/**
 * AI Chat Service - OpenAI function calling with tool execution
 * Handles conversations, message persistence, and SSE streaming
 */

import { getTenantOpenAISettings } from './openai.service';
import { AI_TOOLS } from './tools';
import { executeTool } from './tool-executor';
import { getTenantPrismaBySlug } from '../utils/database';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

interface ChatContext {
  tenantSlug: string;
  tenantId: string;
  userId: string;
  userRoles: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

const SYSTEM_PROMPT = `You are CoreOrbit AI — a helpful, professional office assistant for the CoreOrbit HR & Office Management platform.

Your capabilities:
- Answer questions about employees, attendance, and leave
- Look up who's on leave today or fetch pending leave requests
- Approve or reject leave requests (only when explicitly asked)
- Search for employees by name, department, or designation
- Show the user's own tasks and leave balance
- Get attendance overview for today
- Get employee statistics for the organization
- Generate job descriptions

Guidelines:
- Be concise and helpful. Use bullet points for lists.
- When showing data, format it clearly with names and relevant details.
- For leave approval/rejection, always confirm the action before proceeding.
- If you don't have enough info to use a tool, ask the user for clarification.
- Never make up data — always use the tools to fetch real information.
- If a tool returns an error, explain it clearly and suggest alternatives.
- Respond in a friendly, professional tone.`;

// Maximum tool call rounds to prevent infinite loops
const MAX_TOOL_ROUNDS = 5;

// ============================================================================
// CONVERSATION MANAGEMENT
// ============================================================================

export async function getConversations(ctx: ChatContext) {
  const prisma = await getTenantPrismaBySlug(ctx.tenantSlug);
  return prisma.aiConversation.findMany({
    where: { userId: ctx.userId },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
}

export async function getConversation(ctx: ChatContext, conversationId: string) {
  const prisma = await getTenantPrismaBySlug(ctx.tenantSlug);
  const conversation = await prisma.aiConversation.findFirst({
    where: { id: conversationId, userId: ctx.userId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!conversation) throw new Error('Conversation not found');
  return conversation;
}

export async function deleteConversation(ctx: ChatContext, conversationId: string) {
  const prisma = await getTenantPrismaBySlug(ctx.tenantSlug);
  const conversation = await prisma.aiConversation.findFirst({
    where: { id: conversationId, userId: ctx.userId },
  });
  if (!conversation) throw new Error('Conversation not found');
  await prisma.aiConversation.delete({ where: { id: conversationId } });
}

// ============================================================================
// CHAT (non-streaming)
// ============================================================================

export async function chat(ctx: ChatContext, userMessage: string, conversationId?: string) {
  const settings = await getTenantOpenAISettings(ctx.tenantSlug);
  if (!settings?.enabled || !settings?.apiKey) {
    throw new Error('AI is not configured. Please configure OpenAI in Organization > Integrations.');
  }

  const prisma = await getTenantPrismaBySlug(ctx.tenantSlug);

  // Get or create conversation
  let conversation: any;
  if (conversationId) {
    conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId: ctx.userId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 40 } },
    });
    if (!conversation) throw new Error('Conversation not found');
  } else {
    conversation = await prisma.aiConversation.create({
      data: {
        userId: ctx.userId,
        title: userMessage.slice(0, 100),
      },
      include: { messages: true },
    });
  }

  // Save user message
  await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'USER',
      content: userMessage,
    },
  });

  // Build messages array for OpenAI
  const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];

  for (const msg of conversation.messages) {
    if (msg.role === 'USER') {
      messages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'ASSISTANT') {
      const m: ChatMessage = { role: 'assistant', content: msg.content };
      if (msg.toolCalls) m.tool_calls = msg.toolCalls as any;
      messages.push(m);
    } else if (msg.role === 'TOOL') {
      messages.push({
        role: 'tool',
        content: msg.content || '',
        tool_call_id: (msg.toolResults as any)?.tool_call_id || '',
      });
    }
  }

  messages.push({ role: 'user', content: userMessage });

  // Run OpenAI with tool calling loop
  let assistantContent = '';
  let totalTokens = 0;
  let round = 0;

  while (round < MAX_TOOL_ROUNDS) {
    round++;
    const response = await callOpenAI(settings, messages);
    totalTokens += response.usage?.total_tokens || 0;

    const choice = response.choices?.[0];
    if (!choice) throw new Error('No response from AI');

    const msg = choice.message;

    if (msg.tool_calls?.length) {
      // Add assistant message with tool calls
      messages.push({
        role: 'assistant',
        content: msg.content || null,
        tool_calls: msg.tool_calls,
      });

      // Execute each tool call
      for (const toolCall of msg.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments || '{}');
        const result = await executeTool(toolCall.function.name, args, ctx);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        });

        // Save tool messages to DB
        await prisma.aiMessage.create({
          data: {
            conversationId: conversation.id,
            role: 'TOOL',
            content: result,
            toolCalls: { name: toolCall.function.name, arguments: args },
            toolResults: { tool_call_id: toolCall.id },
          },
        });
      }

      // Continue loop for next OpenAI call with tool results
      continue;
    }

    // No tool calls — we have the final response
    assistantContent = msg.content || '';
    break;
  }

  // Save assistant response
  await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'ASSISTANT',
      content: assistantContent,
      tokenUsage: { total: totalTokens },
    },
  });

  // Update conversation title if first message
  if (!conversationId) {
    await updateConversationTitle(prisma, conversation.id, userMessage, assistantContent);
  }

  await prisma.aiConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return {
    conversationId: conversation.id,
    message: assistantContent,
    tokenUsage: totalTokens,
  };
}

// ============================================================================
// CHAT STREAMING (SSE)
// ============================================================================

export async function chatStream(
  ctx: ChatContext,
  userMessage: string,
  conversationId: string | undefined,
  onChunk: (chunk: string) => void,
  onToolCall: (toolName: string, status: string) => void,
  onDone: (result: { conversationId: string; fullMessage: string }) => void,
  onError: (error: string) => void
) {
  try {
    const settings = await getTenantOpenAISettings(ctx.tenantSlug);
    if (!settings?.enabled || !settings?.apiKey) {
      onError('AI is not configured. Please configure OpenAI in Organization > Integrations.');
      return;
    }

    const prisma = await getTenantPrismaBySlug(ctx.tenantSlug);

    // Get or create conversation
    let conversation: any;
    if (conversationId) {
      conversation = await prisma.aiConversation.findFirst({
        where: { id: conversationId, userId: ctx.userId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 40 } },
      });
      if (!conversation) {
        onError('Conversation not found');
        return;
      }
    } else {
      conversation = await prisma.aiConversation.create({
        data: { userId: ctx.userId, title: userMessage.slice(0, 100) },
        include: { messages: true },
      });
    }

    // Save user message
    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: userMessage,
      },
    });

    // Build messages
    const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];
    for (const msg of conversation.messages) {
      if (msg.role === 'USER') {
        messages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'ASSISTANT') {
        const m: ChatMessage = { role: 'assistant', content: msg.content };
        if (msg.toolCalls) m.tool_calls = msg.toolCalls as any;
        messages.push(m);
      } else if (msg.role === 'TOOL') {
        messages.push({
          role: 'tool',
          content: msg.content || '',
          tool_call_id: (msg.toolResults as any)?.tool_call_id || '',
        });
      }
    }
    messages.push({ role: 'user', content: userMessage });

    // Tool calling loop (non-streamed for tool rounds, then stream final response)
    let round = 0;
    while (round < MAX_TOOL_ROUNDS) {
      round++;

      // First, do a non-streaming call to check for tool calls
      const response = await callOpenAI(settings, messages);
      const choice = response.choices?.[0];
      if (!choice) { onError('No response from AI'); return; }
      const msg = choice.message;

      if (msg.tool_calls?.length) {
        messages.push({
          role: 'assistant',
          content: msg.content || null,
          tool_calls: msg.tool_calls,
        });

        for (const toolCall of msg.tool_calls) {
          onToolCall(toolCall.function.name, 'executing');
          const args = JSON.parse(toolCall.function.arguments || '{}');
          const result = await executeTool(toolCall.function.name, args, ctx);
          onToolCall(toolCall.function.name, 'done');

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });

          await prisma.aiMessage.create({
            data: {
              conversationId: conversation.id,
              role: 'TOOL',
              content: result,
              toolCalls: { name: toolCall.function.name, arguments: args },
              toolResults: { tool_call_id: toolCall.id },
            },
          });
        }
        continue;
      }

      // No tool calls — stream the final response
      break;
    }

    // Now stream the final response
    const fullMessage = await streamOpenAI(settings, messages, onChunk);

    // Save assistant response
    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: fullMessage,
      },
    });

    if (!conversationId) {
      await updateConversationTitle(prisma, conversation.id, userMessage, fullMessage);
    }

    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    onDone({ conversationId: conversation.id, fullMessage });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Chat stream error');
    onError(error.message || 'An error occurred');
  }
}

// ============================================================================
// OPENAI API HELPERS
// ============================================================================

async function callOpenAI(settings: any, messages: ChatMessage[]): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o-mini',
      messages,
      tools: AI_TOOLS,
      tool_choice: 'auto',
      max_tokens: settings.maxTokens || 2000,
      temperature: settings.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as any;
    throw new Error(error.error?.message || `OpenAI API returned ${response.status}`);
  }

  return response.json();
}

async function streamOpenAI(settings: any, messages: ChatMessage[], onChunk: (text: string) => void): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o-mini',
      messages,
      max_tokens: settings.maxTokens || 2000,
      temperature: settings.temperature ?? 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as any;
    throw new Error(error.error?.message || `OpenAI API returned ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream');

  const decoder = new TextDecoder();
  let fullMessage = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') break;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullMessage += delta;
          onChunk(delta);
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  return fullMessage;
}

async function updateConversationTitle(prisma: any, conversationId: string, userMessage: string, aiResponse: string) {
  // Generate a short title from the first message
  const title = userMessage.length > 60
    ? userMessage.slice(0, 57) + '...'
    : userMessage;

  await prisma.aiConversation.update({
    where: { id: conversationId },
    data: { title },
  });
}

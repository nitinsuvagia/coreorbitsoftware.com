/**
 * AI Chat hooks - React Query hooks for AI Assistant
 */

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del, api } from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

export interface AiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

export interface AiMessage {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string | null;
  toolCalls?: any;
  toolResults?: any;
  createdAt: string;
}

export interface AiConversationWithMessages extends AiConversation {
  messages: AiMessage[];
}

export interface ChatResponse {
  conversationId: string;
  message: string;
  tokenUsage: number;
}

// SSE event types
interface SSEChunkEvent {
  type: 'chunk';
  content: string;
}

interface SSEToolEvent {
  type: 'tool';
  name: string;
  status: string;
}

interface SSEDoneEvent {
  type: 'done';
  conversationId: string;
  fullMessage: string;
}

interface SSEErrorEvent {
  type: 'error';
  error: string;
}

type SSEEvent = SSEChunkEvent | SSEToolEvent | SSEDoneEvent | SSEErrorEvent;

// ============================================================================
// HOOKS
// ============================================================================

/**
 * List user's AI conversations
 */
export function useAiConversations() {
  return useQuery({
    queryKey: ['ai', 'conversations'],
    queryFn: () => get<AiConversation[]>('/api/v1/ai/conversations'),
  });
}

/**
 * Get a single conversation with messages
 */
export function useAiConversation(conversationId: string | null) {
  return useQuery({
    queryKey: ['ai', 'conversation', conversationId],
    queryFn: () => get<AiConversationWithMessages>(`/api/v1/ai/conversations/${conversationId}`),
    enabled: !!conversationId,
  });
}

/**
 * Delete a conversation
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => del(`/api/v1/ai/conversations/${conversationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
    },
  });
}

/**
 * Non-streaming chat mutation
 */
export function useChatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { message: string; conversationId?: string }) =>
      post<ChatResponse>('/api/v1/ai/chat', params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
      if (data?.conversationId) {
        queryClient.invalidateQueries({ queryKey: ['ai', 'conversation', data.conversationId] });
      }
    },
  });
}

// ============================================================================
// STREAMING CHAT HOOK
// ============================================================================

interface StreamState {
  isStreaming: boolean;
  streamingContent: string;
  activeToolCall: string | null;
  error: string | null;
}

export function useStreamingChat() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    streamingContent: '',
    activeToolCall: null,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    message: string,
    conversationId?: string,
    onConversationCreated?: (id: string) => void
  ) => {
    // Cancel any existing stream
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState({
      isStreaming: true,
      streamingContent: '',
      activeToolCall: null,
      error: null,
    });

    try {
      // Get auth headers from the api instance
      const token = document.cookie.match(/(^| )accessToken=([^;]+)/)?.[2];
      const tenantSlug = window.location.hostname.split('.')[0];
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

      const response = await fetch(`${apiUrl}/api/v1/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'X-Tenant-Slug': tenantSlug,
          'X-Forwarded-Host': window.location.host,
        },
        body: JSON.stringify({ message, conversationId }),
        signal: abortRef.current.signal,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let finalConversationId = conversationId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          try {
            const event: SSEEvent = JSON.parse(trimmed.slice(6));

            switch (event.type) {
              case 'chunk':
                setState(prev => ({
                  ...prev,
                  streamingContent: prev.streamingContent + event.content,
                  activeToolCall: null,
                }));
                break;

              case 'tool':
                setState(prev => ({
                  ...prev,
                  activeToolCall: event.status === 'executing' ? event.name : null,
                }));
                break;

              case 'done':
                finalConversationId = event.conversationId;
                if (!conversationId && event.conversationId) {
                  onConversationCreated?.(event.conversationId);
                }
                break;

              case 'error':
                setState(prev => ({ ...prev, error: event.error }));
                break;
            }
          } catch {
            // Skip malformed events
          }
        }
      }

      setState(prev => ({ ...prev, isStreaming: false }));

      // Invalidate queries to refresh conversation list
      queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
      if (finalConversationId) {
        queryClient.invalidateQueries({ queryKey: ['ai', 'conversation', finalConversationId] });
      }

      return finalConversationId;
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: error.message || 'Failed to send message',
        }));
      }
      return undefined;
    }
  }, [queryClient]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  return {
    ...state,
    sendMessage,
    cancelStream,
  };
}

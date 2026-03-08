'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, Send, Loader2, Trash2, MessageSquarePlus, ChevronLeft, Sparkles, WifiOff, Briefcase, ExternalLink, CalendarPlus, CheckCircle, XCircle, ClipboardEdit, CalendarCheck } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { JobDescriptionForm } from '@/app/(dashboard)/hr/jobs/_components/JobDescriptionForm';
import type { JobFormData } from '@/app/(dashboard)/hr/jobs/_components/JobDescriptionForm';
import { jobApi } from '@/lib/api/jobs';
import { useOrgSettings } from '@/hooks/use-org-settings';
import { useCreateHoliday } from '@/hooks/use-holidays';
import type { CreateHolidayInput } from '@/hooks/use-holidays';
import { useApproveLeave, useRejectLeave } from '@/hooks/use-attendance';
import { useAuth } from '@/lib/auth/auth-context';
import { SelectEmployeeReviewDialog } from '@/components/hr/SelectEmployeeReviewDialog';
import { ScheduleInterviewDialog } from '@/app/(dashboard)/hr/interviews/_components/ScheduleInterviewDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import {
  useAiStatus,
  useAiConversations,
  useAiConversation,
  useDeleteConversation,
  useStreamingChat,
  type AiMessage,
} from '@/hooks/use-ai-chat';

// ============================================================================
// MARKDOWN RENDERER
// ============================================================================

function AiMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Bold
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        // Headings
        h1: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
        h2: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
        h3: ({ children }) => <h4 className="text-xs font-bold mt-1.5 mb-0.5">{children}</h4>,
        // Paragraphs
        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
        // Lists
        ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto my-2 rounded-lg border">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-primary/10">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-2 py-1.5 text-left font-semibold border-b text-foreground">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-2 py-1 border-b border-muted">{children}</td>
        ),
        tr: ({ children }) => <tr className="hover:bg-muted/50">{children}</tr>,
        // Code
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return (
              <pre className="bg-muted rounded-md p-2 my-1.5 overflow-x-auto text-xs">
                <code>{children}</code>
              </pre>
            );
          }
          return <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>;
        },
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/30 pl-3 my-1.5 text-muted-foreground italic">
            {children}
          </blockquote>
        ),
        // Horizontal rule
        hr: () => <hr className="my-2 border-muted" />,
        // Links
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ============================================================================
// CHART COMPONENT (renders :::chart{...}::: blocks)
// ============================================================================

const CHART_COLORS = ['#8b5cf6', '#ec4899', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#f97316'];

function AiChart({ config }: { config: { type: string; title?: string; xKey: string; yKey: string; color?: string; data: any[] } }) {
  if (!config.data?.length) return null;

  return (
    <div className="my-3 p-3 rounded-xl border bg-card">
      {config.title && (
        <p className="text-xs font-semibold text-foreground mb-2">{config.title}</p>
      )}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={config.data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey={config.xKey} tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={45} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={35} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
            formatter={(value: number) => [value.toLocaleString(), config.yKey === 'value' ? 'Count' : config.yKey]}
          />
          <Bar dataKey={config.yKey} radius={[4, 4, 0, 0]}>
            {config.data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// ACTION BUTTON COMPONENT (renders :::action{...}::: blocks)
// ============================================================================

function ActionButton({ config }: { config: { type: string; label: string; data: any } }) {

  const iconMap: Record<string, React.ReactNode> = {
    create_job: <Briefcase className="w-3.5 h-3.5" />,
    create_holiday: <CalendarPlus className="w-3.5 h-3.5" />,
    approve_leave: <CheckCircle className="w-3.5 h-3.5" />,
    reject_leave: <XCircle className="w-3.5 h-3.5" />,
    create_performance_review: <ClipboardEdit className="w-3.5 h-3.5" />,
    schedule_interview: <CalendarCheck className="w-3.5 h-3.5" />,
  };

  const styleMap: Record<string, string> = {
    approve_leave: 'linear-gradient(to right, #10b981, #059669)',
    reject_leave: 'linear-gradient(to right, #ef4444, #dc2626)',
  };

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('ai-action', { detail: { type: config.type, data: config.data } }));
  };

  return (
    <div className="my-1.5 inline-block mr-2">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg text-white hover:shadow-lg transition-all"
        style={{ background: styleMap[config.type] || 'linear-gradient(to right, #456fe8, #19b0ec)' }}
      >
        {iconMap[config.type] || <Briefcase className="w-3.5 h-3.5" />}
        {config.label}
      </button>
    </div>
  );
}

// ============================================================================
// CONTENT PARSER (splits text into markdown, chart, and action segments)
// ============================================================================

type ContentSegment =
  | { type: 'markdown'; content: string }
  | { type: 'chart'; config: any }
  | { type: 'action'; config: any };

function parseAiContent(text: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  // Match :::chart{...}::: and :::action{...}:::
  const blockRegex = /:::(chart|action)\{([^]*?)data=(\[[\s\S]*?\]|\{[\s\S]*?\})(.*?)\}:::/g;
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(text)) !== null) {
    // Add markdown before the block
    if (match.index > lastIndex) {
      const md = text.slice(lastIndex, match.index).trim();
      if (md) segments.push({ type: 'markdown', content: md });
    }

    const blockType = match[1] as 'chart' | 'action';
    const propsStr = match[2]; // e.g. type="bar" title="..." xKey="name" yKey="value" color="#8b5cf6" 
    const dataStr = match[3]; // e.g. [{...}]
    const afterData = match[4]; // remaining props after data

    // Parse props
    const props: Record<string, string> = {};
    const propRegex = /(\w+)="([^"]*)"/g;
    let pm;
    const fullProps = propsStr + (afterData || '');
    while ((pm = propRegex.exec(fullProps)) !== null) {
      props[pm[1]] = pm[2];
    }

    try {
      const data = JSON.parse(dataStr);
      if (blockType === 'chart') {
        segments.push({ type: 'chart', config: { ...props, data } });
      } else {
        segments.push({ type: 'action', config: { ...props, data } });
      }
    } catch {
      // If JSON parse fails, fall back to markdown
      segments.push({ type: 'markdown', content: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const md = text.slice(lastIndex).trim();
    if (md) segments.push({ type: 'markdown', content: md });
  }

  return segments.length ? segments : [{ type: 'markdown', content: text }];
}

/** Render parsed AI content with charts and action buttons.
 *  Long markdown text gets a fixed-height lighter gray card with auto-scroll to bottom. */
function AiContent({ content }: { content: string }) {
  const segments = useMemo(() => parseAiContent(content), [content]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Separate markdown text from interactive segments (charts/actions)
  const mdParts: string[] = [];
  const interactiveParts: ContentSegment[] = [];
  for (const seg of segments) {
    if (seg.type === 'markdown') {
      mdParts.push(seg.content);
    } else {
      interactiveParts.push(seg);
    }
  }
  const joinedMd = mdParts.join('');
  const lineCount = joinedMd.split('\n').length;
  const isLong = joinedMd.trim().length > 200 || lineCount > 8;

  // Auto-scroll the card to bottom whenever content changes (typewriter)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content]);

  return (
    <>
      {/* Markdown text — long content in a scrollable card */}
      {joinedMd.trim() && (
        isLong ? (
          <div
            ref={scrollRef}
            className="my-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/40 overflow-y-auto custom-scrollbar"
            style={{ maxHeight: '12.5rem' /* ~8 lines at 1.5rem leading */ }}
          >
            <div className="px-3 py-2">
              <AiMarkdown content={joinedMd} />
            </div>
          </div>
        ) : (
          <AiMarkdown content={joinedMd} />
        )
      )}
      {/* Charts and action buttons render outside the card */}
      {interactiveParts.map((seg, i) => {
        if (seg.type === 'chart') return <AiChart key={`i-${i}`} config={seg.config} />;
        if (seg.type === 'action') return <ActionButton key={`i-${i}`} config={seg.config} />;
        return null;
      })}
    </>
  );
}

// ============================================================================
// TYPEWRITER HOOK
// ============================================================================

function useTypewriter(targetText: string, speed: number = 12) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const prevTargetRef = useRef('');

  useEffect(() => {
    // If target text grew (new chunk arrived), we continue from where we are
    // If target text changed completely (new message), reset
    if (!targetText.startsWith(prevTargetRef.current.slice(0, indexRef.current))) {
      indexRef.current = 0;
      setDisplayed('');
    }
    prevTargetRef.current = targetText;

    if (indexRef.current >= targetText.length) {
      setDisplayed(targetText);
      return;
    }

    const timer = setInterval(() => {
      indexRef.current = Math.min(indexRef.current + 2, targetText.length);
      setDisplayed(targetText.slice(0, indexRef.current));
      if (indexRef.current >= targetText.length) {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [targetText, speed]);

  const isTyping = displayed.length < targetText.length;
  return { displayed, isTyping };
}

// ============================================================================
// MESSAGE BUBBLE
// ============================================================================

function MessageBubble({ message, animate = false }: { message: AiMessage; animate?: boolean }) {
  const isUser = message.role === 'USER';
  const isTool = message.role === 'TOOL';
  const content = message.content || '';
  const { displayed, isTyping } = useTypewriter(animate ? content : '', 10);
  const showContent = animate ? displayed : content;

  if (isTool) {
    const toolName = (message.toolCalls as any)?.name || 'tool';
    return (
      <div className="flex items-center gap-2 ml-9 my-1">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          ⚡ Ran {toolName.replace(/_/g, ' ')}
        </span>
      </div>
    );
  }

  // Skip empty ASSISTANT messages (tool_calls with no content)
  if (!isUser && !content.trim()) {
    return null;
  }

  // User messages: colored gradient bubble on the right
  if (isUser) {
    return (
      <div className="flex gap-2 mb-3 justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed text-white" style={{ background: 'linear-gradient(to right, #0968e5, #091970)' }}>
          <div className="whitespace-pre-wrap break-words">{content}</div>
        </div>
      </div>
    );
  }

  // AI messages: no bubble/card, flat text with avatar (like Copilot)
  return (
    <div className="flex gap-2 mb-4 justify-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/15 to-pink-500/15 flex items-center justify-center mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
      </div>
      <div className="flex-1 min-w-0 text-sm leading-relaxed pt-0.5">
        <div className="break-words ai-message">
          <AiContent content={showContent} />
          {animate && isTyping && (
            <span className="inline-block w-1.5 h-4 bg-purple-500/70 animate-pulse ml-0.5 align-middle rounded-sm" />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STREAMING MESSAGE (typing animation)
// ============================================================================

function StreamingMessage({ content, toolCall }: { content: string; toolCall: string | null }) {
  const { displayed, isTyping } = useTypewriter(content, 10);

  return (
    <div className="flex gap-2 mb-4 justify-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/15 to-pink-500/15 flex items-center justify-center mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-pulse" />
      </div>
      <div className="flex-1 min-w-0 text-sm leading-relaxed pt-0.5">
        {toolCall && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Running {toolCall.replace(/_/g, ' ')}...
          </div>
        )}
        {displayed ? (
          <div className="break-words ai-message">
            <AiContent content={displayed} />
            {isTyping && (
              <span className="inline-block w-1.5 h-4 bg-purple-500/70 animate-pulse ml-0.5 align-middle rounded-sm" />
            )}
          </div>
        ) : !toolCall ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-purple-500/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-purple-500/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-purple-500/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-muted-foreground text-xs">Thinking...</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// CHAT INPUT
// ============================================================================

function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void;
  disabled: boolean;
}) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [input]);

  return (
    <div className="border-t p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your office..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 disabled:opacity-50 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white shrink-0 hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// CONVERSATION LIST
// ============================================================================

function ConversationList({
  onSelect,
  onNew,
}: {
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const { data: conversations, isLoading } = useAiConversations();
  const deleteConversation = useDeleteConversation();

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
            <Image src="/ai-chat-icon-white.svg" alt="CoreOrbit AI" width={40} height={40} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white text-sm">CoreOrbit AI</h4>
            <p className="text-xs text-white/75">Your conversations</p>
          </div>
          <button onClick={onNew} className="flex-shrink-0 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <MessageSquarePlus className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !conversations?.length ? (
          <div className="text-center py-8 px-4">
            <Image src="/ai-chat-icon.svg" alt="CoreOrbit AI" width={40} height={40} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <Button variant="outline" size="sm" onClick={onNew} className="mt-3">
              Start a new chat
            </Button>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="group flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted cursor-pointer"
                onClick={() => onSelect(conv.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {conv._count?.messages || 0} messages
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation.mutate(conv.id);
                  }}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN CHAT VIEW
// ============================================================================

function ChatView({
  conversationId,
  onBack,
  aiConfigured = true,
}: {
  conversationId: string | null;
  onBack: () => void;
  aiConfigured?: boolean;
}) {
  const { isStreaming, streamingContent, activeToolCall, error, sendMessage } = useStreamingChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId);
  // Keep local copy of messages to prevent flash when query refreshes
  const [localMessages, setLocalMessages] = useState<AiMessage[]>([]);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  // Track the last AI message that should get typewriter animation
  const [animateMessageId, setAnimateMessageId] = useState<string | null>(null);
  const wasStreamingRef = useRef(false);
  const prevMessageCountRef = useRef(0);

  const { data: conversation } = useAiConversation(activeConvId);

  // Update active conversation when prop changes
  useEffect(() => {
    setActiveConvId(conversationId);
    if (!conversationId) {
      setLocalMessages([]);
      setPendingUserMessage(null);
    }
  }, [conversationId]);

  // Sync fetched conversation messages into local state
  useEffect(() => {
    if (conversation?.messages) {
      const filtered = conversation.messages.filter(m => m.role !== 'SYSTEM');
      const prevCount = prevMessageCountRef.current;
      prevMessageCountRef.current = filtered.length;
      setLocalMessages(filtered);

      // If streaming just ended and we got new messages, animate the latest AI one
      if (wasStreamingRef.current && filtered.length > prevCount) {
        const lastAssistant = [...filtered].reverse().find(m => m.role === 'ASSISTANT' && m.content?.trim());
        if (lastAssistant) {
          setAnimateMessageId(lastAssistant.id);
          wasStreamingRef.current = false;
        }
      }

      // Clear pending user message once it appears in the fetched data
      if (pendingUserMessage && filtered.some(m => m.role === 'USER' && m.content === pendingUserMessage)) {
        setPendingUserMessage(null);
      }
    }
  }, [conversation?.messages, pendingUserMessage]);

  // Mark that streaming just ended so the next message sync can pick it up
  useEffect(() => {
    if (isStreaming) {
      wasStreamingRef.current = true;
    }
  }, [isStreaming]);

  // Auto-scroll to bottom on any content change (including typewriter animation)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll immediately for the initial render
    el.scrollTop = el.scrollHeight;
    // Use MutationObserver to catch DOM changes from typewriter animation
    const observer = new MutationObserver(() => {
      el.scrollTop = el.scrollHeight;
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [localMessages, streamingContent, pendingUserMessage]);

  const handleSend = async (message: string) => {
    // Immediately show user message in chat (optimistic)
    setPendingUserMessage(message);

    const newId = await sendMessage(message, activeConvId ?? undefined, (id) => {
      setActiveConvId(id);
    });
    if (newId && !activeConvId) {
      setActiveConvId(newId);
    }
  };

  // Build the display messages: fetched messages + pending user msg  
  const displayMessages = useMemo(() => {
    const msgs = [...localMessages];
    // Add pending user message if not already in the list
    if (pendingUserMessage && !msgs.some(m => m.role === 'USER' && m.content === pendingUserMessage)) {
      msgs.push({
        id: '__pending__',
        conversationId: activeConvId || '',
        role: 'USER',
        content: pendingUserMessage,
        createdAt: new Date().toISOString(),
      });
    }
    return msgs;
  }, [localMessages, pendingUserMessage, activeConvId]);

  const hasContent = displayMessages.length > 0 || isStreaming;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex-shrink-0 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
            <Image src="/ai-chat-icon-white.svg" alt="CoreOrbit AI" width={40} height={40} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white text-sm truncate">
              {conversation?.title || 'CoreOrbit AI'}
            </h4>
            <p className="text-xs text-white/75 truncate">Your AI-powered office assistant</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {aiConfigured ? (
              <>
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-white/80">Online</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-red-400 rounded-full" />
                <span className="text-xs text-white/80">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {!hasContent && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {!aiConfigured ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/15 to-orange-500/15 flex items-center justify-center mb-4">
                  <WifiOff className="w-8 h-8 text-red-500 dark:text-red-400" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 mb-3">
                  <span className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-red-700 dark:text-red-300 text-xs font-medium">AI Not Connected</span>
                </div>
                <h3 className="font-semibold mb-1">AI Integration Required</h3>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  OpenAI integration is not configured. Please go to <strong>Organization &gt; Integrations</strong> to connect your OpenAI API key.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center mb-4">
                  <Image src="/ai-chat-icon.svg" alt="CoreOrbit AI" width={64} height={64} />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-3">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  <span className="text-purple-700 dark:text-purple-300 text-xs font-medium">Powered by Advanced AI</span>
                </div>
                <h3 className="font-semibold mb-1">How can I help you today?</h3>
                <p className="text-sm text-muted-foreground max-w-[260px]">
                  Ask about employees, leaves, holidays, interviews, attendance, documents, and more.
                </p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center max-w-[340px]">
                  {['Who is on leave today?', 'Upcoming holidays', 'Interview stats', 'My notifications', 'Employee stats', 'My leave balance'].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="text-xs bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 border border-purple-200/50 dark:border-purple-700/30 px-3 py-1.5 rounded-full transition-colors text-purple-700 dark:text-purple-300"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {displayMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} animate={msg.id === animateMessageId} />
        ))}

        {isStreaming && (
          <StreamingMessage content={streamingContent} toolCall={activeToolCall} />
        )}

        {error && (
          <div className="text-center my-2">
            <span className="text-xs text-destructive bg-destructive/10 px-3 py-1 rounded-full">
              {error}
            </span>
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isStreaming || !aiConfigured} />
    </div>
  );
}

// ============================================================================
// AI CHAT PANEL (floating button + panel)
// ============================================================================

export function AiChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'list' | 'chat'>('chat');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const { data: aiStatus, refetch: refetchAiStatus } = useAiStatus();
  const aiConfigured = aiStatus?.configured ?? true; // default true while loading
  const orgSettings = useOrgSettings();
  const { user } = useAuth();

  // Job creation popup state
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [jobPrefillData, setJobPrefillData] = useState<JobFormData | null>(null);

  // Holiday creation popup state
  const [holidayFormOpen, setHolidayFormOpen] = useState(false);
  const [holidayData, setHolidayData] = useState<CreateHolidayInput | null>(null);
  const createHoliday = useCreateHoliday();

  // Leave approve/reject popup state
  const [leaveActionOpen, setLeaveActionOpen] = useState(false);
  const [leaveActionType, setLeaveActionType] = useState<'approve' | 'reject'>('approve');
  const [leaveActionData, setLeaveActionData] = useState<any>(null);
  const [leaveRejectReason, setLeaveRejectReason] = useState('');
  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();

  // Performance review popup state
  const [perfReviewOpen, setPerfReviewOpen] = useState(false);

  // Interview scheduling popup state
  const [interviewFormOpen, setInterviewFormOpen] = useState(false);
  const [interviewPreselect, setInterviewPreselect] = useState<any>(null);

  // Re-check AI status every time the panel is opened
  useEffect(() => {
    if (isOpen) {
      refetchAiStatus();
    }
  }, [isOpen, refetchAiStatus]);

  // Unified action event handler
  useEffect(() => {
    const handler = (e: Event) => {
      const { type, data } = (e as CustomEvent).detail;

      switch (type) {
        case 'create_job': {
          const empTypeMap: Record<string, string> = { FULL_TIME: 'full-time', PART_TIME: 'part-time', CONTRACT: 'contract', INTERN: 'internship' };
          const prefill: JobFormData = {
            title: data?.title || '',
            department: data?.department || '',
            location: '',
            employmentType: (empTypeMap[data?.employmentType] || 'full-time') as JobFormData['employmentType'],
            salaryMin: 0,
            salaryMax: 0,
            currency: orgSettings?.currency || 'INR',
            status: 'open',
            closingDate: '',
            openings: 1,
            experienceMin: data?.experienceMin || 0,
            experienceMax: data?.experienceMax || 0,
            description: data?.description || '',
            requirements: data?.requirements || [],
            responsibilities: data?.responsibilities || [],
            benefits: data?.benefits || [],
            techStack: [],
          };
          setJobPrefillData(prefill);
          setJobFormOpen(true);
          break;
        }
        case 'create_holiday': {
          setHolidayData({
            name: data?.name || '',
            date: data?.date || '',
            type: data?.type || 'public',
            description: data?.description || '',
          });
          setHolidayFormOpen(true);
          break;
        }
        case 'approve_leave':
        case 'reject_leave': {
          setLeaveActionType(type === 'approve_leave' ? 'approve' : 'reject');
          setLeaveActionData(data);
          setLeaveRejectReason('');
          setLeaveActionOpen(true);
          break;
        }
        case 'create_performance_review': {
          setPerfReviewOpen(true);
          break;
        }
        case 'schedule_interview': {
          setInterviewPreselect(data ? {
            id: data.candidateId,
            name: data.candidateName,
            email: '',
            jobId: data.jobId || '',
            jobTitle: data.jobTitle || '',
          } : null);
          setInterviewFormOpen(true);
          break;
        }
      }
    };
    window.addEventListener('ai-action', handler);
    return () => window.removeEventListener('ai-action', handler);
  }, [orgSettings?.currency]);

  // ---- Action handlers ----

  const handleJobFormSubmit = async (data: JobFormData) => {
    try {
      await jobApi.createJob({
        title: data.title,
        department: data.department,
        location: data.location,
        employmentType: data.employmentType,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        currency: data.currency,
        status: data.status,
        closingDate: data.closingDate,
        openings: data.openings,
        experienceMin: data.experienceMin,
        experienceMax: data.experienceMax,
        description: data.description,
        requirements: data.requirements,
        responsibilities: data.responsibilities,
        benefits: data.benefits,
        techStack: data.techStack,
      });
      setJobFormOpen(false);
      setJobPrefillData(null);
      toast.success('Job Created Successfully', {
        description: 'The new job opening has been created and is now active.',
      });
    } catch (error) {
      console.error('Failed to create job:', error);
      toast.error('Failed to Create Job', {
        description: 'An error occurred while creating the job. Please try again.',
      });
    }
  };

  const handleHolidaySubmit = async () => {
    if (!holidayData?.name || !holidayData?.date) return;
    try {
      await createHoliday.mutateAsync(holidayData);
      setHolidayFormOpen(false);
      setHolidayData(null);
      toast.success('Holiday Created', { description: `${holidayData.name} has been added to the calendar.` });
    } catch (error) {
      console.error('Failed to create holiday:', error);
      toast.error('Failed to Create Holiday', { description: 'An error occurred. Please try again.' });
    }
  };

  const handleLeaveAction = async () => {
    if (!leaveActionData?.requestId || !user?.id) return;
    try {
      if (leaveActionType === 'approve') {
        await approveLeave.mutateAsync({ leaveRequestId: leaveActionData.requestId, approverId: user.id });
        toast.success('Leave Approved', { description: `Leave for ${leaveActionData.employeeName} has been approved.` });
      } else {
        if (!leaveRejectReason.trim()) {
          toast.error('Reason Required', { description: 'Please provide a reason for rejection.' });
          return;
        }
        await rejectLeave.mutateAsync({ leaveRequestId: leaveActionData.requestId, approverId: user.id, reason: leaveRejectReason });
        toast.success('Leave Rejected', { description: `Leave for ${leaveActionData.employeeName} has been rejected.` });
      }
      setLeaveActionOpen(false);
      setLeaveActionData(null);
    } catch (error) {
      console.error('Failed to process leave:', error);
      toast.error('Action Failed', { description: 'An error occurred. Please try again.' });
    }
  };

  const handleNewChat = () => {
    setSelectedConversation(null);
    setView('chat');
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    setView('chat');
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center justify-center',
          'w-14 h-14 rounded-full shadow-lg transition-all duration-300',
          'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
          'hover:scale-110 hover:shadow-xl hover:shadow-purple-500/25',
          isOpen && 'rotate-0'
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Image src="/ai-chat-icon.svg" alt="CoreOrbit AI" width={36} height={36} className="rounded-full" />
        )}
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50 w-[560px] h-[780px] max-h-[85vh]',
          'bg-background border border-purple-200/50 dark:border-purple-800/30 rounded-2xl shadow-2xl overflow-hidden',
          'transition-all duration-300 origin-bottom-right',
          isOpen
            ? 'scale-100 opacity-100 pointer-events-auto'
            : 'scale-95 opacity-0 pointer-events-none'
        )}
      >
        {view === 'list' ? (
          <ConversationList
            onSelect={handleSelectConversation}
            onNew={handleNewChat}
          />
        ) : (
          <ChatView
            conversationId={selectedConversation}
            onBack={() => setView('list')}
            aiConfigured={aiConfigured}
          />
        )}
      </div>

      {/* Global job creation popup from AI */}
      <JobDescriptionForm
        open={jobFormOpen}
        onOpenChange={(open) => {
          setJobFormOpen(open);
          if (!open) setJobPrefillData(null);
        }}
        onSubmit={handleJobFormSubmit}
        initialData={jobPrefillData || undefined}
        mode="create"
      />

      {/* Holiday creation popup */}
      <Dialog open={holidayFormOpen} onOpenChange={setHolidayFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Holiday</DialogTitle>
            <DialogDescription>Add a new holiday for your organization.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="holiday-name">Name</Label>
              <Input id="holiday-name" value={holidayData?.name || ''} onChange={(e) => setHolidayData(prev => prev ? { ...prev, name: e.target.value } : prev)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="holiday-date">Date</Label>
              <Input id="holiday-date" type="date" value={holidayData?.date || ''} onChange={(e) => setHolidayData(prev => prev ? { ...prev, date: e.target.value } : prev)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="holiday-type">Type</Label>
              <select id="holiday-type" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={holidayData?.type || 'public'} onChange={(e) => setHolidayData(prev => prev ? { ...prev, type: e.target.value as CreateHolidayInput['type'] } : prev)}>
                <option value="public">Public (Mandatory)</option>
                <option value="optional">Optional</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="holiday-desc">Description (optional)</Label>
              <Textarea id="holiday-desc" value={holidayData?.description || ''} onChange={(e) => setHolidayData(prev => prev ? { ...prev, description: e.target.value } : prev)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHolidayFormOpen(false)}>Cancel</Button>
            <Button onClick={handleHolidaySubmit} disabled={createHoliday.isPending || !holidayData?.name || !holidayData?.date}>
              {createHoliday.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave approve/reject popup */}
      <Dialog open={leaveActionOpen} onOpenChange={setLeaveActionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{leaveActionType === 'approve' ? 'Approve Leave' : 'Reject Leave'}</DialogTitle>
            <DialogDescription>
              {leaveActionType === 'approve'
                ? `Approve ${leaveActionData?.leaveType} for ${leaveActionData?.employeeName}?`
                : `Reject ${leaveActionData?.leaveType} for ${leaveActionData?.employeeName}?`}
            </DialogDescription>
          </DialogHeader>
          {leaveActionData && (
            <div className="py-4 space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Employee:</span>{' '}
                <strong>{leaveActionData.employeeName}</strong>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Leave Type:</span>{' '}
                {leaveActionData.leaveType}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Period:</span>{' '}
                {leaveActionData.fromDate} to {leaveActionData.toDate}
              </div>
              {leaveActionType === 'reject' && (
                <div className="grid gap-2 pt-2">
                  <Label htmlFor="reject-reason">Reason for Rejection</Label>
                  <Textarea id="reject-reason" placeholder="Provide a reason..." value={leaveRejectReason} onChange={(e) => setLeaveRejectReason(e.target.value)} rows={2} />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveActionOpen(false)}>Cancel</Button>
            <Button
              onClick={handleLeaveAction}
              disabled={approveLeave.isPending || rejectLeave.isPending}
              variant={leaveActionType === 'reject' ? 'destructive' : 'default'}
            >
              {(approveLeave.isPending || rejectLeave.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {leaveActionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Performance review popup */}
      <SelectEmployeeReviewDialog
        open={perfReviewOpen}
        onOpenChange={setPerfReviewOpen}
        onSuccess={() => {
          setPerfReviewOpen(false);
          toast.success('Performance Review Saved');
        }}
      />

      {/* Interview scheduling popup */}
      <ScheduleInterviewDialog
        open={interviewFormOpen}
        onOpenChange={setInterviewFormOpen}
        onSuccess={() => {
          setInterviewFormOpen(false);
          setInterviewPreselect(null);
          toast.success('Interview Scheduled');
        }}
        preSelectedCandidate={interviewPreselect || undefined}
      />
    </>
  );
}

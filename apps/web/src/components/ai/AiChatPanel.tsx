'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Trash2, MessageSquarePlus, ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  useAiConversations,
  useAiConversation,
  useDeleteConversation,
  useStreamingChat,
  type AiMessage,
} from '@/hooks/use-ai-chat';

// ============================================================================
// MESSAGE BUBBLE
// ============================================================================

function MessageBubble({ message }: { message: AiMessage }) {
  const isUser = message.role === 'USER';
  const isTool = message.role === 'TOOL';

  if (isTool) {
    // Show tool results as a subtle system message
    const toolName = (message.toolCalls as any)?.name || 'tool';
    return (
      <div className="flex justify-center my-1">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          ⚡ Ran {toolName.replace(/_/g, ' ')}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2 mb-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted rounded-bl-md'
        )}
      >
        <div className="whitespace-pre-wrap break-words">{message.content || ''}</div>
      </div>
    </div>
  );
}

// ============================================================================
// STREAMING MESSAGE
// ============================================================================

function StreamingMessage({ content, toolCall }: { content: string; toolCall: string | null }) {
  return (
    <div className="flex gap-2 mb-3 justify-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-1">
        <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm leading-relaxed">
        {toolCall && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Running {toolCall.replace(/_/g, ' ')}...
          </div>
        )}
        {content ? (
          <div className="whitespace-pre-wrap break-words">{content}</div>
        ) : !toolCall ? (
          <div className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-muted-foreground">Thinking...</span>
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
          placeholder="Ask me anything..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="rounded-xl h-10 w-10 shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
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
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">Conversations</h3>
        <Button variant="ghost" size="icon" onClick={onNew} className="h-8 w-8">
          <MessageSquarePlus className="w-4 h-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !conversations?.length ? (
          <div className="text-center py-8 px-4">
            <Bot className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
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
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// MAIN CHAT VIEW
// ============================================================================

function ChatView({
  conversationId,
  onBack,
}: {
  conversationId: string | null;
  onBack: () => void;
}) {
  const { data: conversation } = useAiConversation(conversationId);
  const { isStreaming, streamingContent, activeToolCall, error, sendMessage } = useStreamingChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId);

  // Update active conversation when prop changes
  useEffect(() => {
    setActiveConvId(conversationId);
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages, streamingContent]);

  const handleSend = async (message: string) => {
    const newId = await sendMessage(message, activeConvId ?? undefined, (id) => {
      setActiveConvId(id);
    });
    if (newId && !activeConvId) {
      setActiveConvId(newId);
    }
  };

  const messages = conversation?.messages?.filter(m => m.role !== 'SYSTEM') || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {conversation?.title || 'New Chat'}
          </h3>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {!messages.length && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">CoreOrbit AI</h3>
            <p className="text-sm text-muted-foreground max-w-[240px]">
              Ask about employees, leaves, tasks, attendance, or generate job descriptions.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center max-w-[320px]">
              {['Who is on leave today?', 'My pending tasks', 'My leave balance', 'Employee stats'].map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
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
      <ChatInput onSend={handleSend} disabled={isStreaming} />
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
          'bg-primary text-primary-foreground hover:scale-105 hover:shadow-xl',
          isOpen && 'rotate-0'
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Bot className="w-6 h-6" />
        )}
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50 w-[400px] h-[600px] max-h-[80vh]',
          'bg-background border rounded-2xl shadow-2xl overflow-hidden',
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
          />
        )}
      </div>
    </>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  X,
  Loader2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useAssistantStore } from '@/state/assistant-store';
import { ToolActivity } from './ToolActivity';
import { EmailPreviewCard } from './EmailPreviewCard';
import { Button } from '@/components/ui/button';

interface AssistantPanelProps {
  onClose?: () => void;
}

const SUGGESTIONS = [
  'Show only unread emails from this week',
  'Open the latest email from David',
  "Reply to this saying thanks, I'll review it today",
  "Send an email to john@example.com with subject Meeting Tomorrow and body Let's meet at 3pm.",
];

export function AssistantPanel({ onClose }: AssistantPanelProps) {
  const {
    messages,
    isThinking,
    sendMessage,
    confirmSend,
    cancelSend,
    clearHistory,
    pendingConfirmation,
  } = useAssistantStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const query = input;
    setInput('');
    await sendMessage(query);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isThinking) return;
    await sendMessage(suggestion);
  };

  return (
    <aside className="flex h-full w-full flex-col bg-card border-l border-border select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-violet-500 text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">MailPilot Copilot</h3>
            <p className="text-[10px] text-muted-foreground">Action Copilot</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={clearHistory}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Close panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/80 text-foreground border border-border/70'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Tool Activity Trace */}
                {msg.tools && msg.tools.length > 0 && (
                  <ToolActivity tools={msg.tools} />
                )}

                {/* Email Preview Card */}
                {msg.previewEmailId && (
                  <EmailPreviewCard messageId={msg.previewEmailId} />
                )}

                {/* Send Confirmation Card */}
                {msg.sendConfirmation && !msg.sendConfirmation.sent && pendingConfirmation && (
                  <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-foreground space-y-2.5">
                    <div className="flex items-center gap-1.5 font-semibold text-primary">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Ready to send this email?</span>
                    </div>

                    <div className="rounded-lg bg-background/80 p-2 border border-border/60 text-[11px] space-y-1">
                      <p>
                        <strong className="text-muted-foreground">To:</strong> {msg.sendConfirmation.draft.to.join(', ')}
                      </p>
                      <p>
                        <strong className="text-muted-foreground">Subject:</strong> {msg.sendConfirmation.draft.subject}
                      </p>
                      <p className="line-clamp-2 text-muted-foreground pt-1 border-t border-border/40">
                        {msg.sendConfirmation.draft.body}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={confirmSend}
                        className="gap-1.5 text-xs font-semibold h-8"
                      >
                        <Send className="h-3 w-3" />
                        <span>Send Now</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelSend}
                        className="text-xs text-muted-foreground hover:text-foreground h-8"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isThinking && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2 w-fit">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>MailPilot is taking action...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="px-3 pb-2 pt-1 border-t border-border/60 bg-muted/10">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Suggested Actions
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestionClick(s)}
              disabled={isThinking}
              className="truncate max-w-full rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all text-left"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="border-t border-border p-3 bg-card">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isThinking}
            placeholder="Instruct MailPilot or ask a question..."
            className="h-10 w-full rounded-xl border border-input bg-background pl-3.5 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isThinking}
            className="absolute right-1.5 h-7 w-7 rounded-lg shadow-xs"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </aside>
  );
}

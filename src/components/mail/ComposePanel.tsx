'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Send,
  Trash2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useMailStore } from '@/state/mail-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ComposePanel() {
  const {
    composeOpen,
    composeDraft,
    setComposeDraft,
    closeCompose,
    fetchMessages,
    folder,
    isAiTyping,
    targetAiDraft,
    finishAiTyping,
  } = useMailStore();

  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Live Animated Field Typing Effect ("The Wow Moment")
  useEffect(() => {
    if (!isAiTyping || !targetAiDraft) return;

    let isCancelled = false;
    const targetTo = targetAiDraft.to.join(', ');
    const targetSubject = targetAiDraft.subject || '';
    const targetBody = targetAiDraft.body || '';

    // Step 1: Animate To field
    setToInput(targetTo);

    // Step 2: Animate Subject character-by-character
    let subIdx = 0;
    const subInterval = setInterval(() => {
      if (isCancelled) return;
      if (subIdx <= targetSubject.length) {
        setComposeDraft({ subject: targetSubject.slice(0, subIdx) });
        subIdx++;
      } else {
        clearInterval(subInterval);

        // Step 3: Animate Body typing in natural words/chunks
        let bodyIdx = 0;
        const bodyInterval = setInterval(() => {
          if (isCancelled) return;
          if (bodyIdx <= targetBody.length) {
            // Take 3-5 chars per tick for smooth natural typing cadence
            bodyIdx += 4;
            setComposeDraft({ body: targetBody.slice(0, Math.min(bodyIdx, targetBody.length)) });
            if (bodyRef.current) {
              bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
            }
          } else {
            clearInterval(bodyInterval);
            finishAiTyping();
          }
        }, 18);
      }
    }, 28);

    return () => {
      isCancelled = true;
      clearInterval(subInterval);
    };
  }, [isAiTyping, targetAiDraft, finishAiTyping, setComposeDraft]);

  // Sync draft recipients to local input strings when not typing
  useEffect(() => {
    if (isAiTyping) return;
    setToInput(composeDraft.to.join(', '));
    setCcInput(composeDraft.cc?.join(', ') || '');
    setBccInput(composeDraft.bcc?.join(', ') || '');
    if (composeDraft.cc && composeDraft.cc.length > 0) setShowCc(true);
    if (composeDraft.bcc && composeDraft.bcc.length > 0) setShowBcc(true);
    setErrorMessage(null);
  }, [composeDraft, isAiTyping]);

  // Handle global keyboard shortcuts: Cmd/Ctrl+Enter to send, Esc to minimize
  useEffect(() => {
    if (!composeOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      } else if (e.key === 'Escape' && !minimized) {
        e.preventDefault();
        setMinimized(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [composeOpen, composeDraft, toInput, ccInput, bccInput, minimized]);

  if (!composeOpen) return null;

  const parseRecipients = (raw: string): string[] => {
    return raw
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
  };

  const handleSend = async () => {
    const recipients = parseRecipients(toInput);
    if (recipients.length === 0) {
      setErrorMessage('Please specify at least one recipient.');
      return;
    }

    setSending(true);
    setErrorMessage(null);

    const payload = {
      to: recipients,
      cc: showCc ? parseRecipients(ccInput) : [],
      bcc: showBcc ? parseRecipients(bccInput) : [],
      subject: composeDraft.subject || '(No Subject)',
      body: composeDraft.body || '',
      inReplyTo: composeDraft.inReplyTo,
      threadId: composeDraft.threadId,
    };

    try {
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      // Successful send: close compose and refresh mailbox
      closeCompose();
      await fetchMessages(folder);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to dispatch email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`fixed z-50 transition-all duration-200 flex flex-col shadow-2xl border border-border bg-card overflow-hidden ${
        maximized
          ? 'inset-4 rounded-2xl'
          : minimized
          ? 'bottom-0 right-6 w-72 h-11 rounded-t-xl'
          : 'bottom-0 right-6 w-[560px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[85vh] rounded-t-2xl'
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2.5 select-none cursor-pointer"
        onClick={() => minimized && setMinimized(false)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">
            {composeDraft.subject ? composeDraft.subject : 'New Message'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMinimized(!minimized);
            }}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMaximized(!maximized);
              setMinimized(false);
            }}
            className="hidden sm:block rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title={maximized ? 'Restore' : 'Maximize'}
          >
            {maximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeCompose();
            }}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
            title="Discard and close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Form (Hidden when Minimized) */}
      {!minimized && (
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="flex-1">{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="hover:font-bold"
              >
                ×
              </button>
            </div>
          )}

          {/* AI Typing Live Indicator Banner */}
          {isAiTyping && (
            <div className="flex items-center justify-between border-b border-primary/20 bg-primary/10 px-4 py-2 text-xs text-primary">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="font-semibold">AI Copilot is typing this draft live...</span>
              </div>
              <button
                onClick={finishAiTyping}
                className="text-[11px] underline hover:font-bold text-primary"
              >
                Skip
              </button>
            </div>
          )}

          {/* Recipient Inputs */}
          <div className="divide-y divide-border/60 border-b border-border text-xs">
            {/* To Field */}
            <div className="flex items-center px-4 py-2 gap-2">
              <span className="w-12 text-muted-foreground font-medium">To:</span>
              <input
                type="text"
                value={toInput}
                onChange={(e) => {
                  setToInput(e.target.value);
                  setComposeDraft({ to: parseRecipients(e.target.value) });
                }}
                placeholder="recipient@example.com"
                className="flex-1 bg-transparent py-1 text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {!showCc && (
                  <button
                    onClick={() => setShowCc(true)}
                    className="hover:text-primary transition-colors"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    onClick={() => setShowBcc(true)}
                    className="hover:text-primary transition-colors"
                  >
                    Bcc
                  </button>
                )}
              </div>
            </div>

            {/* Optional Cc Field */}
            {showCc && (
              <div className="flex items-center px-4 py-1.5 gap-2 bg-muted/20">
                <span className="w-12 text-muted-foreground font-medium">Cc:</span>
                <input
                  type="text"
                  value={ccInput}
                  onChange={(e) => {
                    setCcInput(e.target.value);
                    setComposeDraft({ cc: parseRecipients(e.target.value) });
                  }}
                  placeholder="cc@example.com"
                  className="flex-1 bg-transparent py-1 text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            )}

            {/* Optional Bcc Field */}
            {showBcc && (
              <div className="flex items-center px-4 py-1.5 gap-2 bg-muted/20">
                <span className="w-12 text-muted-foreground font-medium">Bcc:</span>
                <input
                  type="text"
                  value={bccInput}
                  onChange={(e) => {
                    setBccInput(e.target.value);
                    setComposeDraft({ bcc: parseRecipients(e.target.value) });
                  }}
                  placeholder="bcc@example.com"
                  className="flex-1 bg-transparent py-1 text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            )}

            {/* Subject Field */}
            <div className="flex items-center px-4 py-2 gap-2">
              <span className="w-12 text-muted-foreground font-medium">Subject:</span>
              <input
                type="text"
                value={composeDraft.subject}
                onChange={(e) => setComposeDraft({ subject: e.target.value })}
                placeholder="Subject of the email"
                className="flex-1 bg-transparent py-1 font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* Body Textarea */}
          <div className="flex-1 p-4 overflow-y-auto">
            <textarea
              ref={bodyRef}
              value={composeDraft.body}
              onChange={(e) => setComposeDraft({ body: e.target.value })}
              placeholder="Write your email here... Or prompt the AI Copilot to draft it for you."
              className="h-full w-full resize-none bg-transparent font-sans text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSend}
                disabled={sending}
                className="gap-2 font-semibold shadow-md px-5"
                size="sm"
              >
                <Send className={`h-3.5 w-3.5 ${sending ? 'animate-pulse' : ''}`} />
                <span>{sending ? 'Sending...' : 'Send'}</span>
              </Button>

              <span className="hidden sm:inline text-[11px] text-muted-foreground">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">⌘</kbd> + <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Enter</kbd>
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={closeCompose}
              className="text-muted-foreground hover:text-destructive h-8 w-8"
              title="Discard draft"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

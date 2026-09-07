'use client';

import React from 'react';
import {
  ArrowLeft,
  Reply,
  Forward,
  Star,
  Trash2,
  Sparkles,
  Mail,
  Clock,
  User,
} from 'lucide-react';
import { useMailStore } from '@/state/mail-store';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getInitials } from '@/lib/utils';

export function MessageDetail() {
  const {
    selectedMessage,
    detailLoading,
    selectMessage,
    prepareReply,
    prepareForward,
    setMobilePane,
  } = useMailStore();

  if (detailLoading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background p-6 space-y-4 overflow-y-auto">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-7 w-3/4" />
        <div className="space-y-3 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    );
  }

  if (!selectedMessage) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center h-full bg-background p-8 text-center select-none">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground mb-4">
          <Mail className="h-7 w-7 text-primary/70" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No email selected</h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm leading-relaxed">
          Choose an email from your list or ask the AI Copilot to find, filter, or draft a response.
        </p>
      </div>
    );
  }

  const formattedDate = new Date(selectedMessage.date).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Detail Action Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-card/40">
        <div className="flex items-center gap-1">
          {/* Mobile Back Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              selectMessage(null);
              setMobilePane('list');
            }}
            className="md:hidden mr-1"
            title="Back to list"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => prepareReply(selectedMessage)}
            className="gap-1.5 text-xs font-medium"
          >
            <Reply className="h-3.5 w-3.5" />
            <span>Reply</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => prepareForward(selectedMessage)}
            className="gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Forward className="h-3.5 w-3.5" />
            <span>Forward</span>
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-amber-500"
            title={selectedMessage.isStarred ? 'Unstar' : 'Star'}
          >
            <Star className={`h-4 w-4 ${selectedMessage.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Email Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Subject */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {selectedMessage.subject || '(No Subject)'}
          </h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedMessage.labelIds.map((label) => (
              <span
                key={label}
                className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Sender & Recipient Card */}
        <div className="flex items-start justify-between rounded-2xl border border-border bg-card/60 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{getInitials(selectedMessage.from.name, selectedMessage.from.email)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {selectedMessage.from.name || selectedMessage.from.email}
                </span>
                <span className="text-xs text-muted-foreground">
                  &lt;{selectedMessage.from.email}&gt;
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                to {selectedMessage.to.map((t) => t.name || t.email).join(', ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Email Body */}
        <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-foreground/90 font-sans">
          {selectedMessage.bodyHtml ? (
            <div
              className="email-html-content space-y-2"
              dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }}
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90">
              {selectedMessage.bodyText}
            </pre>
          )}
        </div>

        {/* Quick Reply Bar */}
        <div className="mt-8 border-t border-border pt-6">
          <button
            onClick={() => prepareReply(selectedMessage)}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card/80 p-3.5 text-left text-xs text-muted-foreground hover:border-primary/40 hover:bg-card transition-all"
          >
            <Reply className="h-4 w-4 text-primary" />
            <span>Click here to reply to {selectedMessage.from.name || selectedMessage.from.email}...</span>
          </button>
        </div>
      </div>
    </div>
  );
}

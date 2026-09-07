'use client';

import React, { useEffect, useState } from 'react';
import { Mail, ArrowUpRight, Clock, Star } from 'lucide-react';
import { EmailMessage } from '@/types/mail';
import { useMailStore } from '@/state/mail-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmailPreviewCardProps {
  messageId: string;
}

export function EmailPreviewCard({ messageId }: EmailPreviewCardProps) {
  const { messages, selectMessageById, selectedMessageId } = useMailStore();
  const [email, setEmail] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existing = messages.find((m) => m.id === messageId);
    if (existing) {
      setEmail(existing);
      setLoading(false);
      return;
    }

    fetch(`/api/mail/messages/${messageId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.message) {
          setEmail(data.message);
        }
      })
      .catch((err) => console.error('Failed to load email preview:', err))
      .finally(() => setLoading(false));
  }, [messageId, messages]);

  if (loading) {
    return (
      <div className="my-2 animate-pulse rounded-xl border border-border bg-card/60 p-3 text-xs">
        <div className="h-3 w-28 bg-muted rounded mb-2" />
        <div className="h-4 w-44 bg-muted rounded mb-1.5" />
        <div className="h-3 w-full bg-muted rounded" />
      </div>
    );
  }

  if (!email) return null;

  const isSelected = selectedMessageId === email.id;

  return (
    <div
      onClick={() => selectMessageById(email.id)}
      className={`my-2 cursor-pointer rounded-xl border transition-all duration-200 p-3 text-xs select-none ${
        isSelected
          ? 'border-primary bg-primary/10 shadow-xs'
          : 'border-border/80 bg-card hover:border-primary/50 hover:bg-muted/40 shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px]">
              {getInitials(email.from.name, email.from.email)}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-foreground truncate max-w-[140px]">
            {email.from.name || email.from.email}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDate(email.date)}</span>
        </div>
      </div>

      <h4 className="font-semibold text-foreground mb-1 line-clamp-1">
        {email.subject || '(No Subject)'}
      </h4>

      <p className="line-clamp-2 text-[11px] text-muted-foreground leading-relaxed">
        {email.snippet}
      </p>

      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
        <span className="text-[10px] text-primary font-medium flex items-center gap-1">
          <span>Click to view in main pane</span>
          <ArrowUpRight className="h-3 w-3" />
        </span>
        {email.isStarred && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
      </div>
    </div>
  );
}

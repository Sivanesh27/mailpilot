'use client';

import React from 'react';
import {
  Search,
  Star,
  Inbox,
  FilterX,
  MailCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useMailStore } from '@/state/mail-store';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate, getInitials } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { FilterBar } from './FilterBar';

export function MessageList() {
  const {
    messages,
    selectedMessageId,
    selectMessage,
    loading,
    folder,
    searchQuery,
    setSearchQuery,
    fetchMessages,
    filters,
    clearFilters,
  } = useMailStore();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMessages(folder, searchQuery);
  };

  // Messages are queried directly from Gmail; optimistic unread check keeps UI instant
  const filteredMessages = messages.filter((msg) => {
    if (filters.unread && msg.isRead) return false;
    return true;
  });

  const hasActiveFilters = Boolean(
    filters.unread || filters.sender || filters.keyword || filters.dateFrom || filters.dateTo || searchQuery
  );

  return (
    <div className="flex h-full w-full flex-col border-r border-border bg-card/50 select-none md:w-[380px] lg:w-[420px] shrink-0">
      {/* Search Bar */}
      <div className="border-b border-border p-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emails or ask AI..."
            className="h-9 w-full rounded-xl border border-input bg-card pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                fetchMessages(folder, '');
              }}
              className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </form>
      </div>

      {/* Structured Filter Bar */}
      <FilterBar />

      {/* Message List Feed */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
        {loading ? (
          // Shimmer Skeletons
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex gap-3 rounded-xl p-2.5">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-3.5 w-44" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredMessages.length === 0 ? (
          // Empty State
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
              {hasActiveFilters ? <FilterX className="h-6 w-6" /> : <MailCheck className="h-6 w-6 text-primary" />}
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {hasActiveFilters ? 'No matching emails' : "You're all caught up!"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-[240px]">
              {hasActiveFilters
                ? 'Try tweaking your search terms or clearing active filters.'
                : `No messages currently in ${folder}.`}
            </p>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline" size="sm" className="mt-3 text-xs">
                Reset filters
              </Button>
            )}
          </div>
        ) : (
          // Message Cards
          filteredMessages.map((msg) => {
            const isSelected = selectedMessageId === msg.id;

            return (
              <article
                key={msg.id}
                onClick={() => selectMessage(msg)}
                className={`group relative flex cursor-pointer gap-3 p-3.5 transition-all duration-150 ${
                  isSelected
                    ? 'bg-primary/10 dark:bg-primary/15 border-l-4 border-l-primary shadow-xs'
                    : 'hover:bg-muted/60'
                } ${!msg.isRead ? 'bg-card font-medium' : 'opacity-85'}`}
              >
                {/* Unread Indicator Dot */}
                {!msg.isRead && (
                  <span className="absolute left-1.5 top-5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                )}

                {/* Avatar */}
                <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                  <AvatarFallback>{getInitials(msg.from.name, msg.from.email)}</AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={`truncate text-xs ${
                        !msg.isRead ? 'font-bold text-foreground' : 'font-medium text-foreground/80'
                      }`}
                    >
                      {msg.from.name || msg.from.email}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatDate(msg.date)}
                    </span>
                  </div>

                  <h4
                    className={`truncate text-xs mb-1 ${
                      !msg.isRead ? 'font-semibold text-foreground' : 'text-foreground/75'
                    }`}
                  >
                    {msg.subject || '(No Subject)'}
                  </h4>

                  <p className="line-clamp-2 text-[11px] text-muted-foreground leading-relaxed">
                    {msg.snippet}
                  </p>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

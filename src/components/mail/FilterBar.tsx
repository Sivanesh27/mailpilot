'use client';

import React from 'react';
import { Filter, X, Calendar, User, Mail, CheckCircle2 } from 'lucide-react';
import { useMailStore } from '@/state/mail-store';
import { getTimeRangeFilters } from '@/lib/gmail/search';

export function FilterBar() {
  const { filters, setFilters, clearFilters, fetchMessages, folder } = useMailStore();

  const handleTimeRangeToggle = (range: 'today' | 'this_week') => {
    const rangeFilters = getTimeRangeFilters(range);
    if (filters.dateFrom === rangeFilters.dateFrom) {
      // Clear date filter if already active
      setFilters({ dateFrom: null });
    } else {
      setFilters(rangeFilters);
    }
  };

  const isTodayActive = Boolean(
    filters.dateFrom && filters.dateFrom === getTimeRangeFilters('today').dateFrom
  );
  const isThisWeekActive = Boolean(
    filters.dateFrom && filters.dateFrom === getTimeRangeFilters('this_week').dateFrom
  );

  const hasAnyFilter = Boolean(
    filters.unread || filters.sender || filters.recipient || filters.dateFrom || filters.keyword
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-border bg-card/30 text-xs select-none">
      <div className="flex items-center gap-1 text-muted-foreground mr-1">
        <Filter className="h-3 w-3" />
        <span className="text-[11px] font-medium">Filter:</span>
      </div>

      {/* Unread Preset */}
      <button
        onClick={() => setFilters({ unread: !filters.unread })}
        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
          filters.unread
            ? 'bg-primary text-primary-foreground shadow-xs'
            : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        Unread
      </button>

      {/* Today Preset */}
      <button
        onClick={() => handleTimeRangeToggle('today')}
        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
          isTodayActive
            ? 'bg-primary text-primary-foreground shadow-xs'
            : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        Today
      </button>

      {/* This Week Preset */}
      <button
        onClick={() => handleTimeRangeToggle('this_week')}
        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
          isThisWeekActive
            ? 'bg-primary text-primary-foreground shadow-xs'
            : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        This Week
      </button>

      {/* Sender Active Pill */}
      {filters.sender && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          <User className="h-3 w-3" />
          <span>{filters.sender}</span>
          <button
            onClick={() => setFilters({ sender: null })}
            className="rounded-full hover:bg-primary/20 p-0.5 ml-0.5"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      )}

      {/* Clear All Button */}
      {hasAnyFilter && (
        <button
          onClick={clearFilters}
          className="ml-auto flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}

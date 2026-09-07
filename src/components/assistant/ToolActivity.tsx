'use client';

import React from 'react';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  PenSquare,
  Search,
  Filter,
  Mail,
  Send,
  RefreshCw,
} from 'lucide-react';
import { ToolActivityItem } from '@/types/assistant';

interface ToolActivityProps {
  tools: ToolActivityItem[];
}

function getToolIcon(name: string) {
  switch (name) {
    case 'openCompose':
    case 'fillCompose':
      return PenSquare;
    case 'searchEmails':
      return Search;
    case 'setFilters':
      return Filter;
    case 'openEmail':
    case 'openLatestEmail':
      return Mail;
    case 'sendEmail':
      return Send;
    case 'refreshInbox':
      return RefreshCw;
    default:
      return Sparkles;
  }
}

export function ToolActivity({ tools }: ToolActivityProps) {
  if (!tools || tools.length === 0) return null;

  return (
    <div className="my-2 space-y-1.5 rounded-xl border border-border/70 bg-card/60 p-2.5 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
        <Sparkles className="h-3 w-3 text-primary" />
        <span>Action Trace</span>
      </div>

      <div className="space-y-1 pt-1">
        {tools.map((tool) => {
          const Icon = getToolIcon(tool.name);

          return (
            <div
              key={tool.id}
              className="flex items-center justify-between rounded-lg bg-background/80 px-2.5 py-1.5 border border-border/40 text-[11px]"
            >
              <div className="flex items-center gap-2 text-foreground">
                <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-medium">{tool.label}</span>
              </div>

              <div className="flex items-center">
                {tool.status === 'running' || tool.status === 'pending' ? (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                ) : tool.status === 'success' ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-destructive" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import {
  Inbox,
  Send,
  Star,
  FileText,
  Trash2,
  PenSquare,
  Sparkles,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useMailStore } from '@/state/mail-store';
import { MailFolder } from '@/types/mail';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { SyncIndicator } from './SyncIndicator';
import { getInitials } from '@/lib/utils';

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string;
    avatarUrl?: string | null;
    isDemo?: boolean;
  } | null;
  onOpenAssistant?: () => void;
  assistantOpen?: boolean;
}

const folders: { id: MailFolder; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

export function Sidebar({ user, onOpenAssistant, assistantOpen }: SidebarProps) {
  const { folder, setFolder, openCompose, messages, syncStatus, isSyncing, refreshInbox } = useMailStore();

  const unreadInboxCount = messages.filter((m) => m.labelIds.includes('INBOX') && !m.isRead).length;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <aside className="flex h-full w-64 flex-col justify-between border-r border-sidebar-border bg-sidebar px-3 py-4 select-none">
      {/* Top Header & Brand */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-violet-500 shadow-md shadow-primary/25">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-foreground">
                Mail<span className="text-primary">Pilot</span>
              </span>
              <span className="ml-1.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                AI Copilot
              </span>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Primary Compose Button */}
        <div className="px-2 pt-1">
          <Button
            onClick={() => openCompose()}
            className="w-full justify-center gap-2.5 font-semibold shadow-md hover:shadow-primary/20"
            size="lg"
          >
            <PenSquare className="h-4 w-4" />
            <span>Compose</span>
          </Button>
        </div>

        {/* Navigation Folders */}
        <nav className="space-y-1 px-1 pt-2">
          {folders.map((item) => {
            const Icon = item.icon;
            const isActive = folder === item.id;
            const count = item.id === 'inbox' ? unreadInboxCount : undefined;

            return (
              <button
                key={item.id}
                onClick={() => setFolder(item.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary/15 text-primary dark:bg-primary/20 shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {count !== undefined && count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Sync Status, AI trigger, and User Badge */}
      <div className="space-y-3 px-1 pt-4 border-t border-sidebar-border">
        {/* Live Sync Status Indicator with Polling */}
        <SyncIndicator />

        {/* AI Copilot Toggle Button (if side panel is closed) */}
        {onOpenAssistant && (
          <button
            onClick={onOpenAssistant}
            className={`flex w-full items-center justify-between rounded-xl p-2.5 text-xs font-medium transition-all ${
              assistantOpen
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>AI Copilot Active</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>
        )}

        {/* User Account / Logout */}
        <div className="flex items-center justify-between rounded-xl bg-card/80 p-2 border border-border/50">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || 'User'} />
              <AvatarFallback>{getInitials(user?.name || undefined, user?.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {user?.name || 'MailPilot User'}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

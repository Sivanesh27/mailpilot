'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { MessageList } from './MessageList';
import { MessageDetail } from './MessageDetail';
import { ComposePanel } from './ComposePanel';
import { AssistantPanel } from '@/components/assistant/AssistantPanel';
import { useMailStore } from '@/state/mail-store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MailShell() {
  const { fetchMessages, folder, mobilePane, setMobilePane } = useMailStore();
  useKeyboardShortcuts();

  const [user, setUser] = useState<{
    name?: string | null;
    email?: string;
    avatarUrl?: string | null;
    isDemo?: boolean;
  } | null>(null);

  const [assistantOpen, setAssistantOpen] = useState(true);

  useEffect(() => {
    // Fetch user profile
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch((err) => console.error('Failed to load user:', err));

    // Initial message fetch
    fetchMessages(folder);
  }, [fetchMessages, folder]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Pane 1: Sidebar (hidden on mobile, visible on desktop/tablet) */}
      <div className="hidden md:block shrink-0 h-full">
        <Sidebar
          user={user}
          onOpenAssistant={() => setAssistantOpen(!assistantOpen)}
          assistantOpen={assistantOpen}
        />
      </div>

      {/* Pane 2 & 3: Message List & Detail View */}
      <div className="flex flex-1 h-full overflow-hidden">
        {/* On mobile, toggle between list and detail */}
        <div
          className={`h-full ${
            mobilePane === 'list' ? 'flex flex-1' : 'hidden md:flex'
          }`}
        >
          <MessageList />
        </div>

        <div
          className={`h-full flex-1 ${
            mobilePane === 'detail' ? 'flex flex-1' : 'hidden md:flex'
          }`}
        >
          <MessageDetail />
        </div>
      </div>

      {/* Pane 4: AI Copilot Dock (desktop side panel) */}
      {assistantOpen && (
        <div className="hidden lg:flex w-80 xl:w-96 shrink-0 h-full">
          <AssistantPanel onClose={() => setAssistantOpen(false)} />
        </div>
      )}

      {/* Mobile Copilot Drawer Overlay */}
      {assistantOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-sm h-full bg-card shadow-2xl">
            <AssistantPanel onClose={() => setAssistantOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile / Compact Floating Action Button to toggle Copilot */}
      {!assistantOpen && (
        <Button
          onClick={() => setAssistantOpen(true)}
          size="icon"
          className="fixed bottom-5 right-5 h-12 w-12 rounded-full shadow-2xl bg-primary text-primary-foreground z-30"
          title="Open AI Copilot"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      )}

      {/* Compose Modal / Docked Panel */}
      <ComposePanel />
    </div>
  );
}

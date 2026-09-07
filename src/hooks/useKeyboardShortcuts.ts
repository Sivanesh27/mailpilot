'use client';

import { useEffect } from 'react';
import { useMailStore } from '@/state/mail-store';

export function useKeyboardShortcuts() {
  const {
    messages,
    selectedMessageId,
    selectMessage,
    openCompose,
    composeOpen,
    closeCompose,
    filters,
  } = useMailStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut keys if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // 'c' -> Open Compose
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        openCompose();
        return;
      }

      // '/' -> Focus search input
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      // 'Escape' -> Close compose
      if (e.key === 'Escape') {
        if (composeOpen) {
          e.preventDefault();
          closeCompose();
        }
        return;
      }

      // 'j' or 'ArrowDown' -> Select next email
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = messages.findIndex((m) => m.id === selectedMessageId);
        if (currentIndex < messages.length - 1) {
          selectMessage(messages[currentIndex + 1]);
        } else if (messages.length > 0 && currentIndex === -1) {
          selectMessage(messages[0]);
        }
        return;
      }

      // 'k' or 'ArrowUp' -> Select previous email
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = messages.findIndex((m) => m.id === selectedMessageId);
        if (currentIndex > 0) {
          selectMessage(messages[currentIndex - 1]);
        } else if (messages.length > 0 && currentIndex === -1) {
          selectMessage(messages[0]);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [messages, selectedMessageId, selectMessage, openCompose, composeOpen, closeCompose]);
}

'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useMailStore } from '@/state/mail-store';

export function SyncIndicator() {
  const { syncStatus, setSyncStatus, fetchMessages, folder } = useMailStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performSync = useCallback(async () => {
    // Only poll when browser tab is active/visible
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fetch('/api/mail/sync');
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data.syncStatus || 'ACTIVE');
        setLastSyncTime(new Date());

        if (data.changes || data.fullResyncRequired) {
          await fetchMessages(folder);
        }
      } else if (res.status === 401) {
        setSyncStatus('REAUTH_REQUIRED');
      }
    } catch (err) {
      console.warn('Sync poll failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchMessages, folder, setSyncStatus]);

  useEffect(() => {
    // Initial sync
    performSync();

    // Poll interval every 18 seconds
    pollTimerRef.current = setInterval(performSync, 18000);

    // Visibility change listener: immediately sync when returning to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        performSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [performSync]);

  const formattedLastSync = lastSyncTime
    ? lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  return (
    <div className="flex items-center justify-between rounded-xl bg-card/60 px-3 py-2 text-xs border border-border/50">
      <div className="flex items-center gap-2">
        {isSyncing ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
        ) : syncStatus === 'ACTIVE' ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
        )}
        <div className="flex flex-col">
          <span className="text-foreground font-medium text-[11px]">
            {isSyncing ? 'Syncing mail...' : syncStatus === 'ACTIVE' ? 'Live Sync' : 'Reconnect'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {isSyncing ? 'Checking changes' : `Updated ${formattedLastSync}`}
          </span>
        </div>
      </div>

      <button
        onClick={performSync}
        disabled={isSyncing}
        title="Trigger manual sync"
        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
      >
        <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

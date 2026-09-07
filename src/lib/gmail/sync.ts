import { AuthenticatedGmailClient } from './client';
import { prisma } from '@/lib/db/prisma';
import { DEMO_MESSAGES } from './messages';

export interface SyncResult {
  syncStatus: 'ACTIVE' | 'ERROR' | 'REAUTH_REQUIRED';
  changes: boolean;
  historyId?: string;
  newMessagesCount: number;
  addedMessageIds: string[];
  fullResyncRequired?: boolean;
}

/**
 * Polls Gmail history.list to fetch incremental mailbox changes.
 * Idempotent: safe against duplicate requests and network retries.
 */
export async function pollGmailSync(
  client: AuthenticatedGmailClient
): Promise<SyncResult> {
  // Demo Mode Sandbox Polling
  if (client.userId === 'demo-user-id' || (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && !process.env.GOOGLE_CLIENT_ID)) {
    return {
      syncStatus: 'ACTIVE',
      changes: false,
      newMessagesCount: 0,
      addedMessageIds: [],
    };
  }

  // Retrieve existing sync state
  let syncState = await prisma.mailSyncState.findUnique({
    where: { userId: client.userId },
  });

  if (!syncState) {
    syncState = await prisma.mailSyncState.create({
      data: {
        userId: client.userId,
        syncStatus: 'ACTIVE',
      },
    });
  }

  // If no historyId is recorded yet, initialize from user profile
  if (!syncState.historyId) {
    const profileRes = await client.fetchGmail('/profile');
    if (!profileRes.ok) {
      if (profileRes.status === 401) {
        return { syncStatus: 'REAUTH_REQUIRED', changes: false, newMessagesCount: 0, addedMessageIds: [] };
      }
      throw new Error(`Failed to fetch Gmail profile for sync init: ${profileRes.status}`);
    }

    const profile = await profileRes.json();
    const initialHistoryId = profile.historyId;

    await prisma.mailSyncState.update({
      where: { userId: client.userId },
      data: {
        historyId: initialHistoryId,
        lastSyncAt: new Date(),
        syncStatus: 'ACTIVE',
        errorMessage: null,
      },
    });

    return {
      syncStatus: 'ACTIVE',
      historyId: initialHistoryId,
      changes: false,
      newMessagesCount: 0,
      addedMessageIds: [],
    };
  }

  // Poll history.list with current historyId
  const historyRes = await client.fetchGmail(
    `/history?startHistoryId=${syncState.historyId}&maxResults=50`
  );

  // If Gmail returns 404, the historyId has expired (typically after 7 days or large deletion).
  // Fall back to full resync by acquiring a fresh historyId.
  if (historyRes.status === 404) {
    console.warn('Gmail historyId expired. Performing full sync reset.');
    const profileRes = await client.fetchGmail('/profile');
    if (profileRes.ok) {
      const profile = await profileRes.json();
      await prisma.mailSyncState.update({
        where: { userId: client.userId },
        data: {
          historyId: profile.historyId,
          lastSyncAt: new Date(),
          syncStatus: 'ACTIVE',
        },
      });

      return {
        syncStatus: 'ACTIVE',
        historyId: profile.historyId,
        changes: true,
        fullResyncRequired: true,
        newMessagesCount: 0,
        addedMessageIds: [],
      };
    }
  }

  if (!historyRes.ok) {
    if (historyRes.status === 401) {
      return { syncStatus: 'REAUTH_REQUIRED', changes: false, newMessagesCount: 0, addedMessageIds: [] };
    }
    const errText = await historyRes.text();
    throw new Error(`Gmail history.list failed: ${historyRes.status} ${errText}`);
  }

  const historyData = await historyRes.json();
  const addedIds: string[] = [];

  if (historyData.history && Array.isArray(historyData.history)) {
    for (const record of historyData.history) {
      if (record.messagesAdded) {
        for (const item of record.messagesAdded) {
          if (item.message?.id && !addedIds.includes(item.message.id)) {
            addedIds.push(item.message.id);
          }
        }
      }
    }
  }

  const newHistoryId = historyData.historyId || syncState.historyId;

  // Persist updated historyId and sync timestamp
  await prisma.mailSyncState.update({
    where: { userId: client.userId },
    data: {
      historyId: newHistoryId,
      lastSyncAt: new Date(),
      syncStatus: 'ACTIVE',
      errorMessage: null,
    },
  });

  return {
    syncStatus: 'ACTIVE',
    historyId: newHistoryId,
    changes: addedIds.length > 0,
    newMessagesCount: addedIds.length,
    addedMessageIds: addedIds,
  };
}

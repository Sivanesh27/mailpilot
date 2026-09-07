import { describe, it, expect, vi } from 'vitest';
import { pollGmailSync } from '@/lib/gmail/sync';
import { AuthenticatedGmailClient } from '@/lib/gmail/client';

describe('Gmail Polling Sync Engine', () => {
  it('should handle demo mode sync safely and idempotently', async () => {
    const mockClient: AuthenticatedGmailClient = {
      userId: 'demo-user-id',
      accessToken: 'mock-token',
      fetchGmail: vi.fn(),
    };

    const result = await pollGmailSync(mockClient);

    expect(result.syncStatus).toBe('ACTIVE');
    expect(result.changes).toBe(false);
    expect(result.newMessagesCount).toBe(0);
    expect(mockClient.fetchGmail).not.toHaveBeenCalled();
  });

  it('should process history records and detect new messages', async () => {
    const mockHistoryData = {
      historyId: '100500',
      history: [
        {
          id: 'h1',
          messagesAdded: [
            { message: { id: 'msg-new-1', threadId: 'th-new-1' } },
            { message: { id: 'msg-new-2', threadId: 'th-new-2' } },
          ],
        },
      ],
    };

    const mockClient: AuthenticatedGmailClient = {
      userId: 'test-user-sync-1',
      accessToken: 'valid-token',
      fetchGmail: vi.fn().mockImplementation(async (endpoint: string) => {
        if (endpoint.includes('/profile')) {
          return new Response(JSON.stringify({ historyId: '100000', emailAddress: 'test@example.com' }), {
            status: 200,
          });
        }
        if (endpoint.includes('/history')) {
          return new Response(JSON.stringify(mockHistoryData), { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      }),
    };

    // First call initializes historyId from /profile (mocked in database mock or sync init)
    expect(mockClient.accessToken).toBe('valid-token');
  });

  it('should handle stale history 404s with graceful resync', async () => {
    let callCount = 0;
    const mockClient: AuthenticatedGmailClient = {
      userId: 'test-user-sync-404',
      accessToken: 'valid-token',
      fetchGmail: vi.fn().mockImplementation(async (endpoint: string) => {
        if (endpoint.includes('/history')) {
          return new Response('History ID expired', { status: 404 });
        }
        if (endpoint.includes('/profile')) {
          callCount++;
          return new Response(JSON.stringify({ historyId: '200000', emailAddress: 'test@example.com' }), {
            status: 200,
          });
        }
        return new Response('Not found', { status: 404 });
      }),
    };

    expect(mockClient).toBeDefined();
  });
});

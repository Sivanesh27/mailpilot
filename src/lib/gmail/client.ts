import { prisma } from '@/lib/db/prisma';
import { decryptToken, encryptToken } from '@/lib/security/crypto';
import { refreshAccessToken } from '@/lib/auth/google';

export const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

export interface AuthenticatedGmailClient {
  userId: string;
  accessToken: string;
  fetchGmail: (endpoint: string, options?: RequestInit) => Promise<Response>;
}

/**
 * Retrieves an authenticated Gmail API client for the user,
 * automatically handling token expiration and refreshing as needed.
 */
export async function getAuthenticatedGmailClient(userId: string): Promise<AuthenticatedGmailClient> {
  // Check if running in mock/demo mode for local development
  if (userId === 'demo-user-id' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && !process.env.GOOGLE_CLIENT_ID) {
    return {
      userId,
      accessToken: 'demo-access-token',
      fetchGmail: async () => {
        throw new Error('DEMO_MODE');
      },
    };
  }

  const account = await prisma.oAuthAccount.findFirst({
    where: { userId, provider: 'google' },
  });

  if (!account) {
    throw new Error('No Google OAuth account connected for this user');
  }

  let accessToken = decryptToken(account.accessTokenEncrypted);
  const refreshToken = decryptToken(account.refreshTokenEncrypted);

  // Check if token expires within 5 minutes
  const isExpiring = new Date(account.accessTokenExpiresAt.getTime() - 5 * 60 * 1000) <= new Date();

  if (isExpiring) {
    try {
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

      await prisma.oAuthAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEncrypted: encryptToken(accessToken),
          accessTokenExpiresAt: newExpiresAt,
        },
      });

      // Update sync state to ACTIVE if it was in error
      await prisma.mailSyncState.upsert({
        where: { userId },
        create: { userId, syncStatus: 'ACTIVE' },
        update: { syncStatus: 'ACTIVE', errorMessage: null },
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Token refresh failed';
      await prisma.mailSyncState.upsert({
        where: { userId },
        create: { userId, syncStatus: 'REAUTH_REQUIRED', errorMessage: errorMsg },
        update: { syncStatus: 'REAUTH_REQUIRED', errorMessage: errorMsg },
      });
      throw new Error(`Google authorization expired: ${errorMsg}. Please reconnect.`);
    }
  }

  const fetchGmail = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const url = endpoint.startsWith('http') ? endpoint : `${GMAIL_API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${accessToken}`);
    headers.set('Accept', 'application/json');

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      // Mark reauth required
      await prisma.mailSyncState.upsert({
        where: { userId },
        create: { userId, syncStatus: 'REAUTH_REQUIRED', errorMessage: 'Gmail returned 401 Unauthorized' },
        update: { syncStatus: 'REAUTH_REQUIRED', errorMessage: 'Gmail returned 401 Unauthorized' },
      });
    }

    return res;
  };

  return {
    userId,
    accessToken,
    fetchGmail,
  };
}

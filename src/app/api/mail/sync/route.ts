import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAuthenticatedGmailClient } from '@/lib/gmail/client';
import { pollGmailSync } from '@/lib/gmail/sync';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await getAuthenticatedGmailClient(session.userId);
    const syncResult = await pollGmailSync(client);

    return NextResponse.json(syncResult);
  } catch (err: unknown) {
    console.error('Mail sync poll error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to poll mail sync' },
      { status: 500 }
    );
  }
}

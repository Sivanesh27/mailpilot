import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAuthenticatedGmailClient } from '@/lib/gmail/client';
import { listGmailMessages } from '@/lib/gmail/messages';
import { MailFolder } from '@/types/mail';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const folder = (searchParams.get('folder') as MailFolder) || 'inbox';
    const query = searchParams.get('q') || undefined;
    const pageToken = searchParams.get('pageToken') || undefined;
    const maxResults = searchParams.get('maxResults') ? parseInt(searchParams.get('maxResults')!, 10) : 25;

    const client = await getAuthenticatedGmailClient(session.userId);
    const data = await listGmailMessages(client, {
      folder,
      query,
      pageToken,
      maxResults,
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('Fetch messages error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}

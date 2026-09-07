import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAuthenticatedGmailClient } from '@/lib/gmail/client';
import { listGmailMessages } from '@/lib/gmail/messages';
import { compileFilterToGmailQuery } from '@/lib/gmail/search';
import { MailFilter, MailFolder } from '@/types/mail';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const filters: MailFilter = body.filters || {};
    const folder = (body.folder as MailFolder) || 'inbox';

    const compiledQuery = compileFilterToGmailQuery(filters);

    const client = await getAuthenticatedGmailClient(session.userId);
    const result = await listGmailMessages(client, {
      folder,
      query: compiledQuery || undefined,
    });

    return NextResponse.json({
      messages: result.messages,
      query: compiledQuery,
      count: result.messages.length,
    });
  } catch (err: unknown) {
    console.error('Mail search error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to search emails' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAuthenticatedGmailClient } from '@/lib/gmail/client';
import { getGmailMessage } from '@/lib/gmail/messages';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    const client = await getAuthenticatedGmailClient(session.userId);
    const message = await getGmailMessage(client, id);

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ message });
  } catch (err: unknown) {
    console.error('Fetch message detail error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch message detail' },
      { status: 500 }
    );
  }
}

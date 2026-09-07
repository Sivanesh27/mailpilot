import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAuthenticatedGmailClient } from '@/lib/gmail/client';
import { sendGmailMessage } from '@/lib/gmail/send';
import { ComposeDraft } from '@/types/mail';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const draft: ComposeDraft = body.draft || body;

    // Validate recipients
    if (!draft.to || !Array.isArray(draft.to) || draft.to.length === 0) {
      return NextResponse.json(
        { error: 'At least one recipient is required in "To"' },
        { status: 400 }
      );
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidTo = draft.to.find((email) => !emailRegex.test(email.trim()));
    if (invalidTo) {
      return NextResponse.json(
        { error: `Invalid recipient email address: "${invalidTo}"` },
        { status: 400 }
      );
    }

    const client = await getAuthenticatedGmailClient(session.userId);

    const result = await sendGmailMessage(client, {
      fromEmail: session.email,
      fromName: session.email.split('@')[0],
      draft: {
        ...draft,
        to: draft.to.map((e) => e.trim()),
        cc: draft.cc?.map((e) => e.trim()),
        bcc: draft.bcc?.map((e) => e.trim()),
      },
    });

    return NextResponse.json({
      success: true,
      messageId: result.id,
      threadId: result.threadId,
    });
  } catch (err: unknown) {
    console.error('Send mail error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

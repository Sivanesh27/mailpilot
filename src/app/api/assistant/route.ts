import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { runAssistantTurn } from '@/lib/ai/gemini-client';
import { AppContextState } from '@/types/assistant';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { messages, appContext } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      appContext: AppContextState;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const result = await runAssistantTurn(messages, appContext);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('Assistant API Route error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Assistant encountered an error' },
      { status: 500 }
    );
  }
}

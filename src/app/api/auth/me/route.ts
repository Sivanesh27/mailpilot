import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    if (session.userId === 'demo-user-id') {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: 'demo-user-id',
          email: 'alex.rivera@mailpilot.dev',
          name: 'Alex Rivera',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces',
          isDemo: true,
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        syncState: {
          select: {
            syncStatus: true,
            lastSyncAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        ...user,
        isDemo: false,
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false, error: 'Failed to retrieve session' }, { status: 500 });
  }
}

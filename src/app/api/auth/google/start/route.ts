import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAuthUrl } from '@/lib/auth/google';
import { setSessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const isDemoParam = req.nextUrl.searchParams.get('demo') === 'true';

    // If demo requested or credentials not set, provide immediate demo login
    if (isDemoParam || (!process.env.GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_DEMO_MODE === 'true')) {
      await setSessionCookie({
        userId: 'demo-user-id',
        email: 'alex.rivera@mailpilot.dev',
        googleSubject: 'demo-subject-123',
      });
      return NextResponse.redirect(new URL('/mail', req.nextUrl));
    }

    const authUrl = await createGoogleAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth Start Error:', error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent((error as Error).message)}`, req.nextUrl)
    );
  }
}

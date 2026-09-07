import { NextRequest, NextResponse } from 'next/server';
import { generateGoogleAuthParams } from '@/lib/auth/google';
import { attachSessionCookie, attachOAuthCookies } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

function getRequestOrigin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
  if (host) {
    return `${proto}://${host}`;
  }
  return req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function GET(req: NextRequest) {
  try {
    const origin = getRequestOrigin(req);
    const isDemoParam = req.nextUrl.searchParams.get('demo') === 'true';

    // If demo requested or credentials not set, provide immediate demo login
    if (isDemoParam || (!process.env.GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_DEMO_MODE === 'true')) {
      const res = NextResponse.redirect(new URL('/mail', req.nextUrl));
      attachSessionCookie(res, {
        userId: 'demo-user-id',
        email: 'alex.rivera@mailpilot.dev',
        googleSubject: 'demo-subject-123',
      });
      return res;
    }

    const { authUrl, state, verifier } = generateGoogleAuthParams(origin);
    const res = NextResponse.redirect(authUrl);

    // Directly attach state and PKCE verifier cookies to the 302/307 redirect response
    attachOAuthCookies(res, state, verifier);

    return res;
  } catch (error) {
    console.error('OAuth Start Error:', error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent((error as Error).message)}`, req.nextUrl)
    );
  }
}

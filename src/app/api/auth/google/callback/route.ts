import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokensWithVerifier } from '@/lib/auth/google';
import { prisma } from '@/lib/db/prisma';
import { encryptToken } from '@/lib/security/crypto';
import {
  attachSessionCookie,
  clearOAuthCookiesOnResponse,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_VERIFIER_COOKIE_NAME,
  getAndClearOAuthCookies,
} from '@/lib/auth/session';

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
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(`Google returned error: ${error}`)}`, req.nextUrl)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/login?error=Missing+authorization+code+or+state', req.nextUrl)
    );
  }

  // Retrieve state and PKCE verifier from request cookies with fallback to cookieStore
  const cookieState = req.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;
  const cookieVerifier = req.cookies.get(OAUTH_VERIFIER_COOKIE_NAME)?.value;

  let savedState = cookieState;
  let verifier = cookieVerifier;

  if (!savedState || !verifier) {
    const fromStore = await getAndClearOAuthCookies();
    savedState = savedState || fromStore.state || undefined;
    verifier = verifier || fromStore.verifier || undefined;
  }

  if (!savedState || savedState !== state) {
    console.error('OAuth State Mismatch: savedState=', savedState, 'returnedState=', state);
    return NextResponse.redirect(
      new URL('/login?error=Invalid+or+expired+OAuth+state+parameter+(CSRF+protection)', req.nextUrl)
    );
  }

  if (!verifier) {
    return NextResponse.redirect(
      new URL('/login?error=Missing+PKCE+code+verifier+in+session', req.nextUrl)
    );
  }

  try {
    const origin = getRequestOrigin(req);
    const { tokens, profile } = await exchangeCodeForTokensWithVerifier(code, verifier, origin);

    if (!tokens.refresh_token) {
      console.warn('Warning: Google did not return a refresh token. Existing account may retain previous refresh token.');
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Upsert User
    const user = await prisma.user.upsert({
      where: { googleSubject: profile.sub },
      update: {
        email: profile.email,
        name: profile.name || null,
        avatarUrl: profile.picture || null,
      },
      create: {
        googleSubject: profile.sub,
        email: profile.email,
        name: profile.name || null,
        avatarUrl: profile.picture || null,
      },
    });

    // Check existing OAuth account to preserve refresh token if missing from response
    const existingAccount = await prisma.oAuthAccount.findFirst({
      where: { userId: user.id, provider: 'google' },
    });

    const refreshTokenEncrypted = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : existingAccount?.refreshTokenEncrypted || encryptToken('missing_refresh_token');

    await prisma.oAuthAccount.upsert({
      where: { id: existingAccount?.id || 'non-existent' },
      update: {
        accessTokenEncrypted: encryptToken(tokens.access_token),
        refreshTokenEncrypted,
        accessTokenExpiresAt: expiresAt,
        scope: tokens.scope,
      },
      create: {
        userId: user.id,
        provider: 'google',
        accessTokenEncrypted: encryptToken(tokens.access_token),
        refreshTokenEncrypted,
        accessTokenExpiresAt: expiresAt,
        scope: tokens.scope,
      },
    });

    // Initialize or reset MailSyncState
    await prisma.mailSyncState.upsert({
      where: { userId: user.id },
      update: {
        syncStatus: 'ACTIVE',
        errorMessage: null,
      },
      create: {
        userId: user.id,
        syncStatus: 'ACTIVE',
      },
    });

    // Create redirect response directly to /mail
    const res = NextResponse.redirect(new URL('/mail', req.nextUrl));

    // Explicitly attach signed session cookie to response headers
    attachSessionCookie(res, {
      userId: user.id,
      email: user.email,
      googleSubject: user.googleSubject,
    });

    // Explicitly clear temporary OAuth cookies
    clearOAuthCookiesOnResponse(res);

    return res;
  } catch (err: unknown) {
    console.error('OAuth Callback Error:', err);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent((err as Error).message)}`, req.nextUrl)
    );
  }
}

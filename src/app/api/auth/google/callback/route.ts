import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/auth/google';
import { prisma } from '@/lib/db/prisma';
import { encryptToken } from '@/lib/security/crypto';
import { setSessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

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

  try {
    const { tokens, profile } = await exchangeCodeForTokens(code, state);

    if (!tokens.refresh_token) {
      // If user has already consented before, Google may not send refresh_token unless prompt=consent was used
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

    // Set signed HTTP-only session cookie
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      googleSubject: user.googleSubject,
    });

    return NextResponse.redirect(new URL('/mail', req.nextUrl));
  } catch (err: unknown) {
    console.error('OAuth Callback Error:', err);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent((err as Error).message)}`, req.nextUrl)
    );
  }
}

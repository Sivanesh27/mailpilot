import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { SessionUser } from '@/types/auth';

export const SESSION_COOKIE_NAME = 'mailpilot_session';
export const OAUTH_STATE_COOKIE_NAME = 'mailpilot_oauth_state';
export const OAUTH_VERIFIER_COOKIE_NAME = 'mailpilot_code_verifier';

function isSecureContext(): boolean {
  return process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_APP_URL?.startsWith('http://localhost');
}

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || 'mailpilot-fallback-secret-key-min-32-chars-for-dev';
}

/**
 * Creates a signed session token: base64(payload).signature
 */
export function signSessionToken(payload: { userId: string; email: string; googleSubject?: string }): string {
  const secret = getSessionSecret();
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifies and decodes a signed session token.
 */
export function verifySessionToken(token: string): { userId: string; email: string; googleSubject?: string } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  const secret = getSessionSecret();
  const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Explicitly attaches the signed session cookie to a NextResponse (guaranteed delivery in serverless).
 */
export function attachSessionCookie(
  response: NextResponse,
  payload: { userId: string; email: string; googleSubject?: string }
) {
  const token = signSessionToken(payload);
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Clears the session cookie on a NextResponse object.
 */
export function clearSessionCookieOnResponse(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Explicitly attaches OAuth state & verifier cookies to a NextResponse (guaranteed delivery across redirects).
 */
export function attachOAuthCookies(response: NextResponse, state: string, verifier: string) {
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });
  response.cookies.set(OAUTH_VERIFIER_COOKIE_NAME, verifier, {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });
}

/**
 * Explicitly clears OAuth state & verifier cookies on a NextResponse.
 */
export function clearOAuthCookiesOnResponse(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(OAUTH_VERIFIER_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Sets the session cookie on the async cookies() context.
 */
export async function setSessionCookie(payload: { userId: string; email: string; googleSubject?: string }) {
  const token = signSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Retrieves the current session user from the request cookies.
 */
export async function getSession(): Promise<{ userId: string; email: string; googleSubject?: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Clears the session cookie on logout.
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Sets OAuth temporary state and PKCE verifier cookies.
 */
export async function setOAuthCookies(state: string, verifier: string) {
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });
  cookieStore.set(OAUTH_VERIFIER_COOKIE_NAME, verifier, {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });
}

/**
 * Retrieves and clears OAuth temporary cookies for verification.
 */
export async function getAndClearOAuthCookies(): Promise<{ state: string | null; verifier: string | null }> {
  const cookieStore = await cookies();
  const state = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value || null;
  const verifier = cookieStore.get(OAUTH_VERIFIER_COOKIE_NAME)?.value || null;

  cookieStore.set(OAUTH_STATE_COOKIE_NAME, '', { path: '/', maxAge: 0 });
  cookieStore.set(OAUTH_VERIFIER_COOKIE_NAME, '', { path: '/', maxAge: 0 });

  return { state, verifier };
}

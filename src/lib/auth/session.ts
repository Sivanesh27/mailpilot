import { cookies } from 'next/headers';
import crypto from 'crypto';
import { SessionUser } from '@/types/auth';

const SESSION_COOKIE_NAME = 'mailpilot_session';
const OAUTH_STATE_COOKIE_NAME = 'mailpilot_oauth_state';
const OAUTH_VERIFIER_COOKIE_NAME = 'mailpilot_code_verifier';

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
 * Sets the session cookie on the response.
 */
export async function setSessionCookie(payload: { userId: string; email: string; googleSubject?: string }) {
  const token = signSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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
    secure: process.env.NODE_ENV === 'production',
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
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });
  cookieStore.set(OAUTH_VERIFIER_COOKIE_NAME, verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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

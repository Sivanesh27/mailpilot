import { generateCodeVerifier, generateCodeChallenge, generateStateToken } from '@/lib/security/crypto';
import { setOAuthCookies, getAndClearOAuthCookies } from './session';
import { GoogleTokenResponse, GoogleUserProfile } from '@/types/auth';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.modify',
];

export function getRedirectUri(origin?: string): string {
  const base = origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/api/auth/google/callback`;
}

/**
 * Generates OAuth state, PKCE verifier/challenge, and authorization URL.
 * Does not mutate cookies directly; caller can attach cookies to its response.
 */
export function generateGoogleAuthParams(origin?: string): { authUrl: string; state: string; verifier: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is missing');
  }

  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = generateStateToken();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(origin),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent', // Ensure refresh_token is returned
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });

  return {
    authUrl: `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`,
    state,
    verifier,
  };
}

/**
 * Generates the Google OAuth authorization URL and sets cookies on the async store.
 */
export async function createGoogleAuthUrl(origin?: string): Promise<string> {
  const { authUrl, state, verifier } = generateGoogleAuthParams(origin);
  await setOAuthCookies(state, verifier);
  return authUrl;
}

/**
 * Exchanges the authorization code for tokens with an explicit PKCE code verifier and origin.
 */
export async function exchangeCodeForTokensWithVerifier(
  code: string,
  verifier: string,
  origin?: string
): Promise<{ tokens: GoogleTokenResponse; profile: GoogleUserProfile }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth client credentials are not configured');
  }

  const tokenParams = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getRedirectUri(origin),
    grant_type: 'authorization_code',
    code_verifier: verifier,
  });

  const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to exchange authorization code: ${tokenRes.status} ${errText}`);
  }

  const tokens: GoogleTokenResponse = await tokenRes.json();

  // Fetch user profile with access token
  const profileRes = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileRes.ok) {
    const errText = await profileRes.text();
    throw new Error(`Failed to fetch Google user profile: ${profileRes.status} ${errText}`);
  }

  const profile: GoogleUserProfile = await profileRes.json();

  return { tokens, profile };
}

/**
 * Exchanges the authorization code for access and refresh tokens using cookie store.
 */
export async function exchangeCodeForTokens(
  code: string,
  returnedState: string,
  origin?: string
): Promise<{ tokens: GoogleTokenResponse; profile: GoogleUserProfile }> {
  const { state: savedState, verifier } = await getAndClearOAuthCookies();

  if (!savedState || savedState !== returnedState) {
    throw new Error('Invalid or expired OAuth state parameter (CSRF protection)');
  }

  if (!verifier) {
    throw new Error('Missing PKCE code verifier in session');
  }

  return exchangeCodeForTokensWithVerifier(code, verifier, origin);
}

/**
 * Refreshes an expired Google access token using the stored refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to refresh Google access token: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
  };
}

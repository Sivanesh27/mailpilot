import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!keyHex) {
    // In dev / demo fallback, return a deterministic 32-byte key if unset
    return crypto.createHash('sha256').update('mailpilot-default-dev-secret-key-32b').digest();
  }
  // If hex string of 64 chars (32 bytes)
  if (keyHex.length === 64) {
    return Buffer.from(keyHex, 'hex');
  }
  // Otherwise derive 32-byte key with SHA-256
  return crypto.createHash('sha256').update(keyHex).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: "iv:authTag:ciphertext" (hex encoded)
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a ciphertext string produced by encryptToken.
 */
export function decryptToken(encryptedString: string): string {
  if (!encryptedString) return '';
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const [ivHex, authTagHex, cipherHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates a high-entropy PKCE code verifier (URL-safe string).
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(48).toString('base64url');
}

/**
 * Derives the PKCE code challenge from a code verifier using SHA-256 base64url.
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Generates a cryptographically random state string for OAuth CSRF protection.
 */
export function generateStateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

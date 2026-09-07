import { describe, it, expect } from 'vitest';
import {
  encryptToken,
  decryptToken,
  generateCodeVerifier,
  generateCodeChallenge,
  generateStateToken,
} from '@/lib/security/crypto';

describe('Security / Crypto Utilities', () => {
  it('should encrypt and decrypt tokens using AES-256-GCM', () => {
    const rawToken = 'ya29.a0AfH6SMD_real_or_simulated_gmail_token_123456789';
    const encrypted = encryptToken(rawToken);

    expect(encrypted).not.toBe(rawToken);
    expect(encrypted).toContain(':');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3); // iv, authTag, ciphertext

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it('should throw an error on malformed ciphertext', () => {
    expect(() => decryptToken('invalid-token-string')).toThrow();
  });

  it('should generate valid PKCE code_verifier and code_challenge', () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toBeDefined();
    expect(verifier.length).toBeGreaterThanOrEqual(43);

    const challenge = generateCodeChallenge(verifier);
    expect(challenge).toBeDefined();
    expect(challenge).not.toBe(verifier);
  });

  it('should generate high-entropy state tokens', () => {
    const state1 = generateStateToken();
    const state2 = generateStateToken();
    expect(state1).toHaveLength(64);
    expect(state2).toHaveLength(64);
    expect(state1).not.toBe(state2);
  });
});

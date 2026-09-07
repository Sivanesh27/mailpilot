import { describe, it, expect } from 'vitest';
import {
  buildMimeMessage,
  encodeMimeHeader,
  encodeRawMime,
} from '@/lib/gmail/send';

describe('Gmail Send / MIME Builder', () => {
  it('should build a valid RFC 2822 MIME message', () => {
    const mime = buildMimeMessage({
      fromEmail: 'sender@example.com',
      fromName: 'Alex Rivera',
      draft: {
        to: ['john@example.com'],
        cc: ['sarah@example.com'],
        subject: 'Project MailPilot Launch',
        body: 'Hello John,\n\nReady for launch today!',
      },
    });

    expect(mime).toContain('From: Alex Rivera <sender@example.com>');
    expect(mime).toContain('To: john@example.com');
    expect(mime).toContain('Cc: sarah@example.com');
    expect(mime).toContain('Subject: Project MailPilot Launch');
    expect(mime).toContain('MIME-Version: 1.0');
    expect(mime).toContain('Content-Type: text/html; charset=UTF-8');
    expect(mime).toContain('Content-Transfer-Encoding: base64');
  });

  it('should encode non-ASCII headers with RFC 2047', () => {
    const header = encodeMimeHeader('Meeting Tomorrow ✨');
    expect(header).toContain('=?UTF-8?B?');
  });

  it('should require at least one recipient', () => {
    expect(() =>
      buildMimeMessage({
        fromEmail: 'sender@example.com',
        draft: {
          to: [],
          subject: 'No Recipient',
          body: 'Test',
        },
      })
    ).toThrow('Email must have at least one recipient');
  });

  it('should correctly base64url encode MIME messages without padding', () => {
    const sample = 'From: test@example.com\r\nTo: dest@example.com\r\n';
    const encoded = encodeRawMime(sample);

    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });

  it('should include In-Reply-To and References headers for replies', () => {
    const mime = buildMimeMessage({
      fromEmail: 'sender@example.com',
      draft: {
        to: ['john@example.com'],
        subject: 'Re: Previous Discussion',
        body: 'Thanks for the update!',
        inReplyTo: 'msg-prev-12345',
      },
    });

    expect(mime).toContain('In-Reply-To: <msg-prev-12345>');
    expect(mime).toContain('References: <msg-prev-12345>');
  });
});

import crypto from 'crypto';
import { AuthenticatedGmailClient } from './client';
import { ComposeDraft, EmailMessage } from '@/types/mail';
import { DEMO_MESSAGES } from './messages';

export interface SendEmailOptions {
  fromEmail: string;
  fromName?: string;
  draft: ComposeDraft;
}

/**
 * Encodes a string into RFC 2047 MIME encoded-word syntax if it contains non-ASCII characters.
 */
export function encodeMimeHeader(text: string): string {
  if (!text) return '';
  // Check if non-ASCII
  if (/^[\x20-\x7E]*$/.test(text)) {
    return text;
  }
  const base64 = Buffer.from(text, 'utf8').toString('base64');
  return `=?UTF-8?B?${base64}?=`;
}

/**
 * Builds a compliant RFC 2822 MIME message string.
 */
export function buildMimeMessage(options: SendEmailOptions): string {
  const { fromEmail, fromName, draft } = options;

  const lines: string[] = [];

  // From
  const formattedFrom = fromName
    ? `${encodeMimeHeader(fromName)} <${fromEmail}>`
    : fromEmail;
  lines.push(`From: ${formattedFrom}`);

  // To
  if (draft.to && draft.to.length > 0) {
    lines.push(`To: ${draft.to.join(', ')}`);
  } else {
    throw new Error('Email must have at least one recipient in "To"');
  }

  // Cc
  if (draft.cc && draft.cc.length > 0) {
    lines.push(`Cc: ${draft.cc.join(', ')}`);
  }

  // Bcc
  if (draft.bcc && draft.bcc.length > 0) {
    lines.push(`Bcc: ${draft.bcc.join(', ')}`);
  }

  // Subject
  const subject = draft.subject || '(No Subject)';
  lines.push(`Subject: ${encodeMimeHeader(subject)}`);

  // Date
  lines.push(`Date: ${new Date().toUTCString()}`);

  // Message-ID
  const messageId = `<${Date.now()}.${crypto.randomBytes(8).toString('hex')}@mailpilot.dev>`;
  lines.push(`Message-ID: ${messageId}`);

  // Threading headers
  if (draft.inReplyTo) {
    lines.push(`In-Reply-To: <${draft.inReplyTo}>`);
    lines.push(`References: <${draft.inReplyTo}>`);
  }

  // MIME Headers
  lines.push('MIME-Version: 1.0');
  lines.push('Content-Type: text/html; charset=UTF-8');
  lines.push('Content-Transfer-Encoding: base64');
  lines.push(''); // Blank line separates headers from body

  // Convert plain text body to HTML if not already formatted
  let htmlBody = draft.body || '';
  if (!htmlBody.includes('<p>') && !htmlBody.includes('<div>') && !htmlBody.includes('<br')) {
    htmlBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">
${htmlBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}
</div>`;
  }

  // Base64 encode the body
  const bodyBase64 = Buffer.from(htmlBody, 'utf8').toString('base64');
  lines.push(bodyBase64);

  return lines.join('\r\n');
}

/**
 * Base64url encodes an RFC 2822 MIME message for the Gmail API.
 */
export function encodeRawMime(mimeMessage: string): string {
  return Buffer.from(mimeMessage, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Dispatches an email via the Gmail API users.messages.send endpoint.
 */
export async function sendGmailMessage(
  client: AuthenticatedGmailClient,
  options: SendEmailOptions
): Promise<{ id: string; threadId: string }> {
  // Demo Mode fallback: record message into DEMO_MESSAGES
  if (client.userId === 'demo-user-id' || (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && !process.env.GOOGLE_CLIENT_ID)) {
    const newId = `msg-sent-${Date.now()}`;
    const newThreadId = options.draft.threadId || `th-sent-${Date.now()}`;
    const newMsg: EmailMessage = {
      id: newId,
      threadId: newThreadId,
      from: { name: options.fromName || 'You', email: options.fromEmail },
      to: options.draft.to.map((e) => ({ email: e })),
      cc: options.draft.cc?.map((e) => ({ email: e })),
      bcc: options.draft.bcc?.map((e) => ({ email: e })),
      subject: options.draft.subject || '(No Subject)',
      snippet: options.draft.body.slice(0, 100),
      bodyText: options.draft.body,
      bodyHtml: `<div>${options.draft.body.replace(/\n/g, '<br/>')}</div>`,
      date: new Date().toISOString(),
      isRead: true,
      isStarred: false,
      labelIds: ['SENT'],
    };
    DEMO_MESSAGES.unshift(newMsg);
    return { id: newId, threadId: newThreadId };
  }

  const mime = buildMimeMessage(options);
  const raw = encodeRawMime(mime);

  const payload: { raw: string; threadId?: string } = { raw };
  if (options.draft.threadId) {
    payload.threadId = options.draft.threadId;
  }

  const res = await client.fetchGmail('/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail API messages.send failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return { id: data.id, threadId: data.threadId };
}

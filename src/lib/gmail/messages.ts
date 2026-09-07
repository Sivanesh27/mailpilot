import { EmailMessage, EmailAddress, MailFolder, MailFilter } from '@/types/mail';
import { AuthenticatedGmailClient } from './client';

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailPart {
  partId: string;
  mimeType: string;
  filename: string;
  headers: GmailHeader[];
  body: {
    attachmentId?: string;
    size: number;
    data?: string;
  };
  parts?: GmailPart[];
}

export interface GmailRawMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    partId: string;
    mimeType: string;
    filename: string;
    headers: GmailHeader[];
    body: {
      size: number;
      data?: string;
    };
    parts?: GmailPart[];
  };
}

/**
 * Decodes base64url string to utf-8 text.
 */
function decodeBase64Url(data?: string): string {
  if (!data) return '';
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Parses "Name <email@example.com>" or "email@example.com" into EmailAddress.
 */
export function parseEmailAddress(raw?: string): EmailAddress {
  if (!raw) return { email: '' };
  const match = raw.match(/^(?:["']?([^"']*)["']?\s*)?<([^>]+)>$/);
  if (match) {
    return {
      name: match[1]?.trim() || undefined,
      email: match[2]?.trim().toLowerCase(),
    };
  }
  return { email: raw.trim().toLowerCase() };
}

/**
 * Parses a comma-separated list of email headers into EmailAddress[].
 */
export function parseEmailAddressList(raw?: string): EmailAddress[] {
  if (!raw) return [];
  // Basic split on comma not inside quotes
  const parts = raw.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
  return parts.map((p) => parseEmailAddress(p.trim())).filter((a) => a.email);
}

/**
 * Recursively extracts plain text and HTML bodies from Gmail message parts.
 */
function extractBodyParts(payload: GmailRawMessage['payload']): { text: string; html: string } {
  let text = '';
  let html = '';

  const traverse = (part: GmailPart | GmailRawMessage['payload']) => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text += decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      html += decodeBase64Url(part.body.data);
    }

    if (part.parts && Array.isArray(part.parts)) {
      for (const child of part.parts) {
        traverse(child);
      }
    }
  };

  traverse(payload);

  if (!html && text) {
    // Simple line-break conversion if no HTML provided
    html = `<div>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</div>`;
  }

  return { text, html };
}

/**
 * Converts a raw Gmail API message to our normalized EmailMessage format.
 */
export function formatGmailMessage(raw: GmailRawMessage): EmailMessage {
  const headers = raw.payload?.headers || [];
  const headerMap = new Map<string, string>();
  for (const h of headers) {
    headerMap.set(h.name.toLowerCase(), h.value);
  }

  const fromRaw = headerMap.get('from') || '';
  const toRaw = headerMap.get('to') || '';
  const ccRaw = headerMap.get('cc');
  const bccRaw = headerMap.get('bcc');
  const subject = headerMap.get('subject') || '(No Subject)';
  const dateRaw = headerMap.get('date');

  let dateIso = new Date().toISOString();
  if (dateRaw) {
    const parsed = new Date(dateRaw);
    if (!isNaN(parsed.getTime())) {
      dateIso = parsed.toISOString();
    }
  } else if (raw.internalDate) {
    const parsed = new Date(parseInt(raw.internalDate, 10));
    if (!isNaN(parsed.getTime())) {
      dateIso = parsed.toISOString();
    }
  }

  const { text, html } = extractBodyParts(raw.payload);
  const labelIds = raw.labelIds || [];
  const isRead = !labelIds.includes('UNREAD');
  const isStarred = labelIds.includes('STARRED');

  return {
    id: raw.id,
    threadId: raw.threadId,
    from: parseEmailAddress(fromRaw),
    to: parseEmailAddressList(toRaw),
    cc: ccRaw ? parseEmailAddressList(ccRaw) : undefined,
    bcc: bccRaw ? parseEmailAddressList(bccRaw) : undefined,
    subject,
    snippet: raw.snippet || '',
    bodyText: text,
    bodyHtml: html,
    date: dateIso,
    isRead,
    isStarred,
    labelIds,
  };
}

/**
 * Fetches message list from Gmail API with optional folder/query filtering.
 */
export async function listGmailMessages(
  client: AuthenticatedGmailClient,
  options: {
    folder?: MailFolder;
    query?: string;
    maxResults?: number;
    pageToken?: string;
  } = {}
): Promise<{ messages: EmailMessage[]; nextPageToken?: string }> {
  // If in demo mode, return realistic seeded messages
  if (client.userId === 'demo-user-id' || (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && !process.env.GOOGLE_CLIENT_ID)) {
    return getDemoMessages(options.folder || 'inbox', options.query);
  }

  const params = new URLSearchParams();
  const max = Math.min(options.maxResults || 25, 50);
  params.set('maxResults', max.toString());

  if (options.pageToken) {
    params.set('pageToken', options.pageToken);
  }

  // Set folder label or build query
  if (options.folder === 'inbox') {
    params.set('labelIds', 'INBOX');
  } else if (options.folder === 'sent') {
    params.set('labelIds', 'SENT');
  } else if (options.folder === 'starred') {
    params.set('labelIds', 'STARRED');
  } else if (options.folder === 'drafts') {
    params.set('labelIds', 'DRAFT');
  } else if (options.folder === 'trash') {
    params.set('labelIds', 'TRASH');
  }

  if (options.query) {
    params.set('q', options.query);
  }

  const res = await client.fetchGmail(`/messages?${params.toString()}`);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail API messages.list failed: ${res.status} ${errText}`);
  }

  const listData: { messages?: Array<{ id: string; threadId: string }>; nextPageToken?: string } = await res.json();
  if (!listData.messages || listData.messages.length === 0) {
    return { messages: [], nextPageToken: undefined };
  }

  // Fetch full details concurrently (up to 25 items)
  const detailPromises = listData.messages.slice(0, max).map(async (item) => {
    try {
      const msgRes = await client.fetchGmail(
        `/messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Cc&metadataHeaders=Bcc`
      );
      if (!msgRes.ok) return null;
      const raw: GmailRawMessage = await msgRes.json();
      return formatGmailMessage(raw);
    } catch {
      return null;
    }
  });

  const resolved = await Promise.all(detailPromises);
  const validMessages = resolved.filter((m): m is EmailMessage => m !== null);

  return {
    messages: validMessages,
    nextPageToken: listData.nextPageToken,
  };
}

/**
 * Fetches a single message by ID.
 */
export async function getGmailMessage(
  client: AuthenticatedGmailClient,
  messageId: string
): Promise<EmailMessage | null> {
  if (client.userId === 'demo-user-id' || (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && !process.env.GOOGLE_CLIENT_ID)) {
    const demo = DEMO_MESSAGES.find((m) => m.id === messageId);
    return demo || null;
  }

  const res = await client.fetchGmail(`/messages/${messageId}?format=full`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch message ${messageId}: ${res.status}`);
  }

  const raw: GmailRawMessage = await res.json();
  return formatGmailMessage(raw);
}

// -------------------------------------------------------------
// Seeded Demo Messages for Sandbox and Offline Verification
// -------------------------------------------------------------
const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000).toISOString();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400 * 1000).toISOString();

export const DEMO_MESSAGES: EmailMessage[] = [
  {
    id: 'msg-david-1',
    threadId: 'th-david-1',
    from: { name: 'David Miller', email: 'david.miller@acme.corp' },
    to: [{ name: 'You', email: 'me@mailpilot.dev' }],
    subject: 'Q3 Product Roadmap Review & AI Copilot Integration',
    snippet: 'Hi team, I reviewed the latest specs for our MailPilot assistant and have three quick questions before tomorrow...',
    bodyText: `Hi team,

I reviewed the latest specs for our MailPilot assistant and have three quick questions before tomorrow's executive review:

1. How do we ensure that user actions initiated by voice or text commands are strictly confirmed before mail dispatch?
2. Are we leveraging Gmail history polling or pushing via Pub/Sub?
3. Could you verify whether the animated compose typing effect supports multi-paragraph replies?

Let's align on this at 10 AM.

Best regards,
David Miller
VP of Product, Acme Corp`,
    bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
<p>Hi team,</p>
<p>I reviewed the latest specs for our <strong>MailPilot assistant</strong> and have three quick questions before tomorrow's executive review:</p>
<ol>
  <li>How do we ensure that user actions initiated by voice or text commands are strictly confirmed before mail dispatch?</li>
  <li>Are we leveraging Gmail history polling or pushing via Pub/Sub?</li>
  <li>Could you verify whether the animated compose typing effect supports multi-paragraph replies?</li>
</ol>
<p>Let's align on this at 10 AM.</p>
<p>Best regards,<br/><strong>David Miller</strong><br/><span style="color:#64748b;">VP of Product, Acme Corp</span></p>
</div>`,
    date: hoursAgo(2),
    isRead: false,
    isStarred: true,
    labelIds: ['INBOX', 'UNREAD', 'STARRED'],
  },
  {
    id: 'msg-sarah-2',
    threadId: 'th-sarah-2',
    from: { name: 'Sarah Chen', email: 'sarah.chen@techventures.io' },
    to: [{ name: 'You', email: 'me@mailpilot.dev' }],
    subject: 'Contract signature required: AI Mail Pilot deployment',
    snippet: 'Attached is the revised agreement with Neon and Vercel hosting provisions. Please take a look and sign when ready...',
    bodyText: `Hi,

Attached is the revised agreement with Neon and Vercel hosting provisions.
Please take a look and sign when ready so we can finalize the production pipeline.

Thanks!
Sarah Chen`,
    bodyHtml: `<p>Hi,</p><p>Attached is the revised agreement with Neon and Vercel hosting provisions.<br/>Please take a look and sign when ready so we can finalize the production pipeline.</p><p>Thanks!<br/>Sarah Chen</p>`,
    date: hoursAgo(5),
    isRead: false,
    isStarred: false,
    labelIds: ['INBOX', 'UNREAD'],
  },
  {
    id: 'msg-john-3',
    threadId: 'th-john-3',
    from: { name: 'John Doe', email: 'john@example.com' },
    to: [{ name: 'You', email: 'me@mailpilot.dev' }],
    subject: 'Catch up on engineering sync',
    snippet: 'Hey! Are we still on for the 3pm sync tomorrow? Let me know if that time still works on your end...',
    bodyText: `Hey! Are we still on for the 3pm sync tomorrow? Let me know if that time still works on your end.`,
    bodyHtml: `<p>Hey! Are we still on for the 3pm sync tomorrow? Let me know if that time still works on your end.</p>`,
    date: daysAgo(1),
    isRead: true,
    isStarred: false,
    labelIds: ['INBOX'],
  },
  {
    id: 'msg-github-4',
    threadId: 'th-github-4',
    from: { name: 'GitHub Notifications', email: 'notifications@github.com' },
    to: [{ name: 'You', email: 'me@mailpilot.dev' }],
    subject: '[mailpilot/core] Pull Request #42: Implement AES-256-GCM token encryption',
    snippet: 'All checks have passed. 4 files changed, +320 -15 lines. Ready for merge review...',
    bodyText: `All checks have passed for PR #42: Implement AES-256-GCM token encryption. 4 files changed, +320 -15 lines. Ready for merge review.`,
    bodyHtml: `<div style="font-family: monospace;"><p><strong>PR #42: Implement AES-256-GCM token encryption</strong></p><p style="color: green;">✔ All automated tests passed (4/4)</p><p>Ready for merge review.</p></div>`,
    date: daysAgo(2),
    isRead: true,
    isStarred: false,
    labelIds: ['INBOX'],
  },
  {
    id: 'msg-sent-1',
    threadId: 'th-sent-1',
    from: { name: 'You', email: 'me@mailpilot.dev' },
    to: [{ name: 'David Miller', email: 'david.miller@acme.corp' }],
    subject: 'Re: MailPilot Architecture Overview',
    snippet: 'Hi David, Here is the breakdown of the free-tier cloud architecture with Neon Postgres and Google Gemini...',
    bodyText: `Hi David, Here is the breakdown of the free-tier cloud architecture with Neon Postgres and Google Gemini.`,
    bodyHtml: `<p>Hi David,</p><p>Here is the breakdown of the free-tier cloud architecture with Neon Postgres and Google Gemini.</p>`,
    date: daysAgo(3),
    isRead: true,
    isStarred: false,
    labelIds: ['SENT'],
  },
];

function getDemoMessages(folder: MailFolder, query?: string) {
  let filtered = DEMO_MESSAGES.filter((m) => {
    if (folder === 'inbox') return m.labelIds.includes('INBOX');
    if (folder === 'sent') return m.labelIds.includes('SENT');
    if (folder === 'starred') return m.isStarred;
    if (folder === 'drafts') return m.labelIds.includes('DRAFT');
    return true;
  });

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.subject.toLowerCase().includes(q) ||
        m.snippet.toLowerCase().includes(q) ||
        m.from.name?.toLowerCase().includes(q) ||
        m.from.email.toLowerCase().includes(q)
    );
  }

  return { messages: filtered };
}

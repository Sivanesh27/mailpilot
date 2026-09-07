export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  snippet: string;
  bodyText: string;
  bodyHtml: string;
  date: string; // ISO 8601 string
  isRead: boolean;
  isStarred: boolean;
  labelIds: string[];
  hasAttachments?: boolean;
  attachments?: EmailAttachment[];
}

export type MailFolder = 'inbox' | 'sent' | 'starred' | 'drafts' | 'trash' | 'archive';

export interface MailFilter {
  keyword?: string | null;
  sender?: string | null;
  recipient?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  unread?: boolean | null;
}

export interface ComposeDraft {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  inReplyTo?: string;
  threadId?: string;
}

export type SyncStatusState = 'ACTIVE' | 'SYNCING' | 'ERROR' | 'REAUTH_REQUIRED';

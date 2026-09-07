import { EmailMessage } from '@/types/mail';

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/gi,
  /disregard\s+(all\s+)?(previous|prior)\s+instructions/gi,
  /you\s+are\s+now\s+(in\s+developer\s+mode|dan|unrestricted)/gi,
  /system\s+prompt\s+override/gi,
  /new\s+system\s+instruction/gi,
  /send\s+all\s+(my\s+)?emails\s+to/gi,
  /delete\s+all\s+emails/gi,
];

/**
 * Sanitizes untrusted user or email text to neutralize prompt-injection attempts.
 */
export function sanitizeUntrustedContent(text: string, maxLength = 2000): string {
  if (!text) return '';

  let sanitized = text;

  // Defuse known prompt-injection attempt patterns
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[BLOCKED_PROMPT_INJECTION_ATTEMPT]');
  }

  // Escape backticks and format tokens that could interfere with prompt framing
  sanitized = sanitized.replace(/```/g, "'''");

  // Truncate to reasonable context boundary
  if (sanitized.length > maxLength) {
    sanitized = `${sanitized.slice(0, maxLength)}... [truncated]`;
  }

  return sanitized.trim();
}

/**
 * Sanitizes an entire email message object before passing it to the AI assistant context.
 */
export function sanitizeMessageForContext(msg: EmailMessage): Record<string, unknown> {
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: msg.from.name ? `${msg.from.name} <${msg.from.email}>` : msg.from.email,
    to: msg.to.map((t) => (t.name ? `${t.name} <${t.email}>` : t.email)).join(', '),
    subject: sanitizeUntrustedContent(msg.subject, 200),
    date: msg.date,
    snippet: sanitizeUntrustedContent(msg.snippet, 300),
    bodyText: sanitizeUntrustedContent(msg.bodyText, 1500),
  };
}

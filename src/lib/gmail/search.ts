import { MailFilter } from '@/types/mail';

/**
 * Sanitizes a search string to prevent query syntax breakout or malformed characters.
 */
function sanitizeSearchTerm(term: string): string {
  // Strip characters that break Gmail search syntax if unquoted
  return term.replace(/[\\{}\[\]^~*?]/g, ' ').trim();
}

/**
 * Converts a Date object or ISO string into Gmail query date format (YYYY/MM/DD).
 */
function formatGmailDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
}

/**
 * Compiles a structured MailFilter object into a safe, validated Gmail search query string.
 */
export function compileFilterToGmailQuery(filters: MailFilter, baseQuery?: string): string {
  const parts: string[] = [];

  if (baseQuery && baseQuery.trim()) {
    const cleanBase = sanitizeSearchTerm(baseQuery.trim());
    if (cleanBase) parts.push(cleanBase);
  }

  // Sender filter: from:(term)
  if (filters.sender && filters.sender.trim()) {
    const clean = sanitizeSearchTerm(filters.sender.trim());
    if (clean) {
      parts.push(`from:(${clean})`);
    }
  }

  // Recipient filter: to:(term)
  if (filters.recipient && filters.recipient.trim()) {
    const clean = sanitizeSearchTerm(filters.recipient.trim());
    if (clean) {
      parts.push(`to:(${clean})`);
    }
  }

  // Unread status: is:unread
  if (filters.unread === true) {
    parts.push('is:unread');
  }

  // Date range: after:YYYY/MM/DD, before:YYYY/MM/DD
  if (filters.dateFrom) {
    const formatted = formatGmailDate(filters.dateFrom);
    if (formatted) {
      parts.push(`after:${formatted}`);
    }
  }

  if (filters.dateTo) {
    const formatted = formatGmailDate(filters.dateTo);
    if (formatted) {
      parts.push(`before:${formatted}`);
    }
  }

  // Keyword / General query
  if (filters.keyword && filters.keyword.trim()) {
    const cleanKeyword = sanitizeSearchTerm(filters.keyword.trim());
    if (cleanKeyword) {
      // If contains whitespace, group in quotes
      if (cleanKeyword.includes(' ')) {
        parts.push(`"${cleanKeyword}"`);
      } else {
        parts.push(cleanKeyword);
      }
    }
  }

  return parts.join(' ');
}

/**
 * Helper to compute date filter boundaries for common UI time chips.
 */
export function getTimeRangeFilters(range: 'today' | 'this_week' | 'this_month'): Partial<MailFilter> {
  const now = new Date();

  if (range === 'today') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { dateFrom: today.toISOString() };
  }

  if (range === 'this_week') {
    const dayOfWeek = now.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);
    return { dateFrom: monday.toISOString() };
  }

  if (range === 'this_month') {
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: firstOfMonth.toISOString() };
  }

  return {};
}

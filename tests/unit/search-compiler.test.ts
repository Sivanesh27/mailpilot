import { describe, it, expect } from 'vitest';
import {
  compileFilterToGmailQuery,
  getTimeRangeFilters,
} from '@/lib/gmail/search';

describe('Gmail Search / Filter Compiler', () => {
  it('should compile sender filter', () => {
    const query = compileFilterToGmailQuery({ sender: 'Sarah Chen' });
    expect(query).toBe('from:(Sarah Chen)');
  });

  it('should compile recipient filter', () => {
    const query = compileFilterToGmailQuery({ recipient: 'david@acme.corp' });
    expect(query).toBe('to:(david@acme.corp)');
  });

  it('should compile unread flag', () => {
    const query = compileFilterToGmailQuery({ unread: true });
    expect(query).toBe('is:unread');
  });

  it('should compile date range filters', () => {
    const query = compileFilterToGmailQuery({
      dateFrom: '2026-09-01T00:00:00.000Z',
      dateTo: '2026-09-07T00:00:00.000Z',
    });
    expect(query).toContain('after:2026/09/01');
    expect(query).toContain('before:2026/09/07');
  });

  it('should combine multiple filters safely', () => {
    const query = compileFilterToGmailQuery({
      sender: 'David',
      unread: true,
      keyword: 'roadmap review',
    });
    expect(query).toBe('from:(David) is:unread "roadmap review"');
  });

  it('should sanitize dangerous characters from query', () => {
    const query = compileFilterToGmailQuery({
      sender: 'David{hack}[test]^~*',
    });
    expect(query).not.toContain('{');
    expect(query).not.toContain('}');
    expect(query).not.toContain('^');
    expect(query).not.toContain('~');
    expect(query).not.toContain('*');
  });

  it('should calculate time ranges for today and this_week', () => {
    const today = getTimeRangeFilters('today');
    expect(today.dateFrom).toBeDefined();

    const thisWeek = getTimeRangeFilters('this_week');
    expect(thisWeek.dateFrom).toBeDefined();
    expect(new Date(thisWeek.dateFrom!).getTime()).toBeLessThanOrEqual(Date.now());
  });
});

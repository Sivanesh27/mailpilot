import { describe, it, expect } from 'vitest';
import { MAILPILOT_TOOLS, getGeminiToolDeclarations } from '@/lib/ai/tools';
import { buildContextualPrompt, SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { runAssistantTurn } from '@/lib/ai/gemini-client';
import { AppContextState } from '@/types/assistant';

describe('AI Copilot / Tool Definitions & Intent Routing', () => {
  it('should declare all 11 typed MailPilot tools', () => {
    const toolNames = MAILPILOT_TOOLS.map((t) => t.name);
    const expected = [
      'openCompose',
      'fillCompose',
      'sendEmail',
      'searchEmails',
      'setFilters',
      'openEmail',
      'openLatestEmail',
      'prepareReply',
      'prepareForward',
      'refreshInbox',
      'showEmailPreview',
    ];

    expect(toolNames).toHaveLength(11);
    for (const name of expected) {
      expect(toolNames).toContain(name);
    }
  });

  it('should generate valid Gemini tool declarations', () => {
    const decls = getGeminiToolDeclarations();
    expect(decls).toHaveLength(1);
    expect(decls[0].functionDeclarations).toHaveLength(11);
  });

  it('should build contextual system prompt with prompt injection defenses', () => {
    expect(SYSTEM_PROMPT).toContain('UNTRUSTED');
    expect(SYSTEM_PROMPT).toContain('prompt injection');

    const sampleContext: AppContextState = {
      route: 'detail',
      openMessageId: 'msg-david-1',
      openThreadId: 'th-david-1',
      filters: { sender: 'David', unread: true },
      composeDraft: { to: [], cc: [], bcc: [], subject: '', body: '' },
    };

    const prompt = buildContextualPrompt(sampleContext);
    expect(prompt).toContain('msg-david-1');
    expect(prompt).toContain('th-david-1');
    expect(prompt).toContain('"sender": "David"');
  });

  it('should route "Show only unread emails from this week" to setFilters', async () => {
    const appContext: AppContextState = {
      route: 'inbox',
      openMessageId: null,
      openThreadId: null,
      filters: {},
      composeDraft: { to: [], cc: [], bcc: [], subject: '', body: '' },
    };

    const result = await runAssistantTurn(
      [{ role: 'user', content: 'Show only unread emails from this week' }],
      appContext
    );

    expect(result.toolCalls.some((t) => t.name === 'setFilters')).toBe(true);
    const filterTool = result.toolCalls.find((t) => t.name === 'setFilters');
    expect(filterTool?.args?.unread).toBe(true);
    expect(filterTool?.args?.dateFrom).toBeDefined();
  });

  it('should route "Open the latest email from David" to openLatestEmail', async () => {
    const appContext: AppContextState = {
      route: 'inbox',
      openMessageId: null,
      openThreadId: null,
      filters: {},
      composeDraft: { to: [], cc: [], bcc: [], subject: '', body: '' },
    };

    const result = await runAssistantTurn(
      [{ role: 'user', content: 'Open the latest email from David' }],
      appContext
    );

    expect(result.toolCalls.some((t) => t.name === 'openLatestEmail')).toBe(true);
    const openTool = result.toolCalls.find((t) => t.name === 'openLatestEmail');
    expect(openTool?.args?.sender).toBe('David');
  });

  it('should route "Reply to this saying thanks, I\'ll review it today" to prepareReply', async () => {
    const appContext: AppContextState = {
      route: 'detail',
      openMessageId: 'msg-david-1',
      openThreadId: 'th-david-1',
      filters: {},
      composeDraft: { to: [], cc: [], bcc: [], subject: '', body: '' },
    };

    const result = await runAssistantTurn(
      [{ role: 'user', content: "Reply to this saying thanks, I'll review it today" }],
      appContext
    );

    expect(result.toolCalls.some((t) => t.name === 'prepareReply')).toBe(true);
    const replyTool = result.toolCalls.find((t) => t.name === 'prepareReply');
    expect(replyTool?.args?.body).toContain("thanks, I'll review it today");
  });

  it('should open compose, fill fields, and require confirmation for sending email', async () => {
    const appContext: AppContextState = {
      route: 'inbox',
      openMessageId: null,
      openThreadId: null,
      filters: {},
      composeDraft: { to: [], cc: [], bcc: [], subject: '', body: '' },
    };

    const result = await runAssistantTurn(
      [{ role: 'user', content: "Send an email to john@example.com with subject Meeting Tomorrow and body Let's meet at 3pm." }],
      appContext
    );

    expect(result.toolCalls.some((t) => t.name === 'openCompose')).toBe(true);
    expect(result.toolCalls.some((t) => t.name === 'fillCompose')).toBe(true);
    expect(result.sendConfirmation).toBeDefined();
    expect(result.sendConfirmation?.draft.to).toContain('john@example.com');
    expect(result.sendConfirmation?.draft.subject).toBe('Meeting Tomorrow');
    expect(result.sendConfirmation?.draft.body).toBe("Let's meet at 3pm.");
  });
});

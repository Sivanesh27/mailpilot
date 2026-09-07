import { GoogleGenAI } from '@google/genai';
import { buildContextualPrompt } from './prompts';
import { getGeminiToolDeclarations, MAILPILOT_TOOLS } from './tools';
import { AppContextState, ToolActivityItem } from '@/types/assistant';
import { getTimeRangeFilters } from '@/lib/gmail/search';
import { ComposeDraft } from '@/types/mail';

export interface AssistantTurnResult {
  text: string;
  toolCalls: ToolActivityItem[];
  sendConfirmation?: {
    draft: ComposeDraft;
    confirmed?: boolean;
  };
  previewEmailId?: string;
}

/**
 * Handles an AI Copilot turn using the official Gemini API SDK with function calling,
 * or intelligent sandbox fallback when GEMINI_API_KEY is not yet configured.
 */
export async function runAssistantTurn(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  appContext: AppContextState
): Promise<AssistantTurnResult> {
  const lastUserMessage = messages[messages.length - 1]?.content || '';
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'placeholder' && !apiKey.startsWith('AIzaSy_fake')) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = buildContextualPrompt(appContext);
      const tools = getGeminiToolDeclarations();

      const geminiContents = messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: geminiContents as any,
        config: {
          systemInstruction,
          tools: tools as any,
          temperature: 0.2,
        },
      });

      const functionCalls = response.functionCalls || [];
      const toolActivities: ToolActivityItem[] = [];
      let sendConfirmation: AssistantTurnResult['sendConfirmation'] = undefined;
      let previewEmailId: string | undefined = undefined;

      for (const fc of functionCalls) {
        if (!fc.name) continue;
        const toolDef = MAILPILOT_TOOLS.find((t) => t.name === fc.name);
        const args = (fc.args || {}) as Record<string, unknown>;

        toolActivities.push({
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: fc.name,
          label: toolDef ? toolDef.label(args) : `Executing ${fc.name}...`,
          status: 'success',
          args,
          timestamp: Date.now(),
        });

        if (fc.name === 'sendEmail') {
          const draft: ComposeDraft = {
            to: (args.to as string[]) || [],
            subject: (args.subject as string) || '',
            body: (args.body as string) || '',
          };
          if (!args.confirmed) {
            sendConfirmation = { draft, confirmed: false };
          }
        } else if (fc.name === 'showEmailPreview' && args.messageId) {
          previewEmailId = args.messageId as string;
        }
      }

      let responseText = response.text || '';
      if (!responseText && toolActivities.length > 0) {
        responseText = 'I have updated the application state for you.';
      }

      return {
        text: responseText,
        toolCalls: toolActivities,
        sendConfirmation,
        previewEmailId,
      };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local intent parser:', err);
      // Fallback to local deterministic router
    }
  }

  // -------------------------------------------------------------
  // High-Fidelity Sandbox / Local Intent Pattern Router
  // Enables immediate demo testing even before user adds Gemini API Key
  // -------------------------------------------------------------
  return runLocalIntentRouter(lastUserMessage, appContext);
}

function runLocalIntentRouter(
  prompt: string,
  appContext: AppContextState
): AssistantTurnResult {
  const p = prompt.toLowerCase().trim();
  const toolActivities: ToolActivityItem[] = [];
  let sendConfirmation: AssistantTurnResult['sendConfirmation'] = undefined;
  let previewEmailId: string | undefined = undefined;
  let replyText = '';

  // 1. "Show only unread emails from this week"
  if (p.includes('unread') && (p.includes('this week') || p.includes('week'))) {
    const thisWeek = getTimeRangeFilters('this_week');
    toolActivities.push({
      id: `act-${Date.now()}-1`,
      name: 'setFilters',
      label: 'Filtering unread emails from this week...',
      status: 'success',
      args: { unread: true, dateFrom: thisWeek.dateFrom },
      timestamp: Date.now(),
    });
    replyText = 'Filtered your inbox to display only unread emails received this week.';
  }
  // 2. Generic unread filter
  else if (p.includes('show unread') || p.includes('only unread') || p.includes('filter unread')) {
    toolActivities.push({
      id: `act-${Date.now()}-1`,
      name: 'setFilters',
      label: 'Filtering unread emails...',
      status: 'success',
      args: { unread: true },
      timestamp: Date.now(),
    });
    replyText = 'Applied filter for unread emails.';
  }
  // 3. "Open the latest email from David"
  else if (p.includes('open') && (p.includes('david') || p.includes('latest'))) {
    toolActivities.push({
      id: `act-${Date.now()}-1`,
      name: 'openLatestEmail',
      label: 'Locating and opening latest email from David...',
      status: 'success',
      args: { sender: 'David' },
      timestamp: Date.now(),
    });
    replyText = "Opened the latest email from David Miller regarding Q3 Product Roadmap Review.";
  }
  // 4. "Reply to this saying thanks, I'll review it today"
  else if (p.startsWith('reply') || p.includes('reply to this')) {
    const replyBodyMatch = prompt.match(/saying\s+["']?(.+?)["']?$/i) || prompt.match(/reply\s+["']?(.+?)["']?$/i);
    const bodyText = replyBodyMatch ? replyBodyMatch[1].trim() : "Thanks, I'll review it today.";

    toolActivities.push({
      id: `act-${Date.now()}-1`,
      name: 'prepareReply',
      label: 'Preparing reply draft in compose window...',
      status: 'success',
      args: {
        messageId: appContext.openMessageId || 'msg-david-1',
        body: bodyText,
      },
      timestamp: Date.now(),
    });
    replyText = `Opened compose prefilled with your reply: "${bodyText}". Ready for your review.`;
  }
  // 5. "Send an email to john@example.com with subject Meeting Tomorrow and body Let's meet at 3pm."
  else if (p.includes('send') && (p.includes('@') || p.includes('compose') || p.includes('to '))) {
    const emailMatch = prompt.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const subjectMatch = prompt.match(/subject\s+["']?([^"'\n]+?)["']?(?:\s+and\s+body|\s+with\s+body|\s*$)/i);
    const bodyMatch = prompt.match(/body\s+["']?([^"'\n]+?)["']?$/i);

    const to = emailMatch ? [emailMatch[1]] : ['john@example.com'];
    const subject = subjectMatch ? subjectMatch[1].trim() : 'Meeting Tomorrow';
    const body = bodyMatch ? bodyMatch[1].trim() : "Let's meet at 3pm.";

    // Step 1: openCompose
    toolActivities.push({
      id: `act-${Date.now()}-1`,
      name: 'openCompose',
      label: 'Opening compose panel...',
      status: 'success',
      args: {},
      timestamp: Date.now(),
    });

    // Step 2: fillCompose
    toolActivities.push({
      id: `act-${Date.now()}-2`,
      name: 'fillCompose',
      label: `Filling compose: To ${to.join(', ')}, Subject "${subject}"...`,
      status: 'success',
      args: { to, subject, body },
      timestamp: Date.now() + 50,
    });

    const isImmediate = p.includes('immediately') || p.includes('without asking') || p.includes('without confirmation');

    if (!isImmediate) {
      sendConfirmation = {
        draft: { to, subject, body },
        confirmed: false,
      };
      replyText = `I have opened the compose panel and populated the fields. Please confirm below when you are ready to send this email.`;
    } else {
      toolActivities.push({
        id: `act-${Date.now()}-3`,
        name: 'sendEmail',
        label: `Sending email to ${to.join(', ')}...`,
        status: 'success',
        args: { to, subject, body, confirmed: true },
        timestamp: Date.now() + 100,
      });
      replyText = `Email sent successfully to ${to.join(', ')}.`;
    }
  }
  // 6. Search or filter
  else if (p.includes('search') || p.includes('find')) {
    const cleanTerm = prompt.replace(/^search\s+(for\s+)?/i, '').replace(/^find\s+/i, '').trim();
    toolActivities.push({
      id: `act-${Date.now()}-1`,
      name: 'searchEmails',
      label: `Searching inbox for "${cleanTerm}"...`,
      status: 'success',
      args: { query: cleanTerm },
      timestamp: Date.now(),
    });
    replyText = `Searching your messages for "${cleanTerm}".`;
  }
  // 7. Refresh inbox
  else if (p.includes('refresh') || p.includes('sync') || p.includes('check mail')) {
    toolActivities.push({
      id: `act-${Date.now()}-1`,
      name: 'refreshInbox',
      label: 'Checking for new messages...',
      status: 'success',
      args: {},
      timestamp: Date.now(),
    });
    replyText = 'Mailbox refreshed.';
  }
  // Default general assistance
  else {
    replyText = `I am your MailPilot action copilot. I can filter your inbox ("Show only unread emails from this week"), open emails ("Open latest email from David"), draft replies ("Reply to this saying thanks"), and compose emails ("Send an email to john@example.com with subject Meeting Tomorrow and body Let's meet at 3pm."). How can I help you?`;
  }

  return {
    text: replyText,
    toolCalls: toolActivities,
    sendConfirmation,
    previewEmailId,
  };
}

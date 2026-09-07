import { create } from 'zustand';
import { AssistantMessage, ToolActivityItem, AppContextState } from '@/types/assistant';
import { useMailStore } from './mail-store';
import { ComposeDraft } from '@/types/mail';

interface AssistantStoreState {
  messages: AssistantMessage[];
  isThinking: boolean;
  activeTrace: ToolActivityItem[];
  pendingConfirmation: { draft: ComposeDraft } | null;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  confirmSend: () => Promise<void>;
  cancelSend: () => void;
  clearHistory: () => void;
}

const INITIAL_MESSAGES: AssistantMessage[] = [
  {
    id: 'msg-welcome',
    role: 'assistant',
    content: "Hi! I'm your MailPilot AI Copilot. I can control your mail client directly — search, filter, open emails, and compose replies. Try asking me to do something!",
    timestamp: Date.now(),
  },
];

export const useAssistantStore = create<AssistantStoreState>((set, get) => ({
  messages: INITIAL_MESSAGES,
  isThinking: false,
  activeTrace: [],
  pendingConfirmation: null,

  sendMessage: async (content: string) => {
    if (!content.trim()) return;

    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isThinking: true,
      activeTrace: [],
    }));

    // Read current live state from MailStore
    const mailState = useMailStore.getState();
    const appContext: AppContextState = {
      route: mailState.selectedMessage ? 'detail' : mailState.composeOpen ? 'compose' : mailState.folder,
      openMessageId: mailState.selectedMessageId,
      openThreadId: mailState.selectedMessage?.threadId || null,
      filters: mailState.filters,
      composeDraft: mailState.composeDraft,
      visibleMessages: mailState.messages.slice(0, 15).map((m) => ({
        id: m.id,
        subject: m.subject,
        from: m.from.name ? `${m.from.name} <${m.from.email}>` : m.from.email,
        snippet: m.snippet,
        date: m.date,
        isRead: m.isRead,
      })),
    };

    try {
      // Build conversation payload for assistant endpoint
      const conversationHistory = get()
        .messages.concat(userMessage)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          appContext,
        }),
      });

      if (!res.ok) {
        throw new Error(`Assistant endpoint returned status ${res.status}`);
      }

      const result = await res.json();
      const toolCalls: ToolActivityItem[] = result.toolCalls || [];

      // Execute each tool call directly into useMailStore!
      for (const tool of toolCalls) {
        set((state) => ({
          activeTrace: [...state.activeTrace, tool],
        }));

        await executeToolOnMailStore(tool);
      }

      const assistantMsg: AssistantMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: result.text,
        timestamp: Date.now(),
        tools: toolCalls,
        sendConfirmation: result.sendConfirmation,
        previewEmailId: result.previewEmailId,
      };

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        pendingConfirmation: result.sendConfirmation ? { draft: result.sendConfirmation.draft } : null,
      }));
    } catch (err: unknown) {
      console.error('Assistant error:', err);
      const errorMsg: AssistantMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an issue: ${(err as Error).message || 'Request failed'}.`,
        timestamp: Date.now(),
      };
      set((state) => ({
        messages: [...state.messages, errorMsg],
      }));
    } finally {
      set({ isThinking: false });
    }
  },

  confirmSend: async () => {
    const confirmation = get().pendingConfirmation;
    if (!confirmation) return;

    const mailStore = useMailStore.getState();
    set({ isThinking: true });

    try {
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: confirmation.draft }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to dispatch email');
      }

      mailStore.closeCompose();
      await mailStore.fetchMessages('sent');
      mailStore.setFolder('sent');

      set((state) => ({
        pendingConfirmation: null,
        messages: [
          ...state.messages,
          {
            id: `asst-sent-${Date.now()}`,
            role: 'assistant',
            content: `✔ Email successfully sent to ${confirmation.draft.to.join(', ')} and placed in your Sent folder.`,
            timestamp: Date.now(),
          },
        ],
      }));
    } catch (err: unknown) {
      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: `asst-err-${Date.now()}`,
            role: 'assistant',
            content: `Failed to send email: ${(err as Error).message}`,
            timestamp: Date.now(),
          },
        ],
      }));
    } finally {
      set({ isThinking: false });
    }
  },

  cancelSend: () => {
    set({ pendingConfirmation: null });
  },

  clearHistory: () => {
    set({ messages: INITIAL_MESSAGES, activeTrace: [], pendingConfirmation: null });
  },
}));

/**
 * Dispatches AI tool executions directly into the centralized Zustand mail store.
 */
async function executeToolOnMailStore(tool: ToolActivityItem) {
  const mailStore = useMailStore.getState();
  const args = tool.args || {};

  switch (tool.name) {
    case 'openCompose':
      mailStore.openCompose();
      break;

    case 'fillCompose':
      mailStore.triggerAnimatedFill({
        to: (args.to as string[]) || [],
        cc: (args.cc as string[]) || [],
        bcc: (args.bcc as string[]) || [],
        subject: (args.subject as string) || '',
        body: (args.body as string) || '',
      });
      break;

    case 'setFilters':
      mailStore.setFilters({
        sender: (args.sender as string) || null,
        unread: args.unread !== undefined ? (args.unread as boolean) : null,
        dateFrom: (args.dateFrom as string) || null,
        dateTo: (args.dateTo as string) || null,
        keyword: (args.keyword as string) || null,
      });
      break;

    case 'searchEmails':
      if (args.query) {
        mailStore.setSearchQuery(args.query as string);
        await mailStore.fetchMessages(mailStore.folder, args.query as string);
      } else if (args.from) {
        mailStore.setFilters({ sender: args.from as string });
      }
      break;

    case 'openEmail':
      if (args.messageId) {
        await mailStore.selectMessageById(args.messageId as string);
      }
      break;

    case 'openLatestEmail': {
      const senderTerm = (args.sender as string)?.toLowerCase();
      let matched = mailStore.messages.find((m) => {
        if (!senderTerm) return true;
        return (
          m.from.name?.toLowerCase().includes(senderTerm) ||
          m.from.email.toLowerCase().includes(senderTerm)
        );
      });

      if (!matched && senderTerm) {
        // Look in demo seeded messages if not currently in view
        const { DEMO_MESSAGES } = await import('@/lib/gmail/messages');
        matched = DEMO_MESSAGES.find((m) =>
          m.from.name?.toLowerCase().includes(senderTerm) ||
          m.from.email.toLowerCase().includes(senderTerm)
        );
      }

      if (matched) {
        mailStore.selectMessage(matched);
      }
      break;
    }

    case 'prepareReply': {
      const targetId = (args.messageId as string) || mailStore.selectedMessageId;
      const targetMsg = mailStore.messages.find((m) => m.id === targetId) || mailStore.selectedMessage;
      if (targetMsg) {
        mailStore.prepareReply(targetMsg, args.body as string);
      } else {
        // Fallback demo reply
        mailStore.openCompose({
          to: ['david.miller@acme.corp'],
          subject: 'Re: Q3 Product Roadmap Review & AI Copilot Integration',
          body: (args.body as string) || "Thanks, I'll review it today.",
        });
      }
      break;
    }

    case 'prepareForward': {
      const targetId = (args.messageId as string) || mailStore.selectedMessageId;
      const targetMsg = mailStore.messages.find((m) => m.id === targetId) || mailStore.selectedMessage;
      if (targetMsg) {
        mailStore.prepareForward(targetMsg, args.to as string[], args.body as string);
      }
      break;
    }

    case 'refreshInbox':
      await mailStore.refreshInbox();
      break;

    case 'sendEmail':
      if (args.confirmed) {
        await fetch('/api/mail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draft: {
              to: args.to,
              subject: args.subject,
              body: args.body,
            },
          }),
        });
        mailStore.closeCompose();
        await mailStore.fetchMessages('sent');
      }
      break;

    default:
      console.log('Unrecognized tool execution:', tool.name);
  }
}

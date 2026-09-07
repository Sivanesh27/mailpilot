import { create } from 'zustand';
import { EmailMessage, MailFolder, MailFilter, ComposeDraft, SyncStatusState } from '@/types/mail';
import { compileFilterToGmailQuery } from '@/lib/gmail/search';

interface MailStoreState {
  folder: MailFolder;
  messages: EmailMessage[];
  selectedMessage: EmailMessage | null;
  selectedMessageId: string | null;
  filters: MailFilter;
  searchQuery: string;
  composeOpen: boolean;
  composeDraft: ComposeDraft;
  isComposingReply: boolean;
  loading: boolean;
  detailLoading: boolean;
  syncStatus: SyncStatusState;
  isSyncing: boolean;
  mobilePane: 'list' | 'detail';
  isAiTyping: boolean;
  targetAiDraft: ComposeDraft | null;

  // Actions
  setFolder: (folder: MailFolder) => void;
  selectMessage: (message: EmailMessage | null) => void;
  selectMessageById: (id: string) => Promise<void>;
  setFilters: (filters: Partial<MailFilter>) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  openCompose: (initialDraft?: Partial<ComposeDraft>) => void;
  closeCompose: () => void;
  setComposeDraft: (draft: Partial<ComposeDraft>) => void;
  triggerAnimatedFill: (draft: Partial<ComposeDraft>) => void;
  finishAiTyping: () => void;
  prepareReply: (message: EmailMessage, body?: string) => void;
  prepareForward: (message: EmailMessage, to?: string[], body?: string) => void;
  fetchMessages: (folder?: MailFolder, query?: string) => Promise<void>;
  refreshInbox: () => Promise<void>;
  setSyncStatus: (status: SyncStatusState) => void;
  setMobilePane: (pane: 'list' | 'detail') => void;
}

const emptyDraft: ComposeDraft = {
  to: [],
  cc: [],
  bcc: [],
  subject: '',
  body: '',
};

const emptyFilters: MailFilter = {
  keyword: null,
  sender: null,
  recipient: null,
  dateFrom: null,
  dateTo: null,
  unread: null,
};

export const useMailStore = create<MailStoreState>((set, get) => ({
  folder: 'inbox',
  messages: [],
  selectedMessage: null,
  selectedMessageId: null,
  filters: emptyFilters,
  searchQuery: '',
  composeOpen: false,
  composeDraft: emptyDraft,
  isComposingReply: false,
  loading: false,
  detailLoading: false,
  syncStatus: 'ACTIVE',
  isSyncing: false,
  mobilePane: 'list',
  isAiTyping: false,
  targetAiDraft: null,

  setFolder: (folder) => {
    set({ folder, selectedMessage: null, selectedMessageId: null, mobilePane: 'list' });
    get().fetchMessages(folder);
  },

  selectMessage: (message) => {
    set({
      selectedMessage: message,
      selectedMessageId: message?.id || null,
      mobilePane: message ? 'detail' : 'list',
    });
    // If message does not have full body yet, load full detail
    if (message && !message.bodyHtml && !message.bodyText) {
      get().selectMessageById(message.id);
    }
    // Mark as read locally for optimistic UI
    if (message && !message.isRead) {
      set((state) => ({
        messages: state.messages.map((m) => (m.id === message.id ? { ...m, isRead: true } : m)),
        selectedMessage: { ...message, isRead: true },
      }));
    }
  },

  selectMessageById: async (id: string) => {
    const existing = get().messages.find((m) => m.id === id);
    if (existing && (existing.bodyHtml || existing.bodyText)) {
      get().selectMessage(existing);
      return;
    }

    set({ detailLoading: true, selectedMessageId: id, mobilePane: 'detail' });
    try {
      const res = await fetch(`/api/mail/messages/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          set((state) => ({
            selectedMessage: data.message,
            messages: state.messages.map((m) => (m.id === id ? { ...m, ...data.message } : m)),
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load message detail:', err);
    } finally {
      set({ detailLoading: false });
    }
  },

  setFilters: (newFilters) => {
    const updated = { ...get().filters, ...newFilters };
    set({ filters: updated });
    get().fetchMessages(get().folder);
  },

  clearFilters: () => {
    set({ filters: emptyFilters, searchQuery: '' });
    get().fetchMessages(get().folder, '');
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  openCompose: (initialDraft) => {
    set({
      composeOpen: true,
      composeDraft: { ...emptyDraft, ...initialDraft },
      isComposingReply: false,
    });
  },

  closeCompose: () => {
    set({ composeOpen: false, composeDraft: emptyDraft, isComposingReply: false });
  },

  setComposeDraft: (draft) => {
    set((state) => ({
      composeDraft: { ...state.composeDraft, ...draft },
    }));
  },

  triggerAnimatedFill: (draft) => {
    const fullDraft = { ...emptyDraft, ...draft };
    set({
      composeOpen: true,
      isAiTyping: true,
      targetAiDraft: fullDraft,
      // Start with empty fields so animated typing can populate them live
      composeDraft: {
        to: [],
        cc: [],
        bcc: [],
        subject: '',
        body: '',
      },
    });
  },

  finishAiTyping: () => {
    const target = get().targetAiDraft;
    if (target) {
      set({
        composeDraft: target,
        isAiTyping: false,
        targetAiDraft: null,
      });
    } else {
      set({ isAiTyping: false, targetAiDraft: null });
    }
  },

  prepareReply: (message, body = '') => {
    const replySubject = message.subject.toLowerCase().startsWith('re:')
      ? message.subject
      : `Re: ${message.subject}`;

    const quotedDate = new Date(message.date).toLocaleString();
    const quotedBody = `\n\nOn ${quotedDate}, ${message.from.name || message.from.email} wrote:\n> ${message.bodyText.split('\n').join('\n> ')}`;

    set({
      composeOpen: true,
      isComposingReply: true,
      composeDraft: {
        to: [message.from.email],
        cc: [],
        bcc: [],
        subject: replySubject,
        body: body ? `${body}${quotedBody}` : `\n${quotedBody}`,
        inReplyTo: message.id,
        threadId: message.threadId,
      },
    });
  },

  prepareForward: (message, to = [], body = '') => {
    const fwdSubject = message.subject.toLowerCase().startsWith('fwd:')
      ? message.subject
      : `Fwd: ${message.subject}`;

    const quotedDate = new Date(message.date).toLocaleString();
    const quotedBody = `\n\n---------- Forwarded message ---------\nFrom: ${message.from.name || ''} <${message.from.email}>\nDate: ${quotedDate}\nSubject: ${message.subject}\nTo: ${message.to.map((t) => t.email).join(', ')}\n\n${message.bodyText}`;

    set({
      composeOpen: true,
      isComposingReply: false,
      composeDraft: {
        to,
        cc: [],
        bcc: [],
        subject: fwdSubject,
        body: body ? `${body}${quotedBody}` : `\n${quotedBody}`,
        threadId: message.threadId,
      },
    });
  },

  fetchMessages: async (folderParam, queryParam) => {
    const currentFolder = folderParam || get().folder;
    const rawQuery = queryParam !== undefined ? queryParam : get().searchQuery;
    const compiledQuery = compileFilterToGmailQuery(get().filters, rawQuery);

    set({ loading: true });
    try {
      const params = new URLSearchParams();
      params.set('folder', currentFolder);
      if (compiledQuery) {
        params.set('q', compiledQuery);
      }

      const res = await fetch(`/api/mail/messages?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        set({ messages: data.messages || [] });
      } else {
        console.error('Fetch messages failed:', await res.text());
      }
    } catch (err) {
      console.error('Network error fetching messages:', err);
    } finally {
      set({ loading: false });
    }
  },

  refreshInbox: async () => {
    await get().fetchMessages();
  },

  setSyncStatus: (syncStatus) => {
    set({ syncStatus });
  },

  setMobilePane: (mobilePane) => {
    set({ mobilePane });
  },
}));

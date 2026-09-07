import { ComposeDraft, MailFilter, MailFolder } from './mail';

export interface VisibleMessageSummary {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  isRead: boolean;
}

export interface AppContextState {
  route: MailFolder | 'detail' | 'compose';
  openMessageId: string | null;
  openThreadId: string | null;
  filters: MailFilter;
  composeDraft: ComposeDraft;
  visibleMessages?: VisibleMessageSummary[];
}

export type ToolStatus = 'pending' | 'running' | 'success' | 'error';

export interface ToolActivityItem {
  id: string;
  name: string;
  label: string;
  status: ToolStatus;
  detail?: string;
  args?: Record<string, unknown>;
  timestamp: number;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tools?: ToolActivityItem[];
  previewEmailId?: string;
  sendConfirmation?: {
    draft: ComposeDraft;
    sent?: boolean;
  };
}

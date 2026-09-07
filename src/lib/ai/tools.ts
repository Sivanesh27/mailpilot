import { Type } from '@google/genai';

export interface ToolDefinition {
  name: string;
  description: string;
  label: (args?: Record<string, unknown>) => string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const MAILPILOT_TOOLS: ToolDefinition[] = [
  {
    name: 'openCompose',
    description: 'Opens the email compose window in the UI.',
    label: () => 'Opening compose window...',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'fillCompose',
    description: 'Fills the fields in the compose window (To, Cc, Bcc, Subject, Body).',
    label: (args) => {
      const parts: string[] = [];
      if (args?.to) parts.push('recipient');
      if (args?.subject) parts.push('subject');
      if (args?.body) parts.push('body');
      return parts.length > 0 ? `Filling compose ${parts.join(', ')}...` : 'Filling compose draft...';
    },
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of recipient email addresses.',
        },
        cc: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Optional list of CC email addresses.',
        },
        bcc: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Optional list of BCC email addresses.',
        },
        subject: {
          type: Type.STRING,
          description: 'Subject line of the email.',
        },
        body: {
          type: Type.STRING,
          description: 'Body content of the email.',
        },
      },
      required: ['to'],
    },
  },
  {
    name: 'sendEmail',
    description: 'Dispatches an email. Must only be executed if the user explicitly instructed immediate sending or confirmed.',
    label: (args) => (args?.confirmed ? 'Sending email...' : 'Preparing send confirmation...'),
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of recipient email addresses.',
        },
        subject: {
          type: Type.STRING,
          description: 'Subject of the email.',
        },
        body: {
          type: Type.STRING,
          description: 'Body content of the email.',
        },
        confirmed: {
          type: Type.BOOLEAN,
          description: 'True only if the user explicitly stated to send immediately without asking.',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'searchEmails',
    description: 'Searches and filters emails in the user inbox using structured criteria.',
    label: (args) => {
      if (args?.from) return `Searching emails from "${args.from}"...`;
      if (args?.query) return `Searching emails for "${args.query}"...`;
      return 'Searching emails...';
    },
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Keyword search query.',
        },
        from: {
          type: Type.STRING,
          description: 'Sender name or email address to filter by.',
        },
        to: {
          type: Type.STRING,
          description: 'Recipient email address.',
        },
        after: {
          type: Type.STRING,
          description: 'Filter emails received after this ISO date.',
        },
        before: {
          type: Type.STRING,
          description: 'Filter emails received before this ISO date.',
        },
        unread: {
          type: Type.BOOLEAN,
          description: 'Filter for unread emails only.',
        },
      },
    },
  },
  {
    name: 'setFilters',
    description: 'Sets UI filter chips on the active mailbox (unread, sender, date range).',
    label: (args) => {
      if (args?.unread) return 'Filtering unread emails...';
      if (args?.sender) return `Filtering emails from "${args.sender}"...`;
      return 'Updating mailbox filters...';
    },
    parameters: {
      type: Type.OBJECT,
      properties: {
        sender: {
          type: Type.STRING,
          description: 'Sender email or name to filter.',
        },
        keyword: {
          type: Type.STRING,
          description: 'Search keyword.',
        },
        unread: {
          type: Type.BOOLEAN,
          description: 'True to show unread only, false for all.',
        },
        dateFrom: {
          type: Type.STRING,
          description: 'Filter emails on or after this ISO date.',
        },
        dateTo: {
          type: Type.STRING,
          description: 'Filter emails on or before this ISO date.',
        },
      },
    },
  },
  {
    name: 'openEmail',
    description: 'Navigates to and opens a specific email in the detail view by its ID.',
    label: (args) => `Opening email ${args?.messageId || ''}...`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        messageId: {
          type: Type.STRING,
          description: 'The unique ID of the email message to open.',
        },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'openLatestEmail',
    description: 'Finds and opens the most recent email matching an optional sender name.',
    label: (args) =>
      args?.sender ? `Opening latest email from ${args.sender}...` : 'Opening latest email...',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sender: {
          type: Type.STRING,
          description: 'Optional sender name or email address (e.g. "David").',
        },
      },
    },
  },
  {
    name: 'prepareReply',
    description: 'Opens compose prefilled as a reply to a specific email or the currently open email.',
    label: () => 'Preparing reply...',
    parameters: {
      type: Type.OBJECT,
      properties: {
        messageId: {
          type: Type.STRING,
          description: 'The ID of the message to reply to. Defaults to current open message if omitted.',
        },
        body: {
          type: Type.STRING,
          description: 'The response message body to prefill in the reply.',
        },
      },
    },
  },
  {
    name: 'prepareForward',
    description: 'Opens compose prefilled as a forward of a specific email.',
    label: () => 'Preparing forward...',
    parameters: {
      type: Type.OBJECT,
      properties: {
        messageId: {
          type: Type.STRING,
          description: 'The ID of the message to forward. Defaults to current open message if omitted.',
        },
        to: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Recipient email address to forward to.',
        },
        body: {
          type: Type.STRING,
          description: 'Optional note or introductory text to include with the forward.',
        },
      },
    },
  },
  {
    name: 'refreshInbox',
    description: 'Triggers a refresh of the current mailbox to pull new messages.',
    label: () => 'Refreshing mailbox...',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'showEmailPreview',
    description: 'Displays a rich preview card for an email inside the assistant panel.',
    label: (args) => `Loading preview for email ${args?.messageId || ''}...`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        messageId: {
          type: Type.STRING,
          description: 'The ID of the email to preview.',
        },
      },
      required: ['messageId'],
    },
  },
];

export function getGeminiToolDeclarations() {
  return [
    {
      functionDeclarations: MAILPILOT_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
  ];
}

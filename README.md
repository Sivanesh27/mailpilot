<div align="center">

<img src="./docs/screenshots/mailpilot-hero.jpg" alt="MailPilot — AI Action-Taking Mail Client" width="100%" style="border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);" />

<br/><br/>

# ✉️ MailPilot — AI Action-Taking Webmail Client

**A modern, production-ready Gmail web client where an AI assistant is a real action-taking copilot that drives the UI.**

[![Vercel Deployment](https://img.shields.io/badge/Live%20Demo-mailpilot--lovat.vercel.app-7c3aed?style=for-the-badge&logo=vercel&logoColor=white)](https://mailpilot-lovat.vercel.app)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2%20App%20Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Gemini 3.6 Flash](https://img.shields.io/badge/AI-Gemini%203.6%20Flash-4285F4?style=for-the-badge&logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![Neon Postgres](https://img.shields.io/badge/Database-Neon%20Postgres-00e599?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Vitest](https://img.shields.io/badge/Tests-31%2F31%20Passing-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

<br/>

[🚀 **Launch Live Application**](https://mailpilot-lovat.vercel.app) &nbsp;&nbsp;•&nbsp;&nbsp; [📦 **GitHub Repository**](https://github.com/Sivanesh27/mailpilot) &nbsp;&nbsp;•&nbsp;&nbsp; [📖 **Architecture Guide**](#-system-architecture) &nbsp;&nbsp;•&nbsp;&nbsp; [⚡ **Quickstart**](#-quickstart-guide)

</div>

---

## 🌟 Overview

**MailPilot** re-imagines email client interaction by turning AI into an **active operator** rather than an isolated chatbot sidebar. Instead of merely suggesting answers in text bubbles, MailPilot's AI copilot interacts directly with the unified application state:

- 🪄 **Drives the UI directly**: Modifies inbox filters, searches emails, navigates messages, and prepares replies on the fly.
- ⚡ **The "Wow" Compose Experience**: Streams draft text field-by-field into the real compose window with a human typing cadence.
- 📬 **Real Gmail API Integration**: Connects to your real Gmail account via Google OAuth 2.0 (RFC 7636 PKCE) with history polling sync.
- 🛡️ **Zero-Trust Security**: Tokens encrypted with **AES-256-GCM**; prompt injection defenses isolate untrusted email text.
- 💰 **100% Free-Tier Architecture**: Engineered to run entirely on Vercel Hobby, Neon Serverless Postgres, Google Cloud free tier, and Google Gemini API free quota.
- 🧪 **Offline Sandbox Mode**: Explore every feature with seeded realistic demo emails even without logging in!

---

## 📸 Screenshots & Product Tour

### 1. Main Workspace & Action-Taking AI Copilot
> The responsive 3-pane layout features quick filters, live synchronization status, and an embedded Gemini-powered copilot that can see and control your mailbox state.

<p align="center">
  <img src="./docs/screenshots/mailpilot-dashboard.png" alt="MailPilot Dashboard" width="95%" style="border-radius: 8px; border: 1px solid #2e1065;" />
</p>

---

### 2. Sign-In & Offline Interactive Sandbox
> Supports Google OAuth login with RFC 7636 PKCE protection, plus an interactive demo sandbox that lets anyone test the product with zero credentials.

<p align="center">
  <img src="./docs/screenshots/mailpilot-login.png" alt="MailPilot Login Screen" width="55%" style="border-radius: 8px; border: 1px solid #2e1065;" />
</p>

---

### 3. Google OAuth 2.0 Configuration
> Securely authorizes `https://mailpilot-lovat.vercel.app/api/auth/google/callback` with granular `gmail.modify` scope.

<p align="center">
  <img src="./docs/screenshots/google-cloud-oauth-config.png" alt="Google Cloud OAuth Config" width="55%" style="border-radius: 8px; border: 1px solid #2e1065;" />
</p>

---

## 🧠 What Makes MailPilot Different?

In traditional "AI email assistants", the AI is a disconnected chat widget. If you ask it to "filter unread emails", it answers: *"You can click the filter button at the top left"*.

In **MailPilot**, the AI is a **direct operator** that shares the exact same Zustand state store as the user:

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 Centralized Mail Store                 │
                  │                (useMailStore in Zustand)               │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
       ┌────────────────────────┐                          ┌────────────────────────┐
       │   Human User Actions   │                          │  AI Copilot Tool Calls │
       │  - Clicks "Unread"     │                          │  - setFilters({unread})│
       │  - Presses 'c' (new)   │                          │  - openCompose()       │
       │  - Types search query  │                          │  - fillCompose(...)    │
       │  - Selects message     │                          │  - openEmail(id)       │
       └────────────────────────┘                          └────────────────────────┘
```

Both paths mutate the same state, trigger the same animations, and update the exact same UI components.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client ["Browser (Next.js 14 Client Runtime)"]
        UI["Modern UI (Tailwind + Radix + Framer Motion)"]
        Store["Zustand Central Store (Single Source of Truth)"]
        Shortcuts["Keyboard Engine (c, j, k, /, Esc)"]
        UI --> Store
        Shortcuts --> Store
    end

    subgraph Server ["Next.js 14 Serverless API Routes"]
        AuthRoute["/api/auth/google/* (PKCE & Session Signing)"]
        MailRoute["/api/mail/messages (Metadata Streaming)"]
        SendRoute["/api/mail/send (RFC 2822 MIME Builder)"]
        SyncRoute["/api/mail/sync (History Polling Engine)"]
        AIRoute["/api/assistant (Gemini 3.6 Flash Tool Calling)"]
    end

    subgraph External ["Free Cloud Services"]
        Neon[("Neon Serverless Postgres\nUsers • OAuth Tokens • Sync State")]
        GoogleOAuth["Google Cloud OAuth 2.0\nRFC 7636 PKCE"]
        GmailAPI["Gmail REST API v1\nMessages • History • Threads"]
        GeminiAPI["Google Gemini 3.6 Flash\nInteractions & Function Calling"]
    end

    Store <-->|"Fetch & State Dispatch"| Server
    AuthRoute <-->|"AES-256-GCM Encrypted Tokens"| Neon
    AuthRoute <-->|"Auth Code Exchange"| GoogleOAuth
    MailRoute <-->|"format=metadata List Fetch"| GmailAPI
    SendRoute <-->|"MIME base64url Dispatch"| GmailAPI
    SyncRoute <-->|"history.list Poll (18s)"| GmailAPI
    AIRoute <-->|"Function Calling Tools"| GeminiAPI
```

---

## 🛠️ The 11 AI Copilot Tools

MailPilot exposes 11 strictly typed tool declarations to **Gemini 3.6 Flash**:

| Tool Name | Parameters | What It Does to the UI |
|---|---|---|
| `openCompose` | `initialDraft?` | Opens the compose window in the bottom-right corner. |
| `fillCompose` | `to`, `subject`, `body`, `cc`, `bcc` | Triggers the **live animated typing effect** across the form fields. |
| `setFilters` | `unread`, `sender`, `dateFrom`, `dateTo`, `keyword` | Compiles a server-side Gmail query and refreshes the inbox view. |
| `searchEmails` | `query`, `from`, `to`, `subject` | Populates search input and executes a full-mailbox search. |
| `openEmail` | `messageId` | Opens the selected email in the right-side detail reading pane. |
| `openLatestEmail`| `sender?` | Matches and navigates to the newest email from a specific contact. |
| `prepareReply` | `messageId?`, `body` | Prefills recipient, sets `Re: [Subject]`, quotes previous body, and opens compose. |
| `prepareForward`| `messageId?`, `to`, `body?` | Formats forwarded headers and opens compose with attachments intact. |
| `showEmailPreview`| `messageId` | Displays an inline visual preview card inside the Copilot chat stream. |
| `refreshInbox` | *(none)* | Triggers a live sync poll with Gmail to retrieve newly arrived messages. |
| `sendEmail` | `to`, `subject`, `body`, `confirmed` | Dispatches email via RFC 2822 MIME. Requires **confirmation** unless overridden. |

---

## 🔒 Security, Cryptography & Injection Defense

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant App as MailPilot Next.js
    participant DB as Neon PostgreSQL
    participant Google as Google Cloud OAuth

    User->>App: Click "Continue with Google"
    App->>App: Generate PKCE verifier + SHA-256 challenge + random state token
    App->>User: Set-Cookie: mailpilot_oauth_state & verifier (HTTP-Only, SameSite=Lax)
    App->>Google: Redirect to accounts.google.com/o/oauth2/v2/auth
    Google->>User: Consent Screen (gmail.modify)
    User->>Google: Approve
    Google->>App: Redirect back with code & state
    App->>App: Verify state cookie matches returned state (CSRF Protection)
    App->>Google: Exchange code + code_verifier for Access & Refresh Tokens
    Google-->>App: Return Tokens
    App->>App: Encrypt Refresh Token using AES-256-GCM (96-bit IV, 128-bit Auth Tag)
    App->>DB: Store encrypted tokens & create User record
    App->>User: Set-Cookie: mailpilot_session (Signed HMAC-SHA256)
    App->>User: Redirect to /mail
```

### Core Security Guarantees:
1. **Tokens Never Reach the Browser**: Access and refresh tokens remain securely encrypted on the server with AES-256-GCM.
2. **Prompt Injection Defense**: All third-party email contents (bodies, snippets, subjects) are wrapped in untrusted boundary blocks. The assistant system prompt explicitly forbids following instructions embedded in email bodies.
3. **Human Confirmation Guardrail**: The AI cannot dispatch an email without explicit human confirmation in the UI, unless the user explicitly used unambiguous override phrasing (*"send it immediately without asking"*).

---

## ⌨️ Keyboard Accessibility

Power users can navigate MailPilot completely without touching a mouse:

| Key | Action |
|:---:|---|
| <kbd>c</kbd> | Open Compose Panel |
| <kbd>j</kbd> | Navigate to Next Email in list |
| <kbd>k</kbd> | Navigate to Previous Email in list |
| <kbd>/</kbd> | Focus Search Bar |
| <kbd>Esc</kbd> | Close Compose Panel or Deselect Email |
| <kbd>Cmd</kbd> / <kbd>Ctrl</kbd> + <kbd>Enter</kbd> | Send Active Compose Draft |

---

## 💻 Tech Stack

- **Frontend**: Next.js 14+ (App Router, Server & Client Components), TypeScript 5.5
- **Styling & Animation**: Tailwind CSS, Radix UI primitives, Lucide Icons, Framer Motion
- **State Management**: Zustand 4 (Centralized reactive state store)
- **Database & ORM**: Neon Serverless PostgreSQL, Prisma ORM 5
- **Authentication**: Custom OAuth 2.0 PKCE implementation + HMAC-SHA256 signed session cookies
- **AI Intelligence**: Google Gemini 3.6 Flash (`@google/genai` SDK) with native function calling
- **Email Infrastructure**: Gmail REST API v1 (`format=metadata` list streaming, RFC 2822 MIME builder)
- **Testing**: Vitest (31 unit tests across 6 suites)
- **Hosting**: Vercel (Hobby Free Plan)

---

## ⚡ Quickstart Guide

### Prerequisites
- Node.js 18.17+ or 20+
- A free [Neon.tech](https://neon.tech) PostgreSQL account
- A free [Google AI Studio](https://aistudio.google.com/) Gemini API Key
- A [Google Cloud Console](https://console.cloud.google.com) project with **Gmail API** enabled

---

### 1. Clone & Install
```bash
git clone https://github.com/Sivanesh27/mailpilot.git
cd mailpilot
npm install
```

---

### 2. Configure Environment Variables
Create a `.env.local` file in the project root:

```env
# Database (Neon Serverless PostgreSQL with pooling and timeouts)
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-YOUR-PROJECT-pooler.region.neon.tech/neondb?sslmode=require&connect_timeout=30&pool_timeout=30"

# Google Cloud OAuth 2.0 Credentials
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# App Public URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Cryptographic Keys (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
TOKEN_ENCRYPTION_KEY="64-hex-character-key"
SESSION_SECRET="random-32-character-session-secret"

# Google Gemini API Key
GEMINI_API_KEY="AIzaSy..."

# Real Gmail Mode
NEXT_PUBLIC_DEMO_MODE="false"
```

---

### 3. Initialize Database Schema
Push the Prisma schema to your live Neon database:
```bash
npx prisma db push
```

---

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

> [!TIP]
> **No Credentials Yet? No Problem!**
> Click **"Explore Interactive Demo Sandbox"** on the login screen. MailPilot will boot instantly with realistic seeded email data and simulated AI actions!

---

## 🚀 Deploy to Vercel (100% Free)

Deploying MailPilot to Vercel takes under 3 minutes:

1. Push your code to your GitHub repository.
2. Go to **[vercel.com/new](https://vercel.com/new)** and import your `mailpilot` repository.
3. In **Settings > Environment Variables**, add the following 8 variables:

| Variable | Recommended Value |
|---|---|
| `DATABASE_URL` | Your Neon pooled connection string with `&connect_timeout=30&pool_timeout=30` |
| `GOOGLE_CLIENT_ID` | Your Google OAuth 2.0 Web Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth 2.0 Client Secret |
| `GEMINI_API_KEY` | Your Google AI Studio API Key |
| `TOKEN_ENCRYPTION_KEY` | 64-char hex key for AES-256-GCM token storage |
| `SESSION_SECRET` | Secret string for HMAC-SHA256 session cookie signing |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_DEMO_MODE` | `false` |

4. Click **Deploy**.
5. Once your deployment is live, go to **[Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)**, click your OAuth Client ID, and add your Vercel callback URI to **Authorized redirect URIs**:
   ```text
   https://your-app.vercel.app/api/auth/google/callback
   ```
   and your domain to **Authorized JavaScript origins**:
   ```text
   https://your-app.vercel.app
   ```
6. Click **Save**, open your Vercel URL, and sign in with Google!

---

## 🧪 Automated Test Suite

MailPilot includes a complete test suite covering cryptography, MIME generation, Gmail search compilation, and AI tool validation.

Run tests using Vitest:
```bash
npm test
```

### Test Coverage Summary:
- `tests/unit/crypto.test.ts` — AES-256-GCM encryption/decryption, 96-bit IV, 128-bit auth tags, PKCE challenges.
- `tests/unit/mime-builder.test.ts` — RFC 2822 message formatting, RFC 2047 header encoding, base64url compliance.
- `tests/unit/search-compiler.test.ts` — Gmail search query compilation, SQL injection & symbol sanitization.
- `tests/unit/sync-engine.test.ts` — History polling synchronization, expired `historyId` 404 recovery.
- `tests/unit/tool-validator.test.ts` — Validation of all 11 typed tool definitions, Gemini API schemas.
- `tests/unit/prompt-injection.test.ts` — Isolation of untrusted email inputs and boundary escaping.

---

## 📂 Project Directory Structure

```
mailpilot/
├── docs/
│   └── screenshots/              # High-res product screenshots & banners
├── prisma/
│   └── schema.prisma             # User, OAuthAccount, MailSyncState schemas
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── assistant/        # AI Copilot turn execution route
│   │   │   ├── auth/             # Google OAuth start, callback, logout, me
│   │   │   └── mail/             # Messages, search, send, sync routes
│   │   ├── login/                # Dark-mode login & sandbox entry
│   │   ├── mail/                 # Primary 3-pane email application
│   │   ├── layout.tsx            # Root layout & providers
│   │   └── page.tsx              # Root redirection
│   ├── components/
│   │   ├── assistant/            # Copilot panel, message cards, confirmation
│   │   ├── mail/                 # MessageList, MessageDetail, Compose, Sync
│   │   └── ui/                   # Reusable Radix UI components & skeletons
│   ├── hooks/
│   │   └── useKeyboardShortcuts  # Global c, j, k, /, Esc shortcut handler
│   ├── lib/
│   │   ├── ai/                   # Gemini 3.6 Flash client, prompts, tool defs
│   │   ├── auth/                 # Google OAuth, PKCE, signed session cookies
│   │   ├── db/                   # Prisma client singleton & connection pooling
│   │   ├── gmail/                # Gmail client, message formatter, MIME builder
│   │   └── security/             # AES-256-GCM cipher, input sanitizer
│   ├── state/
│   │   ├── assistant-store.ts    # AI conversation, trace, and tool execution
│   │   └── mail-store.ts         # Centralized Zustand mail store
│   └── types/                    # TypeScript interfaces for auth, mail, assistant
├── tests/
│   └── unit/                     # 31 Vitest unit tests
├── .env.example                  # Environment variable blueprint
├── package.json
└── README.md
```

---

## 📄 License

This project is open-source software licensed under the **[MIT License](LICENSE)**.

---

<div align="center">
  <b>Built with ❤️ for high-performance Gmail productivity.</b><br/>
  Powered by <b>Next.js</b>, <b>Google Gemini 3.6 Flash</b>, and <b>Neon Postgres</b>.
</div>

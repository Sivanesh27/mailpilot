# MailPilot — AI Action-Taking Web Mail Client

> A production-grade, Gmail-backed web mail client where an AI assistant is a **real action-taking copilot**, not a chatbot. Every instruction produces visible UI state transitions or real mail actions (opening compose, animated field typing, inbox filtering, message navigation, send confirmation). Deployable entirely on free tiers.

---

## Architecture Overview

```
                               +-----------------------------+
                               |   Browser (Next.js 15 UI)   |
                               |                             |
                               |   +-----------------------+ |
                               |   |   Zustand Store       | |
                               |   | (1 Source of Truth)   | |
                               |   +-----------+-----------+ |
                               |         ^           ^       |
                               |         |           |       |
                               |   Manual UI     AI Tools    |
                               +---------+-----------+-------+
                                         |           |
                                         v           v
                               +-----------------------------+
                               |    Next.js API Layer        |
                               |                             |
                               |  - Google OAuth / PKCE      |
                               |  - Authenticated Gmail      |
                               |  - Polling Sync Engine      |
                               |  - Gemini Function Calling  |
                               +------+----------+-----------+
                                      |          |
                   +------------------+          +------------------+
                   v                                                v
+-----------------------------+                             +-----------------------------+
|    PostgreSQL (Neon)        |                             |     External Services       |
|  - Users                    |                             |  - Gmail REST API (v1)      |
|  - OAuthAccount (AES-GCM)   |                             |  - Google Gemini API        |
|  - MailSyncState            |                             +-----------------------------+
+-----------------------------+
```

---

## Key Features

1. **AI Copilot Drives the Real UI State**:
   - The assistant never manipulates the DOM directly or operates a parallel fake interface.
   - AI tools dispatch into the exact same **Zustand store** (`useMailStore`) that manual buttons and keyboard shortcuts trigger.
2. **The "Wow" Moment (Live Animated Field Typing)**:
   - When the AI generates a compose draft, fields (`To`, `Subject`, `Body`) animate in live with natural human typing cadence and an active electric indicator banner.
3. **Real Gmail Integration**:
   - OAuth 2.0 Authorization Code flow with RFC 7636 PKCE.
   - Real Inbox, Sent, Starred, and Drafts management with live Gmail REST API.
   - RFC 2822 / MIME message builder with RFC 2047 encoded-word headers and URL-safe base64url dispatch.
4. **Real-Time Polling Sync**:
   - Polls `gmail.users.history.list` every 18 seconds while the tab is active (pauses automatically on background/blur to save quota).
   - Gracefully recovers from expired `historyId` 404s via `/profile` resync.
5. **Robust Security & Prompt Injection Defense**:
   - Google tokens encrypted with **AES-256-GCM** using 96-bit IV and 128-bit authentication tags. Never sent to the browser.
   - All email content is treated as untrusted data and sanitized before reaching the model context.
   - Sends require explicit confirmation unless user unambiguously specified immediate sending.
6. **Polished Design & Keyboard Accessibility**:
   - Electric Violet & Slate visual identity with smooth light/dark mode transitions.
   - Full keyboard shortcuts: `c` (compose), `j` / `k` (navigate list), `/` (search), `Esc` (minimize), `Cmd/Ctrl + Enter` (send).

---

## Tech Stack (100% Free-Tier Compatible)

| Layer | Technology | Free Tier Notes |
|---|---|---|
| **Framework** | Next.js 14+ (App Router) + TypeScript | Deployed on Vercel Hobby tier |
| **Styling & Motion** | Tailwind CSS + Radix UI + Framer Motion | Modern design tokens & micro-interactions |
| **Database** | Neon Serverless PostgreSQL + Prisma ORM | Free serverless database project |
| **Authentication** | Google OAuth 2.0 (PKCE) + Signed Session Cookies | Google Cloud Console free web client |
| **Mail API** | Gmail REST API (`gmail.modify` scope) | Free quota within Google API limits |
| **AI Intelligence** | Google Gemini API (`@google/genai`) | Free tier API key from Google AI Studio |
| **State Management**| Zustand | Single source of truth shared by UI and AI |
| **Testing** | Vitest | 31 unit tests covering crypto, sync, and tools |

---

## Free-Tier Deployment Plan

### Step 1: Neon Database
1. Go to [Neon.tech](https://neon.tech) and create a free project.
2. Copy the PostgreSQL connection string (`DATABASE_URL`).
3. Run migrations locally or on deployment:
   ```bash
   npx prisma db push
   ```

### Step 2: Google Cloud OAuth & Gmail API
1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Enable the **Gmail API** (under *APIs & Services > Library*).
3. Under *OAuth consent screen*, select External, and add scope:
   `https://www.googleapis.com/auth/gmail.modify`
4. Under *Credentials > Create Credentials > OAuth client ID*, select **Web application**:
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback` (for local dev)
     - `https://your-app.vercel.app/api/auth/google/callback` (for Vercel)
5. Copy `Client ID` and `Client Secret`.

### Step 3: Google Gemini API
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API key** and generate a free API key.

### Step 4: Deploy to Vercel
1. Push this repository to GitHub.
2. Import the project into [Vercel](https://vercel.com) (Hobby Free Plan).
3. Set the Environment Variables:
   ```env
   DATABASE_URL="postgresql://user:password@ep-...neon.tech/neondb?sslmode=require"
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
   TOKEN_ENCRYPTION_KEY="<64-hex-char-32-byte-key>"
   SESSION_SECRET="<random-32-char-string>"
   GEMINI_API_KEY="AIzaSy..."
   NEXT_PUBLIC_DEMO_MODE="false"
   ```
4. Deploy!

---

## Local Development & Sandbox Mode

1. **Clone and Install**:
   ```bash
   npm install
   ```

2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!TIP]
> **Instant Demo / Sandbox Mode**:
> If external OAuth or DB credentials are not yet configured, click **"Explore Interactive Demo Sandbox"** on the login page or set `NEXT_PUBLIC_DEMO_MODE="true"`. This loads realistic seeded data so the 3-pane layout, assistant actions, and animated field typing can be tested immediately!

---

## Demo Script (10-Step Verification)

1. **Sign in**: Click "Continue with Google" (or click "Explore Demo Sandbox").
2. **Explore Inbox & Sent**: View real messages rendered with avatars, unread indicator dots, and snippets.
3. **Open AI Copilot**: Click the Copilot toggle in the sidebar or mobile floating action button.
4. **Test Filtering**:
   - Prompt: *"Show only unread emails from this week"*
   - Result: `setFilters` executes in the action trace; Inbox visibly filters to unread items from this week.
5. **Test Navigation**:
   - Prompt: *"Open the latest email from David"*
   - Result: `openLatestEmail` executes; message detail view navigates to David's roadmap email.
6. **Test Context-Aware Reply**:
   - Prompt: *"Reply to this saying thanks, I'll review it today"*
   - Result: `prepareReply` opens Compose with `To` prefilled, subject `Re: ...`, and quoted thread body.
7. **The "Wow" Moment (Live Animated Compose)**:
   - Prompt: *"Send an email to john@example.com with subject Meeting Tomorrow and body Let's meet at 3pm."*
   - Result: Compose window opens; recipient, subject, and body animate typing in live with natural cadence!
8. **Send Confirmation UX**:
   - Result: In-feed Send Confirmation Card appears with recipient preview and explicit "Send Now" button.
   - Click **Send Now** -> Email dispatches via RFC 2822 MIME and appears in your Sent folder.
9. **Real-Time Sync**:
   - Send an email into your account from an external mailbox -> background polling picks it up within ~18s without manual refresh.
10. **Keyboard Navigation**:
    - Press `j` / `k` to move between emails, `c` to compose, `/` to focus search, and `Cmd/Ctrl + Enter` to send.

---

## Architectural Trade-offs

1. **Gmail API over IMAP/SMTP**:
   - The official Gmail REST API provides generous free quotas, native OAuth 2.0 PKCE, granular scopes, and history tracking that avoids heavy IMAP socket connections on serverless platforms like Vercel.
2. **Next.js App Router (Single Full-Stack Repository)**:
   - Houses both client UI and server API routes in one repo, simplifying deployment to Vercel's free Hobby tier without requiring a separate Express or Python backend.
3. **Typed AI Tools over Freeform UI Instructions**:
   - The Gemini model never emits arbitrary DOM manipulation commands. It calls strict, server-validated tools (`openCompose`, `fillCompose`, `setFilters`, etc.) ensuring 100% testability, deterministic state updates, and total defense against malformed actions.
4. **Shared Zustand Store**:
   - Guarantees that manual buttons, keyboard shortcuts, and AI Copilot actions mutate the exact same React state.
5. **Live Gmail Reads over Persistent Email Caching**:
   - Stores only encrypted OAuth tokens and sync metadata in PostgreSQL. Live email bodies remain with Gmail, minimizing sensitive data at rest and eliminating compliance burdens.
6. **Polling `history.list` over Cloud Pub/Sub Webhooks**:
   - Google Cloud Pub/Sub push notifications require GCP billing to be activated. By using visibility-aware background polling on `history.list`, MailPilot remains **100% free with zero credit card required anywhere**.

---

## Automated Test Suite

Run the full Vitest suite:
```bash
npm run test
```

Coverage:
- `tests/unit/crypto.test.ts` — AES-256-GCM encryption/decryption, PKCE challenge derivation, state tokens.
- `tests/unit/mime-builder.test.ts` — RFC 2822 formatting, RFC 2047 headers, base64url encoding, reply threading.
- `tests/unit/search-compiler.test.ts` — Safe structured filter to Gmail query compiler, sanitization.
- `tests/unit/sync-engine.test.ts` — Background polling, stale history 404 recovery, idempotency.
- `tests/unit/tool-validator.test.ts` — 11 typed tool definitions, Gemini schemas, context serialization.
- `tests/unit/prompt-injection.test.ts` — Prompt-injection defenses, backtick escaping, length truncation.

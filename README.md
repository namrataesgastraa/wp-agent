# WhatsApp AI Agent

A production-ready WhatsApp AI agent built with Next.js 14 (App Router) and the
official Meta WhatsApp Business API. The app handles the Meta webhook, generates
AI replies via OpenRouter, and ships a real-time dashboard for viewing and
taking over conversations.

```
User → WhatsApp → Meta webhook (POST /api/webhook)
     → store message → AI reply (OpenRouter) → send via Graph API → store reply
     → dashboard shows everything live (Supabase Realtime)
```

## Tech stack

- **Next.js 14+** (App Router, API route handlers)
- **Supabase** (Postgres + Realtime) via `@supabase/supabase-js`
- **OpenRouter** (OpenAI-compatible SDK) for the AI model
- **Tailwind CSS** for the dashboard UI

## Project structure

```
app/
  api/
    webhook/route.ts                  GET verify + POST receive/respond
    conversations/route.ts            GET list with last-message preview
    conversations/[id]/route.ts       PATCH mode (agent/human)
    conversations/[id]/messages/route.ts   GET history
    conversations/[id]/send/route.ts  POST manual reply
  layout.tsx, page.tsx, globals.css
components/
  Dashboard.tsx   client orchestrator + Supabase Realtime
  Sidebar.tsx     conversation list
  ChatPanel.tsx   message thread, mode toggle, input
lib/
  supabase.ts          server (service-role) client
  supabase-browser.ts  browser (anon) client for Realtime
  whatsapp.ts          Meta Graph API send helper
  ai.ts                OpenRouter completion
  db.ts                find-or-create convo, insert/dedupe messages, history
  types.ts, format.ts
supabase/migration.sql
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (keep secret) |
| `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` | Meta App → WhatsApp → API Setup |
| `WHATSAPP_VERIFY_TOKEN` | Any random string you choose |
| `OPENROUTER_API_KEY` | https://openrouter.ai/keys |
| `OPENROUTER_MODEL` | e.g. `openai/gpt-4o-mini` |

Use a **permanent** access token from a Meta System User — it never expires.

### 3. Create the database schema

Either run the Supabase MCP `apply_migration` tool with the SQL in
`supabase/migration.sql`, or paste that file into the Supabase SQL Editor.
It creates `conversations` + `messages` (with the `mode` column from the start)
and enables Realtime on both tables.

### 4. Run

```bash
npm run dev
```

Dashboard at http://localhost:3000.

## Connect the Meta webhook

1. Expose your app: deploy to Vercel, or `ngrok http 3000` for local testing.
2. Meta App → WhatsApp → Configuration → Webhook:
   - **Callback URL**: `https://<your-host>/api/webhook`
   - **Verify token**: the same value as `WHATSAPP_VERIFY_TOKEN`
3. Subscribe to the **messages** field.

## How it works

- **Webhook GET** echoes `hub.challenge` when the verify token matches.
- **Webhook POST** ignores status updates, dedupes deliveries on
  `whatsapp_msg_id`, stores the inbound message, and — only in **agent** mode —
  generates and sends an AI reply. It always returns `200` quickly so Meta
  doesn't retry.
- **Human mode** stores inbound messages without auto-replying; the operator
  responds from the dashboard. The message input is available in **both** modes,
  so an operator can override the AI any time.
- **Realtime**: the dashboard subscribes to `messages` and `conversations`
  inserts/updates, so new messages and mode changes appear instantly.

## Notes & considerations

- Returns `200` to Meta within milliseconds to avoid webhook retries.
- Duplicate deliveries are dropped via the unique `whatsapp_msg_id` constraint.
- Conversation history (last 20 messages) is sent to the model for context.
- Only text messages are handled; extend `handleInboundMessage` for media.

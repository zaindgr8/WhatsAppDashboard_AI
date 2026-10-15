# DevMate Leads — AI lead management on WhatsApp

A Next.js dashboard for your Twilio WhatsApp number, in the DevMate Solutions theme (light and dark):

- **AI lead scoring** — after each burst of customer messages, Claude scores the chat 0–100, sets its stage (New → Qualified → Hot), and pulls out email, company, budget, interest, a one-line summary and the next step. Without an API key it falls back to keyword rules. A stage you set by hand sticks.
- **Pipeline** — a kanban of every lead by stage (New · Qualified · Hot · Won · Lost). Drag cards to move them; Won/Lost resolves the chat.
- **Command palette** — ⌘K jumps to any lead, page or action. Inbox shortcuts: J/K move, / search, R reply, E resolve, I lead panel; ⌥1–5 switch pages.

- **Inbox** — every WhatsApp chat, live (new messages show up without refreshing), with read/delivered ticks, media, unread counts, search and filters (Unread · Needs human · AI · Manual · Resolved).
- **Agent control** — a global on/off switch, plus a per-chat **AI ↔ Manual** switch. Typing a reply yourself pauses the AI for that chat; "Give back to AI" turns it back on.
- **Human handoff** — keywords ("human", "agent"…) or the AI itself can flag a chat as **Needs human**; the customer gets your handoff message.
- **AI drafts** — the ✨ button writes a suggested reply you can edit before sending.
- **24-hour window** — WhatsApp only allows free-form replies within 24h of the customer's last message; after that the composer switches to sending your approved templates.
- **History** — search all messages by text, phone, author and date; export to CSV. **Sync** imports your past messages from Twilio.
- **Agent settings** — persona and instructions (system prompt), model (Claude Opus 5.5 / Sonnet 5.5 / Haiku 5.5), effort, context length, handoff rules, business hours, and a live activity log.
- **Analytics** — lead funnel, win rate, average lead score, automation rate, response times, handoffs, failures, and messages per day.

Without Twilio credentials it runs in **demo mode** with sample chats, so you can explore it first.

## 1. Run it

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run dev                  # http://localhost:3000
```

## 2. Environment variables

| Variable | Where to find it |
|---|---|
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Twilio Console → Account Info |
| `TWILIO_WHATSAPP_FROM` | Your WhatsApp sender, e.g. `whatsapp:+14155238886` (Sandbox) |
| `TWILIO_MESSAGING_SERVICE_SID` | Optional — send through a Messaging Service instead |
| `PUBLIC_BASE_URL` | The public URL of this app (ngrok or your deployed domain) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `N8N_WEBHOOK_URL` | Optional. Your n8n WhatsApp workflow's webhook. Messages are forwarded to it |
| `SUPABASE_URL` | Your Supabase project URL. Chats, settings and agent activity are stored there |
| `SUPABASE_SECRET_KEY` | Supabase secret key (server-only). Run `supabase/schema.sql` once in the SQL Editor first |
| `DASHBOARD_PASSWORD` | Any password; protects the dashboard (leave empty to disable locally) |

## 3. Connect Twilio to the dashboard

Twilio has to be able to reach your app. Locally, use a tunnel:

```bash
ngrok http 3000
```

Put the `https://….ngrok.app` URL in `PUBLIC_BASE_URL` and restart `npm run dev`. Then in Twilio Console:

- **Sandbox:** Messaging → Try it out → Send a WhatsApp message → *Sandbox settings* → "When a message comes in" = `https://YOUR-URL/api/webhooks/twilio` (HTTP POST).
- **Production sender:** Messaging → Senders → WhatsApp senders → your number → Webhook URL for incoming messages = same URL.

Status callbacks (`/api/webhooks/twilio/status`) are set automatically on every message the dashboard sends. Webhooks are checked against Twilio's `X-Twilio-Signature`, so `PUBLIC_BASE_URL` must match the URL you set in Twilio exactly.

Then open the dashboard and click **Sync** to import your existing chat history.

## Using your n8n workflow as the agent

Set `N8N_WEBHOOK_URL` (or pick **n8n workflow** on the Agent page). Then:

1. Twilio sends each incoming WhatsApp message to the dashboard (`/api/webhooks/twilio`). The dashboard saves it and passes Twilio's original request on to n8n, unchanged, so your workflow keeps working as before. If n8n answers with TwiML, that answer goes back to Twilio.
2. n8n sends its replies through Twilio as usual. The dashboard checks Twilio every 15 seconds and adds them to the chat, marked **Agent**.
3. **Control:** turning the agent off for one chat (**Manual**), pausing it globally, a handoff keyword, or business hours means the message is **not** passed to n8n, and you reply from the dashboard instead.

Note: n8n doesn't see the messages you send from the dashboard, so its memory of the conversation won't include them.

## How the built-in Claude agent works

1. A customer messages your number → Twilio calls `/api/webhooks/twilio` → the message is saved and appears in the Inbox.
2. If the agent is on (globally and for that chat), it waits ~2.5s so several quick messages get one answer, then sends the recent thread to Claude with your instructions.
3. Claude replies, and the reply goes out through Twilio. If Claude decides a human is needed (or a handoff keyword matched), the chat is flagged **Needs human**, AI is switched off for it, and the customer gets your handoff message.
4. Replies use Claude Opus 5.5 at low effort by default (fast enough for chat). On Opus and Sonnet, if Claude's safety filter declines a message, the API automatically retries on a fallback model. If every model declines, the chat is handed to a human.

## Deploying

All data lives in Supabase, so it works on Vercel or any other host. Add `SUPABASE_URL` and `SUPABASE_SECRET_KEY` to the host's environment variables. To copy chats from an older install's `storage/db.json`, run `node --env-file=.env.local scripts/migrate-to-supabase.mjs`.

On Vercel, new messages sent by n8n are pulled from Twilio whenever the dashboard refreshes (about every 20 seconds), because background timers don't run between requests there.

## Leads (Freya's WhatsApp lead log)

The **Leads** page replaces the "Freya - WhatsApp Leads" Google Sheet. It shows the same columns:
phone, name, wa_name, query, association, interest, business_owner, stage, handoff, notes and last_seen.

- The n8n workflow *(DM Inbound) WhatsApp - Freya* rewrites each lead's profile after every message. Its
  **Sync Lead to Dashboard** step upserts the row into the `wa_leads` table in the dashboard's own
  Supabase project (created by `supabase/schema.sql`).
- Filter by stage, interest or handoff, open a lead for full notes, jump to the chat, or export CSV.

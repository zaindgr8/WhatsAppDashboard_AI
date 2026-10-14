# WhatsApp Inbox — Twilio + Claude AI agent dashboard

A Next.js dashboard for your Twilio WhatsApp number:

- **Inbox** — every WhatsApp chat, live (new messages show up without refreshing), with read/delivered ticks, media, unread counts, search and filters (Unread · Needs human · AI · Manual · Resolved).
- **Agent control** — a global on/off switch, plus a per-chat **AI ↔ Manual** switch. Typing a reply yourself pauses the AI for that chat; "Give back to AI" turns it back on.
- **Human handoff** — keywords ("human", "agent"…) or the AI itself can flag a chat as **Needs human**; the customer gets your handoff message.
- **AI drafts** — the ✨ button writes a suggested reply you can edit before sending.
- **24-hour window** — WhatsApp only allows free-form replies within 24h of the customer's last message; after that the composer switches to sending your approved templates.
- **History** — search all messages by text, phone, author and date; export to CSV. **Sync** imports your past messages from Twilio.
- **Agent settings** — persona and instructions (system prompt), model (Claude Opus 5.5 / Sonnet 5.5 / Haiku 5.5), effort, context length, handoff rules, business hours, and a live activity log.
- **Analytics** — automation rate, response times, handoffs, failures, and messages per day.

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
| `DATA_DIR` | Optional. Where chats are stored (default `./data`) |
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

Data is stored in `data/db.json`, so run it on a host with a persistent disk (a VPS, Railway or Render with a volume, or `npm run build && npm start` on your own server). On serverless hosts like Vercel the file and the live updates won't persist. For that, move `src/lib/store.ts` onto Postgres or Supabase; it's the only file that touches storage.

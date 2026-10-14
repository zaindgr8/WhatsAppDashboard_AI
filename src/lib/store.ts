import "server-only";
import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import type { AgentEvent, Conversation, DB, Message, Settings } from "./types";

// A small JSON-file database. Fine for a single dashboard instance; swap for
// Postgres/Supabase if you run more than one server.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export const DEFAULT_SETTINGS: Settings = {
  agentEnabled: true,
  agentMode: process.env.N8N_WEBHOOK_URL ? "n8n" : "claude",
  forwardUrl: process.env.N8N_WEBHOOK_URL || "",
  businessName: "My Business",
  systemPrompt: `You are the friendly WhatsApp assistant for {{business}}.

- Reply in the customer's language, in short WhatsApp-style messages (1-3 sentences).
- Be warm, clear and helpful. Use plain text; avoid markdown headings and tables.
- Never invent prices, policies, order details or availability. If you don't know, say a teammate will follow up.
- If the customer asks for a human, is upset, or needs something you can't do, hand off.`,
  model: "claude-opus-5-5",
  effort: "low",
  historyLimit: 30,
  handoffKeywords: ["human", "agent", "representative", "talk to someone"],
  handoffMessage: "Thanks! I'm connecting you with a member of our team — they'll reply here shortly.",
  businessHoursOnly: false,
  businessHours: { start: "09:00", end: "18:00", timezone: "UTC" },
  outOfHoursMessage: "Thanks for your message! We're currently closed and will get back to you during business hours.",
};

type Global = typeof globalThis & {
  __waDb?: DB;
  __waBus?: EventEmitter;
  __waSaveTimer?: NodeJS.Timeout;
};
const g = globalThis as Global;

export const bus: EventEmitter = g.__waBus ?? (g.__waBus = new EventEmitter());
bus.setMaxListeners(100);

function load(): DB {
  if (g.__waDb) return g.__waDb;
  let db: DB;
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as DB;
    db.settings = { ...DEFAULT_SETTINGS, ...db.settings };
  } catch {
    db = { settings: DEFAULT_SETTINGS, conversations: {}, messages: [], agentEvents: [] };
  }
  g.__waDb = db;
  return db;
}

function save() {
  clearTimeout(g.__waSaveTimer);
  g.__waSaveTimer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(load(), null, 2));
    fs.renameSync(tmp, DB_FILE);
  }, 150);
}

function emit(type: string, conversationId?: string) {
  bus.emit("change", { type, conversationId });
}

export const db = () => load();

// ---------- settings ----------
export function getSettings(): Settings {
  return load().settings;
}
export function updateSettings(patch: Partial<Settings>): Settings {
  const d = load();
  d.settings = { ...d.settings, ...patch };
  save();
  emit("settings");
  return d.settings;
}

// ---------- conversations ----------
export function listConversations(): Conversation[] {
  return Object.values(load().conversations).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}
export function getConversation(id: string): Conversation | undefined {
  return load().conversations[id];
}

export function ensureConversation(id: string, profileName = ""): Conversation {
  const d = load();
  let c = d.conversations[id];
  if (!c) {
    const now = new Date().toISOString();
    c = {
      id,
      phone: id.replace(/^whatsapp:/, ""),
      profileName,
      name: "",
      aiEnabled: true,
      needsHuman: false,
      status: "open",
      unread: 0,
      tags: [],
      notes: "",
      lastMessageAt: now,
      lastMessagePreview: "",
      createdAt: now,
    };
    d.conversations[id] = c;
    save();
  } else if (profileName && c.profileName !== profileName) {
    c.profileName = profileName;
    save();
  }
  return c;
}

export function updateConversation(id: string, patch: Partial<Conversation>): Conversation | undefined {
  const d = load();
  const c = d.conversations[id];
  if (!c) return undefined;
  Object.assign(c, patch, { id: c.id });
  save();
  emit("conversation", id);
  return c;
}

// ---------- messages ----------
export function getMessages(conversationId: string): Message[] {
  return load()
    .messages.filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function hasMessage(id: string) {
  return load().messages.some((m) => m.id === id);
}

/** Insert or update a message and keep the conversation summary in sync. */
export function upsertMessage(msg: Message, opts: { countUnread?: boolean } = {}): Message {
  const d = load();
  const existing = d.messages.find((m) => m.id === msg.id);
  if (existing) {
    Object.assign(existing, msg);
  } else {
    d.messages.push(msg);
  }
  const c = ensureConversation(msg.conversationId);
  if (msg.createdAt >= c.lastMessageAt || !c.lastMessagePreview) {
    c.lastMessageAt = msg.createdAt;
    c.lastMessagePreview = msg.body || (msg.media.length ? "📎 Media" : "");
  }
  if (msg.direction === "inbound") {
    if (!c.lastInboundAt || msg.createdAt > c.lastInboundAt) c.lastInboundAt = msg.createdAt;
    if (!existing && opts.countUnread) {
      c.unread += 1;
      c.status = "open";
    }
  }
  save();
  emit("message", msg.conversationId);
  return existing ?? msg;
}

export function updateMessageStatus(id: string, status: string, error?: string) {
  const m = load().messages.find((x) => x.id === id);
  if (!m || (m.status === status && !error)) return;
  m.status = status;
  if (error) m.error = error;
  save();
  emit("status", m.conversationId);
}

export function searchMessages(q: { text?: string; author?: string; from?: string; to?: string; conversationId?: string }) {
  const text = q.text?.toLowerCase().trim();
  return load()
    .messages.filter((m) => {
      if (q.conversationId && m.conversationId !== q.conversationId) return false;
      if (q.author && q.author !== "all" && m.author !== q.author) return false;
      if (q.from && m.createdAt < q.from) return false;
      if (q.to && m.createdAt > q.to) return false;
      if (text && !m.body.toLowerCase().includes(text) && !m.conversationId.includes(text)) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------- agent activity ----------
export function logAgentEvent(e: Omit<AgentEvent, "id" | "at">) {
  const d = load();
  d.agentEvents.unshift({ ...e, id: crypto.randomUUID(), at: new Date().toISOString() });
  d.agentEvents = d.agentEvents.slice(0, 1000);
  save();
  emit("agent", e.conversationId);
}
export function listAgentEvents(limit = 100) {
  return load().agentEvents.slice(0, limit);
}

"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Bot, Check, CheckCheck, CheckCircle2, Clock, FileText, Hand, Loader2, RefreshCw, Search,
  Send, Sparkles, TriangleAlert, User, X,
} from "lucide-react";
import { api, displayName, initials, timeAgo, useLive } from "@/lib/client";
import type { Conversation, Message } from "@/lib/types";

type Conv = Conversation & { sessionOpen: boolean };
type Template = { sid: string; name: string; language: string; status: string; variables: Record<string, string> };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "human", label: "Needs human" },
  { key: "ai", label: "AI" },
  { key: "manual", label: "Manual" },
  { key: "resolved", label: "Resolved" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

export default function Inbox() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState("");

  const loadList = useCallback(() => api<Conv[]>("/api/conversations").then(setConvs).catch(() => {}), []);
  useEffect(() => {
    loadList();
    const c = new URLSearchParams(window.location.search).get("c");
    if (c) setSelected(c);
  }, [loadList]);

  const select = (id: string | null) => {
    setSelected(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("c", id); else url.searchParams.delete("c");
    window.history.replaceState(null, "", url);
  };

  useLive((e) => { if (e.type !== "hello") loadList(); });

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await api<{ imported: number }>("/api/sync", { method: "POST", json: {} });
      flash(`Synced ${r.imported} messages from Twilio`);
      loadList();
    } catch (e) { flash((e as Error).message); }
    setSyncing(false);
  };

  const counts = useMemo(() => ({
    unread: convs.filter((c) => c.unread > 0).length,
    human: convs.filter((c) => c.needsHuman).length,
  }), [convs]);

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    return convs.filter((c) => {
      if (q && !`${displayName(c)} ${c.phone} ${c.lastMessagePreview}`.toLowerCase().includes(q)) return false;
      switch (filter) {
        case "unread": return c.unread > 0;
        case "human": return c.needsHuman;
        case "ai": return c.aiEnabled && c.status === "open";
        case "manual": return !c.aiEnabled && c.status === "open";
        case "resolved": return c.status === "resolved";
        default: return true;
      }
    });
  }, [convs, filter, query]);

  const current = convs.find((c) => c.id === selected) ?? null;

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <section className={`${selected ? "hidden md:flex" : "flex"} w-full flex-col border-r border-line bg-panel md:w-[340px] md:shrink-0`}>
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h1 className="text-lg font-semibold">Chats</h1>
          <button onClick={sync} disabled={syncing} className="btn px-2.5 py-1.5 text-xs" title="Import past messages from Twilio">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> Sync
          </button>
        </div>
        <div className="px-4 pb-2">
          <label className="relative block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input className="input pl-9" placeholder="Search name, number or message" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
        <div className="scroll-thin flex gap-1.5 overflow-x-auto px-4 pb-3">
          {FILTERS.map((f) => {
            const n = f.key === "unread" ? counts.unread : f.key === "human" ? counts.human : 0;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${filter === f.key ? "bg-ink text-panel" : "bg-panel-2 text-ink-2 hover:text-ink"}`}>
                {f.label}{n > 0 && <span className={`ml-1.5 rounded-full px-1.5 text-[10px] ${f.key === "human" ? "bg-warn text-panel" : "bg-brand text-brand-ink"}`}>{n}</span>}
              </button>
            );
          })}
        </div>
        <ul className="scroll-thin flex-1 overflow-y-auto">
          {visible.map((c) => (
            <li key={c.id}>
              <button onClick={() => select(c.id)}
                className={`flex w-full gap-3 border-l-[3px] px-4 py-3 text-left transition ${selected === c.id ? "border-brand bg-brand-soft/60" : "border-transparent hover:bg-panel-2"}`}>
                <Avatar name={displayName(c)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-sm ${c.unread ? "font-semibold" : "font-medium"}`}>{displayName(c)}</span>
                    <span className={`shrink-0 text-[11px] ${c.unread ? "text-brand" : "text-ink-3"}`}>{timeAgo(c.lastMessageAt)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="truncate text-[13px] text-ink-2">{c.lastMessagePreview || "No messages"}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-1">
                      {c.needsHuman && <span title="Needs a human" className="rounded bg-warn-soft px-1.5 py-0.5 text-[10px] font-semibold text-warn">HUMAN</span>}
                      {c.aiEnabled ? <Bot size={14} className="text-ai" aria-label="AI on" /> : <User size={14} className="text-ink-3" aria-label="Manual" />}
                      {c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold text-brand-ink">{c.unread}</span>}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          ))}
          {!visible.length && (
            <li className="px-6 py-16 text-center text-sm text-ink-3">
              {convs.length ? "No chats match this filter." : "No chats yet. When someone messages your WhatsApp number, it will appear here — or click Sync to import history."}
            </li>
          )}
        </ul>
      </section>

      {/* Thread */}
      {current ? (
        <Thread key={current.id} conv={current} onBack={() => select(null)} onChanged={loadList} flash={flash} />
      ) : (
        <div className="chat-wallpaper hidden flex-1 place-items-center md:grid">
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-panel text-brand shadow-sm"><Bot size={30} /></div>
            <p className="font-medium">Select a chat</p>
            <p className="mt-1 max-w-xs text-sm text-ink-2">Watch your agent reply live, take over any conversation, or hand it back.</p>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-sm text-panel shadow-lg">{toast}</div>}
    </div>
  );
}

function Avatar({ name, size = 42 }: { name: string; size?: number }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return (
    <span className="grid shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
      style={{ width: size, height: size, background: `hsl(${h} 45% 45%)` }}>
      {initials(name)}
    </span>
  );
}

function Thread({ conv, onBack, onChanged, flash }: { conv: Conv; onBack: () => void; onChanged: () => void; flash: (m: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<{ messages: Message[] }>(`/api/conversations/${encodeURIComponent(conv.id)}`).then((r) => setMessages(r.messages)).catch(() => {});
  }, [conv.id]);

  useEffect(() => {
    load();
    if (conv.unread) api(`/api/conversations/${encodeURIComponent(conv.id)}`, { method: "PATCH", json: { unread: 0 } }).then(onChanged).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv.id]);

  useLive((e) => {
    if (e.conversationId === conv.id || e.type === "poll") {
      load();
      if (e.type === "message" && document.visibilityState === "visible")
        api(`/api/conversations/${encodeURIComponent(conv.id)}`, { method: "PATCH", json: { unread: 0 } }).catch(() => {});
    }
  });

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  const patch = async (p: Partial<Conversation>) => {
    await api(`/api/conversations/${encodeURIComponent(conv.id)}`, { method: "PATCH", json: p }).catch((e) => flash(e.message));
    onChanged();
  };

  const send = async (extra?: { contentSid: string }) => {
    if (!extra && !draft.trim()) return;
    setSending(true);
    try {
      await api(`/api/conversations/${encodeURIComponent(conv.id)}/messages`, { method: "POST", json: extra ?? { body: draft } });
      setDraft("");
      load();
      onChanged();
      if (conv.aiEnabled) flash("You took over — agent paused for this chat");
    } catch (e) { flash((e as Error).message); }
    setSending(false);
  };

  const aiDraft = async () => {
    setDrafting(true);
    try {
      const r = await api<{ text: string; handoff: boolean; reason?: string }>(`/api/conversations/${encodeURIComponent(conv.id)}/suggest`, { method: "POST" });
      if (r.handoff) flash(`AI suggests a human handles this: ${r.reason}`);
      else setDraft(r.text);
    } catch (e) { flash((e as Error).message); }
    setDrafting(false);
  };

  const openTemplates = async () => {
    try { setTemplates(await api<Template[]>("/api/templates")); } catch (e) { flash((e as Error).message); }
  };

  const name = displayName(conv);
  const groups = groupByDay(messages);

  return (
    <div className={`flex min-w-0 flex-1`}>
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-panel px-3 py-2.5 md:px-5">
          <button onClick={onBack} className="rounded-lg p-1.5 text-ink-2 hover:bg-panel-2 md:hidden" aria-label="Back"><ArrowLeft size={20} /></button>
          <button onClick={() => setShowInfo((s) => !s)} className="flex min-w-0 items-center gap-3 text-left">
            <Avatar name={name} size={38} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{name}</span>
              <span className="block truncate text-xs text-ink-3">{conv.phone}{conv.profileName && conv.name ? ` · ${conv.profileName}` : ""}</span>
            </span>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <AiSwitch on={conv.aiEnabled} onChange={(v) => patch({ aiEnabled: v })} />
            <button onClick={() => patch({ status: conv.status === "open" ? "resolved" : "open" })}
              className="btn hidden px-2.5 py-1.5 text-xs sm:inline-flex" title={conv.status === "open" ? "Mark resolved" : "Reopen"}>
              <CheckCircle2 size={14} className={conv.status === "resolved" ? "text-brand" : ""} />
              {conv.status === "open" ? "Resolve" : "Reopen"}
            </button>
          </div>
        </header>

        {conv.needsHuman && (
          <div className="flex items-center gap-2 border-b border-line bg-warn-soft px-5 py-2 text-sm text-warn">
            <Hand size={16} className="shrink-0" />
            <span className="min-w-0 flex-1"><b>Needs a human.</b> {conv.handoffReason}</span>
            <button onClick={() => patch({ aiEnabled: true })} className="shrink-0 text-xs font-semibold underline">Give back to agent</button>
          </div>
        )}

        <div className="chat-wallpaper scroll-thin flex-1 overflow-y-auto px-3 py-4 md:px-8">
          {groups.map(([day, items]) => (
            <div key={day}>
              <div className="my-3 text-center"><span className="rounded-lg bg-panel/90 px-3 py-1 text-[11px] font-medium text-ink-2 shadow-sm">{day}</span></div>
              {items.map((m) => <Bubble key={m.id} m={m} />)}
            </div>
          ))}
          {!messages.length && <p className="mt-20 text-center text-sm text-ink-3">No messages yet.</p>}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <footer className="border-t border-line bg-panel px-3 py-3 md:px-5">
          {!conv.sessionOpen && conv.lastInboundAt ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-panel-2 px-4 py-3 text-sm">
              <Clock size={16} className="text-warn" />
              <span className="flex-1 text-ink-2">The 24-hour WhatsApp window is closed. You can only send an approved template until the customer replies.</span>
              <button onClick={openTemplates} className="btn btn-primary py-1.5 text-xs"><FileText size={14} /> Send template</button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <button onClick={aiDraft} disabled={drafting} className="btn h-10 shrink-0 px-2.5 text-ai" title="Draft a reply with AI (you review before sending)">
                {drafting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              </button>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={Math.min(5, Math.max(1, draft.split("\n").length))}
                placeholder={conv.aiEnabled ? "Type to take over from the agent…" : "Type a message"}
                className="input scroll-thin max-h-40 min-h-10 resize-none py-2.5"
              />
              <button onClick={() => send()} disabled={sending || !draft.trim()} className="btn btn-primary h-10 w-10 shrink-0 p-0" aria-label="Send">
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          )}
          <p className="mt-1.5 hidden text-[11px] text-ink-3 md:block">
            {conv.aiEnabled ? "Your agent is replying automatically. Sending a message yourself pauses it for this chat." : "Agent is off for this chat — you're in control."}
          </p>
        </footer>
      </section>

      {showInfo && <ContactPanel conv={conv} onClose={() => setShowInfo(false)} onSave={patch} />}

      {templates && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 px-4" onClick={() => setTemplates(null)}>
          <div className="card max-h-[70vh] w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="font-semibold">Approved templates</h3>
              <button onClick={() => setTemplates(null)} className="text-ink-3"><X size={18} /></button>
            </div>
            <ul className="scroll-thin max-h-[55vh] overflow-y-auto">
              {templates.map((t) => (
                <li key={t.sid} className="flex items-center gap-3 border-b border-line px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{t.name}</div>
                    <div className="text-xs text-ink-3">{t.language} · {t.status}</div>
                  </div>
                  <button className="btn py-1 text-xs" onClick={() => { setTemplates(null); send({ contentSid: t.sid }); }}>Send</button>
                </li>
              ))}
              {!templates.length && <li className="px-5 py-10 text-center text-sm text-ink-3">No templates found. Create one in Twilio Console → Content Template Builder.</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function AiSwitch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} title={on ? "Agent is replying — click to take over" : "You're in control — click to hand back to the agent"}
      className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${on ? "border-transparent bg-ai-soft text-ai" : "border-line bg-panel text-ink-2"}`}>
      {on ? <Bot size={14} /> : <User size={14} />}
      <span className="hidden sm:inline">{on ? "Agent on" : "Manual"}</span>
      <span className={`relative h-4 w-7 rounded-full transition ${on ? "bg-ai" : "bg-line"}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${on ? "left-3.5" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Bubble({ m }: { m: Message }) {
  const out = m.direction === "outbound";
  const bg = !out ? "bg-bubble-in" : m.author === "ai" ? "bg-bubble-ai" : "bg-bubble-out";
  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`mb-1.5 flex ${out ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-[0_1px_0.5px_rgba(0,0,0,0.08)] md:max-w-[65%] ${bg} ${out ? "rounded-tr-md" : "rounded-tl-md"}`}>
        {out && (
          <div className={`mb-0.5 flex items-center gap-1 text-[11px] font-semibold ${m.author === "ai" ? "text-ai" : "text-brand"}`}>
            {m.author === "ai" ? <><Bot size={12} /> Agent</> : <><User size={12} /> You</>}
          </div>
        )}
        {m.media.map((x, i) => <MediaView key={i} url={x.url} type={x.contentType} />)}
        {m.body && <p className="whitespace-pre-wrap break-words text-[14px] leading-snug">{m.body}</p>}
        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-ink-3">
          {time}
          {out && <StatusTick status={m.status} />}
        </div>
        {m.error && <p className="mt-1 flex items-center gap-1 text-[11px] text-danger"><TriangleAlert size={12} /> {m.error}</p>}
      </div>
    </div>
  );
}

function StatusTick({ status }: { status: string }) {
  if (status === "read") return <CheckCheck size={14} className="text-[#53bdeb]" />;
  if (status === "delivered") return <CheckCheck size={14} />;
  if (status === "sent") return <Check size={14} />;
  if (status === "failed" || status === "undelivered") return <TriangleAlert size={12} className="text-danger" />;
  if (status === "demo") return <span title="Demo mode — not actually sent"><Check size={14} /></span>;
  return <Clock size={11} />;
}

function MediaView({ url, type }: { url: string; type: string }) {
  const src = `/api/media?url=${encodeURIComponent(url)}`;
  if (type.startsWith("image/")) return <img src={src} alt="" className="mb-1 max-h-72 rounded-lg" />;
  if (type.startsWith("audio/")) return <audio controls src={src} className="mb-1 max-w-full" />;
  if (type.startsWith("video/")) return <video controls src={src} className="mb-1 max-h-72 rounded-lg" />;
  return <a href={src} target="_blank" rel="noreferrer" className="mb-1 flex items-center gap-2 text-sm underline"><FileText size={14} /> Attachment ({type || "file"})</a>;
}

function ContactPanel({ conv, onClose, onSave }: { conv: Conv; onClose: () => void; onSave: (p: Partial<Conversation>) => Promise<void> }) {
  const [name, setName] = useState(conv.name);
  const [notes, setNotes] = useState(conv.notes);
  const [tag, setTag] = useState("");
  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-[300px] flex-col border-l border-line bg-panel shadow-xl lg:static lg:shadow-none">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h3 className="text-sm font-semibold">Contact</h3>
        <button onClick={onClose} className="text-ink-3 hover:text-ink"><X size={18} /></button>
      </div>
      <div className="scroll-thin flex-1 space-y-5 overflow-y-auto px-5 py-4 text-sm">
        <div className="flex flex-col items-center text-center">
          <Avatar name={displayName(conv)} size={64} />
          <div className="mt-2 font-semibold">{displayName(conv)}</div>
          <div className="text-xs text-ink-3">{conv.phone}</div>
        </div>
        <Field label="Display name">
          <input className="input" value={name} placeholder={conv.profileName || "Add a name"} onChange={(e) => setName(e.target.value)} onBlur={() => name !== conv.name && onSave({ name })} />
        </Field>
        <Field label="Tags">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {conv.tags.map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-panel-2 px-2 py-0.5 text-xs">
                {t}<button onClick={() => onSave({ tags: conv.tags.filter((x) => x !== t) })} className="text-ink-3"><X size={11} /></button>
              </span>
            ))}
          </div>
          <input className="input" value={tag} placeholder="Add tag + Enter" onChange={(e) => setTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && tag.trim()) { onSave({ tags: [...new Set([...conv.tags, tag.trim()])] }); setTag(""); } }} />
        </Field>
        <Field label="Internal notes">
          <textarea className="input min-h-24" value={notes} placeholder="Only your team sees this" onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== conv.notes && onSave({ notes })} />
        </Field>
        <dl className="space-y-2 text-xs">
          <Row k="WhatsApp profile" v={conv.profileName || "—"} />
          <Row k="First contact" v={new Date(conv.createdAt).toLocaleString()} />
          <Row k="Last customer message" v={conv.lastInboundAt ? new Date(conv.lastInboundAt).toLocaleString() : "—"} />
          <Row k="24h window" v={conv.sessionOpen ? "Open" : "Closed"} />
          <Row k="Status" v={conv.status} />
        </dl>
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="mb-1.5 text-xs font-medium text-ink-2">{label}</div>{children}</div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-ink-3">{k}</dt><dd className="text-right font-medium capitalize">{v}</dd></div>;
}

function groupByDay(messages: Message[]): [string, Message[]][] {
  const out = new Map<string, Message[]>();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  for (const m of messages) {
    const d = new Date(m.createdAt);
    const key = d.toDateString() === today ? "Today" : d.toDateString() === yesterday ? "Yesterday" : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    if (!out.has(key)) out.set(key, []);
    out.get(key)!.push(m);
  }
  return [...out];
}

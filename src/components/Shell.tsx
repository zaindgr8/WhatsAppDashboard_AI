"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Bot, History, Kanban, LogOut, MessageCircle, Moon, Search, Sun, Users, Zap } from "lucide-react";
import { api, displayName, useLive } from "@/lib/client";
import type { Conversation } from "@/lib/types";
import { Avatar, Logo, ScoreRing } from "./ui";

const NAV = [
  { href: "/", label: "Inbox", icon: MessageCircle, key: "1" },
  { href: "/leads", label: "Leads", icon: Users, key: "2" },
  { href: "/pipeline", label: "Pipeline", icon: Kanban, key: "3" },
  { href: "/history", label: "History", icon: History, key: "4" },
  { href: "/agent", label: "Agent", icon: Bot, key: "5" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, key: "6" },
];

type Env = { twilioConfigured: boolean; aiConfigured: boolean; demo: boolean; whatsappFrom: string };

/** Open a chat from anywhere: the Inbox listens for this, other pages navigate to it. */
export function openChat(router: ReturnType<typeof useRouter>, path: string, id: string) {
  if (path === "/") window.dispatchEvent(new CustomEvent("open-chat", { detail: id }));
  else router.push(`/?c=${encodeURIComponent(id)}`);
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [agentOn, setAgentOn] = useState<boolean | null>(null);
  const [env, setEnv] = useState<Env | null>(null);
  const [mode, setMode] = useState<"n8n" | "claude">("claude");
  const [palette, setPalette] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => { setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light"); }, []);
  const toggleTheme = useCallback(() => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
    setTheme(next);
  }, []);

  const load = useCallback(() => {
    api<{ settings: { agentEnabled: boolean; agentMode: "n8n" | "claude" }; env: Env }>("/api/settings")
      .then((r) => { setAgentOn(r.settings.agentEnabled); setMode(r.settings.agentMode); setEnv(r.env); })
      .catch(() => {});
  }, []);
  useEffect(load, [load]);
  useLive((e) => e.type === "settings" && load());

  const toggleAgent = useCallback(async () => {
    const next = !agentOn;
    setAgentOn(next);
    await api("/api/settings", { method: "PUT", json: { agentEnabled: next } }).catch(() => setAgentOn(!next));
  }, [agentOn]);

  const logout = useCallback(async () => {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  }, []);

  // Global shortcuts: ⌘K opens the palette, ⌥1–5 jumps between pages (⌘1–5 belongs to the browser's tabs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
      else if (e.altKey && !e.metaKey && !e.ctrlKey && /^Digit[1-6]$/.test(e.code)) { e.preventDefault(); router.push(NAV[Number(e.code.slice(5)) - 1].href); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <aside className="flex shrink-0 items-center gap-1 border-b border-line bg-panel px-2 py-2 md:w-[76px] md:flex-col md:border-b-0 md:border-r md:px-0 md:py-4">
        <Link href="/" className="mr-1 md:mb-5 md:mr-0" title="DevMate Leads"><Logo size={38} /></Link>
        <nav className="flex flex-1 gap-0.5 md:flex-col">
          {NAV.map(({ href, label, icon: Icon, key }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link key={href} href={href} title={`${label}  ⌥${key}`} prefetch
                className={`group relative flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 text-[10.5px] font-medium transition md:mx-2 ${active ? "bg-brand-soft text-brand" : "text-ink-3 hover:bg-panel-2 hover:text-ink"}`}>
                {active && <span className="absolute -left-2 top-1/2 hidden h-5 w-[3px] -translate-y-1/2 rounded-r bg-brand md:block" />}
                <Icon size={19} strokeWidth={active ? 2.3 : 2} />
                <span className="hidden md:block">{label}</span>
              </Link>
            );
          })}
        </nav>
        <button onClick={() => setPalette(true)} title="Search & commands  ⌘K" className="rounded-xl p-2 text-ink-3 hover:bg-panel-2 hover:text-ink md:mx-auto md:mb-1">
          <Search size={18} />
        </button>
        <button onClick={toggleTheme} title={theme === "dark" ? "Light mode" : "Dark mode"} className="hidden rounded-xl p-2 text-ink-3 hover:bg-panel-2 hover:text-ink md:mx-auto md:mb-2 md:block">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button onClick={toggleAgent} disabled={agentOn === null} title={agentOn ? "AI agent is live — click to pause everywhere" : "AI agent is paused — click to resume"}
          className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-[10px] font-semibold uppercase tracking-wide md:mx-2 md:mb-2 ${agentOn === null ? "invisible" : agentOn ? "text-ok" : "text-warn"}`}>
          <span className={`relative h-5 w-9 rounded-full transition ${agentOn ? "bg-ok" : "bg-line"}`}>
            <span className={`absolute top-0.5 grid h-4 w-4 place-items-center rounded-full bg-white shadow transition-all ${agentOn ? "left-[18px]" : "left-0.5"}`}>
              {agentOn && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ok text-ok" />}
            </span>
          </span>
          <span className="hidden whitespace-nowrap md:block">{agentOn ? "AI live" : "Paused"}</span>
        </button>
        <button onClick={logout} title="Sign out" className="hidden rounded-xl p-2 text-ink-3 hover:text-ink md:mx-auto md:block">
          <LogOut size={17} />
        </button>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {env && (env.demo || (mode === "claude" && !env.aiConfigured)) && (
          <div className="flex items-center gap-2 border-b border-line bg-warn-soft px-4 py-1.5 text-xs text-warn">
            <Zap size={13} className="shrink-0" />
            <span>
              {env.demo ? "Demo mode — sample leads shown. Add your Twilio credentials to .env.local to go live." : ""}
              {env.demo && mode === "claude" && !env.aiConfigured ? " · " : ""}
              {mode === "claude" && !env.aiConfigured ? "Set ANTHROPIC_API_KEY to turn on AI replies and AI lead scoring." : ""}
            </span>
          </div>
        )}
        <main className="min-h-0 flex-1">{children}</main>
      </div>
      {palette && (
        <CommandPalette onClose={() => setPalette(false)} path={path} router={router}
          actions={[
            { id: "agent", label: agentOn ? "Pause AI agent everywhere" : "Resume AI agent", icon: Bot, run: toggleAgent },
            { id: "theme", label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode", icon: theme === "dark" ? Sun : Moon, run: toggleTheme },
            { id: "logout", label: "Sign out", icon: LogOut, run: logout },
          ]} />
      )}
    </div>
  );
}

type Item = { id: string; label: string; hint?: string; icon?: React.ComponentType<{ size?: number }>; conv?: Conversation; run: () => void };

function CommandPalette({ onClose, path, router, actions }: {
  onClose: () => void; path: string; router: ReturnType<typeof useRouter>;
  actions: { id: string; label: string; icon: React.ComponentType<{ size?: number }>; run: () => void }[];
}) {
  const [q, setQ] = useState("");
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => { api<Conversation[]>("/api/conversations").then(setConvs).catch(() => {}); }, []);

  const items = useMemo<Item[]>(() => {
    const s = q.toLowerCase().trim();
    const match = (t: string) => !s || t.toLowerCase().includes(s);
    const pages: Item[] = NAV.filter((n) => match(n.label)).map((n) => ({ id: n.href, label: `Go to ${n.label}`, hint: `⌥${n.key}`, icon: n.icon, run: () => router.push(n.href) }));
    const chats: Item[] = convs
      .filter((c) => match(`${displayName(c)} ${c.phone} ${c.lead?.company ?? ""} ${c.lead?.intent ?? ""} ${c.lastMessagePreview}`))
      .slice(0, 8)
      .map((c) => ({ id: c.id, label: displayName(c), hint: c.lead?.intent || c.phone, conv: c, run: () => openChat(router, path, c.id) }));
    const acts: Item[] = actions.filter((a) => match(a.label));
    return s ? [...chats, ...pages, ...acts] : [...pages, ...chats.slice(0, 5), ...acts];
  }, [q, convs, actions, router, path]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => { listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active]);

  const run = (it?: Item) => { if (!it) return; onClose(); it.run(); };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-[2px]" onClick={onClose}>
      <div className="card anim-pop w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={17} className="text-ink-3" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leads, pages, actions…"
            className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
              else if (e.key === "Enter") { e.preventDefault(); run(items[active]); }
              else if (e.key === "Escape") onClose();
            }} />
          <span className="kbd">esc</span>
        </div>
        <ul ref={listRef} className="scroll-thin max-h-[52vh] overflow-y-auto p-1.5">
          {items.map((it, i) => (
            <li key={it.id + i} data-i={i}>
              <button onMouseMove={() => setActive(i)} onClick={() => run(it)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === active ? "bg-panel-2" : ""}`}>
                {it.conv ? <Avatar name={it.label} size={26} /> : it.icon ? <span className="grid h-[26px] w-[26px] place-items-center text-ink-2"><it.icon size={16} /></span> : null}
                <span className="min-w-0 flex-1 truncate font-medium">{it.label}</span>
                {it.conv?.lead && <ScoreRing score={it.conv.lead.score} size={22} />}
                {it.hint && <span className="max-w-[40%] truncate text-xs text-ink-3">{it.hint}</span>}
              </button>
            </li>
          ))}
          {!items.length && <li className="px-3 py-8 text-center text-sm text-ink-3">Nothing matches “{q}”.</li>}
        </ul>
        <div className="flex gap-4 border-t border-line px-4 py-2 text-[11px] text-ink-3">
          <span><span className="kbd">↑</span> <span className="kbd">↓</span> navigate</span>
          <span><span className="kbd">↵</span> open</span>
          <span className="ml-auto"><span className="kbd">⌘</span> <span className="kbd">K</span> toggle</span>
        </div>
      </div>
    </div>
  );
}

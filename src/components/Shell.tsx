"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BarChart3, Bot, History, LogOut, MessageCircle } from "lucide-react";
import { api, useLive } from "@/lib/client";

const NAV = [
  { href: "/", label: "Inbox", icon: MessageCircle },
  { href: "/history", label: "History", icon: History },
  { href: "/agent", label: "Agent", icon: Bot },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

type Env = { twilioConfigured: boolean; aiConfigured: boolean; demo: boolean; whatsappFrom: string };

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [agentOn, setAgentOn] = useState<boolean | null>(null);
  const [env, setEnv] = useState<Env | null>(null);
  const [mode, setMode] = useState<"n8n" | "claude">("claude");

  const load = useCallback(() => {
    api<{ settings: { agentEnabled: boolean; agentMode: "n8n" | "claude" }; env: Env }>("/api/settings")
      .then((r) => { setAgentOn(r.settings.agentEnabled); setMode(r.settings.agentMode); setEnv(r.env); })
      .catch(() => {});
  }, []);
  useEffect(load, [load]);
  useLive((e) => e.type === "settings" && load());

  const toggle = async () => {
    const next = !agentOn;
    setAgentOn(next);
    await api("/api/settings", { method: "PUT", json: { agentEnabled: next } }).catch(() => setAgentOn(!next));
  };

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  };

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <aside className="flex shrink-0 items-center gap-1 border-b border-line bg-panel px-2 py-2 md:w-[76px] md:flex-col md:border-b-0 md:border-r md:px-0 md:py-4">
        <div className="mr-2 grid h-10 w-10 place-items-center rounded-xl bg-brand text-brand-ink md:mb-4 md:mr-0" title="WhatsApp Inbox">
          <MessageCircle size={20} strokeWidth={2.4} />
        </div>
        <nav className="flex flex-1 gap-1 md:flex-col">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link key={href} href={href} title={label}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[11px] font-medium transition md:mx-2 ${active ? "bg-brand-soft text-brand" : "text-ink-3 hover:bg-panel-2 hover:text-ink"}`}>
                <Icon size={20} />
                <span className="hidden md:block">{label}</span>
              </Link>
            );
          })}
        </nav>
        <button onClick={toggle} disabled={agentOn === null} title={agentOn ? "AI agent is live — click to pause" : "AI agent is paused — click to resume"}
          className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold uppercase tracking-wide md:mx-2 md:mb-2 ${agentOn === null ? "invisible" : agentOn ? "text-brand" : "text-warn"}`}>
          <span className={`relative h-5 w-9 rounded-full transition ${agentOn ? "bg-brand" : "bg-line"}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${agentOn ? "left-[18px]" : "left-0.5"}`} />
          </span>
          <span className="hidden md:block">{agentOn ? "AI live" : "Paused"}</span>
        </button>
        <button onClick={logout} title="Sign out" className="rounded-xl p-2 text-ink-3 hover:text-ink md:mx-auto">
          <LogOut size={18} />
        </button>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {env && (env.demo || (mode === "claude" && !env.aiConfigured)) && (
          <div className="border-b border-line bg-warn-soft px-4 py-1.5 text-xs text-warn">
            {env.demo ? "Demo mode — sample chats shown. Add your Twilio credentials to .env.local to go live." : ""}
            {env.demo && mode === "claude" && !env.aiConfigured ? " · " : ""}
            {mode === "claude" && !env.aiConfigured ? "Set ANTHROPIC_API_KEY to turn on AI replies." : ""}
          </div>
        )}
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

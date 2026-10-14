"use client";
import { useEffect, useRef } from "react";

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

export type LiveEvent = { type: string; conversationId?: string };

/** Subscribe to live server events (new messages, status updates, agent activity). */
export function useLive(onEvent: (e: LiveEvent) => void) {
  const ref = useRef(onEvent);
  ref.current = onEvent;
  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout>;
    const connect = () => {
      es = new EventSource("/api/events");
      es.onmessage = (m) => {
        try { ref.current(JSON.parse(m.data)); } catch {}
      };
      es.onerror = () => {
        es?.close();
        retry = setTimeout(connect, 3000);
      };
    };
    connect();
    // Safety net in case the event stream is buffered by a proxy.
    const poll = setInterval(() => ref.current({ type: "poll" }), 15_000);
    return () => { es?.close(); clearTimeout(retry); clearInterval(poll); };
  }, []);
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function displayName(c: { name: string; profileName: string; phone: string }) {
  return c.name || c.profileName || c.phone;
}

export function initials(name: string) {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/);
  if (!parts[0]) return "#";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

"use client";
import { useState } from "react";
import { MessageCircle } from "lucide-react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (res.ok) window.location.href = "/";
    else { setError("That password didn't work."); setBusy(false); }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-brand text-brand-ink"><MessageCircle /></div>
        <h1 className="text-xl font-semibold">WhatsApp Inbox</h1>
        <p className="mb-6 mt-1 text-sm text-ink-2">Sign in to manage chats and your AI agent.</p>
        <input className="input" type="password" autoFocus placeholder="Dashboard password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <button className="btn btn-primary mt-4 w-full" disabled={busy || !password}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}

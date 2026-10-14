"use client";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Logo } from "@/components/ui";

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
    <div className="chat-wallpaper grid min-h-dvh place-items-center px-4">
      <form onSubmit={submit} className="card anim-rise w-full max-w-sm p-8">
        <Logo size={48} />
        <h1 className="mt-6 text-xl font-semibold tracking-tight">DevMate Leads</h1>
        <p className="mb-6 mt-1 text-sm text-ink-2">AI lead management for WhatsApp. Sign in to continue.</p>
        <input className="input" type="password" autoFocus placeholder="Dashboard password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <button className="btn btn-primary mt-4 w-full" disabled={busy || !password}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <>Sign in <ArrowRight size={16} /></>}
        </button>
        <p className="mt-6 text-center text-[11px] text-ink-3">Checkmate your goals · DevMate Solutions</p>
      </form>
    </div>
  );
}

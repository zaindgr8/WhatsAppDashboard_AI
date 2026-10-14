"use client";
import { useState } from "react";
import { ArrowRight, Loader2, User, Lock } from "lucide-react";
import { Logo } from "@/components/ui";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        window.location.href = "/";
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Invalid username or password.");
        setBusy(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="chat-wallpaper grid min-h-dvh place-items-center px-4 py-8">
      <form onSubmit={submit} className="card anim-rise w-full max-w-sm p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <Logo size={42} />
          <div>
            <h1 className="text-xl font-semibold tracking-tight leading-tight">DevMate Leads</h1>
            <p className="text-xs text-ink-3">AI WhatsApp Lead Platform</p>
          </div>
        </div>

        <p className="mb-6 mt-4 text-xs text-ink-2">
          Secure access required. Sign in with your credentials to continue.
        </p>

        <div className="flex flex-col gap-3.5">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-2">
              <User size={13} className="text-ink-3" />
              Username
            </label>
            <input
              className="input w-full"
              type="text"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              autoComplete="username"
              placeholder="e.g. aifounderhub"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-2">
              <Lock size={13} className="text-ink-3" />
              Password
            </label>
            <input
              className="input w-full"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && (
          <div className="mt-3.5 rounded-md bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500 border border-red-500/20">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary mt-5 w-full justify-center py-2.5 font-medium"
          disabled={busy || !username || !password}
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              Sign in <ArrowRight size={15} />
            </>
          )}
        </button>

        <p className="mt-6 text-center text-[11px] text-ink-3">
          Checkmate your goals · DevMate Solutions
        </p>
      </form>
    </div>
  );
}

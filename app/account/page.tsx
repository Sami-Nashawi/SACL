"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import AccountMenu from "@/components/AccountMenu";

// Your account: who you are, and change your password.
export default function Account() {
  const [me, setMe] = useState<{ name: string; email: string; role: string; mustChangePassword: boolean } | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch("/api/auth/me").then((r) => r.json()).then((j) => setMe(j.user)).catch(() => {}); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== again) return setMsg({ ok: false, text: "The new passwords do not match" });
    setBusy(true); setMsg(null);
    const res = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, next }) }).catch(() => null);
    const j = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
    setBusy(false);
    if (res?.ok) {
      if (me?.mustChangePassword) { location.href = "/"; return; }
      setMsg({ ok: true, text: "Password changed." }); setCurrent(""); setNext(""); setAgain("");
    } else setMsg({ ok: false, text: j.error ?? "No connection. Try again." });
  };

  return (
    <>
      <header className="app">
        {me?.mustChangePassword ? <span className="back" /> : <Link href="/" className="back" aria-label="Back to cables">‹</Link>}
        <span className="brand title-ellipsis">Account</span>
        <AccountMenu />
      </header>
      <main className="narrow">
        {me && <section className="card"><b>{me.name}</b><p className="meta">{me.email} · {me.role === "admin" ? "Administrator" : "Engineer"}</p></section>}
        <form className="card form" onSubmit={submit}>
          <h2 className="h2">Change password</h2>
          {me?.mustChangePassword && <p className="banner warn">An administrator set a temporary password for you. Choose your own to continue.</p>}
          <label className="field">{me?.mustChangePassword ? "Temporary password" : "Current password"}
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </label>
          <label className="field">New password (at least 8 characters)
            <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
          </label>
          <label className="field">Confirm new password
            <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required />
          </label>
          {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "banner ok" : "alert"}>{msg.text}</p>}
          <button className="btn primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Change password"}</button>
        </form>
      </main>
    </>
  );
}

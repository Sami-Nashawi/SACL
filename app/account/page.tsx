"use client";
import Link from "next/link";
import { useState } from "react";
import AccountMenu from "@/components/AccountMenu";
import { useSession } from "@/components/SessionProvider";
import { apiFetch, friendlyError } from "@/lib/api";

// Your account: who you are, and change your password.
export default function Account() {
  const { user } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== again) return setMsg({ ok: false, text: "The new passwords do not match" });
    setBusy(true); setMsg(null);
    try {
      const res = await apiFetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, next }) });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        if (user?.mustChangePassword) { location.href = "/"; return; } // full load: the server has issued a fresh sign-in
        setMsg({ ok: true, text: "Password changed." }); setCurrent(""); setNext(""); setAgain("");
      } else setMsg({ ok: false, text: j.error ?? "Could not change the password." });
    } catch (e2) { setMsg({ ok: false, text: friendlyError(e2) }); }
    setBusy(false);
  };

  return (
    <>
      <header className="app">
        {user?.mustChangePassword ? <span className="back" /> : <Link href="/" className="back" aria-label="Back to layouts">‹</Link>}
        <span className="brand title-ellipsis">Account</span>
        <AccountMenu />
      </header>
      <main className="narrow">
        {user && <section className="card fade"><b>{user.name}</b><p className="meta">File no. {user.fileNumber} · {user.role === "admin" ? "Administrator" : "Engineer"}</p></section>}
        <form className="card form" onSubmit={submit}>
          <h2 className="h2">Change password</h2>
          {user?.mustChangePassword && <p className="banner warn">An administrator set a temporary password for you. Choose your own to continue.</p>}
          <label className="field">{user?.mustChangePassword ? "Temporary password" : "Current password"}
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </label>
          <label className="field">New password (at least 8 characters)
            <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
          </label>
          <label className="field">Confirm new password
            <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required />
          </label>
          {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "banner ok" : "alert"}>{msg.text}</p>}
          <button className={`btn primary${busy ? " busy" : ""}`} type="submit" disabled={busy}>Change password</button>
        </form>
      </main>
    </>
  );
}

"use client";
import { useEffect, useState } from "react";

// Sign-in. On a brand-new install (no accounts yet) the same screen creates the first administrator.
export default function Login() {
  const [setup, setSetup] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j: { user: unknown; needsSetup: boolean }) => {
      if (j.user) { location.href = "/"; return; }
      setSetup(j.needsSetup);
    }).catch(() => setSetup(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (setup && password !== confirm) return setError("Passwords do not match");
    setBusy(true);
    const res = await fetch(setup ? "/api/auth/setup" : "/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(setup ? { name, email, password } : { email, password }),
    }).catch(() => null);
    const j = res ? ((await res.json().catch(() => ({}))) as { error?: string; mustChangePassword?: boolean }) : {};
    if (res?.ok) { location.href = j.mustChangePassword ? "/account" : "/"; return; }
    setError(res ? j.error ?? "Could not sign in" : "No connection. Try again."); setBusy(false);
  };

  return (
    <main className="auth">
      <form className="authcard" onSubmit={submit}>
        <div className="logo" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="28" height="28"><path d="M10 46 L26 30 L40 36 L54 16" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div>
          <h1 className="title">{setup ? "Set up Cable Locator" : "Sign in"}</h1>
          <p className="note">{setup ? "Create the first administrator account." : "Use your work email and password."}</p>
        </div>
        {setup === null ? <p className="note">Loading…</p> : <>
          {setup && <label className="field">Full name
            <input value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} required />
          </label>}
          <label className="field">Email
            <input type="email" value={email} autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false}
              onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">Password
            <span className="passrow">
              <input type={show ? "text" : "password"} value={password} autoComplete={setup ? "new-password" : "current-password"}
                onChange={(e) => setPassword(e.target.value)} required minLength={setup ? 8 : undefined} />
              <button type="button" className="btn sm" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
            </span>
          </label>
          {setup && <label className="field">Confirm password
            <input type={show ? "text" : "password"} value={confirm} autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} required />
          </label>}
          {setup && <p className="note">At least 8 characters.</p>}
          {error && <p role="alert" className="alert">{error}</p>}
          <button className="btn primary" type="submit" disabled={busy}>{busy ? "Please wait…" : setup ? "Create account" : "Sign in"}</button>
        </>}
      </form>
    </main>
  );
}

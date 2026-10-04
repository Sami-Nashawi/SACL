"use client";
import { useState } from "react";

export default function Login() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setError("");
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }).catch(() => null);
    if (res?.ok) { location.href = "/"; return; }
    setError(res ? "Wrong code" : "No connection"); setBusy(false);
  };

  return (
    <main className="narrow">
      <h1 className="title">Cable Locator</h1>
      <div className="card form">
        <label className="field">Access code
          <input type="password" autoComplete="current-password" value={code} autoFocus
            onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && code && submit()} />
        </label>
        {error && <p role="alert" className="alert">{error}</p>}
        <button className="btn primary" disabled={!code || busy} onClick={submit}>{busy ? "Checking…" : "Sign in"}</button>
      </div>
    </main>
  );
}

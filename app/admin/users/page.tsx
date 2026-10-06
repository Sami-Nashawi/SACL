"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AccountMenu from "@/components/AccountMenu";
import AdminTabs from "@/components/AdminTabs";

type U = { id: string; name: string; email: string; role: "ADMIN" | "ENGINEER"; active: boolean; mustChangePassword: boolean; lastLoginAt: string | null };

// A readable temporary password with no look-alike characters.
const generate = () => {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(10)), (x) => chars[x % chars.length]).join("");
};
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "never");

// Admin: create accounts, change roles, disable people who leave, reset passwords.
export default function Users() {
  const [users, setUsers] = useState<U[]>([]);
  const [meId, setMeId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ENGINEER" | "ADMIN">("ENGINEER");
  const [password, setPassword] = useState(generate);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    fetch("/api/users").then((r) => r.json()).then((j: { users?: U[]; meId?: string }) => { setUsers(j.users ?? []); setMeId(j.meId ?? ""); }).catch(() => {});
  }, []);
  useEffect(reload, [reload]);

  const call = async (url: string, method: string, body: unknown) => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
    return { ok: !!res?.ok, error: res ? j.error ?? "Something went wrong" : "No connection. Try again." };
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const r = await call("/api/users", "POST", { name, email, role, password });
    setBusy(false);
    if (r.ok) {
      setMsg({ ok: true, text: `Account created for ${email}. Give them this temporary password privately: ${password}. They will choose their own at first sign-in.` });
      setName(""); setEmail(""); setRole("ENGINEER"); setPassword(generate()); reload();
    } else setMsg({ ok: false, text: r.error });
  };

  const patch = async (u: U, body: object, done?: string) => {
    const r = await call(`/api/users/${u.id}`, "PATCH", body);
    setMsg(r.ok ? (done ? { ok: true, text: done } : null) : { ok: false, text: r.error });
    if (r.ok) reload();
  };

  const reset = (u: U) => {
    const pw = prompt(`New temporary password for ${u.name} (at least 8 characters)`, generate());
    if (pw) patch(u, { password: pw }, `Password reset for ${u.email}. Give them this temporary password privately: ${pw}`);
  };

  return (
    <>
      <header className="app">
        <Link href="/" className="back" aria-label="Back to cables">‹</Link>
        <span className="brand title-ellipsis">Manage</span>
        <AccountMenu requireAdmin />
      </header>
      <main>
        <AdminTabs active="users" />
        <form className="card form" onSubmit={add}>
          <h2 className="h2">Add a user</h2>
          <label className="field">Full name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label className="field">Email
            <input type="email" value={email} inputMode="email" autoCapitalize="none" spellCheck={false} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <div className="row">
            <label className="field">Role
              <select value={role} onChange={(e) => setRole(e.target.value as "ENGINEER" | "ADMIN")}>
                <option value="ENGINEER">Engineer (find cables)</option>
                <option value="ADMIN">Administrator (also manage)</option>
              </select>
            </label>
            <label className="field">Temporary password
              <input value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            </label>
          </div>
          <button className="btn primary" type="submit" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
        </form>
        {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "banner ok" : "alert"}>{msg.text}</p>}
        <section className="list">
          <h2 className="h2">People ({users.length})</h2>
          {users.map((u) => (
            <div key={u.id} className="item static">
              <b>{u.name}{u.id === meId && " (you)"}</b>
              <span className="meta">{u.email}</span>
              <span className="meta">
                <span className="rolechip">{u.role === "ADMIN" ? "Administrator" : "Engineer"}</span>{" "}
                {u.active ? (u.mustChangePassword ? "Has not signed in yet" : `Last sign-in ${when(u.lastLoginAt)}`) : <span className="off">Disabled</span>}
              </span>
              <span className="actions">
                <button className="btn sm" onClick={() => reset(u)}>Reset password</button>
                {u.id !== meId && <>
                  <button className="btn sm" onClick={() => patch(u, { role: u.role === "ADMIN" ? "ENGINEER" : "ADMIN" }, u.role === "ADMIN" ? `${u.name} is now an engineer.` : `${u.name} is now an administrator. They must sign out and sign in again to see the admin pages.`)}>{u.role === "ADMIN" ? "Make engineer" : "Make admin"}</button>
                  <button className={`btn sm ${u.active ? "danger" : ""}`} onClick={() => patch(u, { active: !u.active })}>{u.active ? "Disable" : "Enable"}</button>
                </>}
              </span>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";
import AccountMenu from "@/components/AccountMenu";
import AdminTabs from "@/components/AdminTabs";
import { apiFetch } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { EmptyState, ErrorState, ListSkeleton, SlowNote, TopProgress } from "@/components/ui";

type U = { id: string; name: string; fileNumber: string; role: "ADMIN" | "ENGINEER"; active: boolean; mustChangePassword: boolean; lastLoginAt: string | null };

// A readable temporary password with no look-alike characters.
const generate = () => {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(10)), (x) => chars[x % chars.length]).join("");
};
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "never");

// Admin: create accounts, change roles, disable people who leave, reset passwords.
export default function Users() {
  const [name, setName] = useState("");
  const [fileNumber, setFileNumber] = useState("");
  const [role, setRole] = useState<"ENGINEER" | "ADMIN">("ENGINEER");
  const [password, setPassword] = useState(generate);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const res = useResource(async () => {
    const r = await apiFetch("/api/users");
    if (!r.ok) throw new Error(r.status === 403 ? "You do not have admin access." : `Could not load users (${r.status}).`);
    return (await r.json()) as { users: U[]; meId: string };
  }, () => null);
  const users = res.data?.users ?? [];
  const meId = res.data?.meId ?? "";
  const reload = res.reload;

  const call = async (url: string, method: string, body: unknown) => {
    const res = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
    return { ok: !!res?.ok, error: res ? j.error ?? "Something went wrong" : "No connection. Try again." };
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const r = await call("/api/users", "POST", { name, fileNumber, role, password });
    setBusy(false);
    if (r.ok) {
      setMsg({ ok: true, text: `Account created for file number ${fileNumber.trim().toUpperCase()}. Give them this temporary password privately: ${password}. They will choose their own at first sign-in.` });
      setName(""); setFileNumber(""); setRole("ENGINEER"); setPassword(generate()); reload();
    } else setMsg({ ok: false, text: r.error });
  };

  const patch = async (u: U, body: object, done?: string) => {
    const r = await call(`/api/users/${u.id}`, "PATCH", body);
    setMsg(r.ok ? (done ? { ok: true, text: done } : null) : { ok: false, text: r.error });
    if (r.ok) reload();
  };

  const edit = async (u: U) => {
    const name = prompt("Full name", u.name);
    if (name === null) return;
    const fileNumber = prompt("File number", u.fileNumber);
    if (fileNumber === null) return;
    const body: { name?: string; fileNumber?: string } = {};
    if (name.trim() && name.trim() !== u.name) body.name = name;
    if (fileNumber.trim().toUpperCase() !== u.fileNumber) body.fileNumber = fileNumber;
    if (Object.keys(body).length) await patch(u, body, `Updated ${name.trim() || u.name}. If they change their own file number, they sign in with the new one.`);
  };

  const reset = (u: U) => {
    const pw = prompt(`New temporary password for ${u.name} (at least 8 characters)`, generate());
    if (pw) patch(u, { password: pw }, `Password reset for file number ${u.fileNumber}. Give them this temporary password privately: ${pw}`);
  };

  return (
    <>
      <header className="app">
        <Link href="/" className="back" aria-label="Back to cables">‹</Link>
        <span className="brand title-ellipsis">Manage</span>
        <AccountMenu />
      </header>
      <main>
        <TopProgress active={res.refreshing && !!res.data} />
        <AdminTabs active="users" />
        <form className="card form" onSubmit={add}>
          <h2 className="h2">Add a user</h2>
          <label className="field">Full name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label className="field">File number
            <input value={fileNumber} autoCapitalize="characters" spellCheck={false} placeholder="e.g. 10234" onChange={(e) => setFileNumber(e.target.value)} required />
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
          <button className={`btn primary${busy ? " busy" : ""}`} type="submit" disabled={busy}>Create account</button>
        </form>
        {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "banner ok" : "alert"}>{msg.text}</p>}
        <section className="list">
          <h2 className="h2">People{res.data ? ` (${users.length})` : ""}</h2>
          {!res.data && !res.error && <><ListSkeleton rows={3} /><SlowNote show={res.slow} /></>}
          {!res.data && res.error && <ErrorState message={res.error} onRetry={reload} />}
          {res.data && users.length === 0 && <EmptyState title="No users" text="Add the first person above." />}
          {users.map((u) => (
            <div key={u.id} className="item static">
              <b>{u.name}{u.id === meId && " (you)"}</b>
              <span className="meta">File no. {u.fileNumber}</span>
              <span className="meta">
                <span className="rolechip">{u.role === "ADMIN" ? "Administrator" : "Engineer"}</span>{" "}
                {u.active ? (u.mustChangePassword ? "Has not signed in yet" : `Last sign-in ${when(u.lastLoginAt)}`) : <span className="off">Disabled</span>}
              </span>
              <span className="actions">
                <button className="btn sm" onClick={() => edit(u)}>Edit</button>
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

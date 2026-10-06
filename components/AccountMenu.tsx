"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Me = { id: string; name: string; email: string; role: "admin" | "engineer"; mustChangePassword: boolean };

// Avatar in the header. Opens your name, role, the admin links, change password and Sign out.
export default function AccountMenu({ requireAdmin = false }: { requireAdmin?: boolean }) {
  const [me, setMe] = useState<Me | null>(null);
  const box = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j: { user: Me | null }) => {
      if (!j.user) { location.href = "/login"; return; }
      if (requireAdmin && j.user.role !== "admin") { location.href = "/"; return; } // e.g. demoted since this page was opened
      setMe(j.user);
      // An admin set or reset this password: it must be replaced before anything else.
      if (j.user.mustChangePassword && location.pathname !== "/account") location.href = "/account";
    }).catch(() => { /* no signal: keep working with what is saved on the device */ });
  }, []);

  // Close the menu when you tap anywhere else.
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current?.open && !box.current.contains(e.target as Node)) box.current.open = false; };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  if (!me) return <span className="avatar ghost" aria-hidden="true" />;
  const initials = me.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  const signOut = async () => { await fetch("/api/auth/logout", { method: "POST" }).catch(() => {}); location.href = "/login"; };

  return (
    <details ref={box} className="menu">
      <summary className="avatar" aria-label="Account menu">{initials}</summary>
      <div className="menupanel">
        <div className="who">
          <b>{me.name}</b>
          <span className="meta">{me.email}</span>
          <span className="rolechip">{me.role === "admin" ? "Administrator" : "Engineer"}</span>
        </div>
        {me.role === "admin" && <><Link href="/admin">Manage cables</Link><Link href="/admin/users">Users</Link></>}
        <Link href="/account">Change password</Link>
        <button onClick={signOut}>Sign out</button>
      </div>
    </details>
  );
}

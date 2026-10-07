"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useSession } from "./SessionProvider";

// Avatar in the header. Opens your name, role, the admin links, change password and Sign out.
// Reads the session from the layout, so it appears instantly on every screen.
export default function AccountMenu() {
  const { user, signOut } = useSession();
  const box = useRef<HTMLDetailsElement>(null);

  // Close the menu when you tap anywhere else.
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current?.open && !box.current.contains(e.target as Node)) box.current.open = false; };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  if (!user) return null;
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => Array.from(w)[0].toUpperCase()).join("") || "?";

  return (
    <details ref={box} className="menu">
      <summary className="avatar" aria-label="Account menu">{initials}</summary>
      <div className="menupanel">
        <div className="who">
          <b>{user.name}</b>
          <span className="meta">File no. {user.fileNumber}</span>
          <span className="rolechip">{user.role === "admin" ? "Administrator" : "Engineer"}</span>
        </div>
        {user.role === "admin" && <><Link href="/admin">Manage layouts</Link><Link href="/admin/users">Users</Link></>}
        <Link href="/account">Change password</Link>
        <button onClick={signOut}>Sign out</button>
      </div>
    </details>
  );
}

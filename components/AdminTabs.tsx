import Link from "next/link";

export default function AdminTabs({ active }: { active: "cables" | "users" }) {
  return (
    <nav className="tabs" aria-label="Manage">
      <Link href="/admin" aria-current={active === "cables" ? "page" : undefined}>Cables</Link>
      <Link href="/admin/users" aria-current={active === "users" ? "page" : undefined}>Users</Link>
    </nav>
  );
}

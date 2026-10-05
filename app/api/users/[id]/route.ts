import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, validPassword } from "@/lib/password";
import { authorize } from "@/lib/session";

export const dynamic = "force-dynamic";

// Admin: change a role, enable or disable an account, or set a new temporary password.
// You cannot change your own role or disable yourself, so the system always keeps an administrator.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize(true);
  if ("error" in a) return a.error;
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { role?: string; active?: boolean; password?: string };
  if (id === a.user.id && (b.role !== undefined || b.active !== undefined)) {
    return NextResponse.json({ error: "You cannot change your own role or disable your own account" }, { status: 400 });
  }
  const data: { role?: "ADMIN" | "ENGINEER"; active?: boolean; passwordHash?: string; mustChangePassword?: boolean; failedLogins?: number; lockedUntil?: null } = {};
  if (b.role !== undefined) data.role = b.role === "ADMIN" ? "ADMIN" : "ENGINEER";
  if (typeof b.active === "boolean") data.active = b.active;
  if (b.password !== undefined) {
    if (!validPassword(b.password)) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    Object.assign(data, { passwordHash: await hashPassword(b.password), mustChangePassword: true, failedLogins: 0, lockedUntil: null });
  }
  await db.user.update({ where: { id }, data }).catch(() => null);
  return NextResponse.json({ ok: true });
}

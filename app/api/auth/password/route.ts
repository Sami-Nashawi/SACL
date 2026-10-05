import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, validPassword, verifyPassword } from "@/lib/password";
import { authorize } from "@/lib/session";

export const dynamic = "force-dynamic";

// Change your own password.
export async function POST(req: NextRequest) {
  const a = await authorize();
  if ("error" in a) return a.error;
  const b = (await req.json().catch(() => ({}))) as { current?: string; next?: string };
  if (!validPassword(b.next ?? "")) return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  const u = await db.user.findUnique({ where: { id: a.user.id } });
  if (!u || !(await verifyPassword(b.current ?? "", u.passwordHash))) return NextResponse.json({ error: "Current password is wrong" }, { status: 400 });
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(b.next!), mustChangePassword: false } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, validEmail, validPassword } from "@/lib/password";
import { authorize } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const a = await authorize(true);
  if ("error" in a) return a.error;
  const users = await db.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, active: true, mustChangePassword: true, lastLoginAt: true },
  });
  return NextResponse.json({ users, meId: a.user.id });
}

// Admin creates an account with a temporary password; the person must choose their own at first sign-in.
export async function POST(req: NextRequest) {
  const a = await authorize(true);
  if ("error" in a) return a.error;
  const b = (await req.json().catch(() => ({}))) as { name?: string; email?: string; role?: string; password?: string };
  const name = (b.name ?? "").trim(), email = (b.email ?? "").trim().toLowerCase();
  if (!name || name.length > 80) return NextResponse.json({ error: "Enter a name" }, { status: 400 });
  if (!validEmail(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  if (!validPassword(b.password ?? "")) return NextResponse.json({ error: "Temporary password must be at least 8 characters" }, { status: 400 });
  if (await db.user.findUnique({ where: { email } })) return NextResponse.json({ error: "That email already has an account" }, { status: 409 });
  await db.user.create({ data: { name, email, passwordHash: await hashPassword(b.password!), role: b.role === "ADMIN" ? "ADMIN" : "ENGINEER", mustChangePassword: true } });
  return NextResponse.json({ ok: true });
}

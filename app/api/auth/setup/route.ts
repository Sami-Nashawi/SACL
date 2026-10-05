import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, validEmail, validPassword } from "@/lib/password";
import { startSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// First run only: creates the first administrator. Refuses once any account exists.
export async function POST(req: NextRequest) {
  if ((await db.user.count()) > 0) return NextResponse.json({ error: "Already set up" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { name?: string; email?: string; password?: string };
  const name = (b.name ?? "").trim(), email = (b.email ?? "").trim().toLowerCase(), password = b.password ?? "";
  if (!name || name.length > 80) return NextResponse.json({ error: "Enter your name" }, { status: 400 });
  if (!validEmail(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  if (!validPassword(password)) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  const user = await db.user.create({ data: { name, email, passwordHash: await hashPassword(password), role: "ADMIN" } });
  const res = NextResponse.json({ ok: true });
  await startSession(res, user);
  return res;
}

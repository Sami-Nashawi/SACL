import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, normalizeFileNumber, verifyPassword } from "@/lib/password";
import { startSession } from "@/lib/session";

export const dynamic = "force-dynamic";
const MAX_FAILS = 5, LOCK_MINUTES = 15;

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { fileNumber?: string; password?: string };
  const fileNumber = normalizeFileNumber(b.fileNumber ?? ""), password = b.password ?? "";
  const bad = () => NextResponse.json({ error: "Wrong file number or password" }, { status: 401 });
  if (!fileNumber || !password) return bad();

  const user = await db.user.findFirst({ where: { fileNumber: { equals: fileNumber, mode: "insensitive" } } });
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json({ error: `Too many wrong attempts. Try again in ${LOCK_MINUTES} minutes.` }, { status: 429 });
  }
  // Unknown file number: still do the hashing work, so the response time does not reveal which file numbers exist.
  const ok = user ? await verifyPassword(password, user.passwordHash) : (await hashPassword(password), false);
  if (!user || !ok) {
    if (user) {
      const fails = user.failedLogins + 1;
      await db.user.update({ where: { id: user.id }, data: fails >= MAX_FAILS ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) } : { failedLogins: fails } });
    }
    return bad();
  }
  if (!user.active) return NextResponse.json({ error: "This account is disabled. Ask an administrator." }, { status: 403 });

  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  const res = NextResponse.json({ ok: true, mustChangePassword: user.mustChangePassword });
  await startSession(res, user);
  return res;
}

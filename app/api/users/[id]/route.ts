import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, normalizeFileNumber, validFileNumber, validPassword } from "@/lib/password";
import { authorize, invalidateUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// Admin: change a name or file number, change a role, enable or disable an account, or set a new temporary password.
// You cannot change your own role or disable yourself, so the system always keeps an administrator.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize(true);
  if ("error" in a) return a.error;
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { name?: string; fileNumber?: string; role?: string; active?: boolean; password?: string };
  if (id === a.user.id && (b.role !== undefined || b.active !== undefined)) {
    return NextResponse.json({ error: "You cannot change your own role or disable your own account" }, { status: 400 });
  }
  const data: { name?: string; fileNumber?: string; role?: "ADMIN" | "ENGINEER"; active?: boolean; passwordHash?: string; mustChangePassword?: boolean; failedLogins?: number; lockedUntil?: null } = {};
  if (b.name !== undefined) {
    const name = b.name.trim();
    if (!name || name.length > 80) return NextResponse.json({ error: "Enter a name (up to 80 characters)" }, { status: 400 });
    data.name = name;
  }
  if (b.fileNumber !== undefined) {
    const fileNumber = normalizeFileNumber(b.fileNumber);
    if (!validFileNumber(fileNumber)) return NextResponse.json({ error: "Enter a file number: 2 to 24 letters or digits, no spaces" }, { status: 400 });
    if (await db.user.findFirst({ where: { fileNumber: { equals: fileNumber, mode: "insensitive" }, NOT: { id } } })) return NextResponse.json({ error: "That file number already has an account" }, { status: 409 });
    data.fileNumber = fileNumber;
  }
  if (b.role !== undefined) data.role = b.role === "ADMIN" ? "ADMIN" : "ENGINEER";
  if (typeof b.active === "boolean") data.active = b.active;
  if (b.password !== undefined) {
    if (!validPassword(b.password)) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    Object.assign(data, { passwordHash: await hashPassword(b.password), mustChangePassword: true, failedLogins: 0, lockedUntil: null });
  }
  try {
    await db.user.update({ where: { id }, data });
    invalidateUser(id);
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

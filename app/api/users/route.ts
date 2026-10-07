import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, normalizeFileNumber, validFileNumber, validPassword } from "@/lib/password";
import { authorize } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const a = await authorize(true);
  if ("error" in a) return a.error;
  const users = await db.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, fileNumber: true, role: true, active: true, mustChangePassword: true, lastLoginAt: true },
  });
  return NextResponse.json({ users, meId: a.user.id });
}

// Admin creates an account with a temporary password; the person must choose their own at first sign-in.
export async function POST(req: NextRequest) {
  const a = await authorize(true);
  if ("error" in a) return a.error;
  const b = (await req.json().catch(() => ({}))) as { name?: string; fileNumber?: string; role?: string; password?: string };
  const name = (b.name ?? "").trim(), fileNumber = normalizeFileNumber(b.fileNumber ?? "");
  if (!name || name.length > 80) return NextResponse.json({ error: "Enter a name" }, { status: 400 });
  if (!validFileNumber(fileNumber)) return NextResponse.json({ error: "Enter a file number: 2 to 24 letters or digits, no spaces" }, { status: 400 });
  if (!validPassword(b.password ?? "")) return NextResponse.json({ error: "Temporary password must be at least 8 characters" }, { status: 400 });
  if (await db.user.findFirst({ where: { fileNumber: { equals: fileNumber, mode: "insensitive" } } })) return NextResponse.json({ error: "That file number already has an account" }, { status: 409 });
  await db.user.create({ data: { name, fileNumber, passwordHash: await hashPassword(b.password!), role: b.role === "ADMIN" ? "ADMIN" : "ENGINEER", mustChangePassword: true } });
  return NextResponse.json({ ok: true });
}

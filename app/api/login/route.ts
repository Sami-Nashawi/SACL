import { NextRequest, NextResponse } from "next/server";
import { COOKIE, SESSION_DAYS, makeToken, safeEqual, type Role } from "@/lib/auth";
import { currentRole } from "@/lib/session";

export const dynamic = "force-dynamic";

// Who am I? Used by the pages to show or hide the Manage link.
export async function GET() {
  return NextResponse.json({ role: await currentRole() });
}

export async function POST(req: NextRequest) {
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  await new Promise((r) => setTimeout(r, 600)); // slows down guessing
  const input = (code ?? "").trim();
  const admin = process.env.ADMIN_CODE, user = process.env.ACCESS_CODE;
  let role: Role | null = null;
  if (input && admin && safeEqual(input, admin)) role = "admin";
  else if (input && user && safeEqual(input, user)) role = "user";
  if (!role) return NextResponse.json({ error: "Wrong code" }, { status: 401 });
  const res = NextResponse.json({ role });
  res.cookies.set(COOKIE, await makeToken(role), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86400 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "./db";
import { COOKIE, SESSION_DAYS, makeToken, readToken, type Role } from "./auth";

export type SessionUser = { id: string; name: string; email: string; role: Role; mustChangePassword: boolean };

// Who is signed in? Checks the cookie, then the database, so a disabled account stops working at once.
export async function currentUser(): Promise<SessionUser | null> {
  const session = await readToken((await cookies()).get(COOKIE)?.value);
  if (!session) return null;
  const u = await db.user.findUnique({ where: { id: session.id } });
  if (!u || !u.active) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role === "ADMIN" ? "admin" : "engineer", mustChangePassword: u.mustChangePassword };
}

// For API routes: returns the user, or a ready-made error response to send back.
export async function authorize(adminOnly = false): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const user = await currentUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  if (adminOnly && user.role !== "admin") return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  return { user };
}

export async function startSession(res: NextResponse, user: { id: string; role: "ADMIN" | "ENGINEER" }) {
  res.cookies.set(COOKIE, await makeToken({ id: user.id, role: user.role === "ADMIN" ? "admin" : "engineer" }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86400,
  });
}

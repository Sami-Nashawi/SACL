import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "./db";
import { COOKIE, SESSION_DAYS, makeToken, readToken, type Role } from "./auth";

export type SessionUser = { id: string; name: string; fileNumber: string; role: Role; mustChangePassword: boolean };

// The database lookup for "is this account still active?" is remembered for 30 seconds, so a screen that makes
// several API calls pays for it once. Changing or disabling an account clears it at once (invalidateUser).
const TTL_MS = 30_000;
const cache = new Map<string, { at: number; user: SessionUser | null }>();
export const invalidateUser = (id: string) => { cache.delete(id); };

// Who is signed in? Checks the cookie, then the database, so a disabled account stops working.
export async function currentUser(): Promise<SessionUser | null> {
  const session = await readToken((await cookies()).get(COOKIE)?.value);
  if (!session) return null;
  const hit = cache.get(session.id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.user;
  const u = await db.user.findUnique({ where: { id: session.id } });
  const user: SessionUser | null = u && u.active
    ? { id: u.id, name: u.name, fileNumber: u.fileNumber, role: u.role === "ADMIN" ? "admin" : "engineer", mustChangePassword: u.mustChangePassword }
    : null;
  if (cache.size > 500) cache.clear();
  cache.set(session.id, { at: Date.now(), user });
  return user;
}

// For API routes: returns the user, or a ready-made error response to send back.
export async function authorize(adminOnly = false): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const user = await currentUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  if (adminOnly && user.role !== "admin") return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  return { user };
}

type Account = { id: string; role: "ADMIN" | "ENGINEER"; name: string; fileNumber: string; mustChangePassword: boolean };

export async function startSession(res: NextResponse, u: Account) {
  invalidateUser(u.id);
  const token = await makeToken({ id: u.id, role: u.role === "ADMIN" ? "admin" : "engineer", name: u.name, fileNumber: u.fileNumber, mc: u.mustChangePassword });
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86400 });
}

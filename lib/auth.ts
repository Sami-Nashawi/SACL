// Signed session cookie. It holds who you are (user id and role) and when it expires.
// Uses Web Crypto only, so it also runs in middleware. The database is the final word on whether an account is still active.
export type Role = "admin" | "engineer";
export type Session = { id: string; role: Role };
export const COOKIE = "cl_session";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

async function sign(text: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(process.env.SESSION_SECRET ?? ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Compares without stopping at the first difference, so timing does not leak anything.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function makeToken(s: Session): Promise<string> {
  const body = `${s.id}.${s.role}.${Date.now() + SESSION_DAYS * 86400000}`;
  return `${body}.${await sign(body)}`;
}

export async function readToken(token?: string): Promise<Session | null> {
  if (!token || !process.env.SESSION_SECRET) return null;
  const [id, role, exp, sig] = token.split(".");
  if (!id || (role !== "admin" && role !== "engineer") || !(Number(exp) > Date.now()) || !sig) return null;
  return safeEqual(sig, await sign(`${id}.${role}.${exp}`)) ? { id, role } : null;
}

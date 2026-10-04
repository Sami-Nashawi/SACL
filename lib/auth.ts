// Sign-in by access code. Two codes are set in the environment:
// ACCESS_CODE lets field users see and locate cables, ADMIN_CODE also lets you add, rename and delete them.
// The session is a signed cookie. Uses Web Crypto only, so it also runs in middleware.
export type Role = "user" | "admin";
export const COOKIE = "cl_session";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

async function sign(text: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(process.env.SESSION_SECRET ?? ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Compares without stopping at the first difference, so timing does not leak the code.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function makeToken(role: Role): Promise<string> {
  const body = `${role}.${Date.now() + SESSION_DAYS * 86400000}`;
  return `${body}.${await sign(body)}`;
}

export async function readToken(token?: string): Promise<Role | null> {
  if (!token || !process.env.SESSION_SECRET) return null;
  const [role, exp, sig] = token.split(".");
  if ((role !== "user" && role !== "admin") || !(Number(exp) > Date.now()) || !sig) return null;
  return safeEqual(sig, await sign(`${role}.${exp}`)) ? role : null;
}

// Signed session cookie. It carries who you are (id, name, file number, role) and whether you must change your password,
// so pages can show your name with no database call. The database stays the final word on whether an account is active.
// Uses Web Crypto only, so it also runs in middleware.
export type Role = "admin" | "engineer";
export type Session = { id: string; role: Role; name: string; fileNumber: string; mc: boolean };
export const COOKIE = "cl_session";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function sign(text: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(process.env.SESSION_SECRET ?? ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(text))));
}

// Compares without stopping at the first difference, so timing does not leak anything.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function makeToken(s: Session): Promise<string> {
  const payload = b64(enc.encode(JSON.stringify({ ...s, exp: Date.now() + SESSION_DAYS * 86400000 })));
  return `${payload}.${await sign(payload)}`;
}

export async function readToken(token?: string): Promise<Session | null> {
  if (!token || !process.env.SESSION_SECRET) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  if (!safeEqual(token.slice(dot + 1), await sign(payload))) return null;
  try {
    const o = JSON.parse(new TextDecoder().decode(unb64(payload)));
    if (!(o.exp > Date.now()) || !o.id || (o.role !== "admin" && o.role !== "engineer")) return null;
    return { id: String(o.id), role: o.role, name: String(o.name ?? ""), fileNumber: String(o.fileNumber ?? o.email ?? ""), mc: !!o.mc };
  } catch { return null; }
}

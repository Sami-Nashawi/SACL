import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Passwords are never stored. We keep a salted scrypt hash (built into Node, nothing to install).
const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `s1$${salt.toString("hex")}$${(await scrypt(password, salt, 64)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [version, salt, hash] = stored.split("$");
  if (version !== "s1" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(password, Buffer.from(salt, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// A company file number: 2 to 24 letters, digits or - _ . / with no spaces (for example 10234 or CGC-1023). Stored in capitals.
export const normalizeFileNumber = (s: string) => s.trim().toUpperCase();
export const validFileNumber = (s: string) => /^[A-Z0-9][A-Z0-9._\-/]{1,23}$/.test(s);
export const validPassword = (p: string) => p.length >= 8 && p.length <= 200;

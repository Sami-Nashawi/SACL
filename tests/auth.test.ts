import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { makeToken, readToken, SESSION_DAYS } from "@/lib/auth";

beforeAll(() => { process.env.SESSION_SECRET = "unit-test-secret"; });
afterEach(() => vi.useRealTimers());
const me = { id: "u1", role: "admin" as const, name: "Sami", fileNumber: "10234", mc: false };

describe("session cookie", () => {
  it("round-trips the profile, including Arabic names and emoji", async () => {
    for (const name of ["Sami", "سامي المهندس", "José Núñez 👷"]) {
      expect(await readToken(await makeToken({ ...me, name }))).toEqual({ ...me, name });
    }
  });
  it("stays small enough for a cookie even with the longest name and email allowed", async () => {
    const t = await makeToken({ ...me, name: "م".repeat(80), fileNumber: "A".repeat(24) });
    expect(t.length).toBeLessThan(2000);
    expect(await readToken(t)).not.toBeNull();
  });
  it("rejects a changed payload, a wrong signature, a missing signature, and garbage", async () => {
    const t = await makeToken(me); const [payload, sig] = t.split(".");
    const swap = Buffer.from(JSON.stringify({ ...me, role: "engineer", exp: Date.now() + 1e9 })).toString("base64url");
    for (const bad of [`${swap}.${sig}`, `${payload}.AAAA`, payload, "", ".", "a.b.c", "💥"]) expect(await readToken(bad)).toBeNull();
  });
  it("rejects a token signed with a different secret", async () => {
    const t = await makeToken(me); process.env.SESSION_SECRET = "another-secret";
    expect(await readToken(t)).toBeNull(); process.env.SESSION_SECRET = "unit-test-secret";
  });
  it("expires after the session length", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-01-01"));
    const t = await makeToken(me);
    vi.setSystemTime(new Date(Date.now() + (SESSION_DAYS - 1) * 86400000)); expect(await readToken(t)).not.toBeNull();
    vi.setSystemTime(new Date(Date.now() + 2 * 86400000)); expect(await readToken(t)).toBeNull();
  });
  it("is useless without a secret configured", async () => {
    const t = await makeToken(me); delete process.env.SESSION_SECRET;
    expect(await readToken(t)).toBeNull(); process.env.SESSION_SECRET = "unit-test-secret";
  });
});

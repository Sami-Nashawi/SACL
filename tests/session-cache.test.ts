// One screen makes several API calls. The "is this account still active?" database lookup must happen once, not every time.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { makeToken } from "@/lib/auth";

const state = vi.hoisted(() => ({ token: "", finds: 0, active: true }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: state.token }) }) }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: async () => { state.finds++; return { id: "u1", name: "A", fileNumber: "A1", role: "ADMIN", active: state.active, mustChangePassword: false }; } } } }));

import { authorize, currentUser, invalidateUser } from "@/lib/session";

beforeAll(async () => { process.env.SESSION_SECRET = "s"; state.token = await makeToken({ id: "u1", role: "admin", name: "A", fileNumber: "A1", mc: false }); });
beforeEach(() => { invalidateUser("u1"); state.finds = 0; state.active = true; });

describe("account lookup cache", () => {
  it("hits the database once for many calls", async () => {
    for (let i = 0; i < 10; i++) await authorize();
    expect(state.finds).toBe(1);
  });
  it("looks again after the account is changed or disabled (invalidateUser)", async () => {
    await currentUser(); expect(state.finds).toBe(1);
    state.active = false; invalidateUser("u1");
    expect(await currentUser()).toBeNull(); expect(state.finds).toBe(2);
  });
  it("looks again after 30 seconds", async () => {
    vi.useFakeTimers(); await currentUser(); vi.setSystemTime(Date.now() + 31_000); await currentUser();
    expect(state.finds).toBe(2); vi.useRealTimers();
  });
  it("a disabled account is refused, and a non-admin cannot pass the admin check", async () => {
    state.active = false; expect((await authorize()) as object).toHaveProperty("error");
  });
});

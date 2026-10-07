"use client";
import { createContext, useContext, type ReactNode } from "react";
import { signOutAndRedirect } from "@/lib/api";

export type SessionInfo = { id: string; name: string; fileNumber: string; role: "admin" | "engineer"; mustChangePassword: boolean };

const Ctx = createContext<{ user: SessionInfo | null; signOut: () => Promise<void> }>({ user: null, signOut: signOutAndRedirect });

// The signed-in person, read once on the server when the page is first sent. It lives in the root layout, which
// stays mounted while you move between screens, so the menu never refetches and never shows an empty circle.
export function SessionProvider({ user, children }: { user: SessionInfo | null; children: ReactNode }) {
  return <Ctx.Provider value={{ user, signOut: signOutAndRedirect }}>{children}</Ctx.Provider>;
}
export const useSession = () => useContext(Ctx);

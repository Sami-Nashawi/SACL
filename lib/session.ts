import { cookies } from "next/headers";
import { COOKIE, readToken, type Role } from "./auth";

// Server side: who is signed in? (null = nobody)
export async function currentRole(): Promise<Role | null> {
  return readToken((await cookies()).get(COOKIE)?.value);
}

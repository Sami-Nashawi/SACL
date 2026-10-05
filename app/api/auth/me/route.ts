import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// Who am I? Also tells the login page whether this is a brand-new install with no accounts yet.
export async function GET() {
  const user = await currentUser();
  return NextResponse.json({ user, needsSetup: user ? false : (await db.user.count()) === 0 });
}

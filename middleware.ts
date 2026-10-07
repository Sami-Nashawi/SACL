import { NextRequest, NextResponse } from "next/server";
import { COOKIE, readToken } from "@/lib/auth";

// Every page and API needs a sign-in, except the login page and the auth APIs (they check for themselves).
// Signed-in people skip the login page. /admin pages are for admins. Someone who must change a temporary
// password is sent to /account first. The APIs re-check the account in the database.
export async function middleware(req: NextRequest) {
  const session = await readToken(req.cookies.get(COOKIE)?.value);
  const path = req.nextUrl.pathname;
  if (path === "/login") return session ? NextResponse.redirect(new URL(session.mc ? "/account" : "/", req.url)) : NextResponse.next();
  if (!session) {
    return path.startsWith("/api/")
      ? NextResponse.json({ error: "Sign in required" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));
  }
  if (path.startsWith("/admin") && session.role !== "admin") return NextResponse.redirect(new URL("/", req.url));
  if (session.mc && !path.startsWith("/api/") && path !== "/account") return NextResponse.redirect(new URL("/account", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api/auth|_next|icon.svg|manifest.webmanifest|favicon.ico).*)"] };

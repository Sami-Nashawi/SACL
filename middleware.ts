import { NextRequest, NextResponse } from "next/server";
import { COOKIE, readToken } from "@/lib/auth";

// Every page and API needs a sign-in, except the login page itself. /admin needs the admin code.
export async function middleware(req: NextRequest) {
  const role = await readToken(req.cookies.get(COOKIE)?.value);
  const path = req.nextUrl.pathname;
  if (!role) {
    return path.startsWith("/api/")
      ? NextResponse.json({ error: "Sign in required" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));
  }
  if (path.startsWith("/admin") && role !== "admin") return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!login|api/login|_next|icon.svg|manifest.webmanifest|favicon.ico).*)"] };

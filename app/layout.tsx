import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { COOKIE, readToken } from "@/lib/auth";
import { SessionProvider } from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "Cable Locator",
  appleWebApp: { capable: true, title: "Cable Locator", statusBarStyle: "default" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the page use the full screen on iPhone; the CSS keeps content clear of the notch
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f2ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1413" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read from the signed cookie only: no database call, so the page is never held up by it.
  const s = await readToken((await cookies()).get(COOKIE)?.value);
  const user = s ? { id: s.id, name: s.name, fileNumber: s.fileNumber, role: s.role, mustChangePassword: s.mc } : null;
  return (
    <html lang="en">
      <body><SessionProvider user={user}>{children}</SessionProvider></body>
    </html>
  );
}

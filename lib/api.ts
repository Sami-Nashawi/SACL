// Browser side: one place for talking to our own API.
// If the server says the sign-in is no longer valid (401), clear the cookie and go to the login page.
// Clearing first matters: otherwise a disabled account would bounce between / and /login.
export async function signOutAndRedirect() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  location.href = "/login";
}

export async function apiFetch(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 20000);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
    if (res.status === 401) void signOutAndRedirect();
    return res;
  } finally { clearTimeout(timer); }
}

export const friendlyError = (e: unknown) =>
  e instanceof DOMException && e.name === "AbortError" ? "The server took too long to answer."
  : e instanceof Error ? e.message : "Something went wrong.";

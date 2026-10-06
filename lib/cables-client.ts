import type { CableFull, CableSummary } from "./cable-types";

// Browser side: fetch from the server and keep a copy on this device, so a layout you opened once still works with no signal.
const LIST_KEY = "cl:list";
const layoutKey = (project: string) => `cl:layout:${project}`;

const read = <T,>(key: string): T | null => { try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : null; } catch { return null; } };
const write = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage full or blocked: ignore */ } };

// A 401 means the sign-in expired: go to the login page.
async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 401) { location.href = "/login"; throw new Error("signed out"); }
  if (!res.ok) throw new Error(String(res.status));
  return res.json() as Promise<T>;
}

export async function fetchList(): Promise<{ cables: CableSummary[]; offline: boolean }> {
  try {
    const { cables } = await get<{ cables: CableSummary[] }>("/api/cables");
    write(LIST_KEY, cables);
    return { cables, offline: false };
  } catch {
    const saved = read<CableSummary[]>(LIST_KEY);
    if (saved) return { cables: saved, offline: true };
    throw new Error("No connection and nothing saved on this device yet.");
  }
}

// All the lines of one layout, with their points. Saved on the device for use without signal.
export async function fetchLayout(project: string): Promise<{ cables: CableFull[]; offline: boolean }> {
  try {
    const { cables } = await get<{ cables: CableFull[] }>(`/api/cables?project=${encodeURIComponent(project)}`);
    write(layoutKey(project), cables);
    return { cables, offline: false };
  } catch {
    const saved = read<CableFull[]>(layoutKey(project));
    if (saved) return { cables: saved, offline: true };
    throw new Error("Could not load this layout. Connect once to save it on this device.");
  }
}

export const isSavedLayout = (project: string) => read(layoutKey(project)) !== null;
export const forgetLayout = (project: string) => { try { localStorage.removeItem(layoutKey(project)); } catch { /* ignore */ } };

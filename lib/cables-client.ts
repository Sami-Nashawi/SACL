import type { CableFull, CableSummary } from "./cable-types";

// Browser side: fetch from the server and keep a copy on this device, so a cable you opened once still works with no signal.
const LIST_KEY = "cl:list";
const cableKey = (id: string) => `cl:cable:${id}`;

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

export async function fetchCable(id: string): Promise<{ cable: CableFull; offline: boolean }> {
  try {
    const { cable } = await get<{ cable: CableFull }>(`/api/cables/${id}`);
    write(cableKey(id), cable);
    return { cable, offline: false };
  } catch {
    const saved = read<CableFull>(cableKey(id));
    if (saved) return { cable: saved, offline: true };
    throw new Error("Could not load this cable. Connect once to save it on this device.");
  }
}

export const isSaved = (id: string) => read(cableKey(id)) !== null;
export const forgetCable = (id: string) => { try { localStorage.removeItem(cableKey(id)); } catch { /* ignore */ } };

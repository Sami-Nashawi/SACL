import type { CableFull, CableSummary } from "./cable-types";
import { apiFetch, friendlyError } from "./api";

// Browser side: fetch from the server and keep a copy on this device, so a layout you opened once opens instantly
// and still works with no signal.
const LIST_KEY = "cl:list";
const layoutKey = (project: string) => `cl:layout:${project}`;

const read = <T,>(key: string): T | null => { try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : null; } catch { return null; } };
const write = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage full or blocked: ignore */ } };

async function get<T>(url: string): Promise<T> {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(res.status === 401 ? "Your session ended." : `Server error (${res.status}).`);
  return res.json() as Promise<T>;
}

export type ListData = { cables: CableSummary[]; offline: boolean };
export type LayoutData = { cables: CableFull[]; offline: boolean };

// Saved copies, read instantly (no network).
export const cachedList = (): ListData | null => { const c = read<CableSummary[]>(LIST_KEY); return c ? { cables: c, offline: false } : null; };
export const cachedLayout = (project: string): LayoutData | null => { const c = read<CableFull[]>(layoutKey(project)); return c ? { cables: c, offline: false } : null; };

export async function fetchList(): Promise<ListData> {
  try {
    const { cables } = await get<{ cables: CableSummary[] }>("/api/cables");
    write(LIST_KEY, cables);
    return { cables, offline: false };
  } catch (e) {
    const saved = read<CableSummary[]>(LIST_KEY);
    if (saved) return { cables: saved, offline: true };
    throw new Error(`Can't reach the server and nothing is saved on this device yet. (${friendlyError(e)})`);
  }
}

// All the lines of one layout, with their points. Saved on the device for instant opening and use without signal.
export async function fetchLayout(project: string): Promise<LayoutData> {
  try {
    const { cables } = await get<{ cables: CableFull[] }>(`/api/cables?project=${encodeURIComponent(project)}`);
    write(layoutKey(project), cables);
    return { cables, offline: false };
  } catch (e) {
    const saved = read<CableFull[]>(layoutKey(project));
    if (saved) return { cables: saved, offline: true };
    throw new Error(`Could not load this layout. Connect once to save it on this device. (${friendlyError(e)})`);
  }
}

export const isSavedLayout = (project: string) => read(layoutKey(project)) !== null;
export const forgetLayout = (project: string) => { try { localStorage.removeItem(layoutKey(project)); } catch { /* ignore */ } };

"use client";
import { useMemo } from "react";
import type { Line } from "@/lib/engine";

const fmt = (m: number) => (m < 10 ? m.toFixed(1) : m.toFixed(0));

// One chip per kind of line (ETC, IRR, PW ...). Tap to hide or show it on the map and in detection.
export function LayerChips({ lines, hidden, onToggle }: { lines: Line[]; hidden: string[]; onToggle: (layer: string) => void }) {
  const groups = useMemo(() => {
    const m = new Map<string, { layer: string; color: string; count: number }>();
    for (const l of lines) {
      const k = l.layer ?? "";
      m.set(k, { layer: k, color: m.get(k)?.color ?? l.color ?? "#888", count: (m.get(k)?.count ?? 0) + 1 });
    }
    return [...m.values()];
  }, [lines]);
  if (groups.length < 2) return null;
  return (
    <div className="chips" role="group" aria-label="Show or hide kinds of lines">
      {groups.map((g) => (
        <button key={g.layer} className="chip" aria-pressed={!hidden.includes(g.layer)} onClick={() => onToggle(g.layer)}>
          <span className="swatch" style={{ background: g.color }} />{g.layer || "Other"} <span className="meta">{g.count}</span>
        </button>
      ))}
    </div>
  );
}

export type Other = { id: string; name: string; layer: string; color: string; d: number };

// The next nearest lines. Several services often run side by side, so this is a safety check as well as a shortcut.
export function NearbyLines({ others, onLock }: { others: Other[]; onLock: (id: string) => void }) {
  if (!others.length) return null;
  return (
    <section className="card details">
      <h2 className="h2">Other lines nearby</h2>
      {others[0].d <= 5 && <p className="banner warn">{others[0].name} is also very close ({fmt(others[0].d)} m). Check both before digging.</p>}
      {others.map((o) => (
        <button key={o.id} className="nearrow" onClick={() => onLock(o.id)}>
          <span className="swatch" style={{ background: o.color }} />
          <b>{o.name}</b>
          <span className="meta">{o.layer && o.layer !== o.name ? `${o.layer} · ` : ""}{fmt(o.d)} m</span>
          <span className="meta">Lock</span>
        </button>
      ))}
    </section>
  );
}

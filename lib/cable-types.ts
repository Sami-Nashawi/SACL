import type { Line, Pt } from "./engine";
import { colorFor } from "./colors";

// What the list shows (no points, so it stays small even with hundreds of lines).
export type CableSummary = {
  id: string; name: string; project: string; layer: string; color: string; zone: number; lengthM: number;
  minE: number; maxE: number; minN: number; maxN: number; updatedAt: string;
};
export type CableFull = CableSummary & { points: [number, number][] };

// One colour per kind of line (layer): a colour saved on a line wins, otherwise a guess from the layer name.
export function layerColors(items: { layer: string; color: string; name: string }[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const it of items) {
    if (!out.has(it.layer) || (it.color && !out.get(it.layer))) out.set(it.layer, it.color || "");
  }
  let i = 0;
  const first = new Map(items.map((it) => [it.layer, it.name]));
  for (const [layer, color] of out) { out.set(layer, color || colorFor(layer || first.get(layer) || "", i)); i++; }
  return out;
}

export function toLines(cables: CableFull[]): Line[] {
  const colors = layerColors(cables);
  return cables.map((c) => ({
    id: c.id, name: c.name, layer: c.layer, color: c.color || colors.get(c.layer),
    pts: c.points.map(([e, n]): Pt => ({ e, n })),
  }));
}

// A layout = everything saved under one project name: one drawing with many separate lines.
export type Layout = {
  key: string; project: string; name: string; zone: number; lines: number; lengthM: number;
  layers: { layer: string; color: string; count: number }[];
  minE: number; maxE: number; minN: number; maxN: number; search: string;
};
export const UNGROUPED = "__ungrouped";
export const layoutKey = (project: string) => project || UNGROUPED;
export const projectOf = (key: string) => (key === UNGROUPED ? "" : key);

export function groupLayouts(cables: CableSummary[]): Layout[] {
  const by = new Map<string, CableSummary[]>();
  for (const c of cables) by.set(c.project, [...(by.get(c.project) ?? []), c]);
  return [...by.entries()].map(([project, items]) => {
    const colors = layerColors(items);
    const counts = new Map<string, number>();
    for (const c of items) counts.set(c.layer, (counts.get(c.layer) ?? 0) + 1);
    const name = project || "Ungrouped lines";
    return {
      key: layoutKey(project), project, name, zone: items[0].zone, lines: items.length,
      lengthM: items.reduce((s, c) => s + c.lengthM, 0),
      layers: [...counts].map(([layer, count]) => ({ layer, count, color: colors.get(layer) ?? "#888" })),
      minE: Math.min(...items.map((c) => c.minE)), maxE: Math.max(...items.map((c) => c.maxE)),
      minN: Math.min(...items.map((c) => c.minN)), maxN: Math.max(...items.map((c) => c.maxN)),
      search: `${name} ${items.map((c) => `${c.name} ${c.layer}`).join(" ")}`.toLowerCase(),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

// Length and bounding box of a line, used when saving and when previewing a DXF.
export function measure(points: [number, number][]) {
  let lengthM = 0;
  for (let i = 1; i < points.length; i++) lengthM += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  const es = points.map((p) => p[0]), ns = points.map((p) => p[1]);
  return { lengthM, minE: Math.min(...es), maxE: Math.max(...es), minN: Math.min(...ns), maxN: Math.max(...ns) };
}

import type { Line, Pt } from "./engine";

// What the list shows (no points, so it stays small even with hundreds of cables).
export type CableSummary = {
  id: string; name: string; project: string; zone: number; lengthM: number;
  minE: number; maxE: number; minN: number; maxN: number; updatedAt: string;
};
export type CableFull = CableSummary & { points: [number, number][] };

export const toLine = (c: CableFull): Line => ({ name: c.name, pts: c.points.map(([e, n]): Pt => ({ e, n })) });

// Length and bounding box of a line, used when saving and when previewing a DXF.
export function measure(points: [number, number][]) {
  let lengthM = 0;
  for (let i = 1; i < points.length; i++) lengthM += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  const es = points.map((p) => p[0]), ns = points.map((p) => p[1]);
  return { lengthM, minE: Math.min(...es), maxE: Math.max(...es), minN: Math.min(...ns), maxN: Math.max(...ns) };
}

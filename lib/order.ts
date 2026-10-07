import type { Pt } from "./engine";

// Orders separate lines of one kind along the main direction of the whole group, which for a road corridor is the
// direction of the road. "Part 1, 2, 3" then run along the road instead of in the order they were drawn.
export function orderAlong<T extends { pts: Pt[] }>(items: T[]): T[] {
  if (items.length < 2) return items;
  const centres = items.map((it) => ({ it, e: it.pts.reduce((s, p) => s + p.e, 0) / it.pts.length, n: it.pts.reduce((s, p) => s + p.n, 0) / it.pts.length }));
  const me = centres.reduce((s, c) => s + c.e, 0) / centres.length, mn = centres.reduce((s, c) => s + c.n, 0) / centres.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const c of centres) { sxx += (c.e - me) ** 2; syy += (c.n - mn) ** 2; sxy += (c.e - me) * (c.n - mn); }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy); // the direction the centres are most spread out along
  let ax = Math.cos(theta), ay = Math.sin(theta);
  if (Math.abs(ax) >= Math.abs(ay) ? ax < 0 : ay < 0) { ax = -ax; ay = -ay; } // west to east, or south to north for a north-south road
  return centres.map((c) => ({ it: c.it, t: (c.e - me) * ax + (c.n - mn) * ay })).sort((a, b) => a.t - b.t).map((x) => x.it);
}

// "Irrigation 600 mm 3", or just the name when there is only one part.
export const partName = (label: string, n: number, total: number) => (total > 1 ? `${label} ${n}` : label);

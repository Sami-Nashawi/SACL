import type { Pt } from "./engine";

// Maps grid metres (east, north) to canvas pixels and back.
export const CANVAS_W = 800;
export const CANVAS_H = 520;

export type View = { scale: number; cx: number; cy: number }; // pixels per metre, centre in metres

// Pick a scale and centre so all points fit on the canvas with a margin around them.
export function fitView(points: Pt[]): View {
  const es = points.map((p) => p.e);
  const ns = points.map((p) => p.n);
  const minE = Math.min(...es), maxE = Math.max(...es);
  const minN = Math.min(...ns), maxN = Math.max(...ns);
  const width = maxE - minE, height = maxN - minN;
  const margin = Math.max(width, height, 20) * 0.35;
  const scale = Math.min(CANVAS_W / (width + 2 * margin), CANVAS_H / (height + 2 * margin));
  return { scale, cx: (minE + maxE) / 2, cy: (minN + maxN) / 2 };
}

// Canvas y grows DOWNWARD but north grows UPWARD, so the y axis is flipped.
export const gridToPixel = (v: View, p: Pt): [number, number] => [
  (p.e - v.cx) * v.scale + CANVAS_W / 2,
  CANVAS_H / 2 - (p.n - v.cy) * v.scale,
];
export const pixelToGrid = (v: View, x: number, y: number): Pt => ({
  e: (x - CANVAS_W / 2) / v.scale + v.cx,
  n: (CANVAS_H / 2 - y) / v.scale + v.cy,
});

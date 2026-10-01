// Pure guidance engine: no browser APIs, so it can be unit tested and driven by the simulator.
export type Pt = { e: number; n: number };
export type Line = { name: string; pts: Pt[] };
export type Guidance = {
  mode: "approach" | "follow";
  distance: number; // metres to nearest point on the cable
  bearing: number; // degrees from grid north, you -> nearest point
  cardinal: string; // N, NE, E ...
  side: "left" | "right" | "on";
  chainage: number; // metres from start (in walking direction)
  length: number;
  remaining: number;
  nearest: Pt;
  bend: { dist: number; turn: number } | null; // turn > 0 = right
};
type Opts = { forward?: boolean; heading?: number; accuracy?: number; nearM?: number };

const CARD = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const norm = (d: number) => ((d % 360) + 360) % 360;
const bearing = (a: Pt, b: Pt) => norm((Math.atan2(b.e - a.e, b.n - a.n) * 180) / Math.PI);

export function guide(line: Line, p: Pt, o: Opts = {}): Guidance {
  const { forward = true, heading, accuracy = 0, nearM = 20 } = o;
  const pts = forward ? line.pts : [...line.pts].reverse();
  const cum = [0];
  let best = { d: Infinity, i: 0, t: 0, q: pts[0] };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const de = b.e - a.e, dn = b.n - a.n, L2 = de * de + dn * dn;
    cum.push(cum[i] + Math.sqrt(L2));
    const t = L2 ? Math.max(0, Math.min(1, ((p.e - a.e) * de + (p.n - a.n) * dn) / L2)) : 0;
    const q = { e: a.e + t * de, n: a.n + t * dn };
    const d = Math.hypot(p.e - q.e, p.n - q.n);
    if (d < best.d) best = { d, i, t, q };
  }
  const { d, i, t, q } = best;
  const segLen = cum[i + 1] - cum[i];
  const segB = bearing(pts[i], pts[i + 1]);
  const walk = ((heading ?? segB) * Math.PI) / 180; // your walking direction
  const cross = Math.sin(walk) * (q.n - p.n) - Math.cos(walk) * (q.e - p.e); // > 0: cable is on your left
  const toward = bearing(p, q);
  let bend: Guidance["bend"] = null;
  if (i + 2 < pts.length) {
    const turn = norm(bearing(pts[i + 1], pts[i + 2]) - segB + 180) - 180;
    if (Math.abs(turn) > 10) bend = { dist: (1 - t) * segLen, turn };
  }
  const chainage = cum[i] + t * segLen;
  const total = cum[cum.length - 1];
  return {
    mode: d > nearM ? "approach" : "follow",
    distance: d, bearing: toward, cardinal: CARD[Math.round(toward / 45) % 8],
    side: d <= Math.max(accuracy, 0.05) ? "on" : cross > 0 ? "left" : "right",
    chainage, length: total, remaining: total - chainage, nearest: q, bend,
  };
}

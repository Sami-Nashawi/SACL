import { wrap360 } from "./angle";

// Pure guidance engine: no browser code, so it can be tested and driven by the simulator.
export type Pt = { e: number; n: number }; // east, north in metres
export type Line = { name: string; pts: Pt[] };
export type Guidance = {
  mode: "approach" | "follow";
  distance: number; // metres from you to the nearest point on the cable
  bearing: number; // degrees from grid north, from you to that point
  cardinal: string; // N, NE, E ...
  side: "left" | "right" | "on";
  chainage: number; // metres along the cable from its start (in your walking direction)
  length: number;
  remaining: number;
  nearest: Pt;
  bend: { dist: number; turn: number } | null; // turn > 0 means a right turn
  lateral: number; // metres across the cable line; positive = the cable is on your right (needs no compass)
  beyond: "start" | "end" | null; // you are past the start or the end of the cable, not alongside it
  lineBearing: number; // direction of the cable at the nearest point, in your walking order
};
type Options = {
  forward?: boolean; // walk start to end (true) or end to start (false)
  heading?: number; // your real walking direction in degrees, if known
  accuracy?: number; // GPS accuracy in metres
  nearM?: number; // switch from Approach to Follow inside this distance
};

const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const toRad = (deg: number) => (deg * Math.PI) / 180;
const distance = (a: Pt, b: Pt) => Math.hypot(b.e - a.e, b.n - a.n);
// Compass bearing from a to b: 0 = north, 90 = east (atan2 gets east first, then north).
const bearing = (a: Pt, b: Pt) => wrap360((Math.atan2(b.e - a.e, b.n - a.n) * 180) / Math.PI);

// Running length along the cable: [0, length to vertex 1, length to vertex 2, ...]
function cumulativeLengths(pts: Pt[]): number[] {
  const cum = [0];
  for (let i = 0; i < pts.length - 1; i++) cum.push(cum[i] + distance(pts[i], pts[i + 1]));
  return cum;
}

type Hit = { dist: number; seg: number; t: number; raw: number; point: Pt };

// Closest point on the cable to p. t is how far along that segment it is (0 = start, 1 = end).
function nearestOnLine(pts: Pt[], p: Pt): Hit {
  let best: Hit = { dist: Infinity, seg: 0, t: 0, raw: 0, point: pts[0] };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const de = b.e - a.e, dn = b.n - a.n, len2 = de * de + dn * dn;
    const raw = len2 ? ((p.e - a.e) * de + (p.n - a.n) * dn) / len2 : 0; // unclamped: below 0 or above 1 means off the end
    const t = clamp(raw, 0, 1);
    const point = { e: a.e + t * de, n: a.n + t * dn };
    const dist = distance(p, point);
    if (dist < best.dist) best = { dist, seg: i, t, raw, point };
  }
  return best;
}

// Is the target on your left or right, if you face walkDeg? The cross product's sign tells us.
function sideOf(walkDeg: number, you: Pt, target: Pt): "left" | "right" {
  const cross = Math.sin(toRad(walkDeg)) * (target.n - you.n) - Math.cos(toRad(walkDeg)) * (target.e - you.e);
  return cross > 0 ? "left" : "right";
}

// The next noticeable turn ahead (more than 10 degrees), or null.
function bendAhead(pts: Pt[], hit: Hit, cum: number[]): Guidance["bend"] {
  if (hit.seg + 2 >= pts.length) return null;
  const now = bearing(pts[hit.seg], pts[hit.seg + 1]);
  const next = bearing(pts[hit.seg + 1], pts[hit.seg + 2]);
  const turn = wrap360(next - now + 180) - 180; // -180..180, positive = right
  if (Math.abs(turn) <= 10) return null;
  return { dist: (1 - hit.t) * (cum[hit.seg + 1] - cum[hit.seg]), turn };
}

export function guide(line: Line, you: Pt, o: Options = {}): Guidance {
  const { forward = true, heading, accuracy = 0, nearM = 20 } = o;
  const pts = forward ? line.pts : [...line.pts].reverse();
  const cum = cumulativeLengths(pts);
  const hit = nearestOnLine(pts, you);

  const lineDirection = bearing(pts[hit.seg], pts[hit.seg + 1]);
  const walking = heading ?? lineDirection; // real walking direction wins; else assume along the cable
  const toward = bearing(you, hit.point);
  const chainage = cum[hit.seg] + hit.t * (cum[hit.seg + 1] - cum[hit.seg]);
  const length = cum[cum.length - 1];

  // Sideways offset from the cable's own line. Rotating the cable direction a quarter turn clockwise gives
  // "your right"; the dot product with the vector from you to the line is the signed distance.
  const a = pts[hit.seg], b = pts[hit.seg + 1];
  const len = distance(a, b) || 1;
  const lateral = (a.e - you.e) * ((b.n - a.n) / len) - (a.n - you.n) * ((b.e - a.e) / len);
  const beyond = hit.seg === 0 && hit.raw < 0 ? "start" : hit.seg === pts.length - 2 && hit.raw > 1 ? "end" : null;

  return {
    lateral, beyond, lineBearing: lineDirection,
    mode: hit.dist > nearM ? "approach" : "follow",
    distance: hit.dist,
    bearing: toward,
    cardinal: CARDINALS[Math.round(toward / 45) % 8],
    side: hit.dist <= Math.max(accuracy, 0.05) ? "on" : sideOf(walking, you, hit.point),
    chainage, length, remaining: length - chainage,
    nearest: hit.point,
    bend: bendAhead(pts, hit, cum),
  };
}

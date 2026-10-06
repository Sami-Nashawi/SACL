import type { Pt } from "./engine";

export type Fix = Pt & { acc: number };

// How many recent GPS fixes are kept to decide "walking or standing", and how strict the decision is.
// Tuned with a simulation of GPS noise: standing still is rarely called walking, normal walking is reliably detected.
export const MOTION_FIXES = 12;
const MIN_FIXES = 6;
const FLOOR_M = 5;        // never call it movement under this distance
const ACCURACY_FACTOR = 1.5; // movement must also exceed this many times the GPS accuracy

// Walking or standing? Compares the average of the first three fixes with the average of the last three.
// Averaging three fixes on each side cancels most of the random GPS jitter. Heading is in degrees from north.
export function motion(fixes: Fix[]): { moving: boolean; heading?: number } {
  if (fixes.length < MIN_FIXES) return { moving: false };
  const mean = (f: Fix[]) => ({ e: f.reduce((s, x) => s + x.e, 0) / f.length, n: f.reduce((s, x) => s + x.n, 0) / f.length });
  const a = mean(fixes.slice(0, 3)), b = mean(fixes.slice(-3));
  const accuracy = fixes.reduce((s, f) => s + f.acc, 0) / fixes.length;
  const moved = Math.hypot(b.e - a.e, b.n - a.n);
  if (moved <= Math.max(FLOOR_M, ACCURACY_FACTOR * accuracy)) return { moving: false };
  return { moving: true, heading: (((Math.atan2(b.e - a.e, b.n - a.n) * 180) / Math.PI) + 360) % 360 };
}

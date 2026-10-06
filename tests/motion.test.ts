// Is a person walking or standing? Checked with simulated GPS noise (seeded, so the result is repeatable).
import { describe, expect, it } from "vitest";
import { MOTION_FIXES, motion, type Fix } from "@/lib/motion";

function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(7);
const gauss = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R());

describe("motion()", () => {
  it("needs a few fixes before it says anything", () => {
    expect(motion([{ e: 0, n: 0, acc: 3 }, { e: 50, n: 0, acc: 3 }]).moving).toBe(false);
  });
  it("reports the heading: east is 90, north is 0, south-west is 225", () => {
    const walk = (de: number, dn: number): Fix[] => Array.from({ length: 12 }, (_, i) => ({ e: de * i, n: dn * i, acc: 3 }));
    expect(motion(walk(2, 0)).heading).toBeCloseTo(90, 0);
    expect(motion(walk(0, 2)).heading).toBeCloseTo(0, 0);
    expect(motion(walk(-2, -2)).heading).toBeCloseTo(225, 0);
  });
  it("standing exactly still is not moving", () => {
    expect(motion(Array.from({ length: 12 }, () => ({ e: 5, n: 5, acc: 3 }))).moving).toBe(false);
  });

  // Same rule the screen uses: flip only after 5 updates in a row that look like walking against the line.
  const falseFlipsPerMinute = (acc: number) => {
    const sigma = acc / 1.5; let flips = 0; const minutes = 300;
    for (let m = 0; m < minutes; m++) {
      const buf: Fix[] = []; let votes = 0, flipped = false;
      for (let s = 0; s < 60; s++) {
        buf.push({ e: sigma * gauss(), n: sigma * gauss(), acc }); if (buf.length > MOTION_FIXES) buf.shift();
        const mo = motion(buf);
        const against = mo.moving && Math.abs(((mo.heading! - 90 + 540) % 360) - 180) > 120; // line runs east
        votes = against ? votes + 1 : 0; if (votes >= 5) flipped = true;
      }
      if (flipped) flips++;
    }
    return flips / minutes;
  };
  it("rarely flips direction while standing still (accuracy 3 m)", () => { expect(falseFlipsPerMinute(3)).toBeLessThan(0.02); });
  it("rarely flips direction while standing still (accuracy 5 m)", () => { expect(falseFlipsPerMinute(5)).toBeLessThan(0.05); });

  const detected = (speed: number, acc: number) => {
    const sigma = acc / 1.5; let hit = 0; const trials = 300;
    for (let t = 0; t < trials; t++) {
      const buf: Fix[] = []; let ok = false;
      for (let s = 0; s < 22; s++) { buf.push({ e: speed * s + sigma * gauss(), n: sigma * gauss(), acc }); if (buf.length > MOTION_FIXES) buf.shift(); if (s >= 16 && motion(buf).moving) ok = true; }
      if (ok) hit++;
    }
    return hit / trials;
  };
  it("detects normal walking (1.4 m/s) at 3 m and 5 m accuracy", () => { expect(detected(1.4, 3)).toBeGreaterThan(0.97); expect(detected(1.4, 5)).toBeGreaterThan(0.95); });
  it("detects slow walking (1.0 m/s) at 5 m accuracy most of the time", () => { expect(detected(1.0, 5)).toBeGreaterThan(0.85); });
});

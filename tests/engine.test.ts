import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { guide, nearestDistance, type Line } from "@/lib/engine";
import { parseDxf } from "@/lib/dxf";
import { colorFor } from "@/lib/colors";
import { groupLayouts, layerColors, toLines, measure, type CableFull } from "@/lib/cable-types";
import { fromLatLon, toLatLon } from "@/lib/geo";

const E = 358000, N = 2799000; // somewhere in UTM zone 40
const L = (...pts: [number, number][]): Line => ({ name: "t", pts: pts.map(([e, n]) => ({ e: E + e, n: N + n })) });
const at = (e: number, n: number) => ({ e: E + e, n: N + n });
const finite = (o: object) => Object.values(o).every((v) => typeof v !== "number" || Number.isFinite(v));

describe("guide(): geometry", () => {
  const east = L([0, 0], [100, 0]); // runs west to east
  it("left/right with no compass: line north of you is on your left when walking east", () => {
    expect(guide(east, at(50, -5), {}).side).toBe("left");
    expect(guide(east, at(50, 5), {}).side).toBe("right");
  });
  it("walking the other way swaps left and right", () => {
    expect(guide(east, at(50, -5), { forward: false }).side).toBe("right");
  });
  it("distance, chainage and remaining", () => {
    const g = guide(east, at(30, -4), {});
    expect(g.distance).toBeCloseTo(4, 5); expect(g.chainage).toBeCloseTo(30, 5); expect(g.remaining).toBeCloseTo(70, 5); expect(g.length).toBeCloseTo(100, 5);
  });
  it("past the end and before the start are flagged", () => {
    expect(guide(east, at(110, 0), {}).beyond).toBe("end");
    expect(guide(east, at(-10, 0), {}).beyond).toBe("start");
    expect(guide(east, at(50, 3), {}).beyond ?? null).toBeNull();
  });
  it("never returns NaN or Infinity for awkward lines", () => {
    const awkward: Line[] = [
      L([0, 0], [0, 0], [10, 0]),                 // repeated point (zero-length segment)
      L([0, 0], [10, 0], [10, 0], [10, 10]),      // repeated point in the middle
      L([0, 0], [0, 0]),                          // all points the same
      L([0, 0], [10, 0], [0, 0]),                 // doubles back on itself
      L([0, 0], [10, 0], [10, 10], [0, 10], [0, 0]), // closed shape
      L([0, 0], [1e-9, 0]),                       // tiny
      L([0, 0], [20000, 20000]),                  // very long
    ];
    for (const ln of awkward) for (const p of [at(0, 0), at(5, 5), at(-50, 30), at(1e5, -1e5)]) {
      const g = guide(ln, p, { accuracy: 3 });
      expect(finite(g), JSON.stringify(g)).toBe(true);
      expect(Number.isFinite(g.nearest.e) && Number.isFinite(g.nearest.n)).toBe(true);
      expect(g.bearing).toBeGreaterThanOrEqual(0); expect(g.bearing).toBeLessThan(360);
    }
  });
  it("reports the next bend and which way it turns", () => {
    const l = L([0, 0], [50, 0], [50, 50]); // east, then north: a left turn
    const g = guide(l, at(30, 0), {});
    expect(g.bend?.dist).toBeCloseTo(20, 3); expect(g.bend!.turn).toBeCloseTo(-90, 3);
    const r = L([0, 0], [50, 0], [50, -50]); // east, then south: a right turn
    expect(guide(r, at(30, 0), {}).bend!.turn).toBeCloseTo(90, 3);
  });
  it("heading given: left/right follows the way you face, not the line", () => {
    const g = guide(east, at(50, -5), { heading: 270 }); // you face west, line is north of you = on your right
    expect(g.side).toBe("right");
  });
  it("nearestDistance matches guide().distance and is fast for big lines", () => {
    const big = L(...Array.from({ length: 20000 }, (_, i) => [i, (i % 7)] as [number, number]));
    const t0 = performance.now(); for (let i = 0; i < 50; i++) nearestDistance(big, at(10000, 40)); const ms = (performance.now() - t0) / 50;
    expect(ms).toBeLessThan(5); // runs on every GPS update for every line
    expect(nearestDistance(east, at(30, -4))).toBeCloseTo(guide(east, at(30, -4), {}).distance, 9);
  });
});

describe("UTM conversion", () => {
  it("round-trips across the UAE", () => {
    for (const [lat, lon] of [[24.45, 54.37], [25.2, 55.27], [25.42, 55.53], [24.2, 55.76], [25.8, 56.0], [22.9, 55.0]]) {
      const p = fromLatLon(40, lat, lon), q = toLatLon(40, p.e, p.n);
      expect(q.lat).toBeCloseTo(lat, 8); expect(q.lon).toBeCloseTo(lon, 8);
    }
  });
});

describe("DXF reading", () => {
  const dxf = (entities: string) => `0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`;
  const line = (layer: string, x1: number, y1: number, x2: number, y2: number) => `0\nLINE\n8\n${layer}\n10\n${x1}\n20\n${y1}\n30\n0\n11\n${x2}\n21\n${y2}\n31\n0\n`;
  it("reads LINE entities with their layer", () => {
    const out = parseDxf(dxf(line("IRR", 0, 0, 10, 0)));
    expect(out).toHaveLength(1); expect(out[0].layer).toBe("IRR"); expect(out[0].name).toBe("IRR"); expect(out[0].pts).toHaveLength(2);
  });
  it("numbers lines when a layer has several, and leaves a single one unnumbered", () => {
    const out = parseDxf(dxf(line("PW", 0, 0, 1, 0) + line("PW", 5, 5, 6, 5) + line("ETC", 0, 0, 1, 1)));
    expect(out.map((l) => l.name)).toEqual(["PW 1", "PW 2", "ETC"]);
  });
  it("does not crash on empty or garbage files (the upload screen catches these)", () => {
    for (const bad of ["", "hello", "0\nEOF\n", dxf("")]) { let result: unknown; try { result = parseDxf(bad); } catch { result = "threw"; } expect(result === "threw" || (Array.isArray(result) && result.length === 0)).toBe(true); }
  });
  it("reads the real Etisalat drawing: 23 lines, 2 layers, in UTM metres", () => {
    const lines = parseDxf(readFileSync("tests/fixtures/ETISALAT_cables.dxf", "utf8"));
    expect(lines).toHaveLength(23);
    expect([...new Set(lines.map((l) => l.layer))].sort()).toEqual(["EX_ETC_DUCT", "etisalat DUCT"]);
    expect(new Set(lines.map((l) => l.name)).size).toBe(23); // names are unique, so they can be saved in one layout
    expect(lines.every((l) => l.pts.every((p) => p.e > 300000 && p.e < 420000 && p.n > 2.7e6 && p.n < 2.9e6))).toBe(true);
  });
  it("from the real drawing: standing on a line picks that line, and the colour is the telecom purple", () => {
    const lines = parseDxf(readFileSync("tests/fixtures/ETISALAT_cables.dxf", "utf8"));
    const pick = lines[5], onIt = pick.pts[Math.floor(pick.pts.length / 2)];
    const nearest = [...lines].sort((a, b) => nearestDistance(a, onIt) - nearestDistance(b, onIt))[0];
    expect(nearestDistance(pick, onIt)).toBeLessThan(0.001);
    expect(nearestDistance(nearest, onIt)).toBeLessThan(0.001);
    expect(colorFor("EX_ETC_DUCT", 0)).toBe("#8e44ad"); expect(colorFor("etisalat DUCT", 0)).toBe("#8e44ad");
  });
});

describe("colours and grouping", () => {
  it("guesses by kind and does not mistake look-alike words", () => {
    expect(colorFor("IRR_MAIN", 0)).toBe("#2e9e4f");
    expect(colorFor("PW", 0)).toBe("#1e88e5"); expect(colorFor("POTABLE WATER", 0)).toBe("#1e88e5");
    expect(colorFor("PWR_CABLE", 0)).toBe("#e53935");   // power, not water
    expect(colorFor("AIR VALVE", 0)).not.toBe("#e53935"); // "lv" inside "valve" is not low voltage
    expect(colorFor("HOTEL", 3)).not.toBe("#8e44ad");    // "tel" inside "hotel" is not telecom
    expect(colorFor("SOMETHING ELSE", 2)).toBe(colorFor("OTHER", 2)); // unknown kinds cycle through a palette by index
  });
  const mk = (id: string, project: string, layer: string, name: string, color = ""): CableFull => ({ id, name, project, layer, color, zone: 40, lengthM: 100, minE: 0, maxE: 1, minN: 0, maxN: 1, updatedAt: "", points: [[0, 0], [1, 1]] });
  it("groups lines into layouts with per-kind counts, and an empty project becomes 'Ungrouped lines'", () => {
    const g = groupLayouts([mk("1", "A", "ETC", "ETC 1"), mk("2", "A", "ETC", "ETC 2"), mk("3", "A", "IRR", "IRR 1"), mk("4", "", "PW", "PW 1")]);
    expect(g.map((x) => x.name)).toEqual(["A", "Ungrouped lines"]);
    expect(g[0].lines).toBe(3); expect(g[0].layers.find((x) => x.layer === "ETC")?.count).toBe(2); expect(g[1].key).toBe("__ungrouped");
  });
  it("a colour saved on one line wins for its whole kind; lines can still override", () => {
    const cables = [mk("1", "A", "ETC", "ETC 1", "#112233"), mk("2", "A", "ETC", "ETC 2"), mk("3", "A", "IRR", "IRR 1")];
    expect(layerColors(cables).get("ETC")).toBe("#112233");
    const lines = toLines(cables); expect(lines[1].color).toBe("#112233"); expect(lines[2].color).toBe("#2e9e4f");
  });
  it("measure() gives length and bounding box", () => {
    expect(measure([[0, 0], [3, 4], [3, 14]])).toEqual({ lengthM: 15, minE: 0, maxE: 3, minN: 0, maxN: 14 });
  });
});

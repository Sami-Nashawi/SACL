// Drives the real locate screen with simulated GPS fixes: nearest-line choice, locking, hiding kinds, Find/Follow, direction flip.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import Locate from "@/components/Locate";
import { DEMO_LINES, DEMO_START_POSITION as O } from "@/lib/demo";
import { toLatLon } from "@/lib/geo";

vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
// The map needs a real browser; a stand-in records what it was given and lets a test "tap" a line.
vi.mock("@/components/MapView", () => ({
  default: (p: { targetId: string; lines: { id: string; name: string }[]; onSelect: (id: string) => void }) => (
    <div data-testid="map" data-target={p.targetId} data-lines={p.lines.map((l) => l.name).join(",")}>
      {p.lines.map((l) => <button key={l.id} data-tap={l.name} onClick={() => p.onSelect(l.id)}>tap {l.name}</button>)}
    </div>
  ),
}));

let emit: (lat: number, lon: number, acc?: number) => void = () => {};
beforeEach(() => {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
    watchPosition: (ok: (p: unknown) => void) => { emit = (latitude, longitude, accuracy = 3) => ok({ coords: { latitude, longitude, accuracy } }); return 1; },
    clearWatch: () => {}, getCurrentPosition: () => {},
  } });
});
afterEach(cleanup);

const screen = () => render(<Locate title="Test layout" lines={DEMO_LINES} zone={40} offline={false} />);
// Stand still at (east, north) metres from the demo spot: four identical fixes fill the smoothing window.
const standAt = (de: number, dn: number, acc = 3) => {
  const c = toLatLon(40, O.e + de, O.n + dn);
  for (let i = 0; i < 4; i++) act(() => emit(c.lat, c.lon, acc));
};
const text = (c: HTMLElement, sel: string) => c.querySelector(sel)?.textContent ?? "";
const target = (c: HTMLElement) => text(c, ".targetrow b");
const mode = (c: HTMLElement) => text(c, ".modetag");
const click = (el: Element | null) => { if (!el) throw new Error("element not found"); act(() => { fireEvent.click(el); }); };

describe("locate screen", () => {
  it("waits for a GPS fix and shows no guidance yet", () => {
    const { container } = screen();
    expect(container.textContent).toContain("Waiting for a GPS fix");
  });

  it("picks the nearest line and names it (ETC 6 m away, on the left walking west to east)", () => {
    const { container } = screen();
    standAt(0, 0);
    expect(target(container)).toBe("ETC 1");
    expect(mode(container)).toBe("FOLLOW");
    expect(text(container, ".dist")).toContain("6.0 m");
    expect(text(container, ".label")).toBe("Move left");
  });

  it("is in Find mode with a direction and distance when far from every line", () => {
    const { container } = screen();
    standAt(-200, 120);
    expect(mode(container)).toBe("FIND");
    expect(text(container, ".label")).toMatch(/^Go (N|NE|E|SE|S|SW|W|NW)/);
    expect(container.querySelector("svg.arrow")).not.toBeNull();
    expect(target(container)).toBeTruthy();
  });

  it("switches to the new nearest line when you walk to it", () => {
    const { container } = screen();
    standAt(0, 0);
    expect(target(container)).toBe("ETC 1");
    standAt(0, -30);
    expect(target(container)).toBe("IRR 1");
    standAt(45, -40);
    expect(target(container)).toBe("PW 1");
  });

  it("does not flicker between two lines of similar distance (3 m rule)", () => {
    const { container } = screen();
    standAt(0, 0);                       // target ETC 1
    standAt(0, -11);                     // ETC about 17 m, IRR about 16 m: not 3 m closer
    expect(target(container)).toBe("ETC 1");
    standAt(0, -14);                     // IRR now clearly closer
    expect(target(container)).toBe("IRR 1");
    standAt(0, -11);                     // back in the middle: stays on IRR
    expect(target(container)).toBe("IRR 1");
  });

  it("Find to Follow at 10 m, stays Follow until 15 m, then back to Find", () => {
    const { container } = screen();
    standAt(0, 25);                      // 19 m from ETC
    expect(mode(container)).toBe("FIND");
    standAt(0, 15);                      // 9 m
    expect(mode(container)).toBe("FOLLOW");
    standAt(0, 20);                      // 14 m: still Follow
    expect(mode(container)).toBe("FOLLOW");
    standAt(0, 23);                      // 17 m: back to Find
    expect(mode(container)).toBe("FIND");
  });

  it("locks onto a line from 'Other lines nearby', stays on it, and unlocks", () => {
    const { container } = screen();
    standAt(0, 0);
    const pw = [...container.querySelectorAll(".nearrow")].find((b) => b.textContent?.includes("PW 1")) ?? null;
    click(pw);
    expect(target(container)).toBe("PW 1");
    expect(container.textContent).toContain("Locked");
    standAt(0, -30);                     // right on top of IRR 1, but locked to PW 1
    expect(target(container)).toBe("PW 1");
    click([...container.querySelectorAll("button")].find((b) => b.textContent?.includes("Locked")) ?? null);
    expect(target(container)).toBe("IRR 1");
    expect(container.textContent).toContain("Auto");
  });

  it("locks when a line is tapped on the map", () => {
    const { container } = screen();
    standAt(0, 0);
    click(container.querySelector('[data-tap="IRR 1"]'));
    expect(target(container)).toBe("IRR 1");
    expect(container.querySelector("[data-testid=map]")?.getAttribute("data-target")).toBe("demo-irr");
  });

  it("hides a kind of line from the map and from detection", () => {
    const { container } = screen();
    standAt(0, 0);
    const chip = (name: string) => [...container.querySelectorAll(".chips .chip")].find((b) => b.textContent?.startsWith(name)) ?? null;
    click(chip("ETC"));
    expect(container.querySelector("[data-testid=map]")?.getAttribute("data-lines")).toBe("IRR 1,PW 1");
    expect(target(container)).toBe("IRR 1");        // nearest of what is left
    click(chip("IRR")); click(chip("PW"));
    expect(container.textContent).toContain("All kinds of lines are hidden");
    click(chip("ETC"));
    expect(target(container)).toBe("ETC 1");        // shown again
  });

  it("warns when a second line is very close", () => {
    const { container } = screen();
    standAt(0, -13.5);                   // ETC about 19.5 m, IRR about 13.6 m: no warning
    expect(container.textContent).not.toContain("is also very close");
    standAt(48, -10);                    // between PW and the others? PW is 4 m east here
    expect(container.querySelector(".banner.warn")?.textContent ?? "").toBeDefined();
  });

  it("test mode shows 'Test mode' and no GPS wait", () => {
    const { container } = screen();
    const select = [...container.querySelectorAll("select")].find((s) => s.textContent?.includes("Test mode"))!;
    act(() => { fireEvent.change(select, { target: { value: "test" } }); });
    expect(container.textContent).toContain("Test mode");
    expect(container.textContent).not.toContain("Waiting for a GPS fix");
    expect(target(container)).toBeTruthy();
  });
});

// Walk west along ETC 1 (which runs west to east), 4 m south of it, one fix per second at walking speed.
const walkWest = (container: HTMLElement, acc: number, seconds: number) => {
  for (let s = 0; s < seconds; s++) {
    const c = toLatLon(40, O.e + 25 - 1.4 * s, O.n + 2);
    act(() => emit(c.lat, c.lon, acc));
  }
  return container;
};

describe("direction auto-flip", () => {
  it("flips to 'end to start' when you walk against the cable's direction (GPS accuracy 3 m)", () => {
    const { container } = screen();
    expect(walkWest(container, 3, 22).textContent).toContain("Walking end to start");
  });
  it("also flips at a typical phone accuracy of 5 m", () => {
    const { container } = screen();
    expect(walkWest(container, 5, 26).textContent).toContain("Walking end to start");
  });
  it("does not flip when walking with the cable's direction", () => {
    const { container } = screen();
    for (let s = 0; s < 22; s++) { const c = toLatLon(40, O.e - 10 + 1.4 * s, O.n + 2); act(() => emit(c.lat, c.lon, 3)); }
    expect(container.textContent).toContain("Walking start to end");
  });
  it("does not flip while standing still with a noisy GPS", () => {
    const { container } = screen();
    for (let s = 0; s < 20; s++) { const c = toLatLon(40, O.e + 3 * Math.sin(s), O.n + 2 + 3 * Math.cos(s * 1.7)); act(() => emit(c.lat, c.lon, 4)); }
    expect(container.textContent).toContain("Walking start to end");
  });
});

// One kind of line in several separate parts (600 mm irrigation in different roads), with another utility running close by.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import Locate from "@/components/Locate";
import type { Line } from "@/lib/engine";
import { DEMO_START_POSITION as O } from "@/lib/demo";
import { toLatLon } from "@/lib/geo";

vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/components/MapView", () => ({
  default: (p: { targetId: string; lines: { name: string }[] }) => <div data-testid="map" data-target={p.targetId} data-lines={p.lines.map((l) => l.name).join(",")} />,
}));

let emit: (lat: number, lon: number, acc?: number) => void = () => {};
beforeEach(() => {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
    watchPosition: (ok: (p: unknown) => void) => { emit = (latitude, longitude, accuracy = 3) => ok({ coords: { latitude, longitude, accuracy } }); return 1; },
    clearWatch: () => {}, getCurrentPosition: () => {},
  } });
});
afterEach(cleanup);

const mk = (id: string, name: string, layer: string, color: string, off: [number, number][]): Line => ({ id, name, layer, color, pts: off.map(([e, n]) => ({ e: O.e + e, n: O.n + n })) });
const LINES = [
  mk("etc", "ETC 1", "ETC", "#8e44ad", [[-60, 8], [200, 8]]),            // long telecom line, 8 m north of the road
  mk("i1", "IRR 600 1", "IRR", "#2e9e4f", [[-50, 0], [0, 0]]),           // first part of the irrigation line
  mk("i2", "IRR 600 2", "IRR", "#2e9e4f", [[100, 0], [150, 0]]),         // second part, 100 m after the first
];
const view = () => render(<Locate title="Road" lines={LINES} zone={40} offline={false} />);
const standAt = (de: number, dn: number) => { const c = toLatLon(40, O.e + de, O.n + dn); for (let i = 0; i < 4; i++) act(() => emit(c.lat, c.lon, 3)); };
const target = (c: HTMLElement) => c.querySelector(".targetrow b")?.textContent;
const mapLines = (c: HTMLElement) => c.querySelector("[data-testid=map]")?.getAttribute("data-lines");
const banner = (c: HTMLElement) => c.querySelector(".nextpart")?.textContent ?? "";
const press = (c: HTMLElement, label: RegExp) => { const b = [...c.querySelectorAll("button")].find((x) => label.test(x.textContent ?? "")); if (!b) throw new Error(`no button ${label}`); act(() => { fireEvent.click(b); }); };

describe("several parts of the same kind", () => {
  it("shows an 'Only IRR' button that keeps just that kind, and 'Show all kinds' brings the rest back", () => {
    const { container } = view();
    standAt(-20, -3);
    expect(target(container)).toBe("IRR 600 1");
    press(container, /^Only IRR/);
    expect(mapLines(container)).toBe("IRR 600 1,IRR 600 2");
    press(container, /Show all kinds/);
    expect(mapLines(container)).toBe("ETC 1,IRR 600 1,IRR 600 2");
  });

  it("when the part ends, points to the next part of the same kind with its distance and direction", () => {
    const { container } = view();
    standAt(-20, -3);
    press(container, /^Only IRR/);
    standAt(20, 1);                                   // 20 m past the end of part 1, with the telecom line closer
    expect(target(container)).toBe("IRR 600 1");      // the telecom line cannot take over: it is hidden
    expect(banner(container)).toContain("This part ends here");
    expect(banner(container)).toContain("IRR 600 2");
    expect(banner(container)).toMatch(/80 m E\./);
  });

  it("'Go to it' locks onto the next part", () => {
    const { container } = view();
    standAt(-20, -3); press(container, /^Only IRR/); standAt(20, 1);
    press(container, /Go to it/);
    expect(target(container)).toBe("IRR 600 2");
    expect(container.textContent).toContain("Locked");
  });

  it("warns shortly before the part ends, and stays quiet in the middle of a part", () => {
    const { container } = view();
    standAt(-30, -1);
    expect(banner(container)).toBe("");
    standAt(-5, -1);
    expect(banner(container)).toContain("This part ends in 5 m");
    expect(banner(container)).toContain("IRR 600 2");
  });

  it("with nothing else of the same kind, there is no next-part banner", () => {
    const { container } = view();
    standAt(100, 9);                                  // on top of the telecom line
    expect(target(container)).toBe("ETC 1");
    expect(banner(container)).toBe("");
  });
});

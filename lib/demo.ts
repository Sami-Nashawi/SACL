import type { Line, Pt } from "./engine";

// A made-up cable so the app works before you upload a DXF.
// Coordinates are UTM metres: origin + (east, north) offsets.
const ORIGIN = { e: 330000, n: 2765000 };
const OFFSETS: [number, number][] = [[0, 0], [40, 10], [90, 10], [130, 50], [130, 110]];

export const DEMO_LINE: Line = {
  name: "Demo cable (replace with your DXF)",
  pts: OFFSETS.map(([e, n]) => ({ e: ORIGIN.e + e, n: ORIGIN.n + n })),
};
export const DEMO_START_POSITION: Pt = { e: ORIGIN.e + 20, n: ORIGIN.n + 25 };

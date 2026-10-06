import type { Line, Pt } from "./engine";
import { fromLatLon } from "./geo";

// A made-up layout so the app works before you upload a DXF: three separate lines that are not connected.
// It is placed around this spot (25°25'25.0"N 55°32'07.2"E, from Google Maps) so you can test where you are.
const HERE = { lat: 25 + 25 / 60 + 25 / 3600, lon: 55 + 32 / 60 + 7.2 / 3600 };
const ORIGIN = fromLatLon(40, HERE.lat, HERE.lon); // UTM zone 40 metres

// Offsets are metres (east, north) from that spot.
const make = (id: string, name: string, layer: string, color: string, offsets: [number, number][]): Line => ({
  id, name, layer, color, pts: offsets.map(([e, n]) => ({ e: ORIGIN.e + e, n: ORIGIN.n + n })),
});

export const DEMO_LINES: Line[] = [
  make("demo-etc", "ETC 1", "ETC", "#8e44ad", [[-60, -5], [-15, 6], [30, 6], [75, 40]]), // passes about 6 m north of the spot
  make("demo-irr", "IRR 1", "IRR", "#2e9e4f", [[-50, -30], [20, -26], [80, -20]]),       // about 26 m south
  make("demo-pw", "PW 1", "PW", "#1e88e5", [[40, -60], [44, -10], [50, 60]]),            // north-south on the east side
];
export const DEMO_START_POSITION: Pt = { e: ORIGIN.e, n: ORIGIN.n };

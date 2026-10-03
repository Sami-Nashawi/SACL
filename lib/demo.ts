import type { Line, Pt } from "./engine";
import { fromLatLon } from "./geo";

// A made-up cable so the app works before you upload a DXF.
// It is placed around this spot (25°25'25.0"N 55°32'07.2"E, from Google Maps) so you can test where you are.
// To move it, change the two numbers below (decimal degrees).
const HERE = { lat: 25 + 25 / 60 + 25 / 3600, lon: 55 + 32 / 60 + 7.2 / 3600 };
const ORIGIN = fromLatLon(40, HERE.lat, HERE.lon); // UTM zone 40 metres

// The cable runs west to east and passes about 6 m north of that spot, then bends north-east.
// Offsets are metres (east, north) from the spot.
const OFFSETS: [number, number][] = [[-60, -5], [-15, 6], [30, 6], [75, 40]];

export const DEMO_LINE: Line = {
  name: "Demo cable (replace with your DXF)",
  pts: OFFSETS.map(([e, n]) => ({ e: ORIGIN.e + e, n: ORIGIN.n + n })),
};
export const DEMO_START_POSITION: Pt = { e: ORIGIN.e, n: ORIGIN.n };

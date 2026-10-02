// Angle helpers, all in degrees.
export const wrap360 = (deg: number) => ((deg % 360) + 360) % 360;
// Shortest signed turn from one direction to another (-180..180). Needed because 359 and 1 are only 2 apart.
export const shortestDiff = (to: number, from: number) => wrap360(to - from + 180) - 180;

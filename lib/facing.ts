export type FacingSource = "walking" | "compass" | "none";

// Which way are you facing? Walking direction while moving (more reliable than a compass near steel),
// the compass when standing still, and the last known walking direction as a fallback.
export function chooseFacing(
  gps: { moving: boolean; heading?: number },
  compassHeading?: number,
): { facing?: number; source: FacingSource } {
  if (gps.moving && gps.heading !== undefined) return { facing: gps.heading, source: "walking" };
  if (compassHeading !== undefined) return { facing: compassHeading, source: "compass" };
  if (gps.heading !== undefined) return { facing: gps.heading, source: "walking" };
  return { source: "none" };
}

"use client";
import { useEffect, useRef, useState } from "react";
import type { Pt } from "./engine";
import { fromLatLon } from "./geo";
import { MOTION_FIXES, motion, type Fix } from "./motion";

type State = { pos: Pt | null; accuracy: number; heading?: number; moving: boolean; error: string };

const WINDOW = 4; // fixes averaged for the position shown (about 3-4 s of walking)

// Live GPS in grid coordinates. Smooths with an accuracy-weighted average and
// derives walking direction from movement (the compass is not used).
export function useGps(zone: number, enabled: boolean): State {
  const [s, setS] = useState<State>({ pos: null, accuracy: 0, moving: false, error: "" });
  const buf = useRef<Fix[]>([]);
  const heading = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) { setS({ pos: null, accuracy: 0, moving: false, error: "" }); return; }
    if (!("geolocation" in navigator)) {
      setS({ pos: null, accuracy: 0, moving: false, error: "This browser cannot access GPS." });
      return;
    }
    buf.current = []; heading.current = undefined;
    const id = navigator.geolocation.watchPosition(
      (r) => {
        const p = fromLatLon(zone, r.coords.latitude, r.coords.longitude);
        const b = buf.current;
        b.push({ ...p, acc: Math.max(r.coords.accuracy, 1) });
        if (b.length > MOTION_FIXES) b.shift(); // longer history for "walking or standing", shorter window for the position
        const win = b.slice(-WINDOW);
        let w = 0, e = 0, n = 0;
        for (const f of win) { const k = 1 / (f.acc * f.acc); w += k; e += f.e * k; n += f.n * k; }
        const last = b[b.length - 1];
        const m = motion(b);
        if (m.moving) heading.current = m.heading;
        const moving = m.moving;
        setS({ pos: { e: e / w, n: n / w }, accuracy: last.acc, heading: heading.current, moving, error: "" });
      },
      (err) => setS((o) => ({
        ...o,
        error: err.code === err.PERMISSION_DENIED
          ? "Location is blocked. Allow location for this site in your browser settings."
          : "No GPS fix yet. Move to open sky and wait a few seconds.",
      })),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [zone, enabled]);

  return s;
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { shortestDiff, wrap360 } from "./angle";

export type CompassStatus = "off" | "needs-permission" | "on" | "denied" | "unsupported";

// iOS Safari adds requestPermission() and a webkitCompassHeading field to these types.
type IOSOrientation = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
type OrientationEvt = DeviceOrientationEvent & { webkitCompassHeading?: number };

const SMOOTHING = 0.25; // 0..1, lower = steadier but slower to react
const MIN_STEP = 1; // ignore changes smaller than this many degrees, to avoid constant re-rendering

// Phone compass heading (degrees clockwise from north), smoothed. Only runs while enabled.
// On iPhone the user must tap a button once to allow motion access, so call request() from a click.
export function useCompass(enabled: boolean) {
  const [heading, setHeading] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<CompassStatus>("off");
  const [listening, setListening] = useState(false);
  const last = useRef<number | undefined>(undefined);

  const request = useCallback(async () => {
    const api = DeviceOrientationEvent as IOSOrientation;
    if (typeof api.requestPermission === "function") {
      const answer = await api.requestPermission().catch(() => "denied");
      if (answer !== "granted") { setStatus("denied"); return; }
    }
    setListening(true);
  }, []);

  useEffect(() => {
    if (!enabled) { setStatus("off"); setListening(false); setHeading(undefined); last.current = undefined; return; }
    if (typeof DeviceOrientationEvent === "undefined") { setStatus("unsupported"); return; }
    const needsTap = typeof (DeviceOrientationEvent as IOSOrientation).requestPermission === "function";
    if (needsTap) setStatus("needs-permission"); else setListening(true);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !listening) return;
    // Android Chrome has an "absolute" event (relative to north); iPhone gives webkitCompassHeading.
    const type = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    const onOrient = (e: Event) => {
      const ev = e as OrientationEvt;
      let raw: number | undefined;
      if (typeof ev.webkitCompassHeading === "number") raw = ev.webkitCompassHeading;
      else if (ev.alpha !== null && (ev.absolute || type === "deviceorientationabsolute")) raw = wrap360(360 - ev.alpha);
      if (raw === undefined) return;
      const prev = last.current;
      const next = prev === undefined ? raw : wrap360(prev + SMOOTHING * shortestDiff(raw, prev));
      if (prev !== undefined && Math.abs(shortestDiff(next, prev)) < MIN_STEP) return;
      last.current = next;
      setHeading(next);
    };
    window.addEventListener(type, onOrient);
    setStatus("on");
    return () => window.removeEventListener(type, onOrient);
  }, [enabled, listening]);

  return { heading, status, request };
}

"use client";
import { useEffect } from "react";

// Keeps the phone screen on while guiding (a locked screen stops GPS in Safari).
// Silently does nothing on browsers without the Screen Wake Lock API.
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const acquire = async () => { try { lock = await navigator.wakeLock.request("screen"); } catch { /* denied: ignore */ } };
    // The lock is released whenever the tab is hidden, so ask again when you come back.
    const onVisible = () => { if (document.visibilityState === "visible" && !stopped) acquire(); };
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [on]);
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { friendlyError } from "./api";

// Show what we already have right away (a copy saved on this device), refresh it in the background, and say
// how it is going. This is why screens open instantly the second time, and why nothing blocks on "Loading...".
export function useResource<T>(fetcher: () => Promise<T>, cached: () => T | null, key = "") {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(true);
  const [slow, setSlow] = useState(false);
  const fetcherRef = useRef(fetcher); fetcherRef.current = fetcher;
  const cachedRef = useRef(cached); cachedRef.current = cached;
  const run = useRef(0);

  const load = useCallback(async () => {
    const mine = ++run.current;
    setRefreshing(true); setError("");
    try {
      const next = await fetcherRef.current();
      if (mine === run.current) setData((prev) => (prev !== null && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    } catch (e) {
      if (mine === run.current) setError(friendlyError(e));
    } finally {
      if (mine === run.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => { setData(cachedRef.current()); load(); }, [key, load]);
  // Serverless databases sleep when idle; if the first answer takes a while, say so instead of looking frozen.
  useEffect(() => {
    if (!refreshing || data) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), 3500);
    return () => clearTimeout(t);
  }, [refreshing, data]);

  return { data, error, refreshing, slow, reload: load };
}

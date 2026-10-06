"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AccountMenu from "@/components/AccountMenu";
import { fetchList, isSavedLayout } from "@/lib/cables-client";
import { fromLatLon } from "@/lib/geo";
import { groupLayouts, type CableSummary } from "@/lib/cable-types";

const fmt = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

// Start screen: pick a layout (one drawing with all its lines). Search, or sort by the nearest to where you stand.
export default function Home() {
  const [cables, setCables] = useState<CableSummary[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [me, setMe] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState("");

  useEffect(() => { fetchList().then((r) => { setCables(r.cables); setOffline(r.offline); }).catch((e: Error) => setError(e.message)); }, []);

  const nearest = () => {
    setLocating(true); setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (p) => { setMe({ lat: p.coords.latitude, lon: p.coords.longitude }); setLocating(false); },
      () => { setGpsError("Could not get your location. Allow location access for this site."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  // Distance from you to the layout's bounding box: quick, and good enough to sort the list.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = groupLayouts(cables ?? []).filter((l) => !q || l.search.includes(q)).map((l) => {
      if (!me) return { l, away: null as number | null };
      const p = fromLatLon(l.zone, me.lat, me.lon);
      return { l, away: Math.hypot(Math.max(l.minE - p.e, 0, p.e - l.maxE), Math.max(l.minN - p.n, 0, p.n - l.maxN)) };
    });
    return me ? list.sort((a, b) => a.away! - b.away!) : list;
  }, [cables, query, me]);

  return (
    <>
      <header className="app">
        <span className="brand">Cable Locator</span>
        <AccountMenu />
      </header>
      <main>
        <section className="ctl">
          <input type="search" placeholder="Search layouts or lines" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search layouts or lines" />
          <button className="btn" onClick={nearest} disabled={locating}>{locating ? "Finding you…" : me ? "Sorted by nearest. Refresh" : "Nearest to me"}</button>
          {gpsError && <p role="alert" className="alert">{gpsError}</p>}
          {offline && <p className="banner warn">No connection. Showing the layouts saved on this device.</p>}
          {error && <p role="alert" className="alert">{error}</p>}
        </section>
        <section className="list">
          {cables === null && !error && <p className="note">Loading…</p>}
          {cables?.length === 0 && <p className="note">No layouts yet. An administrator can add one from the account menu.</p>}
          {rows.map(({ l, away }) => (
            <Link key={l.key} href={`/locate/${encodeURIComponent(l.key)}`} className="item">
              <b>{l.name}</b>
              <span className="meta">{l.lines} lines · {fmt(l.lengthM)}{away !== null && ` · about ${fmt(away)} from you`}</span>
              <span className="chips static">
                {l.layers.map((x) => <span key={x.layer} className="chip"><span className="swatch" style={{ background: x.color }} />{x.layer || "Other"} <span className="meta">{x.count}</span></span>)}
              </span>
              {typeof window !== "undefined" && isSavedLayout(l.project) && <span className="badge">Saved on this device</span>}
            </Link>
          ))}
          <Link href="/locate/demo" className="item muted"><b>Demo layout</b><span className="meta">Three separate lines to practise with, no site visit needed</span></Link>
        </section>
      </main>
    </>
  );
}

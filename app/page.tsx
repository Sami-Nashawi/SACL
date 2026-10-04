"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchList, isSaved } from "@/lib/cables-client";
import { fromLatLon } from "@/lib/geo";
import type { CableSummary } from "@/lib/cable-types";

// Start screen: pick a cable. You can search by name, or sort by the nearest cable to where you stand.
export default function Home() {
  const [cables, setCables] = useState<CableSummary[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [me, setMe] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState("");

  useEffect(() => {
    fetchList().then((r) => { setCables(r.cables); setOffline(r.offline); }).catch((e: Error) => setError(e.message));
    fetch("/api/login").then((r) => r.json()).then((j: { role: string | null }) => setRole(j.role)).catch(() => {});
  }, []);

  const nearest = () => {
    setLocating(true); setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (p) => { setMe({ lat: p.coords.latitude, lon: p.coords.longitude }); setLocating(false); },
      () => { setGpsError("Could not get your location. Allow location access for this site."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  // Distance from you to the cable's bounding box: quick and good enough to sort the list.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (cables ?? []).filter((c) => !q || `${c.name} ${c.project}`.toLowerCase().includes(q))
      .map((c) => {
        if (!me) return { c, away: null as number | null };
        const p = fromLatLon(c.zone, me.lat, me.lon);
        const dx = Math.max(c.minE - p.e, 0, p.e - c.maxE), dy = Math.max(c.minN - p.n, 0, p.n - c.maxN);
        return { c, away: Math.hypot(dx, dy) };
      });
    return me ? list.sort((a, b) => a.away! - b.away!) : list;
  }, [cables, query, me]);

  const fmt = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

  return (
    <>
      <header className="app">
        <span className="brand">Cable Locator</span>
        <span className="actions">
          {role === "admin" && <Link className="btn sm" href="/admin">Manage</Link>}
          <button className="btn sm" onClick={async () => { await fetch("/api/login", { method: "DELETE" }); location.href = "/login"; }}>Sign out</button>
        </span>
      </header>
      <main>
        <section className="ctl">
          <input type="search" placeholder="Search cables" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search cables" />
          <button className="btn" onClick={nearest} disabled={locating}>{locating ? "Finding you…" : me ? "Sorted by nearest. Refresh" : "Nearest to me"}</button>
          {gpsError && <p role="alert" className="alert">{gpsError}</p>}
          {offline && <p className="banner warn">No connection. Showing the cables saved on this device.</p>}
          {error && <p role="alert" className="alert">{error}</p>}
        </section>
        <section className="list">
          {cables === null && !error && <p className="note">Loading…</p>}
          {cables?.length === 0 && <p className="note">No cables yet. {role === "admin" ? "Use Manage to add one from a DXF." : "Ask an admin to add one."}</p>}
          {rows.map(({ c, away }) => (
            <Link key={c.id} href={`/locate/${c.id}`} className="item">
              <b>{c.name}</b>
              <span className="meta">
                {c.project && `${c.project} · `}{fmt(c.lengthM)} long{away !== null && ` · about ${fmt(away)} from you`}
              </span>
              {typeof window !== "undefined" && isSaved(c.id) && <span className="badge">Saved on this device</span>}
            </Link>
          ))}
          <Link href="/locate/demo" className="item muted"><b>Demo cable</b><span className="meta">Practise without going to site</span></Link>
        </section>
      </main>
    </>
  );
}

"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import AccountMenu from "@/components/AccountMenu";
import { EmptyState, ErrorState, ListSkeleton, SlowNote, TopProgress } from "@/components/ui";
import { cachedList, fetchList, isSavedLayout } from "@/lib/cables-client";
import { fromLatLon } from "@/lib/geo";
import { groupLayouts } from "@/lib/cable-types";
import { useResource } from "@/lib/use-resource";
import { useSession } from "@/components/SessionProvider";

const fmt = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

// Start screen: pick a layout (one drawing with all its lines). Search, or sort by the nearest to where you stand.
// The list shows instantly from the copy saved on this device and refreshes quietly in the background.
export default function Home() {
  const res = useResource(fetchList, cachedList);
  const { user } = useSession();
  const [query, setQuery] = useState("");
  const [me, setMe] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState("");

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
    const list = groupLayouts(res.data?.cables ?? []).filter((l) => !q || l.search.includes(q)).map((l) => {
      if (!me) return { l, away: null as number | null };
      const p = fromLatLon(l.zone, me.lat, me.lon);
      return { l, away: Math.hypot(Math.max(l.minE - p.e, 0, p.e - l.maxE), Math.max(l.minN - p.n, 0, p.n - l.maxN)) };
    });
    return me ? list.sort((a, b) => a.away! - b.away!) : list;
  }, [res.data, query, me]);

  return (
    <>
      <TopProgress active={res.refreshing && !!res.data} />
      <header className="app">
        <span className="brand">Cable Locator</span>
        <AccountMenu />
      </header>
      <main>
        <section className="ctl">
          <input type="search" placeholder="Search layouts or lines" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search layouts or lines" />
          <button className={`btn${locating ? " busy" : ""}`} onClick={nearest} disabled={locating}>{me ? "Sorted by nearest. Refresh" : "Nearest to me"}</button>
          {gpsError && <p role="alert" className="alert">{gpsError}</p>}
          {res.data?.offline && <p className="banner warn">No connection. Showing the layouts saved on this device.</p>}
        </section>
        <section className="list">
          {!res.data && !res.error && <><ListSkeleton /><SlowNote show={res.slow} /></>}
          {!res.data && res.error && <ErrorState message={res.error} onRetry={res.reload} />}
          {res.data && res.data.cables.length === 0 && (
            <EmptyState title="No layouts yet" text={user?.role === "admin" ? "Add your first layout from a DXF drawing." : "An administrator needs to add a layout first."}
              action={user?.role === "admin" ? <Link className="btn primary" href="/admin">Add a layout</Link> : undefined} />
          )}
          {res.data && res.data.cables.length > 0 && rows.length === 0 && <p className="note">Nothing matches "{query}".</p>}
          {rows.map(({ l, away }) => (
            <Link key={l.key} href={`/locate/${encodeURIComponent(l.key)}`} className="item fade">
              <b>{l.name}</b>
              <span className="meta">{l.lines} lines · {fmt(l.lengthM)}{away !== null && ` · about ${fmt(away)} from you`}</span>
              <span className="chips static">
                {l.layers.map((x) => <span key={x.layer} className="chip"><span className="swatch" style={{ background: x.color }} />{x.layer || "Other"} <span className="meta">{x.count}</span></span>)}
              </span>
              {typeof window !== "undefined" && isSavedLayout(l.project) && <span className="badge">Saved on this device</span>}
            </Link>
          ))}
          {res.data && <Link href="/locate/demo" className="item muted"><b>Demo layout</b><span className="meta">Three separate lines to practise with, no site visit needed</span></Link>}
        </section>
      </main>
    </>
  );
}

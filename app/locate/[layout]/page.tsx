"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Locate from "@/components/Locate";
import { fetchLayout } from "@/lib/cables-client";
import { projectOf, toLines, type CableFull } from "@/lib/cable-types";
import { DEMO_LINES, DEMO_START_POSITION } from "@/lib/demo";

// Loads one layout (from the server, or from this device if there is no signal), then shows the locate screen.
export default function LocatePage() {
  const raw = useParams<{ layout: string }>().layout;
  const key = (() => { try { return decodeURIComponent(raw); } catch { return raw; } })();
  const [data, setData] = useState<{ cables: CableFull[]; offline: boolean } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (key === "demo") return;
    fetchLayout(projectOf(key)).then(setData).catch((e: Error) => setError(e.message));
  }, [key]);

  if (key === "demo") return <Locate title="Demo layout" lines={DEMO_LINES} zone={40} offline={false} testStart={DEMO_START_POSITION} />;
  if (data?.cables.length) return <Locate title={projectOf(key) || "Ungrouped lines"} lines={toLines(data.cables)} zone={data.cables[0].zone} offline={data.offline} />;
  return (
    <main className="narrow">
      {error || data ? <><p role="alert" className="alert">{error || "This layout has no lines."}</p><Link className="btn" href="/">Back to layouts</Link></> : <p className="note">Loading layout…</p>}
    </main>
  );
}

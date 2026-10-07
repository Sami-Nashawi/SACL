"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import Locate from "@/components/Locate";
import { ErrorState, LocateSkeleton, SlowNote, TopProgress } from "@/components/ui";
import { cachedLayout, fetchLayout } from "@/lib/cables-client";
import { projectOf, toLines } from "@/lib/cable-types";
import { DEMO_LINES, DEMO_START_POSITION } from "@/lib/demo";
import { useResource } from "@/lib/use-resource";

// Opens a layout. A copy saved on this device opens instantly (even with no signal) and refreshes in the background.
export default function LocatePage() {
  const raw = useParams<{ layout: string }>().layout;
  const key = (() => { try { return decodeURIComponent(raw); } catch { return raw; } })();
  const project = projectOf(key);
  const demo = key === "demo";
  const res = useResource(() => fetchLayout(project), () => cachedLayout(project), key);
  const lines = useMemo(() => (res.data ? toLines(res.data.cables) : []), [res.data]);
  const title = project || "Ungrouped lines";

  if (demo) return <Locate title="Demo layout" lines={DEMO_LINES} zone={40} offline={false} testStart={DEMO_START_POSITION} />;
  if (res.data?.cables.length) return <><TopProgress active={res.refreshing} /><Locate title={title} lines={lines} zone={res.data.cables[0].zone} offline={res.data.offline} /></>;
  if (res.data || res.error) {
    return (
      <main className="narrow">
        <ErrorState message={res.error || "This layout has no lines."} onRetry={res.error ? res.reload : undefined} />
        <Link className="btn" href="/">Back to layouts</Link>
      </main>
    );
  }
  return <><LocateSkeleton title={project ? title : undefined} /><SlowNote show={res.slow} /></>;
}

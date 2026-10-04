"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Locate from "@/components/Locate";
import { fetchCable } from "@/lib/cables-client";
import { toLine, type CableFull } from "@/lib/cable-types";
import { DEMO_LINE, DEMO_START_POSITION } from "@/lib/demo";

// Loads one cable (from the server, or from this device if there is no signal), then shows the locate screen.
export default function LocatePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ cable: CableFull; offline: boolean } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id === "demo") return;
    fetchCable(id).then(setData).catch((e: Error) => setError(e.message));
  }, [id]);

  if (id === "demo") return <Locate line={DEMO_LINE} zone={40} offline={false} testStart={DEMO_START_POSITION} />;
  if (data) return <Locate line={toLine(data.cable)} zone={data.cable.zone} offline={data.offline} />;
  return (
    <main className="narrow">
      {error ? <><p role="alert" className="alert">{error}</p><Link className="btn" href="/">Back to cables</Link></> : <p className="note">Loading cable…</p>}
    </main>
  );
}

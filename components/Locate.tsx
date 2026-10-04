"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { guide, type Line, type Pt } from "@/lib/engine";
import { useGps } from "@/lib/gps";
import { useCompass } from "@/lib/compass";
import { useWakeLock } from "@/lib/wakelock";
import { chooseFacing } from "@/lib/facing";
import { shortestDiff } from "@/lib/angle";
import Controls from "@/components/Controls";
import MapView from "@/components/MapView";
import LaneView from "@/components/LaneView";
import { Details, Headline } from "@/components/Readout";
import CompassArrow from "@/components/CompassArrow";

// Follow mode starts closer than it ends, so the screen does not flip back and forth at the border.
const ENTER_FOLLOW_M = 10;
const LEAVE_FOLLOW_M = 15;

type Props = { line: Line; zone: number; offline: boolean; testStart?: Pt };

// The locate screen for one cable. The cable comes in from outside; this component only guides.
export default function Locate({ line, zone, offline, testStart }: Props) {
  const [forward, setForward] = useState(true);
  const [live, setLive] = useState(true);
  const [nearCable, setNearCable] = useState(false);
  const [simPos, setSimPos] = useState<Pt>(testStart ?? line.pts[0]);
  const [simAccuracy, setSimAccuracy] = useState(3);

  // Where "you" are: the live GPS fix if we have one, otherwise the simulated dot.
  const gps = useGps(zone, live);
  const hasFix = live && gps.pos !== null;
  const position = hasFix ? gps.pos! : simPos;
  const accuracy = hasFix ? gps.accuracy : simAccuracy;
  useWakeLock(live);

  // The compass is only for Find mode. Follow mode never uses it.
  const compass = useCompass(live);
  const { facing, source } = hasFix ? chooseFacing(gps, compass.heading) : { facing: undefined, source: "none" as const };

  // Find or Follow: automatic by distance, with a gap between the two thresholds.
  const distance = guide(line, position, { forward }).distance;
  useEffect(() => {
    if (!nearCable && distance < ENTER_FOLLOW_M) setNearCable(true);
    else if (nearCable && distance > LEAVE_FOLLOW_M) setNearCable(false);
  }, [distance, nearCable]);
  const follow = nearCable;

  // Follow: left/right comes from the cable's own direction, so no facing is passed in. Find: use the way you face.
  const g = guide(line, position, { forward, accuracy, heading: follow ? undefined : facing });
  const waiting = live && !hasFix;

  // Walking the other way along the cable? GPS movement tells us, and left/right flips by itself.
  useEffect(() => {
    if (!live || !follow || !gps.moving || gps.heading === undefined) return;
    if (Math.abs(shortestDiff(gps.heading, g.lineBearing)) > 120) setForward((f) => !f);
  }, [gps.heading, gps.moving]); // eslint-disable-line react-hooks/exhaustive-deps

  // One colour for the hero card: blue while finding, green when following, grey while waiting.
  const state = waiting ? "wait" : !follow ? "far" : g.side === "on" ? "on" : "near";

  return (
    <>
      <header className="app">
        <Link href="/" className="back" aria-label="Back to cables">‹</Link>
        <span className="brand title-ellipsis">{line.name}</span>
        <span className={`pill ${live && (waiting || accuracy > 5) ? "warn" : ""}`}>
          {!live ? "Test mode" : waiting ? "Waiting for GPS" : `GPS ±${accuracy.toFixed(0)} m`}
        </span>
      </header>
      <main>
        <div className="alerts">
          {live && gps.error && <p role="alert" className="alert">{gps.error}</p>}
          {offline && <p className="banner warn">Offline copy saved on this device.</p>}
        </div>
        <section className="ctl">
          <Controls forward={forward} onForward={setForward} live={live} onLive={setLive} simAccuracy={simAccuracy} onSimAccuracy={setSimAccuracy} />
        </section>
        <section className={`card hero s-${state}`} aria-live="polite">
          <p className="modetag">{follow ? "FOLLOW" : "FIND"}</p>
          {follow
            ? <LaneView side={g.side} distance={g.distance} accuracy={accuracy} />
            : <CompassArrow bearing={g.bearing} facing={facing} source={source} status={compass.status} onEnable={compass.request} />}
          <Headline g={g} waiting={waiting} accuracy={accuracy} follow={follow} />
          {follow && <p className="note">Walking {forward ? "start to end" : "end to start"}. Flips by itself if you turn around.</p>}
        </section>
        <section className="card plan">
          <MapView line={line} zone={zone} position={position} nearest={g.nearest} accuracy={accuracy}
            interactive={!live} onPick={setSimPos} />
          {!live && <p className="note">Test mode: tap the map to move your position.</p>}
        </section>
        <Details g={g} zone={zone} start={line.pts[0]} here={position} accuracy={accuracy} weakFix={hasFix && accuracy > 5} />
      </main>
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import { guide, type Line, type Pt } from "@/lib/engine";
import { parseDxf } from "@/lib/dxf";
import { useGps } from "@/lib/gps";
import { useCompass } from "@/lib/compass";
import { useWakeLock } from "@/lib/wakelock";
import { chooseFacing } from "@/lib/facing";
import { shortestDiff } from "@/lib/angle";
import { DEMO_LINE, DEMO_START_POSITION } from "@/lib/demo";
import Controls, { ModeSwitch, type GuideMode } from "@/components/Controls";
import MapView from "@/components/MapView";
import LaneView from "@/components/LaneView";
import { Details, Headline } from "@/components/Readout";
import CompassArrow from "@/components/CompassArrow";

const Alert = ({ text }: { text: string }) => <p role="alert" className="alert">{text}</p>;

// Follow mode starts closer than it ends, so the screen does not flip back and forth at the border.
const ENTER_FOLLOW_M = 10;
const LEAVE_FOLLOW_M = 15;

// The page owns all state and wires the pieces together. Nothing else keeps state.
export default function Page() {
  const [lines, setLines] = useState<Line[]>([DEMO_LINE]);
  const [cableIndex, setCableIndex] = useState(0);
  const [zone, setZone] = useState(40);
  const [forward, setForward] = useState(true);
  const [live, setLive] = useState(false);
  const [guideMode, setGuideMode] = useState<GuideMode>("auto");
  const [nearCable, setNearCable] = useState(false);
  const [simPos, setSimPos] = useState<Pt>(DEMO_START_POSITION);
  const [simAccuracy, setSimAccuracy] = useState(3);
  const [fileError, setFileError] = useState("");

  // Where "you" are: the live GPS fix if we have one, otherwise the simulated dot.
  const gps = useGps(zone, live);
  const hasFix = live && gps.pos !== null;
  const position = hasFix ? gps.pos! : simPos;
  const accuracy = hasFix ? gps.accuracy : simAccuracy;
  useWakeLock(live);

  // The compass is only for Find mode. Follow mode never uses it.
  const compass = useCompass(live);
  const { facing, source } = hasFix ? chooseFacing(gps, compass.heading) : { facing: undefined, source: "none" as const };

  const line = lines[cableIndex];

  // Find or Follow: automatic by distance (with a gap between the two thresholds), unless you pick one.
  const distance = guide(line, position, { forward }).distance;
  useEffect(() => {
    if (!nearCable && distance < ENTER_FOLLOW_M) setNearCable(true);
    else if (nearCable && distance > LEAVE_FOLLOW_M) setNearCable(false);
  }, [distance, nearCable]);
  const follow = guideMode === "follow" || (guideMode === "auto" && nearCable);

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

  const selectCable = (i: number) => { setCableIndex(i); setSimPos(lines[i].pts[0]); };

  const loadFile = async (file?: File) => {
    if (!file) return;
    try {
      const found = parseDxf(await file.text());
      if (!found.length) return setFileError("No polylines found. Export each cable as a polyline on its own layer.");
      setFileError(""); setLines(found); setCableIndex(0); setSimPos(found[0].pts[0]);
    } catch {
      setFileError("Could not read this DXF. Save it as ASCII DXF (AutoCAD 2018) and try again.");
    }
  };

  return (
    <>
      <header className="app">
        <span className="brand">Cable Locator</span>
        <ModeSwitch live={live} onLive={setLive} />
      </header>
      <main>
        <div className="alerts">
          {fileError && <Alert text={fileError} />}
          {live && gps.error && <Alert text={gps.error} />}
        </div>
        <Controls cableNames={lines.map((l) => l.name)} cableIndex={cableIndex} onCable={selectCable}
          onFile={loadFile} zone={zone} onZone={setZone} forward={forward} onForward={setForward}
          guide={guideMode} onGuide={setGuideMode} live={live} simAccuracy={simAccuracy} onSimAccuracy={setSimAccuracy}
          openSetup={lines.length === 1 && lines[0] === DEMO_LINE} />
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
          {!live && <p className="note">Simulator: tap the map to move your position.</p>}
        </section>
        <Details g={g} zone={zone} start={line.pts[0]} here={position} accuracy={accuracy} weakFix={hasFix && accuracy > 5} />
      </main>
    </>
  );
}

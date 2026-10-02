"use client";
import { useState } from "react";
import { guide, type Line, type Pt } from "@/lib/engine";
import { parseDxf } from "@/lib/dxf";
import { useGps } from "@/lib/gps";
import { useCompass } from "@/lib/compass";
import { useWakeLock } from "@/lib/wakelock";
import { chooseFacing } from "@/lib/facing";
import { DEMO_LINE, DEMO_START_POSITION } from "@/lib/demo";
import Controls, { ModeSwitch } from "@/components/Controls";
import PlanCanvas from "@/components/PlanCanvas";
import { Details, Headline } from "@/components/Readout";
import CompassArrow from "@/components/CompassArrow";

const Alert = ({ text }: { text: string }) => <p role="alert" className="alert">{text}</p>;

// The page owns all state and wires the pieces together. Nothing else keeps state.
export default function Page() {
  const [lines, setLines] = useState<Line[]>([DEMO_LINE]);
  const [cableIndex, setCableIndex] = useState(0);
  const [zone, setZone] = useState(40);
  const [forward, setForward] = useState(true);
  const [live, setLive] = useState(false);
  const [simPos, setSimPos] = useState<Pt>(DEMO_START_POSITION);
  const [simAccuracy, setSimAccuracy] = useState(3);
  const [fileError, setFileError] = useState("");

  // Where "you" are: the live GPS fix if we have one, otherwise the simulated dot.
  const gps = useGps(zone, live);
  const hasFix = live && gps.pos !== null;
  const position = hasFix ? gps.pos! : simPos;
  const accuracy = hasFix ? gps.accuracy : simAccuracy;
  useWakeLock(live);

  // Which way you face: walking direction while moving, compass when standing still.
  const compass = useCompass(live);
  const { facing, source } = hasFix ? chooseFacing(gps, compass.heading) : { facing: undefined, source: "none" as const };

  const line = lines[cableIndex];
  const g = guide(line, position, { forward, accuracy, heading: facing });
  const waiting = live && !hasFix;

  // One colour for the whole hero card: blue while approaching, green when close or on the line, grey while waiting.
  const state = waiting ? "wait" : g.mode === "approach" ? "far" : g.side === "on" ? "on" : "near";

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
          live={live} simAccuracy={simAccuracy} onSimAccuracy={setSimAccuracy}
          openSetup={lines.length === 1 && lines[0] === DEMO_LINE} />
        <section className={`card hero s-${state}`} aria-live="polite">
          <CompassArrow bearing={g.bearing} facing={facing} source={source} status={compass.status} onEnable={compass.request} />
          <Headline g={g} waiting={waiting} accuracy={accuracy} />
        </section>
        <section className="card plan">
          <PlanCanvas line={line} position={position} nearest={g.nearest} accuracy={accuracy}
            followPosition={hasFix} interactive={!live} onMove={setSimPos} />
          {!live && <p className="note">Simulator: drag on the plan to walk.</p>}
        </section>
        <Details g={g} zone={zone} start={line.pts[0]} here={position} accuracy={accuracy} weakFix={hasFix && accuracy > 5} />
      </main>
    </>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { guide, nearestDistance, type Line, type Pt } from "@/lib/engine";
import { useGps } from "@/lib/gps";
import { useCompass } from "@/lib/compass";
import { useWakeLock } from "@/lib/wakelock";
import { chooseFacing } from "@/lib/facing";
import { shortestDiff } from "@/lib/angle";
import Controls from "@/components/Controls";
import MapView from "@/components/MapView";
import LaneView from "@/components/LaneView";
import { LayerChips, NearbyLines } from "@/components/Layers";
import { Details, Headline } from "@/components/Readout";
import CompassArrow from "@/components/CompassArrow";

// Follow mode starts closer than it ends, so the screen does not flip back and forth at the border.
const ENTER_FOLLOW_M = 10;
const LEAVE_FOLLOW_M = 15;
// Another line must be this much closer than the current one before the detected line changes.
const SWITCH_M = 3;
// Walking against the line must be seen this many GPS updates in a row before left/right flips, so GPS jitter cannot flip it.
const FLIP_VOTES = 5;
const keyOf = (l: Line) => l.id ?? l.name;

type Props = { title: string; lines: Line[]; zone: number; offline: boolean; testStart?: Pt };

// The locate screen for a whole layout: many separate lines, each in its own colour.
// It always guides you to the nearest visible line (or the one you lock), and says which line it is.
export default function Locate({ title, lines, zone, offline, testStart }: Props) {
  const [forward, setForward] = useState(true);
  const [live, setLive] = useState(true);
  const [nearCable, setNearCable] = useState(false);
  const [simPos, setSimPos] = useState<Pt>(testStart ?? lines[0].pts[0]);
  const [simAccuracy, setSimAccuracy] = useState(3);
  const [hidden, setHidden] = useState<string[]>([]);
  const [pinned, setPinned] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);

  // Where "you" are: the live GPS fix if we have one, otherwise the simulated dot.
  const gps = useGps(zone, live);
  const hasFix = live && gps.pos !== null;
  const position = hasFix ? gps.pos! : simPos;
  const accuracy = hasFix ? gps.accuracy : simAccuracy;
  useWakeLock(live);

  // The compass is only for Find mode. Follow mode never uses it.
  const compass = useCompass(live);
  const { facing, source } = hasFix ? chooseFacing(gps, compass.heading) : { facing: undefined, source: "none" as const };

  // Which line? The nearest visible one. It only changes when another line is clearly closer, or when you lock one.
  const visible = useMemo(() => lines.filter((l) => !hidden.includes(l.layer ?? "")), [lines, hidden]);
  const ranks = useMemo(() => visible.map((l) => ({ line: l, d: nearestDistance(l, position) })).sort((a, b) => a.d - b.d), [visible, position]);
  const best = ranks[0]?.line;
  const target = visible.find((l) => keyOf(l) === pinned) ?? visible.find((l) => keyOf(l) === targetId) ?? best;
  useEffect(() => {
    if (pinned || !best) return;
    const current = ranks.find((r) => keyOf(r.line) === targetId);
    if (!current || current.d - ranks[0].d > SWITCH_M) setTargetId(keyOf(best));
  }, [ranks, pinned, targetId, best]);

  const line = target ?? lines[0];
  const targetKey = keyOf(line);
  // A new line starts fresh: walking start to end, Find mode until you are close.
  useEffect(() => { setForward(true); setNearCable(false); }, [targetKey]);

  // Find or Follow: automatic by distance to the detected line, with a gap between the two thresholds.
  const distance = guide(line, position, { forward }).distance;
  useEffect(() => {
    if (!nearCable && distance < ENTER_FOLLOW_M) setNearCable(true);
    else if (nearCable && distance > LEAVE_FOLLOW_M) setNearCable(false);
  }, [distance, nearCable]);
  const follow = nearCable;

  // Follow: left/right comes from the line's own direction, so no facing is passed in. Find: use the way you face.
  const g = guide(line, position, { forward, accuracy, heading: follow ? undefined : facing });
  const waiting = live && !hasFix;

  // Walking the other way along the line? GPS movement tells us, and left/right flips by itself.
  // It only flips after FLIP_VOTES updates in a row agree, and the "Walking ..." note on screen shows the change.
  const flipVotes = useRef(0);
  useEffect(() => {
    if (!live || !follow || !gps.moving || gps.heading === undefined) { flipVotes.current = 0; return; }
    flipVotes.current = Math.abs(shortestDiff(gps.heading, g.lineBearing)) > 120 ? flipVotes.current + 1 : 0;
    if (flipVotes.current >= FLIP_VOTES) { flipVotes.current = 0; setForward((f) => !f); }
  }, [gps]); // eslint-disable-line react-hooks/exhaustive-deps

  const state = waiting ? "wait" : !follow ? "far" : g.side === "on" ? "on" : "near";
  const others = ranks.filter((r) => keyOf(r.line) !== targetKey).slice(0, 3)
    .map((r) => ({ id: keyOf(r.line), name: r.line.name, layer: r.line.layer ?? "", color: r.line.color ?? "#888", d: r.d }));
  const toggleLayer = (layer: string) => setHidden((h) => (h.includes(layer) ? h.filter((x) => x !== layer) : [...h, layer]));

  return (
    <>
      <header className="app">
        <Link href="/" className="back" aria-label="Back to layouts">‹</Link>
        <span className="brand title-ellipsis">{title}</span>
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
          <LayerChips lines={lines} hidden={hidden} onToggle={toggleLayer} />
          <Controls forward={forward} onForward={setForward} live={live} onLive={setLive} simAccuracy={simAccuracy} onSimAccuracy={setSimAccuracy} />
        </section>
        {target ? (
          <section className={`card hero s-${state}`} aria-live="polite">
            <div className="targetrow">
              <span className="swatch" style={{ background: line.color }} />
              <b>{line.name}</b>
              {line.layer && line.layer !== line.name && <span className="rolechip">{line.layer}</span>}
              {pinned ? <button className="btn sm" onClick={() => setPinned(null)}>Locked. Tap for auto</button> : <span className="rolechip">Auto</span>}
            </div>
            <p className="modetag">{follow ? "FOLLOW" : "FIND"}</p>
            {follow
              ? <LaneView side={g.side} distance={g.distance} accuracy={accuracy} />
              : <CompassArrow bearing={g.bearing} facing={facing} source={source} status={compass.status} onEnable={compass.request} />}
            <Headline g={g} waiting={waiting} accuracy={accuracy} follow={follow} />
            {follow && <p className="note">Walking {forward ? "start to end" : "end to start"}. Flips by itself if you turn around.</p>}
          </section>
        ) : <section className="card"><p className="note">All kinds of lines are hidden. Turn one back on above.</p></section>}
        <section className="card plan">
          <MapView lines={visible} targetId={targetKey} zone={zone} position={position} nearest={g.nearest} accuracy={accuracy}
            interactive={!live} onPick={setSimPos} onSelect={setPinned} fitKey={title} />
          <p className="note">{live ? "Tap a line on the map to lock onto it." : "Test mode: tap the map to move your position."}</p>
        </section>
        {target && <Details g={g} zone={zone} start={line.pts[0]} here={position} accuracy={accuracy} weakFix={hasFix && accuracy > 5} />}
        <NearbyLines others={others} onLock={setPinned} />
      </main>
    </>
  );
}

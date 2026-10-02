import type { Guidance, Pt } from "@/lib/engine";
import { mapsLink, toLatLon } from "@/lib/geo";

type Props = {
  g: Guidance; zone: number; start: Pt; here: Pt; accuracy: number;
  waiting: boolean; // live mode, no GPS fix yet
  weakFix: boolean; // live mode, accuracy worse than 5 m
};

function headline(g: Guidance, waiting: boolean) {
  if (waiting) return "Waiting for a GPS fix";
  if (g.mode === "approach") return `Go ${g.cardinal}, ${g.distance.toFixed(0)} m`;
  if (g.side === "on") return "On the line (within GPS accuracy)";
  return `Cable on your ${g.side}, ${g.distance.toFixed(1)} m`;
}

// The answer panel: what to do, where you are along the cable, and map check links.
export default function Readout({ g, zone, start, here, accuracy, waiting, weakFix }: Props) {
  const a = toLatLon(zone, start.e, start.n);
  const b = toLatLon(zone, here.e, here.n);
  return (
    <section className="read" aria-live="polite">
      <div className={`big ${g.mode === "follow" ? "near" : ""}`}>{headline(g, waiting)}</div>
      <dl>
        <dt>Mode</dt><dd>{g.mode === "approach" ? "Approach" : "Follow"}</dd>
        <dt>Along the cable</dt><dd>{g.chainage.toFixed(0)} m from start, {g.remaining.toFixed(0)} m to end</dd>
        {g.bend && (<><dt>Next bend</dt>
          <dd>in {g.bend.dist.toFixed(0)} m, turns {g.bend.turn > 0 ? "right" : "left"} {Math.abs(g.bend.turn).toFixed(0)}°</dd></>)}
        <dt>GPS accuracy</dt><dd>±{accuracy.toFixed(0)} m</dd>
        <dt>Check on map</dt>
        <dd>
          <a href={mapsLink(a.lat, a.lon)} target="_blank" rel="noreferrer">Cable start</a>{" / "}
          <a href={mapsLink(b.lat, b.lon)} target="_blank" rel="noreferrer">Current position</a>
        </dd>
      </dl>
      {weakFix && <p className="note">Accuracy is worse than 5 m, so left and right may flicker. Move to open sky and wait for a better fix.</p>}
      <p className="note">Simulator: drag on the plan to walk. Live GPS uses your walking direction while moving and the compass when standing still. This is guidance only; confirm with an EM cable locator before any excavation.</p>
    </section>
  );
}

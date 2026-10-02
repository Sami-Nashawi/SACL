import type { Guidance, Pt } from "@/lib/engine";
import { mapsLink, toLatLon } from "@/lib/geo";

// The big answer under the arrow: what to do right now.
export function Headline({ g, waiting, accuracy }: { g: Guidance; waiting: boolean; accuracy: number }) {
  if (waiting) return <><div className="label">Waiting for a GPS fix</div><p className="sub">Move to open sky and wait a few seconds.</p></>;
  if (g.mode === "approach") return <><div className="dist">{g.distance.toFixed(0)} m</div><div className="label">Go {g.cardinal}</div></>;
  if (g.side === "on") return <><div className="dist">On line</div><p className="sub">Within GPS accuracy (±{accuracy.toFixed(0)} m)</p></>;
  return <><div className="dist">{g.distance.toFixed(1)} m</div><div className="label">Cable on your {g.side}</div></>;
}

type Props = { g: Guidance; zone: number; start: Pt; here: Pt; accuracy: number; weakFix: boolean };

// Numbers about your position along the cable, plus warnings and map check links.
export function Details({ g, zone, start, here, accuracy, weakFix }: Props) {
  const a = toLatLon(zone, start.e, start.n);
  const b = toLatLon(zone, here.e, here.n);
  return (
    <section className="card details" aria-live="polite">
      <div className="stats">
        <div className="stat"><b>{g.chainage.toFixed(0)} m</b><span>From start</span></div>
        <div className="stat"><b>{g.remaining.toFixed(0)} m</b><span>To end</span></div>
        <div className="stat"><b>±{accuracy.toFixed(0)} m</b><span>GPS</span></div>
      </div>
      {g.bend && (
        <p className="banner bend">
          Next bend in {g.bend.dist.toFixed(0)} m: turns {g.bend.turn > 0 ? "right" : "left"} {Math.abs(g.bend.turn).toFixed(0)}°
        </p>
      )}
      {weakFix && <p className="banner warn">Accuracy is worse than 5 m, so left and right may flicker. Move to open sky and wait for a better fix.</p>}
      <p className="links">
        Check on map: <a href={mapsLink(a.lat, a.lon)} target="_blank" rel="noreferrer">Cable start</a>
        {" · "}<a href={mapsLink(b.lat, b.lon)} target="_blank" rel="noreferrer">Current position</a>
      </p>
      <p className="note">Guidance only. Confirm with an EM cable locator before any excavation.</p>
    </section>
  );
}

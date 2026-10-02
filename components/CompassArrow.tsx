"use client";
import { wrap360 } from "@/lib/angle";
import type { CompassStatus } from "@/lib/compass";
import type { FacingSource } from "@/lib/facing";

type Props = {
  bearing: number; // direction from you to the nearest point on the cable, degrees from north
  facing?: number; // direction you face, if known
  source: FacingSource;
  status: CompassStatus;
  onEnable: () => void; // asks for motion access (needed on iPhone)
};

// An arrow that points at the cable relative to the way you face: straight up means "straight ahead".
// With no facing direction it falls back to a map view where up is north.
// The arrow takes its colour from the --state variable set by the hero card around it.
export default function CompassArrow({ bearing, facing, source, status, onEnable }: Props) {
  const rotation = facing === undefined ? bearing : wrap360(bearing - facing);
  const caption =
    facing === undefined ? "North is up. Walk a few metres or enable the compass to point relative to you."
    : source === "compass" ? "Up is the way the phone is facing. Hold it flat."
    : "Up is your walking direction.";
  return (
    <div className="compass">
      <svg viewBox="-50 -50 100 100" className="arrow" role="img"
        aria-label={`Cable is ${Math.round(rotation)} degrees clockwise from straight ahead`}>
        <circle r="46" fill="var(--bg)" stroke="var(--edge)" strokeWidth="2" />
        <path d="M0 -49 L0 -41" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
        <g style={{ transform: `rotate(${rotation}deg)`, transition: "transform .2s" }}>
          <path d="M0 -34 L16 16 L0 6 L-16 16 Z" fill="var(--state)" stroke="var(--card)" strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      </svg>
      <p className="note">{caption}</p>
      {status === "needs-permission" && <button className="btn primary" onClick={onEnable}>Enable compass</button>}
      {status === "denied" && <p className="note">Compass blocked. Allow motion access for this site in your browser settings.</p>}
      {status === "unsupported" && <p className="note">This device has no compass. The arrow uses your walking direction.</p>}
      {status === "on" && <p className="note">Compass can be wrong near steel, vehicles and bridges.</p>}
    </div>
  );
}

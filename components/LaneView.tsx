"use client";

type Props = { side: "left" | "right" | "on"; distance: number; accuracy: number };

// Follow mode picture: the cable is the vertical line, you are the dot. The dot slides sideways by your
// real offset, and the pale band around it is the GPS uncertainty, so you can see when to trust the number.
// Straight up is the direction you walk along the cable. No compass is used.
export default function LaneView({ side, distance, accuracy }: Props) {
  const you = side === "left" ? distance : side === "right" ? -distance : 0; // metres to the right of the cable
  const need = Math.max(Math.abs(you), accuracy, 1) * 1.25;
  const range = [2, 5, 10, 20, 50].find((r) => r >= need) ?? 100; // half-width of the view in metres
  const px = 130 / range;
  const x = 150 + Math.max(-range, Math.min(range, you)) * px;
  const band = Math.min(accuracy * px, 140);
  return (
    <svg viewBox="0 0 300 180" className="lane" role="img"
      aria-label={side === "on" ? "You are on the cable" : `Cable is ${distance.toFixed(1)} metres to your ${side}`}>
      <rect x="0" y="0" width="300" height="180" rx="14" fill="var(--bg)" />
      <rect x={x - band} y="70" width={band * 2} height="60" rx="10" fill="var(--state)" opacity=".18" />
      <line x1="150" y1="14" x2="150" y2="166" stroke="var(--cable)" strokeWidth="7" strokeLinecap="round" />
      {[-1, 1].map((k) => (
        <g key={k}>
          <line x1={150 + k * 130} y1="150" x2={150 + k * 130} y2="162" stroke="var(--muted)" strokeWidth="2" />
          <text x={150 + k * 130 - k * 4} y="146" textAnchor={k < 0 ? "start" : "end"} fontSize="11" fill="var(--muted)">{range} m</text>
        </g>
      ))}
      <circle cx={x} cy="100" r="13" fill="var(--state)" stroke="var(--card)" strokeWidth="3" />
      <text x="150" y="12" textAnchor="middle" fontSize="11" fill="var(--muted)">▲ walking direction</text>
    </svg>
  );
}

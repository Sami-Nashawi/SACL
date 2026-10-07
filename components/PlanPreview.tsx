"use client";

type Row = { include: boolean; src: string; name: string; points: [number, number][] };

// A small plan of everything in the DXF, in the colours chosen. Tap a line, or a row below, to see which one it is.
export default function PlanPreview({ rows, meta, selected, onSelect }: {
  rows: Row[]; meta: Record<string, { color: string }>; selected: number | null; onSelect: (i: number | null) => void;
}) {
  const used = rows.map((r, i) => ({ r, i })).filter((x) => x.r.include);
  if (!used.length) return null;
  const es = used.flatMap((x) => x.r.points.map((p) => p[0])), ns = used.flatMap((x) => x.r.points.map((p) => p[1]));
  const minE = Math.min(...es), minN = Math.min(...ns), W = 300, H = 190, pad = 14;
  const scale = Math.min((W - 2 * pad) / (Math.max(...es) - minE || 1), (H - 2 * pad) / (Math.max(...ns) - minN || 1));
  const offX = (W - 2 * pad - (Math.max(...es) - minE) * scale) / 2, offY = (H - 2 * pad - (Math.max(...ns) - minN) * scale) / 2;
  const xy = (p: [number, number]) => `${(pad + offX + (p[0] - minE) * scale).toFixed(1)},${(H - pad - offY - (p[1] - minN) * scale).toFixed(1)}`;
  const sel = used.find((x) => x.i === selected);
  const mid = sel ? sel.r.points[Math.floor(sel.r.points.length / 2)] : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="preview" role="img" aria-label="Plan of the lines in this file" onClick={() => onSelect(null)}>
      {used.map(({ r, i }) => {
        const pts = r.points.map(xy).join(" ");
        return (
          <g key={i} opacity={selected === null || selected === i ? 1 : 0.4}>
            <polyline points={pts} fill="none" stroke={meta[r.src]?.color ?? "#888"} strokeWidth={selected === i ? 5 : 2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <polyline points={pts} fill="none" stroke="transparent" strokeWidth={22} vectorEffect="non-scaling-stroke" onClick={(e) => { e.stopPropagation(); onSelect(i); }} />
          </g>
        );
      })}
      {sel && mid && <text x={xy(mid).split(",")[0]} y={Number(xy(mid).split(",")[1]) - 8} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink)" stroke="var(--bg)" strokeWidth="3" paintOrder="stroke">{sel.r.name}</text>}
    </svg>
  );
}

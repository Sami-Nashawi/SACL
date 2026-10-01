"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { guide, type Line, type Pt } from "@/lib/engine";
import { parseDxf } from "@/lib/dxf";
import { mapsLink, toLatLon } from "@/lib/geo";

const E0 = 330000, N0 = 2765000; // demo origin (UTM metres)
const DEMO: Line = {
  name: "Demo cable (replace with your DXF)",
  pts: [[0, 0], [40, 10], [90, 10], [130, 50], [130, 110]].map(([e, n]) => ({ e: E0 + e, n: N0 + n })),
};
const W = 800, H = 520;

export default function Page() {
  const [lines, setLines] = useState<Line[]>([DEMO]);
  const [idx, setIdx] = useState(0);
  const [zone, setZone] = useState(40);
  const [forward, setForward] = useState(true);
  const [accuracy, setAccuracy] = useState(3);
  const [pos, setPos] = useState<Pt>({ e: E0 + 20, n: N0 + 25 });
  const [error, setError] = useState("");
  const cv = useRef<HTMLCanvasElement>(null);
  const line = lines[idx];

  // map transform: grid metres <-> canvas pixels
  const view = useMemo(() => {
    const es = line.pts.map((p) => p.e), ns = line.pts.map((p) => p.n);
    const w = Math.max(...es) - Math.min(...es), h = Math.max(...ns) - Math.min(...ns);
    const pad = Math.max(w, h, 20) * 0.35;
    const s = Math.min(W / (w + 2 * pad), H / (h + 2 * pad));
    return { s, cx: (Math.max(...es) + Math.min(...es)) / 2, cy: (Math.max(...ns) + Math.min(...ns)) / 2 };
  }, [line]);
  const toPx = (p: Pt) => [(p.e - view.cx) * view.s + W / 2, H / 2 - (p.n - view.cy) * view.s];

  const g = useMemo(() => guide(line, pos, { forward, accuracy }), [line, pos, forward, accuracy]);

  useEffect(() => {
    const c = cv.current!.getContext("2d")!;
    c.clearRect(0, 0, W, H);
    c.lineWidth = 4; c.strokeStyle = "#d9480f"; c.lineJoin = "round"; c.beginPath();
    line.pts.forEach((p, i) => { const [x, y] = toPx(p); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.stroke();
    const [sx, sy] = toPx(line.pts[0]);
    c.fillStyle = "#1b2a2f"; c.beginPath(); c.arc(sx, sy, 6, 0, 7); c.fill();
    c.font = "14px system-ui"; c.fillText("Start", sx + 10, sy - 8);
    const [ux, uy] = toPx(pos), [qx, qy] = toPx(g.nearest);
    c.setLineDash([6, 5]); c.lineWidth = 2; c.strokeStyle = "#0b63c5";
    c.beginPath(); c.moveTo(ux, uy); c.lineTo(qx, qy); c.stroke(); c.setLineDash([]);
    c.fillStyle = "rgba(11,99,197,.15)"; c.beginPath(); c.arc(ux, uy, accuracy * view.s, 0, 7); c.fill();
    c.fillStyle = "#0b63c5"; c.beginPath(); c.arc(ux, uy, 8, 0, 7); c.fill();
  });

  const place = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.type === "pointermove" && e.buttons === 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
    setPos({ e: (x - W / 2) / view.s + view.cx, n: (H / 2 - y) / view.s + view.cy });
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      const found = parseDxf(await f.text());
      if (!found.length) return setError("No polylines found. Export each cable as a polyline on its own layer.");
      setError(""); setLines(found); setIdx(0); setPos(found[0].pts[0]);
    } catch { setError("Could not read this DXF. Save it as ASCII DXF (AutoCAD 2018) and try again."); }
  };

  const here = toLatLon(zone, pos.e, pos.n), start = toLatLon(zone, line.pts[0].e, line.pts[0].n);
  const headline = g.mode === "approach" ? `Go ${g.cardinal}, ${g.distance.toFixed(0)} m`
    : g.side === "on" ? "On the line (within GPS accuracy)" : `Cable on your ${g.side}, ${g.distance.toFixed(1)} m`;

  return (
    <main>
      <h1>Cable Locator</h1>
      <div className="bar">
        <label>DXF file<input type="file" accept=".dxf" onChange={(e) => onFile(e.target.files?.[0])} /></label>
        <label>Cable<select value={idx} onChange={(e) => { setIdx(+e.target.value); setPos(lines[+e.target.value].pts[0]); }}>
          {lines.map((l, i) => <option key={i} value={i}>{l.name}</option>)}</select></label>
        <label>UTM zone<input type="number" min={1} max={60} value={zone} onChange={(e) => setZone(+e.target.value || 40)} /></label>
        <label>Walking<select value={forward ? "f" : "b"} onChange={(e) => setForward(e.target.value === "f")}>
          <option value="f">Start to end</option><option value="b">End to start</option></select></label>
        <label>GPS accuracy (m)<input type="number" min={0} step={0.5} value={accuracy} onChange={(e) => setAccuracy(+e.target.value)} /></label>
      </div>
      {error && <p role="alert" style={{ color: "#b42318", margin: 0 }}>{error}</p>}
      <canvas ref={cv} width={W} height={H} onPointerDown={place} onPointerMove={place} aria-label="Cable plan. Drag to move your simulated position." />
      <section className="read" aria-live="polite">
        <div className={`big ${g.mode === "follow" ? "near" : ""}`}>{headline}</div>
        <dl>
          <dt>Mode</dt><dd>{g.mode === "approach" ? "Approach" : "Follow"}</dd>
          <dt>Along the cable</dt><dd>{g.chainage.toFixed(0)} m from start, {g.remaining.toFixed(0)} m to end</dd>
          {g.bend && <><dt>Next bend</dt><dd>in {g.bend.dist.toFixed(0)} m, turns {g.bend.turn > 0 ? "right" : "left"} {Math.abs(g.bend.turn).toFixed(0)}°</dd></>}
          <dt>Check on map</dt>
          <dd><a href={mapsLink(start.lat, start.lon)} target="_blank" rel="noreferrer">Cable start</a>{" / "}
            <a href={mapsLink(here.lat, here.lon)} target="_blank" rel="noreferrer">Simulated position</a></dd>
        </dl>
        <p className="note">Drag on the plan to simulate walking. This is guidance only; confirm with an EM cable locator before any excavation.</p>
      </section>
    </main>
  );
}

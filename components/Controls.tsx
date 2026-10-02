"use client";

type Props = {
  cableNames: string[]; cableIndex: number; onCable: (i: number) => void;
  onFile: (f?: File) => void;
  zone: number; onZone: (z: number) => void;
  forward: boolean; onForward: (f: boolean) => void;
  live: boolean; onLive: (l: boolean) => void;
  simAccuracy: number; onSimAccuracy: (a: number) => void;
};

// The settings bar. Holds no state of its own: it shows values and reports changes upward.
export default function Controls(p: Props) {
  return (
    <div className="bar">
      <label>DXF file
        <input type="file" accept=".dxf" onChange={(e) => p.onFile(e.target.files?.[0])} />
      </label>
      <label>Cable
        <select value={p.cableIndex} onChange={(e) => p.onCable(+e.target.value)}>
          {p.cableNames.map((name, i) => <option key={i} value={i}>{name}</option>)}
        </select>
      </label>
      <label>UTM zone
        <input type="number" min={1} max={60} value={p.zone} onChange={(e) => p.onZone(+e.target.value || 40)} />
      </label>
      <label>Walking
        <select value={p.forward ? "f" : "b"} onChange={(e) => p.onForward(e.target.value === "f")}>
          <option value="f">Start to end</option>
          <option value="b">End to start</option>
        </select>
      </label>
      <label>Position
        <select value={p.live ? "live" : "sim"} onChange={(e) => p.onLive(e.target.value === "live")}>
          <option value="sim">Simulator</option>
          <option value="live">Live GPS</option>
        </select>
      </label>
      <label>Simulated accuracy (m)
        <input disabled={p.live} type="number" min={0} step={0.5} value={p.simAccuracy}
          onChange={(e) => p.onSimAccuracy(+e.target.value)} />
      </label>
    </div>
  );
}

"use client";

// The settings. Holds no state of its own: it shows values and reports changes upward.
type Props = {
  cableNames: string[]; cableIndex: number; onCable: (i: number) => void;
  onFile: (f?: File) => void;
  zone: number; onZone: (z: number) => void;
  forward: boolean; onForward: (f: boolean) => void;
  live: boolean; onLive: (l: boolean) => void;
  simAccuracy: number; onSimAccuracy: (a: number) => void;
  openSetup: boolean; // true until a real DXF is loaded, so first-time users see the upload button
};

export default function Controls(p: Props) {
  return (
    <section className="ctl">
      <label className="field">Cable
        <select value={p.cableIndex} onChange={(e) => p.onCable(+e.target.value)}>
          {p.cableNames.map((name, i) => <option key={i} value={i}>{name}</option>)}
        </select>
      </label>
      <details className="card setup" open={p.openSetup}>
        <summary>DXF file and settings</summary>
        <div className="fields">
          <label className="btn primary">Choose DXF file
            <input type="file" accept=".dxf" hidden onChange={(e) => p.onFile(e.target.files?.[0])} />
          </label>
          <div className="row">
            <label className="field">UTM zone
              <input type="number" inputMode="numeric" min={1} max={60} value={p.zone}
                onChange={(e) => p.onZone(+e.target.value || 40)} />
            </label>
            <label className="field">Walking
              <select value={p.forward ? "f" : "b"} onChange={(e) => p.onForward(e.target.value === "f")}>
                <option value="f">Start to end</option>
                <option value="b">End to start</option>
              </select>
            </label>
          </div>
          <label className="field">Position
            <select value={p.live ? "live" : "test"} onChange={(e) => p.onLive(e.target.value === "live")}>
              <option value="live">Live GPS (on site)</option>
              <option value="test">Test mode (tap the map to move)</option>
            </select>
          </label>
          {!p.live && (
            <label className="field">Test accuracy (m)
              <input type="number" inputMode="decimal" min={0} step={0.5} value={p.simAccuracy}
                onChange={(e) => p.onSimAccuracy(+e.target.value)} />
            </label>
          )}
        </div>
      </details>
    </section>
  );
}

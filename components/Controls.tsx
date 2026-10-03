"use client";

// The settings. Holds no state of its own: it shows values and reports changes upward.
type ModeProps = { live: boolean; onLive: (l: boolean) => void };

// Big two-button switch in the header: easy to hit with a thumb.
export function ModeSwitch({ live, onLive }: ModeProps) {
  return (
    <div className="seg" role="group" aria-label="Position source">
      <button aria-pressed={!live} onClick={() => onLive(false)}>Simulator</button>
      <button aria-pressed={live} onClick={() => onLive(true)}>Live GPS</button>
    </div>
  );
}

export type GuideMode = "auto" | "find" | "follow";

// Auto switches by distance (Follow when close, Find when far); the other two force a mode.
export function GuideSwitch({ value, onChange }: { value: GuideMode; onChange: (m: GuideMode) => void }) {
  const names: Record<GuideMode, string> = { auto: "Auto", find: "Find", follow: "Follow" };
  return (
    <div className="seg wide" role="group" aria-label="Guidance mode">
      {(Object.keys(names) as GuideMode[]).map((m) => (
        <button key={m} aria-pressed={value === m} onClick={() => onChange(m)}>{names[m]}</button>
      ))}
    </div>
  );
}

type Props = {
  cableNames: string[]; cableIndex: number; onCable: (i: number) => void;
  onFile: (f?: File) => void;
  zone: number; onZone: (z: number) => void;
  forward: boolean; onForward: (f: boolean) => void;
  live: boolean; simAccuracy: number; onSimAccuracy: (a: number) => void;
  guide: GuideMode; onGuide: (m: GuideMode) => void;
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
      <GuideSwitch value={p.guide} onChange={p.onGuide} />
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
          <label className="field">Simulated accuracy (m)
            <input disabled={p.live} type="number" inputMode="decimal" min={0} step={0.5} value={p.simAccuracy}
              onChange={(e) => p.onSimAccuracy(+e.target.value)} />
          </label>
        </div>
      </details>
    </section>
  );
}

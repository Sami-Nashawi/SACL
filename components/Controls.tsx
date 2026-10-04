"use client";

// The few settings the locate screen needs. Holds no state of its own.
type Props = {
  forward: boolean; onForward: (f: boolean) => void;
  live: boolean; onLive: (l: boolean) => void;
  simAccuracy: number; onSimAccuracy: (a: number) => void;
};

export default function Controls(p: Props) {
  return (
    <details className="card setup">
      <summary>Settings</summary>
      <div className="fields">
        <label className="field">Walking
          <select value={p.forward ? "f" : "b"} onChange={(e) => p.onForward(e.target.value === "f")}>
            <option value="f">Start to end</option>
            <option value="b">End to start</option>
          </select>
        </label>
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
  );
}

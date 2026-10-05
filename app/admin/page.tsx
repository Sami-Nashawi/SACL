"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AccountMenu from "@/components/AccountMenu";
import AdminTabs from "@/components/AdminTabs";
import { parseDxf } from "@/lib/dxf";
import { fetchList, forgetCable } from "@/lib/cables-client";
import { measure, type CableSummary } from "@/lib/cable-types";

type Row = { include: boolean; name: string; points: [number, number][] };
const fmt = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`);

// Admin: add cables from a DXF (name each one, tick the ones to keep), and rename or delete saved cables.
export default function Admin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [project, setProject] = useState("");
  const [zone, setZone] = useState(40);
  const [cables, setCables] = useState<CableSummary[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => { fetchList().then((r) => setCables(r.cables)).catch(() => {}); }, []);
  useEffect(reload, [reload]);

  const onFile = async (file?: File) => {
    if (!file) return;
    setMsg(null);
    try {
      const lines = parseDxf(await file.text());
      if (!lines.length) return setMsg({ ok: false, text: "No polylines found. Save the DWG as DXF (2018 ASCII) and make sure the cables are polylines." });
      setRows(lines.map((l) => ({ include: true, name: l.name, points: l.pts.map((p): [number, number] => [p.e, p.n]) })));
    } catch {
      setMsg({ ok: false, text: "Could not read this DXF. Save it as ASCII DXF (AutoCAD 2018) and try again." });
    }
  };

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const chosen = rows.filter((r) => r.include);
  const looksWrong = chosen.some((r) => r.points.some(([e, n]) => e < 100000 || e > 900000 || n < 0 || n > 10000000));

  const save = async () => {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/cables", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project, zone, cables: chosen.map((r) => ({ name: r.name, points: r.points })) }) }).catch(() => null);
    const j = res ? ((await res.json().catch(() => ({}))) as { saved?: number; error?: string }) : {};
    setBusy(false);
    if (res?.ok) { setMsg({ ok: true, text: `Saved ${j.saved} cable${j.saved === 1 ? "" : "s"}.` }); setRows([]); reload(); }
    else setMsg({ ok: false, text: j.error ?? "Could not save. Check your connection." });
  };

  const rename = async (c: CableSummary) => {
    const name = prompt("New name for this cable", c.name);
    if (!name || name === c.name) return;
    const res = await fetch(`/api/cables/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (res.ok) { forgetCable(c.id); reload(); } else setMsg({ ok: false, text: ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Could not rename" });
  };

  const remove = async (c: CableSummary) => {
    if (!confirm(`Delete "${c.name}" for everyone?`)) return;
    await fetch(`/api/cables/${c.id}`, { method: "DELETE" });
    forgetCable(c.id); reload();
  };

  return (
    <>
      <header className="app">
        <Link href="/" className="back" aria-label="Back to cables">‹</Link>
        <span className="brand title-ellipsis">Manage</span>
        <AccountMenu />
      </header>
      <main>
        <AdminTabs active="cables" />
        <section className="card form">
          <h2 className="h2">Add from a DXF</h2>
          <label className="btn primary">Choose DXF file
            <input type="file" accept=".dxf" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {rows.length > 0 && (
            <>
              <div className="row">
                <label className="field">Project (optional)
                  <input value={project} placeholder="e.g. ETISALAT" onChange={(e) => setProject(e.target.value)} />
                </label>
                <label className="field">UTM zone
                  <input type="number" inputMode="numeric" min={1} max={60} value={zone} onChange={(e) => setZone(+e.target.value || 40)} />
                </label>
              </div>
              <p className="note">{rows.length} lines found. Untick any you do not need, and give each a clear name.</p>
              {looksWrong && <p className="banner warn">Some coordinates do not look like UTM metres. Check the drawing's coordinate system before saving.</p>}
              {rows.map((r, i) => (
                <div key={i} className="cablerow">
                  <input type="checkbox" checked={r.include} aria-label={`Include ${r.name}`} onChange={(e) => update(i, { include: e.target.checked })} />
                  <input value={r.name} onChange={(e) => update(i, { name: e.target.value })} aria-label="Cable name" />
                  <span className="meta">{fmt(measure(r.points).lengthM)}</span>
                </div>
              ))}
              <button className="btn primary" disabled={busy || !chosen.length || chosen.some((r) => !r.name.trim())} onClick={save}>
                {busy ? "Saving…" : `Save ${chosen.length} cable${chosen.length === 1 ? "" : "s"}`}
              </button>
            </>
          )}
          {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "banner ok" : "alert"}>{msg.text}</p>}
        </section>
        <section className="list">
          <h2 className="h2">Saved cables ({cables.length})</h2>
          {cables.map((c) => (
            <div key={c.id} className="item static">
              <b>{c.name}</b>
              <span className="meta">{c.project && `${c.project} · `}{fmt(c.lengthM)} · zone {c.zone}</span>
              <span className="actions">
                <Link className="btn sm" href={`/locate/${c.id}`}>Open</Link>
                <button className="btn sm" onClick={() => rename(c)}>Rename</button>
                <button className="btn sm danger" onClick={() => remove(c)}>Delete</button>
              </span>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}

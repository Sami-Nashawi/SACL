"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AccountMenu from "@/components/AccountMenu";
import AdminTabs from "@/components/AdminTabs";
import { parseDxf } from "@/lib/dxf";
import { colorFor } from "@/lib/colors";
import { fetchList, forgetLayout } from "@/lib/cables-client";
import { groupLayouts, layerColors, measure, type CableSummary } from "@/lib/cable-types";

type Row = { include: boolean; name: string; src: string; points: [number, number][] };
type Meta = Record<string, { label: string; color: string }>; // per DXF layer: the name and colour of that kind of line
const fmt = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`);
const errorOf = async (res: Response | null, fallback: string) =>
  res ? (((await res.json().catch(() => ({}))) as { error?: string }).error ?? fallback) : "No connection. Try again.";

// Admin: turn a whole DXF into a layout (name each line, name and colour each kind of line), and manage saved layouts.
export default function Admin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Meta>({});
  const [layout, setLayout] = useState("");
  const [zone, setZone] = useState(40);
  const [cables, setCables] = useState<CableSummary[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const reload = useCallback(() => { fetchList().then((r) => setCables(r.cables)).catch(() => {}); }, []);
  useEffect(reload, [reload]);
  const layouts = useMemo(() => groupLayouts(cables), [cables]);

  const onFile = async (file?: File) => {
    if (!file) return;
    setMsg(null);
    try {
      const lines = parseDxf(await file.text());
      if (!lines.length) return setMsg({ ok: false, text: "No lines found. Save the DWG as DXF (2018 ASCII) and make sure the lines are polylines." });
      const srcs = [...new Set(lines.map((l) => l.layer ?? "0"))];
      setMeta(Object.fromEntries(srcs.map((s, i) => [s, { label: s, color: colorFor(s, i) }])));
      setRows(lines.map((l) => ({ include: true, name: l.name, src: l.layer ?? "0", points: l.pts.map((p): [number, number] => [p.e, p.n]) })));
      if (!layout) setLayout(file.name.replace(/\.dxf$/i, ""));
    } catch {
      setMsg({ ok: false, text: "Could not read this DXF. Save it as ASCII DXF (AutoCAD 2018) and try again." });
    }
  };

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setMetaFor = (src: string, patch: Partial<Meta[string]>) => setMeta((m) => ({ ...m, [src]: { ...m[src], ...patch } }));
  const chosen = rows.filter((r) => r.include);
  const looksWrong = chosen.some((r) => r.points.some(([e, n]) => e < 100000 || e > 900000 || n < 0 || n > 10000000));
  const srcs = Object.keys(meta);

  const save = async () => {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/cables", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: layout, zone, cables: chosen.map((r) => ({ name: r.name, layer: meta[r.src].label, color: meta[r.src].color, points: r.points })) }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) { const j = (await res.json()) as { saved: number }; setMsg({ ok: true, text: `Saved ${j.saved} lines into "${layout}".` }); setRows([]); setMeta({}); forgetLayout(layout); reload(); }
    else setMsg({ ok: false, text: await errorOf(res, "Could not save") });
  };

  const send = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    if (res?.ok) reload(); else setMsg({ ok: false, text: await errorOf(res, "Something went wrong") });
    return !!res?.ok;
  };
  const renameLayout = async (project: string) => {
    const to = prompt("New name for this layout", project);
    if (to && to !== project && (await send("/api/layouts", "PATCH", { from: project, to }))) { forgetLayout(project); forgetLayout(to); }
  };
  const deleteLayout = async (project: string, name: string) => {
    if (confirm(`Delete the layout "${name}" and all its lines, for everyone?`) && (await send(`/api/layouts?name=${encodeURIComponent(project)}`, "DELETE"))) forgetLayout(project);
  };
  const renameLine = async (c: CableSummary) => {
    const name = prompt("New name for this line", c.name);
    if (name && name !== c.name && (await send(`/api/cables/${c.id}`, "PATCH", { name }))) forgetLayout(c.project);
  };
  const deleteLine = async (c: CableSummary) => {
    if (confirm(`Delete "${c.name}" for everyone?`) && (await send(`/api/cables/${c.id}`, "DELETE"))) forgetLayout(c.project);
  };
  // Colour pickers fire while you drag, so wait until you stop before saving.
  const changeColor = (project: string, layer: string, color: string) => {
    const k = `${project}|${layer}`;
    clearTimeout(timers.current[k]);
    timers.current[k] = setTimeout(async () => { if (await send("/api/layouts", "PATCH", { project, layer, color })) forgetLayout(project); }, 600);
  };

  return (
    <>
      <header className="app">
        <Link href="/" className="back" aria-label="Back to layouts">‹</Link>
        <span className="brand title-ellipsis">Manage</span>
        <AccountMenu requireAdmin />
      </header>
      <main>
        <AdminTabs active="cables" />
        <section className="card form">
          <h2 className="h2">Add a layout from a DXF</h2>
          <label className="btn primary">Choose DXF file
            <input type="file" accept=".dxf" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {rows.length > 0 && (
            <>
              <div className="row">
                <label className="field">Layout name
                  <input list="layout-names" value={layout} onChange={(e) => setLayout(e.target.value)} placeholder="e.g. Al Tallah Road" />
                  <datalist id="layout-names">{layouts.map((l) => <option key={l.key} value={l.project} />)}</datalist>
                </label>
                <label className="field">UTM zone
                  <input type="number" inputMode="numeric" min={1} max={60} value={zone} onChange={(e) => setZone(+e.target.value || 40)} />
                </label>
              </div>
              <p className="note">{rows.length} lines found in {srcs.length} kinds. Name each kind and pick its colour, then untick or rename single lines. Using an existing layout name adds to it.</p>
              {looksWrong && <p className="banner warn">Some coordinates do not look like UTM metres. Check the drawing's coordinate system before saving.</p>}
              {srcs.map((src) => (
                <div key={src} className="layergroup">
                  <div className="layerhead">
                    <input type="color" value={meta[src].color} onChange={(e) => setMetaFor(src, { color: e.target.value })} aria-label={`Colour for ${src}`} />
                    <input value={meta[src].label} onChange={(e) => setMetaFor(src, { label: e.target.value })} aria-label={`Name for kind ${src}`} />
                  </div>
                  {rows.map((r, i) => r.src !== src ? null : (
                    <div key={i} className="cablerow">
                      <input type="checkbox" checked={r.include} aria-label={`Include ${r.name}`} onChange={(e) => update(i, { include: e.target.checked })} />
                      <input value={r.name} onChange={(e) => update(i, { name: e.target.value })} aria-label="Line name" />
                      <span className="meta">{fmt(measure(r.points).lengthM)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <button className="btn primary" disabled={busy || !layout.trim() || !chosen.length || chosen.some((r) => !r.name.trim())} onClick={save}>
                {busy ? "Saving…" : `Save ${chosen.length} line${chosen.length === 1 ? "" : "s"}`}
              </button>
            </>
          )}
          {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "banner ok" : "alert"}>{msg.text}</p>}
        </section>
        <section className="list">
          <h2 className="h2">Saved layouts ({layouts.length})</h2>
          {layouts.map((l) => {
            const mine = cables.filter((c) => c.project === l.project);
            const colors = layerColors(mine);
            return (
              <div key={l.key} className="item static">
                <b>{l.name}</b>
                <span className="meta">{l.lines} lines · {fmt(l.lengthM)} · zone {l.zone}</span>
                <span className="actions">
                  <Link className="btn sm" href={`/locate/${encodeURIComponent(l.key)}`}>Open</Link>
                  {l.project && <button className="btn sm" onClick={() => renameLayout(l.project)}>Rename</button>}
                  <button className="btn sm danger" onClick={() => deleteLayout(l.project, l.name)}>Delete</button>
                </span>
                <details className="sublist">
                  <summary>Colours and lines</summary>
                  {l.layers.map((x) => (
                    <div key={x.layer} className="layerhead">
                      <input type="color" defaultValue={colors.get(x.layer) ?? x.color} onChange={(e) => changeColor(l.project, x.layer, e.target.value)} aria-label={`Colour for ${x.layer || "other"}`} />
                      <b>{x.layer || "Other"}</b><span className="meta">{x.count} lines</span>
                    </div>
                  ))}
                  {mine.map((c) => (
                    <div key={c.id} className="cablerow lines">
                      <span className="swatch" style={{ background: c.color || colors.get(c.layer) }} />
                      <span>{c.name} <span className="meta">{fmt(c.lengthM)}</span></span>
                      <span className="actions">
                        <button className="btn sm" onClick={() => renameLine(c)}>Rename</button>
                        <button className="btn sm danger" onClick={() => deleteLine(c)}>Delete</button>
                      </span>
                    </div>
                  ))}
                </details>
              </div>
            );
          })}
        </section>
      </main>
    </>
  );
}

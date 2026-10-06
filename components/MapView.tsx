"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Line, Pt } from "@/lib/engine";
import { fromLatLon, toLatLon } from "@/lib/geo";
import { MAP_LAYERS } from "@/lib/map";

type Props = {
  lines: Line[]; targetId: string; zone: number; position: Pt; nearest: Pt; accuracy: number;
  interactive: boolean; // test mode: tapping the map moves your dot
  onPick: (p: Pt) => void;
  onSelect: (id: string) => void; // tapping a line locks onto it
  fitKey: string; // zoom to the whole layout only when this changes
};
type Leaf = typeof import("leaflet");
const keyOf = (l: Line) => l.id ?? l.name;

// The point halfway along a line, where its name label sits.
function midPoint(pts: Pt[]): Pt {
  let half = 0;
  for (let i = 1; i < pts.length; i++) half += Math.hypot(pts[i].e - pts[i - 1].e, pts[i].n - pts[i - 1].n);
  half /= 2;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].e - pts[i - 1].e, pts[i].n - pts[i - 1].n);
    if (half <= seg) { const t = seg ? half / seg : 0; return { e: pts[i - 1].e + t * (pts[i].e - pts[i - 1].e), n: pts[i - 1].n + t * (pts[i].n - pts[i - 1].n) }; }
    half -= seg;
  }
  return pts[0];
}

// Every line of the layout on a real map, each in its own colour with its name. Leaflet needs the browser, so it loads inside an effect.
export default function MapView({ lines, targetId, zone, position, nearest, accuracy, interactive, onPick, onSelect, fitKey }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const st = useRef<{ L: Leaf; map: LMap; layer: LayerGroup } | null>(null);
  const latest = useRef({ zone, interactive, onPick }); latest.current = { zone, interactive, onPick };
  const [ready, setReady] = useState(false);
  const fitted = useRef("");

  useEffect(() => {
    let dead = false;
    (async () => {
      const mod = await import("leaflet");
      const L = ((mod as unknown as { default?: Leaf }).default ?? mod) as Leaf;
      if (dead || !el.current) return;
      const map = L.map(el.current, { zoomControl: false, maxZoom: 21 });
      const bases = MAP_LAYERS.map((b) => ({ name: b.name, layer: L.tileLayer(b.url, { attribution: b.attribution, maxNativeZoom: b.maxNativeZoom, maxZoom: 21 }) }));
      bases[0].layer.addTo(map);
      L.control.layers(Object.fromEntries(bases.map((b) => [b.name, b.layer])), undefined, { position: "topright" }).addTo(map);
      const layer = L.layerGroup().addTo(map);
      map.on("click", (e) => { const c = latest.current; if (c.interactive) c.onPick(fromLatLon(c.zone, e.latlng.lat, e.latlng.lng)); });
      // Names are hidden when zoomed far out, so a big layout does not turn into a wall of labels.
      map.on("zoomend", () => el.current?.classList.toggle("labels-off", map.getZoom() < 16));
      st.current = { L, map, layer };
      setReady(true);
    })();
    return () => { dead = true; st.current?.map.remove(); st.current = null; setReady(false); fitted.current = ""; };
  }, []);

  const ll = (p: Pt) => { const c = toLatLon(zone, p.e, p.n); return [c.lat, c.lon] as [number, number]; };
  const fit = () => {
    const s = st.current; if (!s) return;
    const pts = [...lines.flatMap((l) => l.pts), position].map(ll);
    s.map.fitBounds(pts, { padding: [30, 30], maxZoom: 20 });
  };

  useEffect(() => {
    const s = st.current; if (!ready || !s) return;
    const { L, layer, map } = s;
    layer.clearLayers();
    for (const ln of lines) {
      const id = keyOf(ln), isTarget = id === targetId, color = ln.color ?? "#ff6a1f";
      L.polyline(ln.pts.map(ll), { color, weight: isTarget ? 7 : 4, opacity: isTarget ? 1 : 0.85, interactive: false }).addTo(layer);
      if (!interactive) { // wide invisible line so a thumb can tap it; tapping locks onto that line
        L.polyline(ln.pts.map(ll), { weight: 26, opacity: 0, bubblingMouseEvents: false }).on("click", () => onSelect(id)).addTo(layer);
      }
      const tag = document.createElement("span");
      tag.textContent = ln.name; tag.style.background = color; // textContent, so a name can never inject HTML
      L.circleMarker(ll(midPoint(ln.pts)), { radius: 1, opacity: 0, fillOpacity: 0, interactive: false })
        .bindTooltip(tag, { permanent: true, direction: "center", className: `linelabel${isTarget ? " target" : ""}`, interactive: false }).addTo(layer);
    }
    const target = lines.find((l) => keyOf(l) === targetId);
    if (target) {
      L.circleMarker(ll(target.pts[0]), { radius: 6, color: "#fff", weight: 2, fillColor: "#14211f", fillOpacity: 1, interactive: false }).addTo(layer);
      L.polyline([ll(position), ll(nearest)], { color: "#5aa9ff", weight: 2, dashArray: "6 5", interactive: false }).addTo(layer);
    }
    L.circle(ll(position), { radius: Math.max(accuracy, 0.5), color: "#5aa9ff", weight: 1, fillOpacity: 0.15, interactive: false }).addTo(layer);
    L.circleMarker(ll(position), { radius: 8, color: "#fff", weight: 3, fillColor: "#0b63c5", fillOpacity: 1, interactive: false }).addTo(layer);
    const key = `${fitKey}|${zone}`;
    if (fitted.current !== key && lines.length) { fitted.current = key; fit(); } // only re-frame for a new layout, so panning is not undone
    el.current?.classList.toggle("labels-off", map.getZoom() < 16);
  }, [ready, lines, targetId, zone, position, nearest, accuracy, interactive]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mapwrap">
      <div ref={el} className="map" />
      <button className="btn recenter" onClick={fit} aria-label="Show the whole layout and my position">Fit</button>
    </div>
  );
}

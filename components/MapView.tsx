"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Line, Pt } from "@/lib/engine";
import { fromLatLon, toLatLon } from "@/lib/geo";
import { MAP_LAYERS } from "@/lib/map";

type Props = {
  line: Line; zone: number; position: Pt; nearest: Pt; accuracy: number;
  interactive: boolean; // simulator: tapping the map moves your dot
  onPick: (p: Pt) => void;
};
type Leaf = typeof import("leaflet");

// The cable and you on a real map. Leaflet is loaded inside an effect because it needs the browser.
export default function MapView({ line, zone, position, nearest, accuracy, interactive, onPick }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const st = useRef<{ L: Leaf; map: LMap; layer: LayerGroup } | null>(null);
  const latest = useRef({ zone, interactive, onPick }); latest.current = { zone, interactive, onPick };
  const [ready, setReady] = useState(false);
  const fitKey = useRef("");

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
      map.on("click", (e) => {
        const c = latest.current;
        if (c.interactive) c.onPick(fromLatLon(c.zone, e.latlng.lat, e.latlng.lng));
      });
      st.current = { L, map, layer };
      setReady(true);
    })();
    return () => { dead = true; st.current?.map.remove(); st.current = null; setReady(false); fitKey.current = ""; };
  }, []);

  const fit = () => {
    const s = st.current; if (!s) return;
    const pts = [...line.pts, position].map((p) => { const c = toLatLon(zone, p.e, p.n); return [c.lat, c.lon] as [number, number]; });
    s.map.fitBounds(pts, { padding: [30, 30], maxZoom: 20 });
  };

  useEffect(() => {
    const s = st.current; if (!ready || !s) return;
    const { L, layer } = s;
    const ll = (p: Pt) => { const c = toLatLon(zone, p.e, p.n); return [c.lat, c.lon] as [number, number]; };
    layer.clearLayers();
    L.polyline(line.pts.map(ll), { color: "#ff6a1f", weight: 5 }).addTo(layer);
    L.circleMarker(ll(line.pts[0]), { radius: 6, color: "#fff", weight: 2, fillColor: "#14211f", fillOpacity: 1 }).bindTooltip("Start", { permanent: true, direction: "right" }).addTo(layer);
    L.polyline([ll(position), ll(nearest)], { color: "#5aa9ff", weight: 2, dashArray: "6 5" }).addTo(layer);
    L.circle(ll(position), { radius: Math.max(accuracy, 0.5), color: "#5aa9ff", weight: 1, fillOpacity: 0.15 }).addTo(layer);
    L.circleMarker(ll(position), { radius: 8, color: "#fff", weight: 3, fillColor: "#0b63c5", fillOpacity: 1 }).addTo(layer);
    const key = `${line.name}|${line.pts.length}|${zone}`;
    if (fitKey.current !== key) { fitKey.current = key; fit(); } // only re-frame when the cable changes, so panning is not undone
  }, [ready, line, zone, position, nearest, accuracy]);

  return (
    <div className="mapwrap">
      <div ref={el} className="map" />
      <button className="btn recenter" onClick={fit} aria-label="Show the whole cable and my position">Fit</button>
    </div>
  );
}

import DxfParser from "dxf-parser";
import type { Line, Pt } from "./engine";

// The parts of a DXF entity we use.
type Entity = { type: string; layer?: string; vertices?: { x: number; y: number }[]; shape?: boolean };

// Reads LINE / LWPOLYLINE / POLYLINE from model space. Each becomes one line with its DXF layer.
// Names are "LAYER 1", "LAYER 2" ... when a layer has several lines, or just the layer name when it has one.
export function parseDxf(text: string): Line[] {
  const dxf = new DxfParser().parseSync(text);
  const entities = (dxf?.entities ?? []) as Entity[];
  const found: { layer: string; pts: Pt[] }[] = [];

  for (const en of entities) {
    if (!["LINE", "LWPOLYLINE", "POLYLINE"].includes(en.type)) continue;
    if (!en.vertices || en.vertices.length < 2) continue;
    const pts = en.vertices.map((v) => ({ e: v.x, n: v.y }));
    if (en.shape && pts.length > 2) pts.push(pts[0]); // closed polyline: join the end back to the start
    found.push({ layer: en.layer || "0", pts });
  }

  const total: Record<string, number> = {};
  for (const f of found) total[f.layer] = (total[f.layer] ?? 0) + 1;
  const seen: Record<string, number> = {};
  return found.map((f) => {
    seen[f.layer] = (seen[f.layer] ?? 0) + 1;
    return { name: total[f.layer] > 1 ? `${f.layer} ${seen[f.layer]}` : f.layer, layer: f.layer, pts: f.pts };
  });
}

import DxfParser from "dxf-parser";
import type { Line } from "./engine";

// The parts of a DXF entity we use.
type Entity = { type: string; layer?: string; vertices?: { x: number; y: number }[]; shape?: boolean };

// Reads LINE / LWPOLYLINE / POLYLINE from model space. The layer name becomes the cable name.
export function parseDxf(text: string): Line[] {
  const dxf = new DxfParser().parseSync(text);
  const entities = (dxf?.entities ?? []) as Entity[];
  const lines: Line[] = [];
  const perLayer: Record<string, number> = {};

  for (const en of entities) {
    if (!["LINE", "LWPOLYLINE", "POLYLINE"].includes(en.type)) continue;
    if (!en.vertices || en.vertices.length < 2) continue;

    const pts = en.vertices.map((v) => ({ e: v.x, n: v.y }));
    if (en.shape && pts.length > 2) pts.push(pts[0]); // closed polyline: join the end back to the start

    const layer = en.layer || "0";
    perLayer[layer] = (perLayer[layer] ?? 0) + 1;
    lines.push({ name: perLayer[layer] > 1 ? `${layer} #${perLayer[layer]}` : layer, pts });
  }
  return lines;
}

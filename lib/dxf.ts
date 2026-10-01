import DxfParser from "dxf-parser";
import type { Line } from "./engine";

// Reads LINE / LWPOLYLINE / POLYLINE from model space. Layer name becomes the cable name.
export function parseDxf(text: string): Line[] {
  const dxf = new DxfParser().parseSync(text);
  const out: Line[] = [];
  const count: Record<string, number> = {};
  for (const en of dxf?.entities ?? []) {
    if (!["LINE", "LWPOLYLINE", "POLYLINE"].includes(en.type)) continue;
    const v = (en as { vertices?: { x: number; y: number }[] }).vertices;
    if (!v || v.length < 2) continue;
    const pts = v.map((p) => ({ e: p.x, n: p.y }));
    if ((en as { shape?: boolean }).shape && pts.length > 2) pts.push(pts[0]);
    const layer = en.layer || "0";
    count[layer] = (count[layer] ?? 0) + 1;
    out.push({ name: count[layer] > 1 ? `${layer} #${count[layer]}` : layer, pts });
  }
  return out;
}

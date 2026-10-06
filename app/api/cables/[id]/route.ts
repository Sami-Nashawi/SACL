import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/session";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

// One cable with all its points: this is what gets saved on the phone.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const a = await authorize();
  if ("error" in a) return a.error;
  const cable = await db.cable.findUnique({ where: { id: (await params).id } });
  return cable ? NextResponse.json({ cable }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const a = await authorize(true);
  if ("error" in a) return a.error;
  const { name, project, layer, color } = (await req.json().catch(() => ({}))) as { name?: string; project?: string; layer?: string; color?: string };
  const data: { name?: string; project?: string; layer?: string; color?: string } = {};
  if (name !== undefined) { if (!name.trim() || name.length > 120) return NextResponse.json({ error: "Invalid name" }, { status: 400 }); data.name = name.trim(); }
  if (project !== undefined) data.project = project.trim().slice(0, 80);
  if (layer !== undefined) data.layer = layer.trim().slice(0, 80);
  if (color !== undefined && /^#[0-9a-fA-F]{6}$/.test(color)) data.color = color;
  try {
    await db.cable.update({ where: { id: (await params).id }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string }).code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "A line with that name already exists in this layout" }, { status: 409 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const a = await authorize(true);
  if ("error" in a) return a.error;
  await db.cable.delete({ where: { id: (await params).id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/session";

export const dynamic = "force-dynamic";

// Admin: rename a layout ({from, to}) or set the colour of one kind of line in it ({project, layer, color}).
export async function PATCH(req: NextRequest) {
  const a = await authorize(true);
  if ("error" in a) return a.error;
  const b = (await req.json().catch(() => ({}))) as { from?: string; to?: string; project?: string; layer?: string; color?: string };
  if (typeof b.from === "string" && typeof b.to === "string") {
    const to = b.to.trim();
    if (!to || to.length > 80) return NextResponse.json({ error: "Invalid layout name" }, { status: 400 });
    try {
      await db.cable.updateMany({ where: { project: b.from }, data: { project: to } });
    } catch {
      return NextResponse.json({ error: "That layout already has a line with the same name" }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }
  if (typeof b.project === "string" && typeof b.layer === "string" && /^#[0-9a-fA-F]{6}$/.test(b.color ?? "")) {
    await db.cable.updateMany({ where: { project: b.project, layer: b.layer }, data: { color: b.color as string } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
}

// Admin: delete a whole layout and all its lines.
export async function DELETE(req: NextRequest) {
  const a = await authorize(true);
  if ("error" in a) return a.error;
  const name = req.nextUrl.searchParams.get("name");
  if (name === null) return NextResponse.json({ error: "Missing layout" }, { status: 400 });
  await db.cable.deleteMany({ where: { project: name } });
  return NextResponse.json({ ok: true });
}

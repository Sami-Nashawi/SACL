import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/session";
import { measure } from "@/lib/cable-types";

export const dynamic = "force-dynamic";

// Without ?project: the list (no points). With ?project=NAME: every line of that layout, with points.
export async function GET(req: NextRequest) {
  const a = await authorize();
  if ("error" in a) return a.error;
  const project = req.nextUrl.searchParams.get("project");
  if (project !== null) {
    const cables = await db.cable.findMany({ where: { project }, orderBy: { name: "asc" } });
    return NextResponse.json({ cables });
  }
  const cables = await db.cable.findMany({
    orderBy: [{ project: "asc" }, { name: "asc" }],
    select: { id: true, name: true, project: true, layer: true, color: true, zone: true, lengthM: true, minE: true, maxE: true, minN: true, maxN: true, updatedAt: true },
  });
  return NextResponse.json({ cables });
}

type NewLine = { name?: string; layer?: string; color?: string; points?: unknown };
const validPoints = (p: unknown): p is [number, number][] =>
  Array.isArray(p) && p.length >= 2 && p.length <= 20000 &&
  p.every((q) => Array.isArray(q) && q.length >= 2 && Number.isFinite(q[0]) && Number.isFinite(q[1]));

// Admin only: save the lines of a drawing into a layout. Adds to the layout if it already exists.
export async function POST(req: NextRequest) {
  const a = await authorize(true);
  if ("error" in a) return a.error;
  const body = (await req.json().catch(() => null)) as { project?: string; zone?: number; cables?: NewLine[] } | null;
  const project = (body?.project ?? "").trim();
  const zone = Number(body?.zone ?? 40);
  const items = body?.cables ?? [];
  if (!project || project.length > 80) return NextResponse.json({ error: "Give the layout a name (up to 80 characters)" }, { status: 400 });
  if (!items.length || !Number.isInteger(zone) || zone < 1 || zone > 60) return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
  const names = items.map((c) => (c.name ?? "").trim());
  if (names.some((n) => !n || n.length > 120)) return NextResponse.json({ error: "Every line needs a name (up to 120 characters)" }, { status: 400 });
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) return NextResponse.json({ error: "Two lines in this upload have the same name" }, { status: 400 });
  if (!items.every((c) => validPoints(c.points))) return NextResponse.json({ error: "A line has invalid points" }, { status: 400 });
  const taken = await db.cable.findMany({ where: { project, name: { in: names } }, select: { name: true } });
  if (taken.length) return NextResponse.json({ error: `Already in this layout: ${taken.map((t: { name: string }) => t.name).join(", ")}. Rename and try again.` }, { status: 409 });
  await db.$transaction(items.map((c, i) => db.cable.create({
    data: {
      name: names[i], project, zone,
      layer: (c.layer ?? "").trim().slice(0, 80),
      color: /^#[0-9a-fA-F]{6}$/.test(c.color ?? "") ? (c.color as string) : "",
      points: c.points as [number, number][], ...measure(c.points as [number, number][]),
    },
  })));
  return NextResponse.json({ saved: items.length });
}

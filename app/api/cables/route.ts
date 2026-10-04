import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentRole } from "@/lib/session";
import { measure } from "@/lib/cable-types";

export const dynamic = "force-dynamic";

// List of cables for the picker: no points, just what is needed to show and sort them.
export async function GET() {
  const cables = await db.cable.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, project: true, zone: true, lengthM: true, minE: true, maxE: true, minN: true, maxN: true, updatedAt: true },
  });
  return NextResponse.json({ cables });
}

type NewCable = { name?: string; points?: unknown };
const validPoints = (p: unknown): p is [number, number][] =>
  Array.isArray(p) && p.length >= 2 && p.length <= 20000 &&
  p.every((q) => Array.isArray(q) && q.length >= 2 && Number.isFinite(q[0]) && Number.isFinite(q[1]));

// Admin only: save one or many cables (a DXF often holds several).
export async function POST(req: NextRequest) {
  if ((await currentRole()) !== "admin") return NextResponse.json({ error: "Admin code required" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { project?: string; zone?: number; cables?: NewCable[] } | null;
  const zone = Number(body?.zone ?? 40);
  const items = body?.cables ?? [];
  if (!items.length || !Number.isInteger(zone) || zone < 1 || zone > 60) return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
  const names = items.map((c) => (c.name ?? "").trim());
  if (names.some((n) => !n || n.length > 120)) return NextResponse.json({ error: "Every cable needs a name (up to 120 characters)" }, { status: 400 });
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) return NextResponse.json({ error: "Two cables in this upload have the same name" }, { status: 400 });
  if (!items.every((c) => validPoints(c.points))) return NextResponse.json({ error: "A cable has invalid points" }, { status: 400 });
  const taken = await db.cable.findMany({ where: { name: { in: names } }, select: { name: true } });
  if (taken.length) return NextResponse.json({ error: `Already exists: ${taken.map((t: { name: string }) => t.name).join(", ")}. Rename and try again.` }, { status: 409 });
  await db.$transaction(items.map((c, i) => db.cable.create({
    data: { name: names[i], project: (body?.project ?? "").trim().slice(0, 80), zone, points: c.points as [number, number][], ...measure(c.points as [number, number][]) },
  })));
  return NextResponse.json({ saved: items.length });
}

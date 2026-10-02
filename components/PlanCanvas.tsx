"use client";
import { useEffect, useRef } from "react";
import type { Line, Pt } from "@/lib/engine";
import { CANVAS_H, CANVAS_W, fitView, gridToPixel, pixelToGrid, type View } from "@/lib/view";

const FULL_CIRCLE = Math.PI * 2; // radians
const COLORS = { cable: "#d9480f", you: "#0b63c5", ink: "#1b2a2f", accuracy: "rgba(11,99,197,.15)" };

type Props = {
  line: Line; position: Pt; nearest: Pt; accuracy: number;
  followPosition: boolean; // true in live mode: zoom out so your dot stays on screen
  interactive: boolean; // true in simulator mode: dragging moves the dot
  onMove: (p: Pt) => void;
};

const dot = (ctx: CanvasRenderingContext2D, [x, y]: [number, number], radius: number, fill: string) => {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, FULL_CIRCLE);
  ctx.fill();
};

function drawPlan(ctx: CanvasRenderingContext2D, view: View, p: Props) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // the cable
  ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.strokeStyle = COLORS.cable;
  ctx.beginPath();
  p.line.pts.forEach((pt, i) => {
    const [x, y] = gridToPixel(view, pt);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // its start
  const start = gridToPixel(view, p.line.pts[0]);
  dot(ctx, start, 6, COLORS.ink);
  ctx.font = "14px system-ui";
  ctx.fillText("Start", start[0] + 10, start[1] - 8);

  // dashed link from you to the nearest point on the cable
  const you = gridToPixel(view, p.position);
  const near = gridToPixel(view, p.nearest);
  ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = COLORS.you;
  ctx.beginPath(); ctx.moveTo(you[0], you[1]); ctx.lineTo(near[0], near[1]); ctx.stroke();
  ctx.setLineDash([]);

  // you: accuracy circle (radius in metres x pixels per metre), then the dot
  dot(ctx, you, p.accuracy * view.scale, COLORS.accuracy);
  dot(ctx, you, 8, COLORS.you);
}

export default function PlanCanvas(props: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const view = fitView(props.followPosition ? [...props.line.pts, props.position] : props.line.pts);

  // No dependency list on purpose: redraw after every render. The drawing is tiny and cheap.
  useEffect(() => { drawPlan(ref.current!.getContext("2d")!, view, props); });

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!props.interactive || e.buttons === 0) return; // only while pressed or touching
    const box = e.currentTarget.getBoundingClientRect();
    // The canvas is scaled by CSS, so convert from screen size to canvas pixels first.
    const x = ((e.clientX - box.left) / box.width) * CANVAS_W;
    const y = ((e.clientY - box.top) / box.height) * CANVAS_H;
    props.onMove(pixelToGrid(view, x, y));
  };

  return (
    <canvas ref={ref} width={CANVAS_W} height={CANVAS_H} onPointerDown={onPointer} onPointerMove={onPointer}
      // Only block page scrolling when dragging moves the simulated dot; in live mode the plan must not trap your thumb.
      style={{ touchAction: props.interactive ? "none" : "auto" }}
      aria-label="Cable plan. In simulator mode, drag to move your position." />
  );
}

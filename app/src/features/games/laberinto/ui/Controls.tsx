"use client";

import { useRef, useState } from "react";
import type { PlayerInput } from "../scene/Player";

const JOY_RADIUS = 56;
const TAP_MS = 300;
const TAP_PX = 12;

type Track = { kind: "joy" | "look"; x0: number; y0: number; x: number; y: number; t0: number };

/**
 * The input surface over the canvas. Touch: the left half is a floating
 * joystick, the right half drags to look, and a quick tap anywhere walks to the
 * door under it. Mouse: hover highlights a door, click walks to it (the same
 * click also grabs pointer lock via PointerLockControls, which listens on this id).
 */
export function Controls({
  inputRef,
  touch,
  locked,
  enabled,
}: {
  inputRef: React.RefObject<PlayerInput>;
  touch: boolean;
  locked: boolean;
  enabled: boolean;
}) {
  const tracks = useRef(new Map<number, Track>());
  const [joy, setJoy] = useState<{ x0: number; y0: number; dx: number; dy: number } | null>(null);

  const ndc = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 };
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    const hasJoy = [...tracks.current.values()].some((t) => t.kind === "joy");
    const kind = !hasJoy && e.clientX - r.left < r.width / 2 ? "joy" : "look";
    tracks.current.set(e.pointerId, { kind, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: e.timeStamp });
    if (kind === "joy") setJoy({ x0: e.clientX - r.left, y0: e.clientY - r.top, dx: 0, dy: 0 });
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") {
      inputRef.current.hover = locked ? null : ndc(e);
      return;
    }
    const t = tracks.current.get(e.pointerId);
    if (!t) return;
    if (t.kind === "look") {
      inputRef.current.look.dx += e.clientX - t.x;
      inputRef.current.look.dy += e.clientY - t.y;
    } else {
      let dx = e.clientX - t.x0;
      let dy = e.clientY - t.y0;
      const len = Math.hypot(dx, dy);
      if (len > JOY_RADIUS) {
        dx = (dx / len) * JOY_RADIUS;
        dy = (dy / len) * JOY_RADIUS;
      }
      inputRef.current.move.x = dx / JOY_RADIUS;
      inputRef.current.move.y = -dy / JOY_RADIUS;
      setJoy((j) => (j ? { ...j, dx, dy } : j));
    }
    t.x = e.clientX;
    t.y = e.clientY;
  };

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") return;
    const t = tracks.current.get(e.pointerId);
    tracks.current.delete(e.pointerId);
    if (!t) return;
    if (t.kind === "joy") {
      inputRef.current.move.x = inputRef.current.move.y = 0;
      setJoy(null);
    }
    const tap = e.timeStamp - t.t0 < TAP_MS && Math.hypot(e.clientX - t.x0, e.clientY - t.y0) < TAP_PX;
    if (tap && e.type === "pointerup") inputRef.current.pick = ndc(e);
  };

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (touch || !enabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    inputRef.current.pick = locked
      ? { x: 0, y: 0 }
      : { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 };
  };

  return (
    <div
      id="laberinto-canvas"
      className={`absolute inset-0 z-10 touch-none select-none ${!touch && !locked ? "cursor-pointer" : ""}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") inputRef.current.hover = null;
      }}
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {touch && (
        <>
          {/* Resting joystick: shows where the thumb goes. */}
          {!joy && (
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-[calc(28px+env(safe-area-inset-bottom))] left-[max(24px,env(safe-area-inset-left))] flex h-28 w-28 items-center justify-center rounded-full border-[3px] border-dashed border-white/70 bg-[color-mix(in_srgb,var(--ink)_18%,transparent)]"
            >
              <div className="h-12 w-12 rounded-full bg-card shadow-[0_3px_0_var(--card-shadow)]" />
            </div>
          )}
          {joy && (
            <div
              aria-hidden
              className="pointer-events-none absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/80 bg-[color-mix(in_srgb,var(--ink)_22%,transparent)]"
              style={{ left: joy.x0, top: joy.y0 }}
            >
              <div
                className="absolute top-1/2 left-1/2 -mt-6 -ml-6 h-12 w-12 rounded-full bg-accent shadow-[0_3px_0_var(--accent-shadow)]"
                style={{ transform: `translate(${joy.dx}px, ${joy.dy}px)` }}
              />
            </div>
          )}
          <p className="pointer-events-none absolute right-[max(16px,env(safe-area-inset-right))] bottom-[calc(28px+env(safe-area-inset-bottom))] max-w-[210px] rounded-full bg-[color-mix(in_srgb,var(--ink)_45%,transparent)] px-3 py-1 text-right text-[12px] font-bold text-on-ink">
            Drag to look · tap a door
          </p>
        </>
      )}
    </div>
  );
}

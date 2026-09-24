"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { NeutralToneMapping, type Mesh } from "three";
import bundled from "@/content/donde.json";
import type { GameProps } from "@/features/games/types";
import { Hud } from "./hud/Hud";
import { emptyFills } from "./model/judge";
import type { Progress } from "./model/progress";
import { scrapbookSchema, type Scrapbook } from "./model/schema";
import { Ctx, newView, ZOOM_MAX, ZOOM_MIN, type SceneCtx, type ViewState } from "./scene/context";
import { Stage } from "./scene/Stage";
import { useDonde } from "./useDonde";

function parseBook(content: unknown): Scrapbook {
  const parsed = scrapbookSchema.safeParse(content);
  return parsed.success ? parsed.data : scrapbookSchema.parse(bundled);
}

function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function subscribeVisibility(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}

/** Pointer gestures on empty space: swipe to rotate (snaps to 90°), pinch/wheel to zoom, one-finger pan when zoomed. */
function useGestures(viewRef: React.RefObject<ViewState>) {
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef<{ mode: "none" | "rotate" | "pan" | "pinch"; x: number; y: number; dist: number; zoom: number }>({ mode: "none", x: 0, y: 0, dist: 0, zoom: 1 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const v = viewRef.current;
      if (v.captured) {
        // A 3D object (piece, cover, building) took this pointer.
        v.captured = false;
        return;
      }
      if ((e.target as HTMLElement).tagName !== "CANVAS") return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...pointers.current.values()];
      if (pts.length === 2) {
        g.current = { mode: "pinch", x: 0, y: 0, dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), zoom: v.zoom };
        v.dragAz = 0;
      } else if (pts.length === 1) {
        g.current = { mode: v.zoom > 1.05 ? "pan" : "rotate", x: e.clientX, y: e.clientY, dist: 0, zoom: v.zoom };
      }
    },
    [viewRef],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const p = pointers.current.get(e.pointerId);
      if (!p) return;
      const v = viewRef.current;
      const s = g.current;
      if (s.mode === "pinch") {
        p.x = e.clientX;
        p.y = e.clientY;
        const pts = [...pointers.current.values()];
        if (pts.length < 2) return;
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        v.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (s.zoom * d) / Math.max(1, s.dist)));
      } else if (s.mode === "rotate") {
        v.dragAz = -(e.clientX - s.x) * 0.008;
      } else if (s.mode === "pan") {
        // Screen drag → ground-plane pan, in the camera's rotated frame.
        const az = Math.PI / 4 + v.step * (Math.PI / 2);
        const k = 0.04 / v.zoom;
        const dx = (e.clientX - p.x) * k;
        const dy = (e.clientY - p.y) * k;
        v.pan = [v.pan[0] - dx * Math.cos(az) - dy * Math.sin(az) * 1.6, v.pan[1] + dx * Math.sin(az) - dy * Math.cos(az) * 1.6];
        p.x = e.clientX;
        p.y = e.clientY;
      }
    },
    [viewRef],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!pointers.current.delete(e.pointerId)) return;
      const v = viewRef.current;
      if (g.current.mode === "rotate") {
        // Snap the swipe to the nearest quarter turn.
        v.step += Math.round(v.dragAz / (Math.PI / 2));
        v.dragAz = 0;
      }
      g.current.mode = pointers.current.size === 1 ? "pan" : "none";
      if (pointers.current.size === 1) {
        const [only] = pointers.current.values();
        g.current.x = only.x;
        g.current.y = only.y;
        if (v.zoom <= 1.05) g.current.mode = "none";
      }
    },
    [viewRef],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const v = viewRef.current;
      v.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom * Math.exp(-e.deltaY * 0.0015)));
    },
    [viewRef],
  );

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel };
}

export default function Game({ content, source, initialProgress, saveProgress, recordAttempt, exit }: GameProps<unknown, unknown>) {
  const book = useMemo(() => parseBook(content), [content]);
  const s = useDonde({ book, initialProgress, saveProgress: saveProgress as (p: Progress) => void, recordAttempt });
  const viewRef = useRef<ViewState>(newView());
  const hitsRef = useRef(new Map<string, Mesh[]>());
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoverZone, setHoverZone] = useState<string | null>(null);
  const [dpr, setDpr] = useState(1.5);
  const [fx, setFx] = useState(true);
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const hidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);
  const gestures = useGestures(viewRef);

  // New page: straight camera, no zoom.
  useEffect(() => {
    const v = viewRef.current;
    v.zoom = 1;
    v.pan = [0, 0];
  }, [s.pageIndex]);

  // Keyboard: arrows rotate, +/- zoom, PageUp/PageDown change floor, Escape drops a selection.
  const { setFloor, floor, setSelected } = s;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      const v = viewRef.current;
      if (e.key === "ArrowLeft") v.step -= 1;
      else if (e.key === "ArrowRight") v.step += 1;
      else if (e.key === "+" || e.key === "=") v.zoom = Math.min(ZOOM_MAX, v.zoom * 1.3);
      else if (e.key === "-") v.zoom = Math.max(ZOOM_MIN, v.zoom / 1.3);
      else if (e.key === "PageUp") setFloor(floor + 1);
      else if (e.key === "PageDown") setFloor(floor - 1);
      else if (e.key === "Escape") setSelected(null);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setFloor, floor, setSelected]);

  // Dev-only hook for the headless playtest: inspect state and solve the current step.
  const live = useRef(s);
  useEffect(() => {
    live.current = s;
  });
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __donde?: object };
    w.__donde = {
      state: () => {
        const c = live.current;
        return { page: c.pageIndex, task: c.task?.id ?? null, mechanic: c.task?.mechanic ?? null, done: c.done, placed: c.placed, candidates: c.candidates, floor: c.floor, note: c.note?.text ?? null, selected: c.selected };
      },
      solve: () => {
        const c = live.current;
        const t = c.task;
        if (!t) return false;
        if (t.mechanic === "drag") c.dropIntoZone(t.target_zone);
        else if (t.mechanic === "build" && t.build) {
          const answer = t.build.answers[0];
          const fills = c.fills.length ? c.fills : emptyFills(t);
          const slot = answer.findIndex((tok, i) => fills[i] !== tok);
          if (slot >= 0) c.placeWord(slot, answer[slot]);
        } else c.chooseZone(t.target_zone);
        return true;
      },
      goToPage: (i: number) => live.current.goToPage(i),
      reset: () => live.current.reset(),
      setFloor: (f: number) => live.current.setFloor(f),
      view: viewRef.current,
    };
    return () => {
      delete w.__donde;
    };
  }, []);

  const ctx: SceneCtx = { s, viewRef, hitsRef, dragging, setDragging, hoverZone, setHoverZone, reducedMotion };

  return (
    <main className="fixed inset-0 touch-none overflow-hidden bg-[#d4b690] select-none" {...gestures}>
      <Canvas
        orthographic
        shadows="soft"
        dpr={dpr}
        frameloop={hidden ? "never" : "always"}
        camera={{ position: [20, 20, 20], zoom: 30, near: 0.1, far: 200 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = NeutralToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
        aria-label={`Papercraft diorama: ${s.page.title_en}`}
      >
        <color attach="background" args={["#d4b690"]} />
        <PerformanceMonitor
          onDecline={() => {
            setDpr(1);
            setFx(false);
          }}
          onIncline={() => setDpr(2)}
        />
        <Ctx.Provider value={ctx}>
          <Stage fx={fx} />
        </Ctx.Provider>
      </Canvas>
      <Hud s={s} viewRef={viewRef} source={source} exit={exit} />
    </main>
  );
}

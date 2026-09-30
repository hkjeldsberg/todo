"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { World } from "../model/relations";
import { GnomeMotion, type GnomeTarget } from "./gnome";
import { ctxOf, T, YPX } from "./pixel";
import { buildRoom, buildStatic, fitView, paint, pickAt, pointFor, signature, type PaintState, type RoomArt, type View } from "./room";

/**
 * The map: a 16-bit top-down pixel-art scene (3/4 view, north = the back of
 * the room). Drawn at 16 px per tile on a canvas, scaled up by an integer
 * factor with nearest-neighbour. The static layer is built once per room and
 * size; per frame only props (painter-sorted) and the gnome are blitted, and
 * only while something moves. Labels are HTML on top.
 */

export interface MapProps {
  world: World;
  gnome: GnomeTarget | null;
  /** Objects the player can tap (their name goes into the answer). Enables hover feedback. */
  pickable: boolean;
  selected: string[];
  labels: boolean;
  /** Object ids the gnome is inside or under: faded so he shows. */
  ghosts: string[];
  onPick(id: string): void;
  onArrive(key: string): void;
  reducedMotion: boolean;
  label: string;
}

/** CSS px kept clear for the HUD over the map (top bar, bottom buttons). */
const HUD = { top: 64, bottom: 18, side: 6 };

interface Size {
  w: number;
  h: number;
  dpr: number;
}

export function GardenMap(props: MapProps) {
  const { world, gnome, labels, selected, label } = props;
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const live = useRef({ props, hover });
  const motion = useRef<GnomeMotion | null>(null);
  const kick = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    live.current = { props, hover };
    kick.current();
  });

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const next = { w: r.width, h: r.height, dpr: window.devicePixelRatio || 1 };
      setSize((s) => (s && s.w === next.w && s.h === next.h && s.dpr === next.dpr ? s : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", measure);
    };
  }, []);

  // Room art needs a DOM (canvases); built only once the map has been measured on the client.
  const measured = size !== null;
  const art = useMemo<RoomArt | null>(() => (measured ? buildRoom(world) : null), [world, measured]);
  const view = useMemo<View | null>(() => (art && size && size.w > 0 && size.h > 0 ? fitView(art.fit, size.w, size.h, size.dpr, HUD) : null), [art, size]);

  // Paint loop: runs on rAF while something moves, sleeps otherwise, pauses when the tab is hidden.
  useEffect(() => {
    const cv = canvas.current;
    if (!art || !view || !cv) return;
    cv.width = view.baseW;
    cv.height = view.baseH;
    const g = ctxOf(cv);
    const stat = buildStatic(art, view);
    const m = (motion.current ??= new GnomeMotion());
    let raf = 0;
    let last = 0;
    let sig = "";
    let clock = 0;
    const tick = (now: number) => {
      raf = 0;
      const { props: p, hover: h } = live.current;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      clock += dt;
      let gf = null;
      if (p.gnome) {
        const r = m.step(p.gnome, p.world.scene.id, dt, p.reducedMotion);
        gf = { target: p.gnome, frame: r.frame };
        if (r.justArrived) p.onArrive(p.gnome.key);
      }
      const hoverSet = new Set(p.selected);
      if (h && p.pickable) hoverSet.add(h);
      const st: PaintState = { gnome: gf, ghosts: new Set(p.ghosts), hover: hoverSet, t: clock, reduced: p.reducedMotion };
      const next = signature(art, st);
      if (next !== sig) {
        sig = next;
        paint(g, stat, art, view, st);
      }
      const busy = !!gf && (!gf.frame.arrived || gf.frame.moving);
      if (!document.hidden && (busy || !p.reducedMotion)) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const start = () => {
      if (!raf && !document.hidden) raf = requestAnimationFrame(tick);
    };
    kick.current = start;
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      } else start();
    };
    document.addEventListener("visibilitychange", onVis);
    start();
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      kick.current = () => {};
    };
  }, [art, view]);

  const toWorld = (clientX: number, clientY: number): [number, number] | null => {
    const cv = canvas.current;
    if (!cv || !view) return null;
    const r = cv.getBoundingClientRect();
    return [((clientX - r.left) / r.width) * view.baseW - view.ox, ((clientY - r.top) / r.height) * view.baseH - view.oy];
  };
  /** Finger-friendly: near misses within ~22 CSS px still pick the closest thing. */
  const slop = (touch: boolean) => (view ? ((touch ? 22 : 8) * view.dpr) / view.s : 8);

  // Dev only: screen point of an object, for the headless playtest.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !art || !view) return;
    const w = window as unknown as { __posicionesScene?: object };
    w.__posicionesScene = {
      object: (id: string) => {
        const cv = canvas.current;
        const p = pointFor(art, id);
        if (!cv || !p) return null;
        const r = cv.getBoundingClientRect();
        return [r.left + ((p[0] + view.ox) / view.baseW) * r.width, r.top + ((p[1] + view.oy) / view.baseH) * r.height];
      },
    };
    return () => {
      delete w.__posicionesScene;
    };
  }, [art, view]);

  const tags = useMemo(() => {
    if (!art || !view || !size) return [];
    const k = view.s / view.dpr;
    return art.sprites
      .filter((s) => s.id && s.art)
      .map((s) => {
        const b = s.body!;
        const o = world.objects.find((x) => x.id === s.id)!;
        // Never let a name cover the gnome: hide the label of the thing he's on or in.
        const x = Math.min(size.w - 8, Math.max(8, (s.art!.label[0] + view.ox) * k));
        const y = Math.min(size.h - 8, Math.max(8, (s.art!.label[1] + view.oy) * k));
        // …or whose sign would sit over him on screen.
        const gx = gnome ? (gnome.at[0] * T + view.ox) * k : 0;
        const gy = gnome ? (gnome.at[1] * T - gnome.y * YPX - 10 + view.oy) * k : 0;
        const over = !!gnome && Math.abs(x - gx) < o.es.length * 3.6 + 8 * k && Math.abs(y - gy) < 12 * k;
        const covers = over || (!!gnome && Math.abs(gnome.at[0] - b.at[0]) <= b.size[0] / 2 + 0.3 && Math.abs(gnome.at[1] - b.at[1]) <= b.size[1] / 2 + 0.3);
        return { id: s.id!, es: o.es, x, y, covers };
      });
  }, [art, view, size, world, gnome]);

  return (
    <div
      ref={wrap}
      className="absolute inset-0 overflow-hidden"
      style={{ background: art?.bg ?? "#66BC48", touchAction: "manipulation", cursor: hover && props.pickable ? "pointer" : "default" }}
    >
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        className="absolute top-0 left-0"
        style={{
          width: view ? `${(view.baseW * view.s) / view.dpr}px` : "100%",
          height: view ? `${(view.baseH * view.s) / view.dpr}px` : "100%",
          imageRendering: "pixelated",
        }}
        onClick={(e) => {
          const p = toWorld(e.clientX, e.clientY);
          if (!p || !art) return;
          const touch = (e.nativeEvent as PointerEvent).pointerType === "touch" || matchMedia("(pointer: coarse)").matches;
          const id = pickAt(art, p[0], p[1], slop(touch));
          if (id) props.onPick(id);
        }}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const p = toWorld(e.clientX, e.clientY);
          const id = p && art ? pickAt(art, p[0], p[1], slop(false)) : null;
          setHover((h) => (h === id ? h : id));
        }}
        onPointerLeave={() => setHover(null)}
      />
      {labels && (
        <div className="pointer-events-none absolute inset-0 z-[5]">
          {tags.map((t) =>
            t.covers && !selected.includes(t.id) ? null : (
              <span
                key={t.id}
                className={`absolute block -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[3px] border-2 px-1.5 text-[11px] leading-[15px] font-bold lg:text-[13px] lg:leading-[17px] ${
                  selected.includes(t.id) || (hover === t.id && props.pickable) ? "border-ink bg-accent text-white" : "border-ink bg-[#FFF4DC] text-ink"
                }`}
                style={{ left: t.x, top: t.y, boxShadow: "0 2px 0 rgba(61,33,64,0.55)" }}
              >
                {t.es}
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}

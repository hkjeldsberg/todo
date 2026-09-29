"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Vector3 } from "three";
import { SurfaceHtml } from "@/features/games/donde/scene/SurfaceHtml";
import type { Body, Layout } from "../model/layouts";
import type { Rotation, World } from "../model/relations";
import { Gnome, type GnomeTarget } from "./Gnome";
import { checker, flat, unlit } from "./materials";
import { Prop } from "./props";

/**
 * The orthographic garden map: a near top-down 16-bit-RPG view that turns in
 * 90° steps around the map centre. Flat Lambert materials, no post-processing,
 * DPR 1–2, and the render loop stops while the tab is hidden.
 */

const ELEVATION = 0.98; // ~56° above the ground: top-down, but heights still read.
const SPAN = 13; // world units framed: the 10×10 room plus its outside strip.

export interface MapProps {
  world: World;
  rot: Rotation;
  gnome: GnomeTarget | null;
  /** Objects the player can tap (suggestions on and a chip picked, or any time to fill the text field). */
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

function subscribeVisibility(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}

function CameraRig({ rot }: { rot: Rotation }) {
  const cur = useRef({ az: 0, target: 0, last: 0 as number, fit: 30 });
  const dir = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }, dt) => {
    const c = cur.current;
    if (rot !== c.last) {
      // Shortest turn from the last rotation, keeping the angle continuous.
      const delta = ((rot - c.last + 6) % 4) - 2;
      c.target += (delta === -2 ? 2 : delta) * (Math.PI / 2);
      c.last = rot;
    }
    c.az += (c.target - c.az) * (1 - Math.exp(-9 * dt));
    const ca = Math.abs(Math.cos(c.az));
    const sa = Math.abs(Math.sin(c.az));
    const across = SPAN * (ca + sa);
    const deep = SPAN * (ca + sa) * Math.sin(ELEVATION) + 2.4 * Math.cos(ELEVATION);
    const fit = Math.min(size.width / across, size.height / deep);
    c.fit += (fit - c.fit) * (1 - Math.exp(-10 * dt));
    dir.set(Math.cos(ELEVATION) * Math.sin(c.az), Math.sin(ELEVATION), Math.cos(ELEVATION) * Math.cos(c.az));
    camera.position.set(0, 0.6, 0).addScaledVector(dir, 40);
    camera.lookAt(0, 0.6, 0);
    camera.zoom = c.fit;
    camera.updateProjectionMatrix();
  });
  return null;
}

function Ground({ layout }: { layout: Layout }) {
  const grass = checker(layout.palette.grass[0], layout.palette.grass[1], 10);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={flat(layout.palette.outside)}>
        <planeGeometry args={[60, 60]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshLambertMaterial map={grass} />
      </mesh>
    </>
  );
}

/** Walls around the room, with gaps where a gate sits on the boundary. */
function Walls({ layout }: { layout: Layout }) {
  const gaps = Object.values(layout.objects).filter((b) => b.traits?.includes("opening") && (Math.abs(Math.abs(b.at[0]) - 5) < 0.3 || Math.abs(Math.abs(b.at[1]) - 5) < 0.3));
  const open = new Set(layout.openSides ?? []);
  const sides: { dir: "n" | "s" | "e" | "w"; along: "x" | "z"; at: number }[] = [
    { dir: "n", along: "x", at: -5.25 },
    { dir: "s", along: "x", at: 5.25 },
    { dir: "w", along: "z", at: -5.25 },
    { dir: "e", along: "z", at: 5.25 },
  ];
  const style = layout.wall;
  const h = style === "houses" ? 0.7 : style === "stone" ? 0.7 : 0.85;
  const out: React.ReactNode[] = [];
  for (const s of sides) {
    if (open.has(s.dir)) continue;
    // Split the side into segments around any gate on it.
    let segs: [number, number][] = [[-5.5, 5.5]];
    for (const g of gaps) {
      const onSide = s.along === "z" ? Math.abs(g.at[0] - Math.sign(s.at) * 5) < 0.3 : Math.abs(g.at[1] - Math.sign(s.at) * 5) < 0.3;
      if (!onSide) continue;
      const c = s.along === "z" ? g.at[1] : g.at[0];
      const half = Math.max(g.size[0], g.size[1]) / 2 + 0.1;
      segs = segs.flatMap(([a, b]) => (c - half > a && c + half < b ? [[a, c - half] as [number, number], [c + half, b] as [number, number]] : [[a, b] as [number, number]]));
    }
    for (const [a, b] of segs) {
      const len = b - a;
      const mid = (a + b) / 2;
      const pos: [number, number, number] = s.along === "x" ? [mid, h / 2, s.at] : [s.at, h / 2, mid];
      const size: [number, number, number] = s.along === "x" ? [len, h, 0.5] : [0.5, h, len];
      out.push(
        <mesh key={`${s.dir}${a}`} position={pos} material={flat(layout.palette.wall)}>
          <boxGeometry args={size} />
        </mesh>,
        <mesh key={`${s.dir}${a}t`} position={[pos[0], h + 0.04, pos[2]]} material={flat(layout.palette.wallTop)}>
          <boxGeometry args={[size[0] - 0.06, 0.08, size[2] - 0.06]} />
        </mesh>,
      );
    }
  }
  if (style === "houses") {
    // Village houses behind the closed sides.
    const colors = ["#E98A6A", "#F2C98A", "#D9A3C7", "#9FC7E0", "#F2E3C2"];
    let k = 0;
    for (const s of sides) {
      if (open.has(s.dir)) continue;
      for (let o = -4.5; o <= 4.5; o += 2.25) {
        const col = colors[k++ % colors.length];
        const pos: [number, number, number] = s.along === "x" ? [o, 1.1, s.at + Math.sign(s.at) * 1.3] : [s.at + Math.sign(s.at) * 1.3, 1.1, o];
        out.push(
          <group key={`h${s.dir}${o}`} position={pos}>
            <mesh material={flat(col)}>
              <boxGeometry args={s.along === "x" ? [2.1, 2.2, 2] : [2, 2.2, 2.1]} />
            </mesh>
            <mesh position={[0, 1.35, 0]} rotation={[0, Math.PI / 4, 0]} material={flat("#C8573F")}>
              <coneGeometry args={[1.6, 0.8, 4]} />
            </mesh>
          </group>,
        );
      }
    }
  }
  return <>{out}</>;
}

/** A thin pink frame around a footprint (hover, selection, tappable hint). */
function Frame({ body, strong }: { body: Body; strong: boolean }) {
  const [w, d] = body.size;
  const t = strong ? 0.1 : 0.05;
  const m = unlit("#FF5FA2", strong ? 1 : 0.55);
  const y = 0.05;
  return (
    <group>
      <mesh position={[0, y, -d / 2 - t / 2]} material={m}>
        <boxGeometry args={[w + 2 * t, 0.02, t]} />
      </mesh>
      <mesh position={[0, y, d / 2 + t / 2]} material={m}>
        <boxGeometry args={[w + 2 * t, 0.02, t]} />
      </mesh>
      <mesh position={[-w / 2 - t / 2, y, 0]} material={m}>
        <boxGeometry args={[t, 0.02, d]} />
      </mesh>
      <mesh position={[w / 2 + t / 2, y, 0]} material={m}>
        <boxGeometry args={[t, 0.02, d]} />
      </mesh>
    </group>
  );
}

const hitMaterial = unlit("#000000", 0);
hitMaterial.colorWrite = false;

function Things({ world, pickable, selected, labels, ghosts, onPick, gnome }: Pick<MapProps, "world" | "pickable" | "selected" | "labels" | "ghosts" | "onPick" | "gnome">) {
  const [hover, setHover] = useState<string | null>(null);
  const items = world.objects.filter((o) => o.id !== world.room && !world.bodies.get(o.id)!.members);
  return (
    <>
      {items.map((o) => {
        const b = world.bodies.get(o.id)!;
        const isSel = selected.includes(o.id);
        // Never let a name cover the gnome: hide the label of the thing he's on or in.
        const covers = !!gnome && Math.abs(gnome.at[0] - b.at[0]) <= b.size[0] / 2 + 0.3 && Math.abs(gnome.at[1] - b.at[1]) <= b.size[1] / 2 + 0.3;
        const click = (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onPick(o.id);
        };
        return (
          <group key={o.id} position={[b.at[0], 0, b.at[1]]}>
            <Prop body={b} ghost={ghosts.includes(o.id)} />
            <mesh
              position={[0, Math.max(0.3, b.h) / 2, 0]}
              material={hitMaterial}
              onClick={click}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHover(o.id);
              }}
              onPointerOut={() => setHover((h) => (h === o.id ? null : h))}
            >
              <boxGeometry args={[Math.max(0.6, b.size[0]), Math.max(0.3, b.h), Math.max(0.6, b.size[1])]} />
            </mesh>
            {(isSel || (pickable && hover === o.id)) && <Frame body={b} strong />}
            {pickable && !isSel && hover !== o.id && <Frame body={b} strong={false} />}
            {labels && (!covers || isSel) && (
              <SurfaceHtml position={[b.labelAt?.[0] ?? 0, Math.min(b.h, 2.4) + 0.45, b.labelAt?.[1] ?? 0]} zIndex={5}>
                <span
                  className={`block whitespace-nowrap rounded-full px-2 py-[1px] text-[11px] leading-[16px] font-bold lg:text-[13px] lg:leading-[18px] shadow-[0_2px_0_rgba(36,19,42,0.35)] ${isSel ? "bg-accent text-white" : "bg-ink/85 text-on-ink"}`}
                >
                  {o.es}
                </span>
              </SurfaceHtml>
            )}
          </group>
        );
      })}
    </>
  );
}

/** Dev only: screen positions for the headless playtest. */
function DevHook({ world }: { world: World }) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const v = new Vector3();
    const toScreen = (x: number, y: number, z: number): [number, number] => {
      const { camera, size, gl } = get();
      v.set(x, y, z).project(camera);
      const r = gl.domElement.getBoundingClientRect();
      return [r.left + ((v.x + 1) / 2) * size.width, r.top + ((1 - v.y) / 2) * size.height];
    };
    const w = window as unknown as { __posicionesScene?: object };
    w.__posicionesScene = {
      object: (id: string) => {
        const b = world.bodies.get(id);
        return b ? toScreen(b.at[0], Math.max(0.15, b.h / 2), b.at[1]) : null;
      },
    };
    return () => {
      delete w.__posicionesScene;
    };
  }, [get, world]);
  return null;
}

export function GardenMap(props: MapProps) {
  const { world, rot, gnome, reducedMotion, onArrive, label } = props;
  const hidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);
  return (
    <Canvas
      orthographic
      dpr={[1, 2]}
      frameloop={hidden ? "never" : "always"}
      camera={{ position: [0, 30, 30], zoom: 30, near: 0.1, far: 200 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      aria-label={label}
      style={{ touchAction: "none" }}
    >
      <color attach="background" args={[world.layout.palette.outside]} />
      <hemisphereLight args={["#FFF6E0", "#6E5A40", 1.2]} />
      <directionalLight position={[6, 14, 8]} intensity={1.6} color="#FFF1D6" />
      <CameraRig rot={rot} />
      <Ground layout={world.layout} />
      <Walls layout={world.layout} />
      <Things {...props} />
      {gnome && <Gnome target={gnome} reducedMotion={reducedMotion} onArrive={onArrive} />}
      {process.env.NODE_ENV !== "production" && <DevHook world={world} />}
    </Canvas>
  );
}

"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import { Shape, ShapeGeometry, Path, Vector3, type Group, type MeshStandardMaterial, type Texture } from "three";
import { PLINTH } from "./layouts";
import { kraft, tiled, wallPaper, windowPane } from "./paper";
import { Block, Cardboard, damp, paperMat } from "./prims";

export type Side = "n" | "w" | "s" | "e";

/** Rotation of each wall so local +z points into the room; local x runs along the wall. */
const THETA: Record<Side, number> = { n: 0, w: Math.PI / 2, s: Math.PI, e: -Math.PI / 2 };

export interface Hole {
  /** Centre along the wall (wall-local x), centre height, size. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WallSpec {
  side: Side;
  paper?: { upper: string; lower: string };
  hole?: Hole;
  /** Wall-mounted things, in wall-local coords (x along the wall, z = 0 at the inner face). */
  children?: ReactNode;
}

/**
 * Wall-local x for a world coordinate along the wall. n: x, s: -x, w: -z, e: z.
 */
export function alongWall(side: Side, world: number): number {
  return side === "n" ? world : side === "s" ? -world : side === "w" ? -world : world;
}

const toCam = new Vector3();

/**
 * One cutaway wall: kraft cardboard with corrugated edges, a wallpaper face (one ShapeGeometry,
 * so the paper pattern runs unbroken around the window hole) and an optional window.
 * The wall nearest the camera folds down to a stub so the room stays visible from any side.
 */
function Wall({ side, length, height, t, size, spec }: { side: Side; length: number; height: number; t: number; size: number; spec: WallSpec }) {
  const group = useRef<Group>(null);
  const mounted = useRef<Group>(null);
  const theta = THETA[side];
  const half = size / 2 - t / 2;
  const pos: [number, number, number] = side === "n" ? [0, 0, -half] : side === "s" ? [0, 0, half] : side === "w" ? [-half, 0, 0] : [half, 0, 0];
  const out = { x: -Math.sin(theta), z: -Math.cos(theta) };
  const hole = spec.hole;

  const face = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-length / 2, 0);
    shape.lineTo(length / 2, 0);
    shape.lineTo(length / 2, height);
    shape.lineTo(-length / 2, height);
    shape.closePath();
    if (hole) {
      const p = new Path();
      p.moveTo(hole.x - hole.w / 2, hole.y - hole.h / 2);
      p.lineTo(hole.x - hole.w / 2, hole.y + hole.h / 2);
      p.lineTo(hole.x + hole.w / 2, hole.y + hole.h / 2);
      p.lineTo(hole.x + hole.w / 2, hole.y - hole.h / 2);
      p.closePath();
      shape.holes.push(p);
    }
    return new ShapeGeometry(shape);
  }, [length, height, hole]);

  const faceMat = useMemo(() => {
    const tex: Texture = tiled(wallPaper(spec.paper?.upper, spec.paper?.lower), 1 / 5, 1 / height);
    return paperMat("#ffffff", { map: tex, key: `wall:${spec.paper?.upper}:${height}` });
  }, [spec.paper, height]);

  const segments = useMemo(() => {
    if (!hole) return [{ x: 0, y: height / 2, w: length, h: height }];
    const l = -length / 2;
    const r = length / 2;
    const hl = hole.x - hole.w / 2;
    const hr = hole.x + hole.w / 2;
    const hb = hole.y - hole.h / 2;
    const ht = hole.y + hole.h / 2;
    return [
      { x: (l + hl) / 2, y: height / 2, w: hl - l, h: height },
      { x: (hr + r) / 2, y: height / 2, w: r - hr, h: height },
      { x: hole.x, y: hb / 2, w: hole.w, h: hb },
      { x: hole.x, y: (ht + height) / 2, w: hole.w, h: height - ht },
    ].filter((sg) => sg.w > 0.01 && sg.h > 0.01);
  }, [hole, length, height]);

  useFrame(({ camera }, dt) => {
    const g = group.current;
    if (!g) return;
    camera.getWorldDirection(toCam).negate();
    const len = Math.hypot(toCam.x, toCam.z) || 1;
    const near = (out.x * toCam.x + out.z * toCam.z) / len > 0.3;
    g.scale.y = damp(g.scale.y, near ? 0.06 : 1, 7, dt);
    if (mounted.current) mounted.current.visible = g.scale.y > 0.35;
  });

  return (
    <group position={pos} rotation={[0, theta, 0]}>
      <group ref={group}>
        {segments.map((sg, i) => (
          <Cardboard key={i} size={[sg.w, sg.h, t]} position={[sg.x, sg.y, 0]} />
        ))}
        <mesh geometry={face} material={faceMat} position={[0, 0, t / 2 + 0.003]} receiveShadow />
        {hole && <Window hole={hole} t={t} />}
        <group ref={mounted} position={[0, 0, t / 2]}>
          {spec.children}
        </group>
      </group>
    </group>
  );
}

/** Cream window frame, cross mullions and warm glowing glass. */
function Window({ hole, t }: { hole: Hole; t: number }) {
  const frame = "#f3ead8";
  const f = 0.09;
  return (
    <group position={[hole.x, hole.y, 0]}>
      <mesh position={[0, 0, -t / 4]} material={paperMat("#ffffff", { map: windowPane(), emissive: "#ffd99a", key: "glass" })}>
        <planeGeometry args={[hole.w, hole.h]} />
      </mesh>
      <Block size={[hole.w + f * 2, f, t + 0.12]} position={[0, hole.h / 2, 0]} color={frame} cast={false} />
      <Block size={[hole.w + f * 2 + 0.2, f * 1.4, t + 0.3]} position={[0, -hole.h / 2, 0.08]} color={frame} cast={false} />
      <Block size={[f, hole.h, t + 0.12]} position={[-hole.w / 2, 0, 0]} color={frame} cast={false} />
      <Block size={[f, hole.h, t + 0.12]} position={[hole.w / 2, 0, 0]} color={frame} cast={false} />
      <Block size={[0.05, hole.h, 0.06]} position={[0, 0, 0]} color={frame} cast={false} />
      <Block size={[hole.w, 0.05, 0.06]} position={[0, 0.1, 0]} color={frame} cast={false} />
    </group>
  );
}

/** Four cutaway walls on a square floor. */
export function Room({ size, height, t, walls }: { size: number; height: number; t: number; walls: WallSpec[] }) {
  return (
    <group>
      {walls.map((w) => (
        <Wall key={w.side} side={w.side} length={w.side === "n" || w.side === "s" ? size : size - 2 * t} height={height} t={t} size={size} spec={w} />
      ))}
    </group>
  );
}

/** The cardboard base a diorama stands on, with its floor paper on top. */
export function Plinth({ size, floor }: { size: [number, number]; floor: MeshStandardMaterial }) {
  const [w, d] = size;
  return (
    <group>
      <Cardboard size={[w, PLINTH, d]} position={[0, -PLINTH / 2, 0]} top={floor} />
      <Cardboard size={[w + 0.5, 0.12, d + 0.5]} position={[0, -PLINTH + 0.06, 0]} top={paperMat("#ffffff", { map: tiled(kraft(), 3, 3) })} />
    </group>
  );
}

/** A floor slab between storeys (the ceiling of the room below). */
export function Slab({ size, y, thickness, floor }: { size: number; y: number; thickness: number; floor: MeshStandardMaterial }) {
  return <Cardboard size={[size, thickness, size]} position={[0, y - thickness / 2, 0]} top={floor} />;
}

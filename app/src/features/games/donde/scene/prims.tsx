"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import { DoubleSide, MeshStandardMaterial, type Group, type Texture } from "three";
import { blob, cardstock, corrugated, kraft, tiled } from "./paper";
import type { V3 } from "./layouts";

/**
 * Shared paper materials. Colour is multiplied onto a white cardstock grain, so every
 * tint still reads as paper. Cached per colour: one material, many meshes.
 */
const mats = new Map<string, MeshStandardMaterial>();

export function paperMat(color: string, opts: { map?: Texture; double?: boolean; emissive?: string; key?: string } = {}): MeshStandardMaterial {
  const key = opts.key ?? `${color}:${opts.map?.uuid ?? "card"}:${opts.double ? 1 : 0}:${opts.emissive ?? ""}`;
  let m = mats.get(key);
  if (!m) {
    m = new MeshStandardMaterial({
      color,
      map: opts.map ?? cardstock("#ffffff"),
      roughness: 0.93,
      metalness: 0,
      side: opts.double ? DoubleSide : undefined,
      emissive: opts.emissive ?? "#000000",
      emissiveIntensity: opts.emissive ? 0.55 : 0,
    });
    mats.set(key, m);
  }
  return m;
}

type Common = { position?: V3; rotation?: V3; cast?: boolean; receive?: boolean; scale?: number | V3 };

/** Plain paper box. */
export function Block({ size, color, map, position, rotation, cast = true, receive = true, scale }: Common & { size: V3; color: string; map?: Texture }) {
  return (
    <mesh position={position} rotation={rotation} scale={scale} castShadow={cast} receiveShadow={receive} material={paperMat(color, { map })}>
      <boxGeometry args={size} />
    </mesh>
  );
}

/** Soft-cornered paper box (cushions, sofa parts, mattress). */
export function Soft({ size, radius = 0.12, color, map, position, rotation, cast = true, receive = true }: Common & { size: V3; radius?: number; color: string; map?: Texture }) {
  return (
    <RoundedBox args={size} radius={Math.min(radius, Math.min(...size) / 2 - 0.001)} smoothness={3} position={position} rotation={rotation} castShadow={cast} receiveShadow={receive} material={paperMat(color, { map })} />
  );
}

export function Cyl({ r, h, color, map, position, rotation, top, seg = 20, cast = true, receive = true }: Common & { r: number; h: number; top?: number; color: string; map?: Texture; seg?: number }) {
  return (
    <mesh position={position} rotation={rotation} castShadow={cast} receiveShadow={receive} material={paperMat(color, { map })}>
      <cylinderGeometry args={[top ?? r, r, h, seg]} />
    </mesh>
  );
}

export function Ball({ r, color, map, position, scale, cast = true }: Common & { r: number; color: string; map?: Texture }) {
  return (
    <mesh position={position} scale={scale} castShadow={cast} receiveShadow material={paperMat(color, { map })}>
      <sphereGeometry args={[r, 20, 14]} />
    </mesh>
  );
}

/** Flat paper cut-out lying on or leaning against something. */
export function Sheet({ size, color = "#ffffff", map, position, rotation, cast = false, alpha }: Common & { size: [number, number]; color?: string; map?: Texture; alpha?: boolean }) {
  const mat = useMemo(() => {
    const m = paperMat(color, { map, double: true }).clone();
    if (alpha) {
      m.alphaTest = 0.5;
      m.transparent = false;
    }
    return m;
  }, [color, map, alpha]);
  return (
    <mesh position={position} rotation={rotation} castShadow={cast} receiveShadow material={mat}>
      <planeGeometry args={size} />
    </mesh>
  );
}

/** Soft contact shadow painted on the surface under furniture (cheap baked AO). */
export function Blob({ position, size, opacity = 1 }: { position: V3; size: [number, number]; opacity?: number }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={blob()} transparent depthWrite={false} opacity={opacity} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
}

/** Corrugated-cardboard edge texture tiled along `len`, optionally turned 90°. */
function corrEdge(len: number, turned = false): Texture {
  const t = tiled(corrugated(), Math.max(1, len / 0.45), 1);
  if (turned && t.rotation === 0) {
    // Turned edges show the flutes running across a wall's height.
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2;
  }
  return t;
}

/**
 * Box of cardboard: the big faces get `face`/`top`, every cut edge shows the corrugated
 * flutes. Used for the diorama base, floor slabs and walls.
 */
export function Cardboard({ size, position, rotation, top, face, back, cast = false }: Common & { size: V3; top?: MeshStandardMaterial; face?: MeshStandardMaterial; back?: MeshStandardMaterial }) {
  const [w, h, d] = size;
  const materials = useMemo(() => {
    const kraftMat = paperMat("#ffffff", { map: tiled(kraft(), Math.max(1, w / 4), Math.max(1, h / 4)) });
    const edge = (len: number, turned = false) => paperMat("#ffffff", { map: corrEdge(len, turned), key: `corr:${len.toFixed(2)}:${turned}` });
    const thinZ = d <= Math.min(w, h);
    const thinY = h <= Math.min(w, d);
    if (thinY) {
      // Slab: top/bottom are faces, all four sides are cut edges.
      return [edge(d), edge(d), top ?? kraftMat, kraftMat, edge(w), edge(w)];
    }
    if (thinZ) {
      // Wall along x: +z inner face, -z back, the rest are cut edges.
      return [edge(h, true), edge(h, true), edge(w), edge(w), face ?? kraftMat, back ?? kraftMat];
    }
    return [kraftMat, kraftMat, top ?? kraftMat, kraftMat, face ?? kraftMat, kraftMat];
  }, [w, h, d, top, face, back]);
  return (
    <mesh position={position} rotation={rotation} castShadow={cast} receiveShadow material={materials}>
      <boxGeometry args={size} />
    </mesh>
  );
}

/** Idle "breathing" lift for objects that are part of the current task. */
export function Breathe({ active, children, amount = 0.06, phase = 0 }: { active: boolean; children: ReactNode; amount?: number; phase?: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    const target = active ? amount * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.4 + phase)) : 0;
    g.position.y += (target - g.position.y) * Math.min(1, dt * 8);
    const s = active ? 1 + 0.015 * Math.sin(clock.elapsedTime * 2.4 + phase) : 1;
    g.scale.setScalar(g.scale.x + (s - g.scale.x) * Math.min(1, dt * 8));
  });
  return <group ref={ref}>{children}</group>;
}

/** Damped approach used by every idle animation (frame-rate independent). */
export function damp(current: number, target: number, speed: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}

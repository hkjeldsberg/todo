"use client";

import { forwardRef, type ReactNode } from "react";
import type { Mesh } from "three";
import { Toon } from "../toon";

type V3 = [number, number, number];

interface PartProps {
  p?: V3;
  r?: V3;
  c: string;
  emissive?: string;
  glow?: number;
  children?: ReactNode;
}

/** Toon box. `s` = full size. */
export const Box = forwardRef<Mesh, PartProps & { s: V3 }>(function Box({ p, r, s, c, emissive, glow }, ref) {
  return (
    <mesh ref={ref} position={p} rotation={r}>
      <boxGeometry args={s} />
      <Toon color={c} emissive={emissive} emissiveIntensity={glow} />
    </mesh>
  );
});

/** Toon cylinder: radiusTop, radiusBottom, height. */
export const Cyl = forwardRef<Mesh, PartProps & { rt: number; rb?: number; h: number; seg?: number }>(function Cyl(
  { p, r, rt, rb, h, seg = 20, c, emissive, glow },
  ref,
) {
  return (
    <mesh ref={ref} position={p} rotation={r}>
      <cylinderGeometry args={[rt, rb ?? rt, h, seg]} />
      <Toon color={c} emissive={emissive} emissiveIntensity={glow} />
    </mesh>
  );
});

export const Sph = forwardRef<Mesh, PartProps & { rad: number; sc?: V3 }>(function Sph(
  { p, r, rad, sc, c, emissive, glow },
  ref,
) {
  return (
    <mesh ref={ref} position={p} rotation={r} scale={sc}>
      <sphereGeometry args={[rad, 20, 14]} />
      <Toon color={c} emissive={emissive} emissiveIntensity={glow} />
    </mesh>
  );
});

/** Floor + two back walls of an 8×8 isometric diorama. */
export function RoomShell({ floor, wallLeft, wallBack, trim }: { floor: string; wallLeft: string; wallBack: string; trim: string }) {
  return (
    <group>
      <Box p={[0, -0.15, 0]} s={[8.3, 0.3, 8.3]} c={floor} />
      <Box p={[-4.1, 2, -0.05]} s={[0.2, 4, 8.2]} c={wallLeft} />
      <Box p={[0.05, 2, -4.1]} s={[8.2, 4, 0.2]} c={wallBack} />
      <Box p={[-3.97, 0.15, 0]} s={[0.08, 0.3, 8]} c={trim} />
      <Box p={[0, 0.15, -3.97]} s={[8, 0.3, 0.08]} c={trim} />
    </group>
  );
}

/** Musical note (for radio/piano loops). */
export const Note = forwardRef<Mesh, { c?: string }>(function Note({ c = "#3d2140" }, ref) {
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.07, 12, 10]} />
      <Toon color={c} />
      <mesh position={[0.06, 0.14, 0]}>
        <boxGeometry args={[0.025, 0.28, 0.025]} />
        <Toon color={c} />
      </mesh>
    </mesh>
  );
});

"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";
import { Box, Cyl, RoomShell, Sph } from "../objects/parts";
import { Radio, WallClock, PendantLamp, HALF_PI, clamp01 } from "../objects/common";
import { Slot, useSlot } from "../slot";
import { easeOutCubic, onceProgress, useGameTime } from "../time";
import { Toon } from "../toon";


/* ---------- kettle_01 · preterite once: lid pops off and lands on the counter ---------- */
function Kettle() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const lid = useRef<Group>(null);
  const body = useRef<Group>(null);
  const puffs = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    const p = on ? onceProgress(time.current.t, since.current, 1.6) : 0;
    const l = lid.current;
    if (l) {
      const k = easeOutCubic(p);
      l.position.set(0.75 * k, 0.5 + Math.sin(Math.PI * k) * 1.2 - 0.47 * k, 0.3 * k);
      l.rotation.set(k * Math.PI * 4 + (p === 1 ? 0.12 : 0), 0, k * 0.2);
    }
    if (body.current) body.current.position.x = p > 0 && p < 0.25 ? Math.sin(p * 120) * 0.03 : 0;
    puffs.current.forEach((m, i) => {
      if (!m) return;
      const f = clamp01((p - i * 0.12) / 0.5);
      m.visible = f > 0 && f < 1;
      m.position.set(0.42 + f * 0.3, 0.45 + f * 0.9 + i * 0.1, 0);
      m.scale.setScalar(0.1 + Math.sin(f * Math.PI) * 0.22);
    });
  });
  return (
    <group>
      <group ref={body}>
        <Sph p={[0, 0.25, 0]} rad={0.3} sc={[1, 0.85, 1]} c="#d64545" />
        <Cyl p={[0.33, 0.3, 0]} r={[0, 0, -0.9]} rt={0.035} rb={0.07} h={0.32} c="#d64545" />
        <Box p={[-0.02, 0.62, 0]} s={[0.36, 0.05, 0.06]} c="#3d2140" />
        <Box p={[-0.18, 0.52, 0]} s={[0.05, 0.2, 0.06]} c="#3d2140" />
        <Box p={[0.14, 0.52, 0]} s={[0.05, 0.2, 0.06]} c="#3d2140" />
      </group>
      <group ref={lid} position={[0, 0.5, 0]}>
        <Cyl rt={0.13} rb={0.15} h={0.05} c="#b8322f" />
        <Sph p={[0, 0.05, 0]} rad={0.04} c="#3d2140" />
      </group>
      {[0, 1, 2].map((i) => (
        <Sph key={i} ref={(m) => void (puffs.current[i] = m)} rad={1} c="#f7f4ee" />
      ))}
    </group>
  );
}

/* ---------- plate_table_01 · preterite once: plate falls and breaks ---------- */
function Plate() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const plate = useRef<Group>(null);
  const halfA = useRef<Group>(null);
  const halfB = useRef<Group>(null);
  useFrame(() => {
    const p = on ? onceProgress(time.current.t, since.current, 1.3) : 0;
    const s1 = clamp01(p / 0.25);
    const s2 = clamp01((p - 0.25) / 0.45);
    const s3 = clamp01((p - 0.7) / 0.3);
    const g = plate.current;
    if (g) {
      g.position.set(0.35 * s1 + 0.55 * s2, -0.895 * s2 * s2 + Math.sin(Math.PI * s3) * 0.08, 0);
      g.rotation.z = -0.4 * s1 + (-2 * Math.PI + 0.4) * s2;
    }
    if (halfA.current && halfB.current) {
      halfA.current.position.set(0, 0, -0.2 * s3);
      halfA.current.rotation.y = 0.35 * s3;
      halfB.current.position.set(0.08 * s3, 0, 0.2 * s3);
      halfB.current.rotation.y = -0.5 * s3;
    }
  });
  const half = (start: number) => (
    <>
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.3, 0.22, 0.05, 20, 1, false, start, Math.PI]} />
        <Toon color="#f7f4ee" />
      </mesh>
      <mesh position={[0, 0.052, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.01, 20, 1, false, start, Math.PI]} />
        <Toon color="#4f7fbf" />
      </mesh>
    </>
  );
  return (
    <group ref={plate}>
      <group ref={halfA}>{half(0)}</group>
      <group ref={halfB}>{half(Math.PI)}</group>
    </group>
  );
}

/* ---------- decor ---------- */
function Cat() {
  return (
    <group position={[0.55, 0.9, 0.35]} rotation={[0, 0.6, 0]}>
      <Sph p={[0, 0.2, 0]} rad={0.22} sc={[0.9, 1, 1.1]} c="#e8883a" />
      <Sph p={[0, 0.5, 0.08]} rad={0.15} c="#e8883a" />
      <mesh position={[-0.08, 0.64, 0.08]}>
        <coneGeometry args={[0.05, 0.1, 4]} />
        <Toon color="#e8883a" />
      </mesh>
      <mesh position={[0.08, 0.64, 0.08]}>
        <coneGeometry args={[0.05, 0.1, 4]} />
        <Toon color="#e8883a" />
      </mesh>
      <Sph p={[-0.05, 0.52, 0.21]} rad={0.022} c="#3d2140" />
      <Sph p={[0.05, 0.52, 0.21]} rad={0.022} c="#3d2140" />
      <Cyl p={[0.05, 0.08, -0.28]} r={[1.2, 0, 0.3]} rt={0.035} h={0.45} c="#c96d26" />
    </group>
  );
}

function Decor() {
  return (
    <group>
      {/* counter + stove */}
      <Box p={[-1.95, 0.48, -3.5]} s={[4.1, 0.96, 0.9]} c="#f2e3c6" />
      <Box p={[-1.95, 0.99, -3.48]} s={[4.25, 0.08, 1.0]} c="#c4704a" />
      <Box p={[-1.3, 1.04, -3.45]} s={[0.9, 0.03, 0.7]} c="#3a3a3a" />
      <Box p={[-1.3, 0.5, -3.02]} s={[0.8, 0.6, 0.04]} c="#3a3a3a" />
      {[-3.4, -2.6, -0.3].map((x) => (
        <Box key={x} p={[x, 0.5, -3.03]} s={[0.7, 0.8, 0.04]} c="#e9d5ae" />
      ))}
      {/* upper cabinet + jars */}
      <Box p={[-2.8, 2.9, -3.78]} s={[2.2, 0.9, 0.45]} c="#2f8f8b" />
      <Box p={[-0.8, 2.4, -3.85]} s={[1.3, 0.06, 0.3]} c="#8a5433" />
      <Cyl p={[-1.2, 2.58, -3.85]} rt={0.1} h={0.3} c="#d64545" />
      <Cyl p={[-0.8, 2.56, -3.85]} rt={0.09} h={0.26} c="#ffd23f" />
      <Cyl p={[-0.4, 2.6, -3.85]} rt={0.1} h={0.34} c="#4f7fbf" />
      {/* window */}
      <Box p={[1.8, 2.2, -3.97]} s={[1.6, 1.4, 0.08]} c="#f7f4ee" />
      <Box p={[1.8, 2.2, -3.93]} s={[1.36, 1.16, 0.04]} c="#9fd3e8" />
      <Box p={[1.8, 2.2, -3.9]} s={[0.06, 1.16, 0.04]} c="#f7f4ee" />
      <Box p={[1.8, 2.2, -3.9]} s={[1.36, 0.06, 0.04]} c="#f7f4ee" />
      {/* table + chairs */}
      <Box p={[1, 0.85, 0.5]} s={[2.3, 0.1, 1.4]} c="#b57a4a" />
      {[
        [0, -0.5],
        [2, -0.5],
        [0, 1.5],
        [2, 1.5],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} p={[x, 0.4, z]} s={[0.1, 0.8, 0.1]} c="#8a5433" />
      ))}
      <Box p={[1, 0.45, 1.75]} s={[0.6, 0.08, 0.6]} c="#d64545" />
      <Box p={[1, 0.8, 2.02]} s={[0.6, 0.7, 0.08]} c="#d64545" />
      <Box p={[1, 0.22, 1.75]} s={[0.08, 0.45, 0.08]} c="#8a5433" />
      {/* rug */}
      <Box p={[1, 0.01, 0.5]} s={[3.4, 0.02, 2.6]} c="#e0b83a" />
      <Box p={[1, 0.02, 0.5]} s={[3.0, 0.02, 2.2]} c="#c4704a" />
      <Cat />
    </group>
  );
}

export function Kitchen() {
  return (
    <group>
      <RoomShell floor="#e9d5ae" wallLeft="#f4c96b" wallBack="#f6d886" trim="#8a5433" />
      <Decor />
      <Slot id="radio_vintage_01" anim="anim_radio_music_loop" position={[-3.1, 1.03, -3.55]} markerY={1.5}>
        <Radio />
      </Slot>
      <Slot id="clock_wall_01" anim="anim_pendulum_swing_loop" position={[-3.95, 2.5, -0.9]} rotation={[0, HALF_PI, 0]} markerY={1.1}>
        <WallClock />
      </Slot>
      <Slot id="lamp_kitchen_01" anim="anim_lamp_glow_loop" position={[1, 2.45, 0.5]} markerY={0.75}>
        <PendantLamp />
      </Slot>
      <Slot id="kettle_01" anim="anim_kettle_lid_pop_once" position={[-1.3, 1.055, -3.45]} markerY={1.1}>
        <Kettle />
      </Slot>
      <Slot id="plate_table_01" anim="anim_plate_fall_once" position={[1.7, 0.9, 1.0]} markerY={0.7}>
        <Plate />
      </Slot>
    </group>
  );
}

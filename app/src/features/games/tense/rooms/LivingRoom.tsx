"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh, PointLight } from "three";
import { Box, Cyl, Note, RoomShell } from "../objects/parts";
import { SnowWindow, PhotoFrame, Door, HALF_PI } from "../objects/common";
import { Slot, useSlot } from "../slot";
import { easeOutBounce, onceProgress, useGameTime } from "../time";
import { Toon } from "../toon";



/* ---------- piano_01 · imperfect loop: sister practises ---------- */
function Piano() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const keys = useRef<(Mesh | null)[]>([]);
  const notes = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    keys.current.forEach((k, i) => {
      if (k) k.position.y = 0.87 - (on ? Math.max(0, Math.sin(lt * 5 - i * 1.3)) * 0.035 : 0);
    });
    notes.current.forEach((n, i) => {
      if (!n) return;
      n.visible = on;
      const f = (lt * 0.4 + i / 3) % 1;
      n.position.set(-0.4 + i * 0.4 + Math.sin(f * 5) * 0.15, 1.45 + f * 1.0, 0.1);
      n.scale.setScalar(Math.sin(f * Math.PI));
    });
  });
  return (
    <group>
      <Box p={[0, 0.7, -0.05]} s={[1.8, 1.4, 0.55]} c="#2b1d16" />
      <Box p={[0, 1.42, -0.05]} s={[1.9, 0.06, 0.6]} c="#3a2418" />
      <Box p={[0, 0.8, 0.35]} s={[1.75, 0.1, 0.35]} c="#2b1d16" />
      {Array.from({ length: 11 }, (_, i) => (
        <Box key={i} ref={(m) => void (keys.current[i] = m)} p={[-0.75 + i * 0.15, 0.87, 0.36]} s={[0.13, 0.05, 0.3]} c="#f7f4ee" />
      ))}
      {[1, 2, 4, 5, 6, 8, 9].map((i) => (
        <Box key={`b${i}`} p={[-0.75 + i * 0.15 - 0.075, 0.91, 0.28]} s={[0.07, 0.05, 0.16]} c="#3d2140" />
      ))}
      <Box p={[0, 1.15, 0.24]} s={[0.5, 0.35, 0.03]} c="#f2e3c6" />
      <Cyl p={[0, 0.25, 0.95]} rt={0.25} h={0.5} c="#8a2f2a" />
      {[0, 1, 2].map((i) => (
        <Note key={i} ref={(m) => void (notes.current[i] = m)} c={i === 1 ? "#d64545" : "#3d2140"} />
      ))}
    </group>
  );
}

/* ---------- fireplace_01 · preterite once: fire is lit (and stays lit) ---------- */
function Fireplace() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const flames = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  useFrame(() => {
    const t = time.current.t;
    const p = on ? onceProgress(t, since.current, 1.1) : 0;
    const lit = easeOutBounce(p);
    const flicker = p === 1 ? Math.sin(t * 11) * 0.08 + Math.sin(t * 17) * 0.05 : 0;
    const f = flames.current;
    if (f) {
      f.scale.set(lit, Math.max(0.001, lit * (1 + flicker)), lit);
      f.visible = p > 0;
    }
    if (light.current) light.current.intensity = lit * (8 + flicker * 20);
  });
  return (
    <group>
      <Box p={[0, 0.8, 0]} s={[1.8, 1.6, 0.6]} c="#a3553f" />
      <Box p={[0, 0.5, 0.28]} s={[1.0, 0.8, 0.08]} c="#1d1411" />
      <Box p={[0, 1.66, 0.05]} s={[2.1, 0.12, 0.8]} c="#6b4a3a" />
      <Box p={[0, 0.06, 0.45]} s={[1.9, 0.12, 0.35]} c="#7d7874" />
      <Cyl p={[-0.12, 0.2, 0.25]} r={[0, 0.3, HALF_PI]} rt={0.07} h={0.6} c="#6b4a3a" />
      <Cyl p={[0.12, 0.26, 0.28]} r={[0, -0.3, HALF_PI]} rt={0.07} h={0.6} c="#8a5433" />
      <group ref={flames} position={[0, 0.3, 0.3]}>
        <mesh position={[0, 0.2, 0]}>
          <coneGeometry args={[0.24, 0.55, 7]} />
          <Toon color="#ff7a2f" emissive="#ff5a1f" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[-0.18, 0.13, 0.05]}>
          <coneGeometry args={[0.14, 0.35, 7]} />
          <Toon color="#ffb13b" emissive="#ff8a1f" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0.17, 0.15, 0.06]}>
          <coneGeometry args={[0.13, 0.38, 7]} />
          <Toon color="#ffd23f" emissive="#ffb100" emissiveIntensity={0.8} />
        </mesh>
      </group>
      <pointLight ref={light} position={[0, 0.6, 1]} color="#ff9a4a" distance={7} decay={1.3} intensity={0} />
      {/* mantel decor */}
      <Cyl p={[-0.7, 1.87, 0.05]} rt={0.06} h={0.3} c="#f7f4ee" />
      <Box p={[0.6, 1.85, 0.05]} s={[0.3, 0.26, 0.08]} c="#4f7fbf" />
    </group>
  );
}

/* ---------- decor ---------- */
function Decor() {
  return (
    <group>
      {/* rug */}
      <Cyl p={[0.8, 0.01, 0.6]} rt={2} h={0.02} seg={32} c="#8a2f2a" />
      <Cyl p={[0.8, 0.02, 0.6]} rt={1.7} h={0.02} seg={32} c="#c9a227" />
      {/* sofa */}
      <group position={[1.4, 0, 2.6]}>
        <Box p={[0, 0.3, 0]} s={[2.4, 0.5, 0.9]} c="#3f6e8c" />
        <Box p={[0, 0.75, 0.35]} s={[2.4, 0.7, 0.25]} c="#355d77" />
        <Box p={[-1.25, 0.5, 0]} s={[0.2, 0.7, 0.9]} c="#355d77" />
        <Box p={[1.25, 0.5, 0]} s={[0.2, 0.7, 0.9]} c="#355d77" />
        <Box p={[-0.6, 0.6, 0.05]} s={[0.4, 0.35, 0.15]} r={[0.2, 0, 0]} c="#ffd23f" />
      </group>
      {/* coffee table */}
      <Box p={[1.0, 0.42, 0.7]} s={[1.4, 0.07, 0.8]} c="#8a5433" />
      <Box p={[1.0, 0.2, 0.7]} s={[1.2, 0.4, 0.6]} c="#6b4a3a" />
      <Cyl p={[0.8, 0.53, 0.6]} rt={0.08} h={0.14} c="#f7f4ee" />
      {/* floor lamp */}
      <Cyl p={[3.4, 0.9, -0.9]} rt={0.03} h={1.8} c="#3d2140" />
      <Cyl p={[3.4, 1.9, -0.9]} rt={0.15} rb={0.3} h={0.35} c="#f2e3c6" />
    </group>
  );
}

export function LivingRoom() {
  return (
    <group>
      <RoomShell floor="#a8744c" wallLeft="#bfd1dd" wallBack="#aec4d3" trim="#6b4a3a" />
      <Decor />
      <Slot id="window_snow_01" anim="anim_snow_fall_loop" position={[0.9, 2.3, -3.97]} markerY={1.1}>
        <SnowWindow />
      </Slot>
      <Slot id="photo_frame_01" anim="anim_photo_shimmer_loop" position={[-3.97, 2.5, 1.7]} rotation={[0, HALF_PI, 0]} markerY={0.8}>
        <PhotoFrame />
      </Slot>
      <Slot id="piano_01" anim="anim_piano_keys_loop" position={[-3.5, 0, -1.4]} rotation={[0, HALF_PI, 0]} markerY={1.9}>
        <Piano />
      </Slot>
      <Slot id="fireplace_01" anim="anim_fire_ignite_once" position={[-1.3, 0, -3.65]} markerY={2.3}>
        <Fireplace />
      </Slot>
      <Slot id="door_01" anim="anim_door_open_once" position={[2.7, 0, -3.97]} markerY={2.9}>
        <Door />
      </Slot>
    </group>
  );
}

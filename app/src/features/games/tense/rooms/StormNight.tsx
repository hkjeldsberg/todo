"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, PointLight } from "three";
import { Door, HALF_PI, RainWindow, WallClock, clamp01 } from "../objects/common";
import { Box, Cyl, RoomShell, Sph } from "../objects/parts";
import { Slot, useSlot } from "../slot";
import { easeOutBounce, onceProgress, useGameTime } from "../time";
import { Toon } from "../toon";

/* ---------- rocking_chair_01 · imperfect loop: grandma rocks calmly ---------- */
function RockingChair() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const chair = useRef<Group>(null);
  const needles = useRef<Group>(null);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    if (chair.current) chair.current.rotation.x = on ? Math.sin(lt * 1.6) * 0.12 : 0;
    if (needles.current) needles.current.rotation.z = on ? Math.sin(lt * 7) * 0.25 : 0;
  });
  return (
    <group ref={chair}>
      {/* rockers */}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.35, 0]} rotation={[0, HALF_PI, 0]}>
          <torusGeometry args={[0.6, 0.035, 6, 20, 1.2]} />
          <Toon color="#6b4a3a" />
        </mesh>
      ))}
      <group position={[0, 0.12, 0]} rotation={[0, 0, 0]}>
        <Box p={[0, 0.35, 0]} s={[0.7, 0.07, 0.6]} c="#8a5433" />
        <Box p={[0, 0.85, -0.3]} r={[-0.15, 0, 0]} s={[0.7, 0.95, 0.07]} c="#8a5433" />
        {[-0.33, 0.33].map((x) => (
          <Box key={x} p={[x, 0.17, 0]} s={[0.05, 0.35, 0.5]} c="#6b4a3a" />
        ))}
        {/* grandma */}
        <Box p={[0, 0.62, -0.05]} s={[0.46, 0.5, 0.36]} c="#7a4f8f" />
        <Box p={[0, 0.45, 0.2]} s={[0.44, 0.14, 0.4]} c="#5b3a70" />
        <Sph p={[0, 1.0, -0.05]} rad={0.14} c="#e7b48a" />
        <Sph p={[0, 1.08, -0.1]} rad={0.14} sc={[1.05, 0.8, 1]} c="#d9d4cc" />
        <Sph p={[0, 1.16, -0.2]} rad={0.07} c="#d9d4cc" />
        <Box p={[0, 0.98, 0.09]} s={[0.18, 0.04, 0.02]} c="#3d2140" />
        {/* knitting */}
        <group ref={needles} position={[0, 0.6, 0.25]}>
          <Sph rad={0.1} sc={[1, 0.7, 0.6]} c="#d64545" />
          <Box r={[0, 0, 0.6]} s={[0.02, 0.3, 0.02]} c="#c9c9c9" />
          <Box r={[0, 0, -0.6]} s={[0.02, 0.3, 0.02]} c="#c9c9c9" />
        </group>
      </group>
    </group>
  );
}

/* ---------- candle_01 · preterite once: the power goes out, a candle is lit ---------- */
function Candle() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const flame = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const match = useRef<Group>(null);
  useFrame(() => {
    const t = time.current.t;
    const p = on ? onceProgress(t, since.current, 1.3) : 0;
    const m = clamp01(p / 0.5);
    if (match.current) {
      match.current.visible = m > 0 && m < 1;
      match.current.position.set(0.35 - m * 0.3, 0.55 + Math.sin(m * Math.PI) * 0.2, 0);
    }
    const lit = easeOutBounce(clamp01((p - 0.45) / 0.55));
    const flicker = p === 1 ? Math.sin(t * 13) * 0.08 + Math.sin(t * 29) * 0.05 : 0;
    if (flame.current) {
      flame.current.visible = lit > 0;
      flame.current.scale.set(Math.max(0.001, lit), Math.max(0.001, lit * (1 + flicker)), Math.max(0.001, lit));
    }
    if (light.current) light.current.intensity = lit * (7 + flicker * 25);
  });
  return (
    <group>
      <Cyl p={[0, 0.02, 0]} rt={0.18} rb={0.2} h={0.04} c="#c9a227" />
      <Cyl p={[0, 0.22, 0]} rt={0.07} h={0.36} c="#f7f4ee" />
      <Box p={[0, 0.43, 0]} s={[0.012, 0.06, 0.012]} c="#3d2140" />
      <mesh position={[0.2, 0.06, 0]} rotation={[HALF_PI, 0, 0]}>
        <torusGeometry args={[0.06, 0.015, 6, 12, Math.PI * 1.4]} />
        <Toon color="#c9a227" />
      </mesh>
      <group ref={flame} position={[0, 0.47, 0]}>
        <mesh position={[0, 0.07, 0]}>
          <coneGeometry args={[0.05, 0.16, 8]} />
          <Toon color="#ffb13b" emissive="#ff8a1f" emissiveIntensity={1.2} />
        </mesh>
        <Sph p={[0, 0.03, 0]} rad={0.035} c="#fff3b0" emissive="#ffd86b" glow={1.2} />
      </group>
      <group ref={match}>
        <Box r={[0, 0, 0.8]} s={[0.02, 0.2, 0.02]} c="#e0b83a" />
        <Sph p={[-0.07, 0.07, 0]} rad={0.025} c="#ff7a2f" emissive="#ff5a1f" glow={1} />
      </group>
      <pointLight ref={light} position={[0, 0.8, 0.3]} color="#ffb060" distance={6} decay={1.3} intensity={0} />
    </group>
  );
}

/* ---------- decor ---------- */
function Decor() {
  return (
    <group>
      {/* rug + side table (candle sits on it) */}
      <Cyl p={[-0.6, 0.01, 0.8]} rt={1.8} h={0.02} seg={32} c="#5b3a70" />
      <Cyl p={[-0.6, 0.02, 0.8]} rt={1.5} h={0.02} seg={32} c="#7a4f8f" />
      <group position={[0.4, 0, 0.3]}>
        <Cyl p={[0, 0.66, 0]} rt={0.4} h={0.06} c="#6b4a3a" />
        <Cyl p={[0, 0.33, 0]} rt={0.05} h={0.64} c="#5b3a26" />
        <Cyl p={[0, 0.02, 0]} rt={0.25} h={0.04} c="#5b3a26" />
      </group>
      {/* old sofa */}
      <group position={[1.8, 0, 2.3]} rotation={[0, -0.3, 0]}>
        <Box p={[0, 0.3, 0]} s={[2.2, 0.5, 0.9]} c="#4a6a5a" />
        <Box p={[0, 0.75, 0.35]} s={[2.2, 0.7, 0.25]} c="#3f5a4c" />
        <Box p={[-1.15, 0.5, 0]} s={[0.2, 0.7, 0.9]} c="#3f5a4c" />
        <Box p={[1.15, 0.5, 0]} s={[0.2, 0.7, 0.9]} c="#3f5a4c" />
        <Box p={[0.4, 0.62, 0.1]} r={[0.2, 0.3, 0]} s={[0.45, 0.4, 0.15]} c="#c9a227" />
      </group>
      {/* old trunk and boxes in the corner */}
      <Box p={[-3.2, 0.3, -3.2]} s={[1.0, 0.6, 0.7]} c="#6b4a3a" />
      <Box p={[-3.2, 0.62, -3.2]} s={[1.02, 0.05, 0.72]} c="#c9a227" />
      <Box p={[-3.3, 0.9, -3.25]} r={[0, 0.3, 0]} s={[0.6, 0.5, 0.5]} c="#a3683f" />
      {/* hanging bulb, dead (the power is out) */}
      <Box p={[1.2, 3.4, -1.2]} s={[0.02, 1.2, 0.02]} c="#3d2140" />
      <Sph p={[1.2, 2.72, -1.2]} rad={0.12} c="#6f6a60" />
      {/* cobweb corner */}
      <mesh position={[-3.9, 3.8, -3.9]} rotation={[0, Math.PI / 4, 0]}>
        <torusGeometry args={[0.25, 0.008, 4, 16, HALF_PI]} />
        <Toon color="#d9d4cc" />
      </mesh>
      {/* framed painting */}
      <Box p={[-3.96, 2.5, 1.6]} s={[0.05, 0.9, 1.2]} c="#c9a227" />
      <Box p={[-3.93, 2.5, 1.6]} s={[0.02, 0.72, 1.0]} c="#2f5b43" />
      <Sph p={[-3.91, 2.6, 1.9]} rad={0.1} sc={[0.2, 1, 1]} c="#f4efe6" />
    </group>
  );
}

export function StormNight() {
  return (
    <group>
      <RoomShell floor="#5e4f42" wallLeft="#4d5872" wallBack="#434e67" trim="#2b2230" />
      <Decor />
      <Slot id="window_storm_01" anim="anim_storm_rain_loop" position={[0.3, 2.3, -3.97]} markerY={1.1}>
        <RainWindow storm />
      </Slot>
      <Slot id="rocking_chair_01" anim="anim_chair_rock_loop" position={[-2.0, 0, 0.6]} rotation={[0, 0.9, 0]} markerY={1.7}>
        <RockingChair />
      </Slot>
      <Slot id="candle_01" anim="anim_candle_light_once" position={[0.4, 0.69, 0.3]} markerY={0.9}>
        <Candle />
      </Slot>
      <Slot id="door_01" anim="anim_door_open_once" position={[2.7, 0, -3.97]} markerY={2.9}>
        <Door item={null} />
      </Slot>
      <Slot id="clock_wall_01" anim="anim_pendulum_swing_loop" position={[-3.95, 2.4, -1.6]} rotation={[0, HALF_PI, 0]} markerY={1.1}>
        <WallClock />
      </Slot>
    </group>
  );
}

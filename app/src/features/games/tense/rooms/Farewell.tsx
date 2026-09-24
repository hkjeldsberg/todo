"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { Door, HALF_PI, Phone, PhotoFrame, WallClock, clamp01 } from "../objects/common";
import { Box, Cyl, RoomShell } from "../objects/parts";
import { Slot, useSlot } from "../slot";
import { easeOutBounce, onceProgress, useGameTime } from "../time";

/* ---------- boxes_01 · preterite once: thirty years get packed into boxes ---------- */
const STACK: { p: [number, number, number]; s: [number, number, number]; r: number; c: string }[] = [
  { p: [0, 0.3, 0], s: [0.8, 0.6, 0.7], r: 0, c: "#c98a4b" },
  { p: [0.85, 0.25, 0.1], s: [0.7, 0.5, 0.6], r: 0.2, c: "#b8743a" },
  { p: [0.05, 0.85, 0.02], s: [0.65, 0.5, 0.6], r: -0.15, c: "#d99a4e" },
  { p: [0.8, 0.72, 0.12], s: [0.5, 0.45, 0.5], r: 0.4, c: "#c98a4b" },
];

function Boxes() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const boxes = useRef<(Group | null)[]>([]);
  const flat = useRef<Group>(null);
  useFrame(() => {
    const p = on ? onceProgress(time.current.t, since.current, 1.8) : 0;
    if (flat.current) flat.current.visible = p === 0;
    boxes.current.forEach((g, i) => {
      if (!g) return;
      const k = easeOutBounce(clamp01((p - i * 0.18) / 0.4));
      g.visible = p > i * 0.18;
      const { p: pos } = STACK[i];
      g.position.set(pos[0], pos[1] + (1 - k) * 1.8, pos[2]);
    });
  });
  return (
    <group>
      {/* before: a flat, unfolded box and a roll of tape */}
      <group ref={flat}>
        <Box p={[0.3, 0.01, 0.1]} r={[0, 0.3, 0]} s={[1.3, 0.02, 0.9]} c="#c98a4b" />
        <Box p={[0.3, 0.025, 0.1]} r={[0, 0.3, 0]} s={[0.04, 0.01, 0.9]} c="#a3683f" />
      </group>
      <Cyl p={[1.2, 0.06, 0.6]} r={[HALF_PI, 0, 0]} rt={0.1} h={0.08} c="#d9c29c" />
      {STACK.map((b, i) => (
        <group key={i} ref={(g) => void (boxes.current[i] = g)} rotation={[0, b.r, 0]}>
          <Box s={b.s} c={b.c} />
          <Box p={[0, b.s[1] / 2 + 0.005, 0]} s={[0.1, 0.01, b.s[2] + 0.01]} c="#d9c29c" />
          <Box p={[0, 0, b.s[2] / 2 + 0.005]} s={[0.3, 0.12, 0.01]} c="#f7f4ee" />
        </group>
      ))}
    </group>
  );
}

/* ---------- decor ---------- */
function Decor() {
  return (
    <group>
      {/* pale rectangles where pictures used to hang */}
      <Box p={[-1.6, 2.3, -3.99]} s={[0.9, 1.1, 0.02]} c="#f3efe7" />
      <Box p={[-3.99, 2.3, 0.3]} s={[0.02, 0.8, 1.2]} c="#f3efe7" />
      {/* rolled-up rug, lone chair, a few taped boxes by the door */}
      <Cyl p={[-2.6, 0.18, -2.6]} r={[0, 0.5, HALF_PI]} rt={0.18} h={2.2} c="#8a2f2a" />
      <Cyl p={[-2.6, 0.18, -2.6]} r={[0, 0.5, HALF_PI]} rt={0.1} h={2.22} c="#c9a227" />
      <group position={[3.0, 0, 2.6]} rotation={[0, -0.6, 0]}>
        <Box p={[0, 0.45, 0]} s={[0.5, 0.06, 0.5]} c="#8a5433" />
        <Box p={[0, 0.8, -0.22]} s={[0.5, 0.65, 0.06]} c="#8a5433" />
        {[
          [-0.22, -0.22],
          [0.22, -0.22],
          [-0.22, 0.22],
          [0.22, 0.22],
        ].map(([x, z]) => (
          <Box key={`${x}${z}`} p={[x, 0.22, z]} s={[0.05, 0.45, 0.05]} c="#6b4a3a" />
        ))}
      </group>
      {/* box the phone sits on */}
      <Box p={[2.3, 0.3, 0.4]} s={[0.8, 0.6, 0.7]} c="#b8743a" />
      <Box p={[2.3, 0.605, 0.4]} s={[0.1, 0.01, 0.71]} c="#d9c29c" />
      <Box p={[1.8, 0.25, -2.9]} s={[0.7, 0.5, 0.6]} c="#c98a4b" />
      <Box p={[1.8, 0.7, -2.9]} r={[0, 0.3, 0]} s={[0.55, 0.4, 0.5]} c="#d99a4e" />
      {/* bare bulb */}
      <Box p={[0.4, 3.5, -0.6]} s={[0.02, 1.0, 0.02]} c="#3d2140" />
      {/* floor boards */}
      {Array.from({ length: 8 }, (_, i) => (
        <Box key={i} p={[0, 0.004, -3.5 + i]} s={[8, 0.008, 0.96]} c={i % 2 ? "#cbb89a" : "#c2ae8e"} />
      ))}
    </group>
  );
}

export function Farewell() {
  return (
    <group>
      <RoomShell floor="#c2ae8e" wallLeft="#e9e4da" wallBack="#dcd6ca" trim="#8a7f70" />
      <Decor />
      <Slot id="boxes_01" anim="anim_boxes_stack_once" position={[-1.6, 0, 0.6]} markerY={1.7}>
        <Boxes />
      </Slot>
      <Slot id="phone_01" anim="anim_phone_ring_loop" position={[2.3, 0.61, 0.4]} markerY={0.75}>
        <Phone />
      </Slot>
      <Slot id="photo_frame_01" anim="anim_photo_shimmer_loop" position={[0.3, 2.3, -3.97]} markerY={0.8}>
        <PhotoFrame />
      </Slot>
      <Slot id="clock_wall_01" anim="anim_pendulum_swing_loop" position={[-3.95, 2.4, -1.6]} rotation={[0, HALF_PI, 0]} markerY={1.1}>
        <WallClock />
      </Slot>
      <Slot id="door_01" anim="anim_door_close_once" position={[2.7, 0, -3.97]} markerY={2.9}>
        <Door closing />
      </Slot>
    </group>
  );
}

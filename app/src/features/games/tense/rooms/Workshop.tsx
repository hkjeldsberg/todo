"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { HALF_PI, PendantLamp, Radio, SeaWindow, clamp01 } from "../objects/common";
import { Box, Cyl, RoomShell, Sph } from "../objects/parts";
import { Slot, useSlot } from "../slot";
import { easeOutBounce, easeOutCubic, onceProgress, useGameTime } from "../time";
import { Toon } from "../toon";

/* ---------- toy_boat_01 · preterite once: loose planks fly together into a wooden boat ---------- */
interface Piece {
  from: [number, number, number, number]; // x, z, rotY, rotZ as a loose plank on the bench
  to: [number, number, number]; // assembled position
  s: [number, number, number];
  c: string;
}

const PIECES: Piece[] = [
  { from: [-0.35, 0.15, 0.4, 0], to: [0, 0.08, 0], s: [0.7, 0.1, 0.26], c: "#b57a4a" },
  { from: [0.05, -0.1, -0.3, 0], to: [0, 0.17, 0.12], s: [0.64, 0.1, 0.04], c: "#8a5433" },
  { from: [0.35, 0.18, 1.2, 0], to: [0, 0.17, -0.12], s: [0.64, 0.1, 0.04], c: "#8a5433" },
  { from: [-0.1, 0.25, 2.0, 0], to: [0, 0.4, 0], s: [0.03, 0.55, 0.03], c: "#6b4a3a" },
];

function ToyBoat() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const parts = useRef<(Group | null)[]>([]);
  const sail = useRef<Group>(null);
  useFrame(() => {
    const p = on ? onceProgress(time.current.t, since.current, 1.8) : 0;
    parts.current.forEach((g, i) => {
      if (!g) return;
      const k = easeOutCubic(clamp01((p - i * 0.12) / 0.4));
      const { from, to } = PIECES[i];
      const loose = i === 3 ? [from[0], 0.02, from[1]] : [from[0], 0.05, from[1]];
      g.position.set(loose[0] + (to[0] - loose[0]) * k, loose[1] + (to[1] - loose[1]) * k + Math.sin(k * Math.PI) * 0.4, loose[2] + (to[2] - loose[2]) * k);
      g.rotation.set(0, from[2] * (1 - k), (i === 3 ? HALF_PI : 0) * (1 - k));
    });
    const sl = clamp01((p - 0.7) / 0.3);
    if (sail.current) {
      sail.current.visible = sl > 0;
      sail.current.scale.set(1, Math.max(0.001, easeOutBounce(sl)), 1);
    }
  });
  return (
    <group>
      {PIECES.map((pc, i) => (
        <group key={i} ref={(g) => void (parts.current[i] = g)}>
          <Box s={pc.s} c={pc.c} />
        </group>
      ))}
      <group ref={sail} position={[0.03, 0.2, 0]}>
        <mesh position={[0.12, 0.3, 0]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.2, 0.42, 3]} />
          <Toon color="#f7f4ee" />
        </mesh>
        <Box p={[-0.02, 0.55, 0]} s={[0.12, 0.06, 0.01]} c="#d64545" />
      </group>
    </group>
  );
}

/* ---------- toolbox_01 · preterite once: grandpa's toolbox opens up ---------- */
function Toolbox() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const lidL = useRef<Group>(null);
  const lidR = useRef<Group>(null);
  const tools = useRef<Group>(null);
  const bow = useRef<Group>(null);
  useFrame(() => {
    const p = on ? onceProgress(time.current.t, since.current, 1.4) : 0;
    const b = clamp01(p / 0.3);
    if (bow.current) {
      bow.current.visible = b < 1;
      bow.current.scale.setScalar(1 - b);
      bow.current.position.y = 0.52 + b * 0.5;
    }
    const k = easeOutBounce(clamp01((p - 0.25) / 0.45));
    if (lidL.current) lidL.current.rotation.x = k * 1.9;
    if (lidR.current) lidR.current.rotation.x = -k * 1.9;
    const t = clamp01((p - 0.55) / 0.45);
    if (tools.current) {
      tools.current.visible = t > 0;
      tools.current.position.y = 0.12 + easeOutBounce(t) * 0.28;
    }
  });
  return (
    <group>
      <Box p={[0, 0.2, 0]} s={[0.9, 0.4, 0.5]} c="#d64545" />
      <Box p={[0, 0.2, 0.26]} s={[0.9, 0.06, 0.02]} c="#8a2f2a" />
      <group ref={tools}>
        <Box p={[-0.15, 0.12, -0.05]} r={[0, 0, 0.25]} s={[0.05, 0.4, 0.05]} c="#8a5433" />
        <Box p={[-0.1, 0.32, -0.05]} r={[0, 0, 0.25]} s={[0.2, 0.08, 0.07]} c="#6b6b6b" />
        <Box p={[0.18, 0.1, 0.05]} r={[0, 0, -0.3]} s={[0.05, 0.36, 0.03]} c="#c9c9c9" />
        <mesh position={[0.24, 0.3, 0.05]} rotation={[0, 0, -0.3]}>
          <torusGeometry args={[0.06, 0.02, 6, 12, Math.PI * 1.5]} />
          <Toon color="#c9c9c9" />
        </mesh>
      </group>
      <group ref={lidL} position={[0, 0.4, -0.25]}>
        <Box p={[0, 0.03, 0.125]} s={[0.9, 0.06, 0.25]} c="#b8322f" />
      </group>
      <group ref={lidR} position={[0, 0.4, 0.25]}>
        <Box p={[0, 0.03, -0.125]} s={[0.9, 0.06, 0.25]} c="#b8322f" />
      </group>
      <group ref={bow} position={[0, 0.52, 0]}>
        <Sph rad={0.1} sc={[1.6, 0.7, 0.8]} c="#ffd23f" />
        <Box p={[0, -0.06, 0]} s={[0.92, 0.03, 0.08]} c="#ffd23f" />
      </group>
    </group>
  );
}

/* ---------- decor ---------- */
function Decor() {
  return (
    <group>
      {/* workbench along the back wall */}
      <Box p={[-1.2, 0.93, -3.35]} s={[3.8, 0.1, 1.1]} c="#b57a4a" />
      {[-3.0, 0.6].map((x) => (
        <Box key={x} p={[x, 0.45, -3.35]} s={[0.12, 0.9, 1.0]} c="#8a5433" />
      ))}
      <Box p={[-1.2, 0.25, -3.35]} s={[3.6, 0.06, 0.9]} c="#8a5433" />
      <Box p={[-2.3, 0.4, -3.35]} s={[0.6, 0.25, 0.5]} c="#4f7fbf" />
      {/* vice */}
      <Box p={[0.35, 1.08, -3.0]} s={[0.25, 0.2, 0.3]} c="#3a3a3a" />
      {/* pegboard with tools */}
      <Box p={[-1.2, 2.25, -3.96]} s={[3.2, 1.3, 0.04]} c="#d9b27c" />
      <Box p={[-2.4, 2.3, -3.92]} r={[0, 0, 0.1]} s={[0.08, 0.7, 0.04]} c="#8a5433" />
      <Box p={[-2.3, 2.62, -3.92]} r={[0, 0, 0.1]} s={[0.3, 0.1, 0.05]} c="#6b6b6b" />
      <Box p={[-1.7, 2.2, -3.92]} s={[0.5, 0.25, 0.03]} c="#c9c9c9" />
      <Box p={[-1.7, 2.05, -3.92]} s={[0.5, 0.08, 0.04]} c="#8a5433" />
      <Box p={[-0.9, 2.3, -3.92]} r={[0, 0, -0.3]} s={[0.05, 0.6, 0.03]} c="#c9c9c9" />
      <Box p={[-0.3, 2.3, -3.92]} s={[0.05, 0.6, 0.03]} c="#d64545" />
      {/* stool + wood pile + shavings */}
      <group position={[1.2, 0, -1.4]}>
        <Cyl p={[0, 0.62, 0]} rt={0.28} h={0.08} c="#8a5433" />
        {[0, 1, 2].map((i) => (
          <Box key={i} p={[Math.cos(i * 2.1) * 0.18, 0.3, Math.sin(i * 2.1) * 0.18]} s={[0.05, 0.6, 0.05]} c="#6b4a3a" />
        ))}
      </group>
      {[0, 1, 2, 3].map((i) => (
        <Box key={i} p={[2.9, 0.08 + i * 0.12, -2.8 + (i % 2) * 0.05]} r={[0, 0.1 * i, 0]} s={[1.6, 0.1, 0.25]} c={i % 2 ? "#b57a4a" : "#c98a4b"} />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <Sph key={i} p={[-0.6 + Math.sin(i * 7) * 0.9, 0.02, -2.2 + Math.cos(i * 5) * 0.4]} rad={0.07} sc={[1.2, 0.3, 0.8]} c="#e8c9a0" />
      ))}
      {/* rug */}
      <Box p={[0.3, 0.01, 1.2]} s={[3.2, 0.02, 2.2]} c="#4f7fbf" />
      <Box p={[0.3, 0.02, 1.2]} s={[2.8, 0.02, 1.8]} c="#3b6aa8" />
    </group>
  );
}

export function Workshop() {
  return (
    <group>
      <RoomShell floor="#a99c8a" wallLeft="#c9b18f" wallBack="#bca47d" trim="#5b3a26" />
      <Decor />
      <Slot id="radio_vintage_01" anim="anim_radio_music_loop" position={[-2.7, 0.98, -3.45]} markerY={1.5}>
        <Radio />
      </Slot>
      <Slot id="lamp_workshop_01" anim="anim_lamp_glow_loop" position={[-1.2, 2.55, -2.9]} markerY={0.75}>
        <PendantLamp />
      </Slot>
      <Slot id="window_sea_01" anim="anim_sea_waves_loop" position={[-3.97, 2.3, 0.4]} rotation={[0, HALF_PI, 0]} markerY={1.1}>
        <SeaWindow />
      </Slot>
      <Slot id="toy_boat_01" anim="anim_boat_build_once" position={[-0.9, 0.98, -3.25]} markerY={1.0}>
        <ToyBoat />
      </Slot>
      <Slot id="toolbox_01" anim="anim_toolbox_open_once" position={[1.4, 0, 0.8]} rotation={[0, -0.3, 0]} markerY={1.0}>
        <Toolbox />
      </Slot>
    </group>
  );
}

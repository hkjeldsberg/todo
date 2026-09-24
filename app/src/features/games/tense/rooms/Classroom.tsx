"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh, MeshToonMaterial } from "three";
import { Door, Globe, HALF_PI, WallClock, clamp01 } from "../objects/common";
import { Box, Cyl, RoomShell, Sph } from "../objects/parts";
import { Slot, useSlot } from "../slot";
import { easeOutBounce, onceProgress, useGameTime } from "../time";
import { Toon } from "../toon";

/* ---------- chalkboard_01 · preterite once: the news gets written on the board ---------- */
const CHALK_LINES: [number, number, number][] = [
  // x, y, width
  [-0.55, 0.35, 1.3],
  [-0.35, 0.12, 1.7],
  [-0.65, -0.11, 1.1],
  [0.55, -0.34, 0.6],
];

function Chalkboard() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const lines = useRef<(Mesh | null)[]>([]);
  const heart = useRef<Group>(null);
  const chalk = useRef<Mesh>(null);
  useFrame(() => {
    const p = on ? onceProgress(time.current.t, since.current, 2.0) : 0;
    let tipX = -1.2;
    let tipY = 0.35;
    lines.current.forEach((l, i) => {
      if (!l) return;
      const f = clamp01((p - i * 0.18) / 0.18);
      const [x, y, w] = CHALK_LINES[i];
      l.visible = f > 0;
      l.scale.x = Math.max(0.001, f);
      l.position.x = x - (w / 2) * (1 - f);
      if (f > 0 && f < 1) {
        tipX = x - w / 2 + w * f;
        tipY = y;
      }
    });
    const h = clamp01((p - 0.75) / 0.25);
    if (heart.current) {
      heart.current.visible = h > 0;
      heart.current.scale.setScalar(Math.max(0.001, easeOutBounce(h)));
    }
    if (chalk.current) {
      chalk.current.visible = p > 0 && p < 0.75;
      chalk.current.position.set(tipX, tipY - 0.05, 0.08);
    }
  });
  return (
    <group>
      <Box s={[2.8, 1.4, 0.08]} c="#8a5433" />
      <Box p={[0, 0, 0.045]} s={[2.6, 1.2, 0.02]} c="#2f5b43" />
      <Box p={[0, -0.72, 0.1]} s={[2.6, 0.06, 0.18]} c="#8a5433" />
      <Box p={[-0.9, -0.66, 0.12]} s={[0.25, 0.06, 0.1]} c="#e9e4da" />
      {CHALK_LINES.map(([x, y, w], i) => (
        <Box key={i} ref={(m) => void (lines.current[i] = m)} p={[x, y, 0.06]} s={[w, 0.05, 0.01]} c="#f4efe6" />
      ))}
      <group ref={heart} position={[0.95, 0.2, 0.06]}>
        <Sph p={[-0.07, 0.04, 0]} rad={0.09} sc={[1, 1, 0.1]} c="#f4efe6" />
        <Sph p={[0.07, 0.04, 0]} rad={0.09} sc={[1, 1, 0.1]} c="#f4efe6" />
        <mesh position={[0, -0.06, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.15, 0.2, 4]} />
          <Toon color="#f4efe6" />
        </mesh>
      </group>
      <Cyl ref={chalk} r={[0, 0, 0.6]} rt={0.02} h={0.14} c="#ffffff" />
    </group>
  );
}

/* ---------- trophy_01 · preterite once: the exam is passed, a trophy appears ---------- */
function Trophy() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const cup = useRef<Group>(null);
  const star = useRef<Mesh>(null);
  const paper = useRef<Mesh>(null);
  useFrame(() => {
    const t = time.current.t;
    const p = on ? onceProgress(t, since.current, 1.3) : 0;
    const g = easeOutBounce(clamp01(p / 0.7));
    if (cup.current) {
      cup.current.visible = p > 0;
      cup.current.scale.setScalar(Math.max(0.001, g));
      cup.current.rotation.y = (1 - g) * Math.PI;
    }
    if (star.current) {
      star.current.visible = p === 1;
      star.current.rotation.z = t * 1.5;
    }
    const m = paper.current?.material as MeshToonMaterial | undefined;
    if (m) m.color.set(p > 0 ? "#fff6d6" : "#f7f4ee");
  });
  return (
    <group>
      <Box ref={paper} p={[-0.1, 0.005, 0.05]} r={[0, 0.2, 0]} s={[0.42, 0.01, 0.55]} c="#f7f4ee" />
      {[0.12, 0.05, -0.02, -0.09].map((z) => (
        <Box key={z} p={[-0.1, 0.012, z]} r={[0, 0.2, 0]} s={[0.3, 0.005, 0.02]} c="#4f7fbf" />
      ))}
      <Cyl p={[0.2, 0.05, -0.12]} r={[HALF_PI, 0, 0.9]} rt={0.02} h={0.35} c="#ffd23f" />
      <group ref={cup} position={[0.05, 0, -0.1]}>
        <Box p={[0, 0.05, 0]} s={[0.28, 0.1, 0.28]} c="#6b4a3a" />
        <Cyl p={[0, 0.2, 0]} rt={0.04} h={0.22} c="#e0b83a" />
        <Cyl p={[0, 0.42, 0]} rt={0.18} rb={0.08} h={0.26} c="#e0b83a" emissive="#ffb100" glow={0.2} />
        <mesh position={[-0.19, 0.44, 0]} rotation={[0, 0, HALF_PI]}>
          <torusGeometry args={[0.08, 0.02, 6, 12, Math.PI]} />
          <Toon color="#e0b83a" />
        </mesh>
        <mesh position={[0.19, 0.44, 0]} rotation={[0, 0, -HALF_PI]}>
          <torusGeometry args={[0.08, 0.02, 6, 12, Math.PI]} />
          <Toon color="#e0b83a" />
        </mesh>
        <mesh ref={star} position={[0, 0.78, 0]}>
          <octahedronGeometry args={[0.1, 0]} />
          <Toon color="#ffd23f" emissive="#ffb100" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- decor ---------- */
function StudentDesk({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <Box p={[0, 0.72, 0]} s={[1.0, 0.06, 0.7]} c="#d9b27c" />
      <Box p={[0, 0.5, 0.05]} s={[0.9, 0.04, 0.55]} c="#8a8a8a" />
      {[
        [-0.45, -0.3],
        [0.45, -0.3],
        [-0.45, 0.3],
        [0.45, 0.3],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} p={[x, 0.35, z]} s={[0.05, 0.7, 0.05]} c="#3a3a3a" />
      ))}
      <group position={[0, 0, 0.75]}>
        <Box p={[0, 0.42, 0]} s={[0.5, 0.05, 0.45]} c="#4f7fbf" />
        <Box p={[0, 0.7, 0.22]} s={[0.5, 0.5, 0.05]} c="#4f7fbf" />
        <Box p={[0, 0.2, 0]} s={[0.05, 0.4, 0.05]} c="#3a3a3a" />
      </group>
    </group>
  );
}

function Decor() {
  return (
    <group>
      {/* floor boards */}
      {Array.from({ length: 8 }, (_, i) => (
        <Box key={i} p={[-3.5 + i, 0.004, 0]} s={[0.96, 0.008, 8]} c={i % 2 ? "#c89f6e" : "#bf9563"} />
      ))}
      {/* teacher's desk */}
      <group position={[-2.4, 0, -2.2]} rotation={[0, 0.4, 0]}>
        <Box p={[0, 0.8, 0]} s={[1.6, 0.08, 0.8]} c="#8a5433" />
        <Box p={[0, 0.4, -0.3]} s={[1.5, 0.76, 0.06]} c="#6b4a3a" />
        <Box p={[-0.72, 0.4, 0]} s={[0.06, 0.76, 0.75]} c="#6b4a3a" />
        <Box p={[0.72, 0.4, 0]} s={[0.06, 0.76, 0.75]} c="#6b4a3a" />
        <Sph p={[0.5, 0.92, 0.1]} rad={0.1} c="#d64545" />
        <Box p={[-0.4, 0.88, 0.1]} s={[0.35, 0.08, 0.25]} c="#2f8f5b" />
      </group>
      <StudentDesk p={[-0.4, 0, 0.6]} />
      <StudentDesk p={[1.2, 0, 0.6]} />
      <StudentDesk p={[-0.4, 0, 2.5]} />
      <StudentDesk p={[1.2, 0, 2.5]} />
      {/* alphabet strip + map on the left wall */}
      {Array.from({ length: 9 }, (_, i) => (
        <Box key={i} p={[-3.95, 3.35, -3.2 + i * 0.8]} s={[0.03, 0.4, 0.6]} c={["#d64545", "#ffd23f", "#4f7fbf", "#2f8f5b"][i % 4]} />
      ))}
      <Box p={[-3.95, 2.1, -0.4]} s={[0.04, 1.1, 1.5]} c="#9fd3e8" />
      <Box p={[-3.92, 2.2, -0.7]} s={[0.02, 0.4, 0.5]} c="#5fae5a" />
      <Box p={[-3.92, 1.9, -0.1]} s={[0.02, 0.5, 0.35]} c="#5fae5a" />
      {/* bookshelf corner */}
      <Box p={[1.2, 0.5, -3.7]} s={[1.3, 1.0, 0.5]} c="#8a5433" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Box key={i} p={[0.7 + i * 0.18, 1.15, -3.7]} s={[0.12, 0.3, 0.3]} c={["#d64545", "#4f7fbf", "#ffd23f"][i % 3]} />
      ))}
    </group>
  );
}

export function Classroom() {
  return (
    <group>
      <RoomShell floor="#bf9563" wallLeft="#f0e2b6" wallBack="#e8d49a" trim="#6b4a3a" />
      <Decor />
      <Slot id="chalkboard_01" anim="anim_chalk_write_once" position={[-0.9, 2.2, -3.95]} markerY={1.0}>
        <Chalkboard />
      </Slot>
      <Slot id="globe_01" anim="anim_globe_spin_loop" position={[-2.0, 0.84, -2.1]} markerY={1.35}>
        <Globe />
      </Slot>
      <Slot id="door_01" anim="anim_door_open_once" position={[2.8, 0, -3.97]} markerY={2.9}>
        <Door item="backpack" />
      </Slot>
      <Slot id="clock_wall_01" anim="anim_pendulum_swing_loop" position={[-3.95, 2.3, 1.7]} rotation={[0, HALF_PI, 0]} markerY={1.1}>
        <WallClock />
      </Slot>
      <Slot id="trophy_01" anim="anim_trophy_rise_once" position={[1.2, 0.75, 0.6]} markerY={1.0}>
        <Trophy />
      </Slot>
    </group>
  );
}

"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh, MeshToonMaterial } from "three";
import { Door, HALF_PI, Radio, clamp01, rand } from "../objects/common";
import { Box, Cyl, RoomShell, Sph } from "../objects/parts";
import { Slot, useSlot } from "../slot";
import { easeOutBounce, easeOutCubic, onceProgress, useGameTime } from "../time";
import { Toon } from "../toon";

const PARTY = ["#d64545", "#ffd23f", "#4f7fbf", "#2f8f5b", "#b0508a", "#e8883a"];

/* ---------- balloons_01 · imperfect loop: balloons bob in the corner ---------- */
const BALLOONS = PARTY.map((c, i) => ({ c, x: Math.cos(i * 1.1) * 0.35, z: Math.sin(i * 1.1) * 0.3, h: 1.7 + (i % 3) * 0.25 }));

function Balloons() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const tops = useRef<(Group | null)[]>([]);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    tops.current.forEach((g, i) => {
      if (!g) return;
      const { x, z, h } = BALLOONS[i];
      g.position.set(x + (on ? Math.sin(lt * 1.3 + i) * 0.06 : 0), h + (on ? Math.sin(lt * 1.8 + i * 2) * 0.08 : 0), z);
      g.rotation.z = on ? Math.sin(lt * 1.1 + i) * 0.12 : 0;
    });
  });
  return (
    <group>
      <Box p={[0, 0.1, 0]} s={[0.3, 0.2, 0.3]} c="#f7f4ee" />
      {BALLOONS.map(({ c, x, z, h }, i) => (
        <group key={c}>
          <Box p={[x / 2, h / 2, z / 2]} r={[z * 0.3, 0, -x * 0.3]} s={[0.012, h, 0.012]} c="#3d2140" />
          <group ref={(g) => void (tops.current[i] = g)} position={[x, h, z]}>
            <Sph p={[0, 0.2, 0]} rad={0.22} sc={[1, 1.2, 1]} c={c} />
            <mesh position={[0, -0.05, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.04, 0.06, 6]} />
              <Toon color={c} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/* ---------- cake_01 · preterite once: mum puts the cake on the table ---------- */
function Cake() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const cake = useRef<Group>(null);
  const flames = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    const t = time.current.t;
    const p = on ? onceProgress(t, since.current, 1.2) : 0;
    const k = easeOutBounce(clamp01(p / 0.7));
    if (cake.current) {
      cake.current.visible = p > 0;
      cake.current.position.y = 0.06 + (1 - k) * 1.3;
    }
    flames.current.forEach((f, i) => {
      if (!f) return;
      f.visible = p > 0.7;
      f.scale.y = 1 + Math.sin(t * 12 + i * 2) * 0.2;
    });
  });
  return (
    <group>
      {/* stand: always there, so the spot is clickable */}
      <Cyl p={[0, 0.03, 0]} rt={0.42} h={0.03} c="#f7f4ee" />
      <Cyl p={[0, 0.015, 0]} rt={0.1} rb={0.16} h={0.03} c="#e9e4da" />
      <group ref={cake}>
        <Cyl p={[0, 0.14, 0]} rt={0.34} h={0.26} seg={28} c="#f2c6d6" />
        <Cyl p={[0, 0.28, 0]} rt={0.35} h={0.03} seg={28} c="#f7f4ee" />
        <Cyl p={[0, 0.4, 0]} rt={0.22} h={0.2} seg={28} c="#f2c6d6" />
        <Cyl p={[0, 0.51, 0]} rt={0.23} h={0.03} seg={28} c="#f7f4ee" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Sph key={i} p={[Math.cos(i * 1.26) * 0.3, 0.3, Math.sin(i * 1.26) * 0.3]} rad={0.035} c="#d64545" />
        ))}
        {[-0.1, 0, 0.1].map((x, i) => (
          <group key={x} position={[x, 0.52, i === 1 ? 0.08 : -0.03]}>
            <Cyl p={[0, 0.08, 0]} rt={0.015} h={0.16} c={PARTY[i + 2]} />
            <mesh ref={(m) => void (flames.current[i] = m)} position={[0, 0.2, 0]}>
              <coneGeometry args={[0.025, 0.07, 6]} />
              <Toon color="#ffb13b" emissive="#ff8a1f" emissiveIntensity={1.2} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/* ---------- window_fireworks_01 · preterite once: fireworks burst over the garden ---------- */
const BURSTS = [
  { x: -0.35, y: 0.2, c: "#ffd23f", at: 0 },
  { x: 0.35, y: 0.3, c: "#d64545", at: 0.25 },
  { x: 0.0, y: 0.05, c: "#4fbfbf", at: 0.5 },
];

function FireworksWindow() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const sparks = useRef<(Mesh | null)[]>([]);
  const stars = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    const t = time.current.t;
    const p = on ? onceProgress(t, since.current, 2.6) : 0;
    sparks.current.forEach((m, j) => {
      if (!m) return;
      const b = BURSTS[Math.floor(j / 10)];
      const a = ((j % 10) / 10) * Math.PI * 2;
      const f = clamp01((p - b.at) / 0.45);
      m.visible = f > 0 && f < 1;
      const r = easeOutCubic(f) * 0.28;
      m.position.set(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r - f * f * 0.1, 0.07);
      (m.material as MeshToonMaterial).opacity = 1 - f;
    });
    // Afterwards the sky stays full of twinkling stars: the night has changed.
    stars.current.forEach((m, i) => {
      if (!m) return;
      m.visible = p === 1;
      m.scale.setScalar(0.7 + Math.sin(t * 3 + i * 1.7) * 0.3);
    });
  });
  return (
    <group>
      <Box s={[1.8, 1.5, 0.1]} c="#f4efe6" />
      <Box p={[0, 0, 0.04]} s={[1.6, 1.3, 0.04]} c="#1c2c46" />
      <Box p={[0, -0.5, 0.06]} s={[1.6, 0.3, 0.02]} c="#2f5b43" />
      {BURSTS.flatMap((b, bi) =>
        Array.from({ length: 10 }, (_, k) => (
          <mesh key={`${bi}-${k}`} ref={(m) => void (sparks.current[bi * 10 + k] = m)}>
            <sphereGeometry args={[0.03, 6, 5]} />
            <Toon color={b.c} emissive={b.c} emissiveIntensity={0.8} transparent opacity={1} />
          </mesh>
        )),
      )}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} ref={(m) => void (stars.current[i] = m)} position={[rand(i) * 1.4 - 0.7, rand(i + 20) * 0.8 - 0.2, 0.07]}>
          <octahedronGeometry args={[0.035, 0]} />
          <Toon color="#fff3b0" emissive="#ffd86b" emissiveIntensity={0.8} />
        </mesh>
      ))}
      <Box p={[0, 0, 0.1]} s={[0.05, 1.3, 0.04]} c="#f4efe6" />
      <Box p={[0, -0.8, 0.12]} s={[2.0, 0.08, 0.3]} c="#f4efe6" />
    </group>
  );
}

/* ---------- decor ---------- */
function Bunting({ from, to, n }: { from: [number, number, number]; to: [number, number, number]; n: number }) {
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const f = (i + 0.5) / n;
        const sag = Math.sin(f * Math.PI) * 0.25;
        const p: [number, number, number] = [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f - sag, from[2] + (to[2] - from[2]) * f];
        return (
          <mesh key={i} position={p} rotation={[0, from[0] === to[0] ? HALF_PI : 0, Math.PI]}>
            <coneGeometry args={[0.12, 0.25, 3]} />
            <Toon color={PARTY[i % PARTY.length]} />
          </mesh>
        );
      })}
    </group>
  );
}

function Decor() {
  return (
    <group>
      {/* party table */}
      <Box p={[0.6, 0.8, 0.4]} s={[2.4, 0.08, 1.4]} c="#f7f4ee" />
      <Box p={[0.6, 0.74, 1.12]} s={[2.4, 0.2, 0.02]} c="#f2c6d6" />
      {[
        [-0.5, -0.2],
        [1.7, -0.2],
        [-0.5, 1.0],
        [1.7, 1.0],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} p={[x, 0.38, z]} s={[0.08, 0.76, 0.08]} c="#8a5433" />
      ))}
      {[-0.2, 0.6, 1.4].map((x, i) => (
        <group key={x} position={[x, 0.85, 0.95]}>
          <Cyl p={[0, 0.01, 0]} rt={0.14} h={0.02} c="#f7f4ee" />
          <mesh position={[0, 0.2, -0.35]} rotation={[0.2, 0, 0]}>
            <coneGeometry args={[0.07, 0.2, 10]} />
            <Toon color={PARTY[i]} />
          </mesh>
        </group>
      ))}
      <Cyl p={[1.6, 0.93, 0.1]} rt={0.1} h={0.18} c="#e8883a" />
      {/* presents pile */}
      <Box p={[2.9, 0.2, 1.4]} s={[0.5, 0.4, 0.5]} c="#4f7fbf" />
      <Box p={[2.9, 0.2, 1.4]} s={[0.08, 0.41, 0.51]} c="#ffd23f" />
      <Box p={[3.3, 0.15, 2.0]} r={[0, 0.4, 0]} s={[0.4, 0.3, 0.4]} c="#b0508a" />
      {/* sideboard for the radio */}
      <Box p={[-3.55, 0.45, 1.3]} s={[0.7, 0.9, 1.6]} c="#8a5433" />
      {/* bunting */}
      <Bunting from={[-3.9, 3.4, -3.9]} to={[3.9, 3.4, -3.9]} n={12} />
      <Bunting from={[-3.9, 3.4, -3.9]} to={[-3.9, 3.4, 3.9]} n={12} />
      {/* confetti on the floor */}
      {Array.from({ length: 24 }, (_, i) => (
        <Box key={i} p={[rand(i) * 6 - 3, 0.01, rand(i + 40) * 6 - 2]} r={[0, rand(i + 80) * 3, 0]} s={[0.08, 0.01, 0.05]} c={PARTY[i % PARTY.length]} />
      ))}
    </group>
  );
}

export function Party() {
  return (
    <group>
      <RoomShell floor="#d8b98a" wallLeft="#ffd9d0" wallBack="#ffcfc2" trim="#b0508a" />
      <Decor />
      <Slot id="balloons_01" anim="anim_balloons_float_loop" position={[-3.1, 0, -3.1]} markerY={2.6}>
        <Balloons />
      </Slot>
      <Slot id="radio_vintage_01" anim="anim_radio_music_loop" position={[-3.5, 0.9, 1.3]} rotation={[0, HALF_PI, 0]} markerY={1.5}>
        <Radio />
      </Slot>
      <Slot id="door_01" anim="anim_door_open_once" position={[2.7, 0, -3.97]} markerY={2.9}>
        <Door item="gift" />
      </Slot>
      <Slot id="cake_01" anim="anim_cake_arrive_once" position={[0.6, 0.84, 0.35]} markerY={1.1}>
        <Cake />
      </Slot>
      <Slot id="window_fireworks_01" anim="anim_fireworks_burst_once" position={[0.2, 2.3, -3.97]} markerY={1.1}>
        <FireworksWindow />
      </Slot>
    </group>
  );
}

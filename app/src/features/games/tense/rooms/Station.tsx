"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh, MeshToonMaterial } from "three";
import { HALF_PI, WallClock, clamp01 } from "../objects/common";
import { Box, Cyl, RoomShell, Sph } from "../objects/parts";
import { Slot, useSlot } from "../slot";
import { easeOutBounce, easeOutCubic, onceProgress, useGameTime } from "../time";
import { Toon } from "../toon";

const PLATFORM = 0.3;

/* ---------- speaker_01 · imperfect loop: the loudspeaker keeps announcing ---------- */
function Speaker() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const cone = useRef<Group>(null);
  const rings = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    const talking = on && lt % 2.4 < 1.5;
    if (cone.current) cone.current.scale.setScalar(1 + (talking ? Math.abs(Math.sin(lt * 18)) * 0.08 : 0));
    rings.current.forEach((r, i) => {
      if (!r) return;
      const f = (lt * 1.2 + i / 3) % 1;
      r.visible = talking;
      r.position.z = 0.35 + f * 0.9;
      r.scale.setScalar(0.5 + f * 1.3);
      (r.material as MeshToonMaterial).opacity = 1 - f;
    });
  });
  return (
    <group>
      <Box p={[0, 0.3, -0.05]} s={[0.08, 0.4, 0.08]} c="#3a3a3a" />
      <group ref={cone}>
        <mesh rotation={[HALF_PI, 0, 0]} position={[0, 0, 0.15]}>
          <cylinderGeometry args={[0.28, 0.1, 0.4, 16]} />
          <Toon color="#c9c9c9" />
        </mesh>
        <Cyl p={[0, 0, -0.06]} r={[HALF_PI, 0, 0]} rt={0.12} h={0.1} c="#8a8a8a" />
      </group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => void (rings.current[i] = m)}>
          <torusGeometry args={[0.25, 0.015, 6, 28, Math.PI * 0.8]} />
          <Toon color="#ffd23f" transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- pigeon_01 · imperfect loop: a pigeon walks up and down the platform ---------- */
function Pigeon() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const bird = useRef<Group>(null);
  const head = useRef<Group>(null);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    const b = bird.current;
    if (b) {
      const phase = (lt * 0.25) % 2; // 0..1 walk right, 1..2 walk left
      const x = phase < 1 ? phase : 2 - phase;
      b.position.x = (x - 0.5) * 1.6;
      b.rotation.y = phase < 1 ? 0 : Math.PI;
      b.position.y = on ? Math.abs(Math.sin(lt * 9)) * 0.03 : 0;
    }
    if (head.current) head.current.position.x = 0.2 + (on ? Math.sin(lt * 9) * 0.04 : 0);
  });
  return (
    <group ref={bird}>
      <Sph p={[0, 0.2, 0]} rad={0.16} sc={[1.3, 0.9, 0.9]} c="#8d95a3" />
      <Sph p={[-0.05, 0.25, 0.1]} rad={0.1} sc={[1.4, 0.6, 0.3]} c="#6e7686" />
      <Box p={[-0.23, 0.2, 0]} r={[0, 0, 0.3]} s={[0.14, 0.04, 0.12]} c="#555c69" />
      <group ref={head} position={[0.2, 0.33, 0]}>
        <Sph rad={0.08} c="#6e7686" />
        <Sph p={[-0.03, -0.06, 0]} rad={0.06} c="#5fae8a" />
        <mesh position={[0.1, -0.01, 0]} rotation={[0, 0, -HALF_PI]}>
          <coneGeometry args={[0.025, 0.07, 6]} />
          <Toon color="#e8883a" />
        </mesh>
        <Sph p={[0.04, 0.02, 0.06]} rad={0.015} c="#d64545" />
      </group>
      <Box p={[0.02, 0.05, 0.04]} s={[0.02, 0.1, 0.02]} c="#d66a6a" />
      <Box p={[0.02, 0.05, -0.04]} s={[0.02, 0.1, 0.02]} c="#d66a6a" />
    </group>
  );
}

/* ---------- train_01 · preterite once: the train pulls into the station ---------- */
function Train() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const train = useRef<Group>(null);
  const lamp = useRef<Mesh>(null);
  useFrame(() => {
    const p = on ? onceProgress(time.current.t, since.current, 2.2) : 0;
    const k = easeOutCubic(p);
    if (train.current) {
      train.current.visible = p > 0;
      train.current.position.x = 3.2 + 9 * (1 - k);
    }
    const m = lamp.current?.material as MeshToonMaterial | undefined;
    if (m) m.color.set(p > 0 ? "#3fbf5f" : "#d64545");
  });
  return (
    <group>
      {/* signal post at the end of the track: clickable before the train arrives */}
      <group>
        <Box p={[0, 0.25, 0]} s={[0.55, 0.5, 0.45]} c="#6b6b6b" />
        <Cyl p={[0, 1.1, 0]} rt={0.08} h={1.3} c="#3a3a3a" />
        <Box p={[0, 1.85, 0]} s={[0.42, 0.7, 0.3]} c="#3d2140" />
        <Sph ref={lamp} p={[0, 1.95, 0.17]} rad={0.11} c="#d64545" emissive="#ffffff" glow={0.25} />
        <Sph p={[0, 1.7, 0.17]} rad={0.09} c="#3a3a3a" />
      </group>
      <group ref={train} position={[3.2, 0, 0.75]}>
        <Box p={[0, 0.85, 0]} s={[3.6, 1.2, 1.1]} c="#2f5f8f" />
        <Box p={[0, 1.5, 0]} s={[3.5, 0.12, 1.15]} c="#e9e4da" />
        <Box p={[-1.95, 0.75, 0]} s={[0.3, 1.0, 1.0]} c="#ffd23f" />
        {[-1.2, -0.4, 0.4, 1.2].map((x) => (
          <Box key={x} p={[x, 1.05, 0.56]} s={[0.55, 0.4, 0.02]} c="#bfe0f0" />
        ))}
        <Box p={[0, 0.45, 0.56]} s={[3.6, 0.1, 0.02]} c="#ffd23f" />
        {[-1.4, -0.9, 0.9, 1.4].map((x) => (
          <Cyl key={x} p={[x, 0.2, 0.45]} r={[HALF_PI, 0, 0]} rt={0.18} h={0.1} c="#3a3a3a" />
        ))}
        <Sph p={[-2.1, 0.6, 0.3]} rad={0.07} c="#fff3b0" emissive="#ffd86b" glow={1} />
      </group>
    </group>
  );
}

/* ---------- suitcase_01 · preterite once: the aunt's suitcase opens, presents pop out ---------- */
function Suitcase() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const lid = useRef<Group>(null);
  const gifts = useRef<(Group | null)[]>([]);
  useFrame(() => {
    const p = on ? onceProgress(time.current.t, since.current, 1.5) : 0;
    if (lid.current) lid.current.rotation.x = -easeOutBounce(clamp01(p / 0.4)) * 1.9;
    gifts.current.forEach((g, i) => {
      if (!g) return;
      const f = clamp01((p - 0.3 - i * 0.12) / 0.5);
      g.visible = f > 0;
      g.position.set((i - 1) * 0.28, 0.2 + Math.sin(f * Math.PI) * 0.6 + f * 0.05, 0.05 + f * (0.25 + i * 0.05));
      g.rotation.y = f * (i - 1) * 0.8;
    });
  });
  const colors = ["#d64545", "#ffd23f", "#4f7fbf"];
  return (
    <group>
      <Box p={[0, 0.12, 0]} s={[1.0, 0.24, 0.7]} c="#8a5433" />
      <Box p={[0, 0.12, 0.36]} s={[0.12, 0.08, 0.04]} c="#e0b83a" />
      <group ref={lid} position={[0, 0.24, -0.35]}>
        <Box p={[0, 0.08, 0.35]} s={[1.0, 0.16, 0.7]} c="#a3683f" />
        <Box p={[0, 0.17, 0.35]} s={[0.3, 0.04, 0.08]} c="#3a2418" />
        <Box p={[-0.3, 0.165, 0.35]} s={[0.04, 0.02, 0.7]} c="#6b4a3a" />
        <Box p={[0.3, 0.165, 0.35]} s={[0.04, 0.02, 0.7]} c="#6b4a3a" />
      </group>
      {colors.map((c, i) => (
        <group key={c} ref={(g) => void (gifts.current[i] = g)}>
          <Box p={[0, 0.1, 0]} s={[0.22, 0.2, 0.22]} c={c} />
          <Box p={[0, 0.1, 0]} s={[0.04, 0.21, 0.23]} c="#f7f4ee" />
        </group>
      ))}
    </group>
  );
}

/* ---------- decor ---------- */
function Decor() {
  return (
    <group>
      {/* platform + edge stripe */}
      <Box p={[0, PLATFORM / 2, -1.05]} s={[8, PLATFORM, 5.9]} c="#b8b2a7" />
      <Box p={[0, PLATFORM + 0.005, 1.75]} s={[8, 0.01, 0.2]} c="#ffd23f" />
      {/* track bed */}
      <Box p={[0, 0.02, 3.0]} s={[8, 0.04, 1.9]} c="#8a7f70" />
      {Array.from({ length: 14 }, (_, i) => (
        <Box key={i} p={[-3.7 + i * 0.57, 0.06, 3.0]} s={[0.18, 0.04, 1.4]} c="#6b4a3a" />
      ))}
      <Box p={[0, 0.11, 2.55]} s={[8, 0.06, 0.08]} c="#c9c9c9" />
      <Box p={[0, 0.11, 3.45]} s={[8, 0.06, 0.08]} c="#c9c9c9" />
      {/* departures board */}
      <Box p={[-1.3, 2.8, -3.95]} s={[2.4, 1.0, 0.1]} c="#3d2140" />
      {[0.25, 0, -0.25].map((y, i) => (
        <group key={y}>
          <Box p={[-1.95, 2.8 + y, -3.89]} s={[0.8, 0.12, 0.02]} c="#ffd23f" />
          <Box p={[-0.85, 2.8 + y, -3.89]} s={[0.35 + i * 0.1, 0.12, 0.02]} c="#ffd23f" />
          <Box p={[-0.35, 2.8 + y, -3.89]} s={[0.3, 0.12, 0.02]} c="#f7f4ee" />
        </group>
      ))}
      {/* bench */}
      <group position={[0.3, PLATFORM, -3.3]}>
        <Box p={[0, 0.45, 0]} s={[1.8, 0.08, 0.5]} c="#2f8f5b" />
        <Box p={[0, 0.8, -0.22]} s={[1.8, 0.4, 0.06]} c="#2f8f5b" />
        <Box p={[-0.8, 0.22, 0]} s={[0.08, 0.45, 0.45]} c="#3d2140" />
        <Box p={[0.8, 0.22, 0]} s={[0.08, 0.45, 0.45]} c="#3d2140" />
      </group>
      {/* lamp posts */}
      {[-2.2, 2.2].map((x) => (
        <group key={x} position={[x, PLATFORM, 1.3]}>
          <Cyl p={[0, 1.3, 0]} rt={0.05} h={2.6} c="#3d2140" />
          <Sph p={[0, 2.65, 0]} rad={0.16} c="#fff3b0" emissive="#ffd86b" glow={0.5} />
        </group>
      ))}
      {/* archway on the left wall */}
      <Box p={[-3.96, 1.5, 0.2]} s={[0.05, 2.4, 1.6]} c="#3a3a3a" />
      <Box p={[-3.94, 2.8, 0.2]} s={[0.07, 0.3, 1.9]} c="#8a5433" />
    </group>
  );
}

export function Station() {
  return (
    <group>
      <RoomShell floor="#8a7f70" wallLeft="#e6d3b3" wallBack="#dcc59f" trim="#6b4a3a" />
      <Decor />
      <Slot id="clock_station_01" anim="anim_pendulum_swing_loop" position={[1.9, 2.6, -3.95]} markerY={1.1}>
        <WallClock />
      </Slot>
      <Slot id="speaker_01" anim="anim_speaker_announce_loop" position={[-3.75, 3.1, -1.9]} rotation={[0, HALF_PI, 0]} markerY={0.55}>
        <Speaker />
      </Slot>
      <Slot id="pigeon_01" anim="anim_pigeon_walk_loop" position={[0.4, PLATFORM, 0.4]} markerY={0.75}>
        <Pigeon />
      </Slot>
      <Slot id="train_01" anim="anim_train_arrive_once" position={[-2.9, 0.1, 2.25]} markerY={2.35}>
        <Train />
      </Slot>
      <Slot id="suitcase_01" anim="anim_suitcase_open_once" position={[2.6, PLATFORM, -0.4]} rotation={[0, -0.3, 0]} markerY={0.8}>
        <Suitcase />
      </Slot>
    </group>
  );
}

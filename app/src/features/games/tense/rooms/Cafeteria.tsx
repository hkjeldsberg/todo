"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";
import { HALF_PI, RainWindow, clamp01 } from "../objects/common";
import { Box, Cyl, RoomShell, Sph } from "../objects/parts";
import { Slot, useSlot } from "../slot";
import { easeOutBounce, easeOutCubic, onceProgress, useGameTime } from "../time";
import { Toon } from "../toon";

/* ---------- espresso_machine_01 · imperfect loop: steam and coffee keep flowing ---------- */
function EspressoMachine() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const puffs = useRef<(Mesh | null)[]>([]);
  const streams = useRef<(Mesh | null)[]>([]);
  const light = useRef<Mesh>(null);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    puffs.current.forEach((m, i) => {
      if (!m) return;
      const f = (lt * 0.5 + i / 4) % 1;
      m.visible = on;
      m.position.set(0.2 + Math.sin(f * 5 + i) * 0.08, 0.85 + f * 0.8, 0);
      m.scale.setScalar(0.06 + Math.sin(f * Math.PI) * 0.1);
    });
    streams.current.forEach((m, i) => {
      if (m) m.visible = on && Math.sin(lt * 2 + i * 2) > -0.3;
    });
    if (light.current) light.current.visible = !on || Math.sin(lt * 6) > 0;
  });
  return (
    <group>
      <Box p={[0, 0.35, 0]} s={[1.0, 0.7, 0.5]} c="#c9c9c9" />
      <Box p={[0, 0.74, 0]} s={[1.05, 0.08, 0.55]} c="#8a8a8a" />
      <Box p={[0, 0.05, 0.12]} s={[0.9, 0.04, 0.35]} c="#3a3a3a" />
      {[-0.25, 0.25].map((x, i) => (
        <group key={x} position={[x, 0, 0.2]}>
          <Cyl p={[0, 0.48, 0]} rt={0.07} h={0.12} c="#3a3a3a" />
          <Box ref={(m) => void (streams.current[i] = m)} p={[0, 0.3, 0]} s={[0.025, 0.24, 0.025]} c="#5b3a26" />
          <Cyl p={[0, 0.13, 0]} rt={0.07} rb={0.06} h={0.12} c="#f7f4ee" />
        </group>
      ))}
      <Sph ref={light} p={[0.38, 0.62, 0.26]} rad={0.035} c="#d64545" emissive="#ff3b3b" glow={0.8} />
      <Cyl p={[0.2, 0.83, 0]} rt={0.03} h={0.12} c="#8a8a8a" />
      {[0, 1, 2, 3].map((i) => (
        <Sph key={i} ref={(m) => void (puffs.current[i] = m)} rad={1} c="#f7f4ee" />
      ))}
    </group>
  );
}

/* ---------- dog_01 · imperfect loop: the owner's dog sleeps (breathing + z's) ---------- */
function Dog() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const body = useRef<Group>(null);
  const zs = useRef<(Group | null)[]>([]);
  const tail = useRef<Group>(null);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    if (body.current) body.current.scale.set(1, 1 + (on ? Math.sin(lt * 2.2) * 0.07 : 0), 1 + (on ? Math.sin(lt * 2.2) * 0.03 : 0));
    if (tail.current) tail.current.rotation.y = on ? Math.sin(lt * 0.8) * 0.2 : 0;
    zs.current.forEach((z, i) => {
      if (!z) return;
      const f = (lt * 0.35 + i / 3) % 1;
      z.visible = on;
      z.position.set(0.35 + f * 0.25, 0.45 + f * 0.7, 0);
      z.scale.setScalar(0.5 + f);
      z.rotation.z = -0.3;
    });
  });
  return (
    <group>
      <group ref={body}>
        <Sph p={[0, 0.2, 0]} rad={0.28} sc={[1.5, 0.75, 0.95]} c="#c98a4b" />
        <Sph p={[0.36, 0.2, 0.08]} rad={0.17} sc={[1.1, 0.85, 1]} c="#c98a4b" />
        <Sph p={[0.5, 0.17, 0.12]} rad={0.07} c="#e8c9a0" />
        <Sph p={[0.56, 0.2, 0.14]} rad={0.03} c="#3d2140" />
        <Sph p={[0.33, 0.26, 0.24]} rad={0.08} sc={[0.8, 1.2, 0.5]} c="#8a5433" />
        <Box p={[0.44, 0.26, 0.2]} s={[0.06, 0.012, 0.012]} c="#3d2140" />
      </group>
      <group ref={tail} position={[-0.4, 0.18, 0]}>
        <Cyl p={[-0.12, 0, 0.05]} r={[0, 0.4, HALF_PI]} rt={0.035} rb={0.05} h={0.26} c="#c98a4b" />
      </group>
      <Cyl p={[0, 0.01, 0]} rt={0.62} h={0.03} c="#b8433a" />
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(g) => void (zs.current[i] = g)}>
          <Box p={[0, 0.05, 0]} s={[0.1, 0.018, 0.018]} c="#3d2140" />
          <Box r={[0, 0, 0.8]} s={[0.018, 0.13, 0.018]} c="#3d2140" />
          <Box p={[0, -0.05, 0]} s={[0.1, 0.018, 0.018]} c="#3d2140" />
        </group>
      ))}
    </group>
  );
}

/* ---------- cups_table_01 · preterite once: hot chocolate and churros arrive ---------- */
function CupsServe() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const cup = useRef<Group>(null);
  const plate = useRef<Group>(null);
  useFrame(() => {
    const p = on ? onceProgress(time.current.t, since.current, 1.2) : 0;
    const a = easeOutBounce(clamp01(p / 0.6));
    const b = easeOutBounce(clamp01((p - 0.35) / 0.65));
    if (cup.current) {
      cup.current.visible = p > 0;
      cup.current.position.y = (1 - a) * 1.2;
    }
    if (plate.current) {
      plate.current.visible = p > 0.35;
      plate.current.position.y = (1 - b) * 1.2;
    }
  });
  return (
    <group>
      <Box p={[0, 0.005, 0]} s={[0.9, 0.01, 0.6]} c="#f2e3c6" />
      <Cyl p={[-0.3, 0.07, -0.18]} rt={0.06} h={0.14} c="#f7f4ee" />
      <group ref={cup} position={[-0.12, 0, 0]}>
        <Cyl p={[0, 0.02, 0]} rt={0.14} h={0.02} c="#f7f4ee" />
        <Cyl p={[0, 0.12, 0]} rt={0.09} rb={0.07} h={0.18} c="#f7f4ee" />
        <Cyl p={[0, 0.2, 0]} rt={0.08} h={0.01} c="#5b3a26" />
        <mesh position={[0.11, 0.12, 0]} rotation={[HALF_PI, 0, 0]}>
          <torusGeometry args={[0.05, 0.015, 6, 12]} />
          <Toon color="#f7f4ee" />
        </mesh>
      </group>
      <group ref={plate} position={[0.22, 0, 0.05]}>
        <Cyl p={[0, 0.02, 0]} rt={0.18} rb={0.14} h={0.03} c="#f7f4ee" />
        {[-0.06, 0, 0.06].map((z, i) => (
          <Cyl key={z} p={[0, 0.06, z]} r={[0, 0.3 * i, HALF_PI]} rt={0.025} h={0.28} seg={6} c="#e0a35a" />
        ))}
      </group>
    </group>
  );
}

/* ---------- oven_01 · preterite once: the oven opens, fresh bread comes out ---------- */
function Oven() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const door = useRef<Group>(null);
  const bread = useRef<Group>(null);
  const puffs = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    const p = on ? onceProgress(time.current.t, since.current, 1.6) : 0;
    const open = easeOutCubic(clamp01(p / 0.35));
    if (door.current) door.current.rotation.x = open * 1.45;
    const b = clamp01((p - 0.3) / 0.5);
    if (bread.current) {
      bread.current.position.set(0, 0.55 + Math.sin(Math.PI * b) * 0.6 + b * 0.62, 0.1 - b * 0.1);
      bread.current.rotation.z = b * Math.PI * 2;
    }
    puffs.current.forEach((m, i) => {
      if (!m) return;
      const f = clamp01((p - 0.2 - i * 0.1) / 0.6);
      m.visible = f > 0 && f < 1;
      m.position.set((i - 1) * 0.2, 0.9 + f * 1.0, 0.45);
      m.scale.setScalar(0.08 + Math.sin(f * Math.PI) * 0.18);
    });
  });
  return (
    <group>
      <Box p={[0, 0.6, 0]} s={[1.1, 1.2, 0.7]} c="#b8433a" />
      <Box p={[0, 1.22, 0]} s={[1.15, 0.06, 0.75]} c="#8a2f2a" />
      <Box p={[0, 0.55, 0.3]} s={[0.8, 0.6, 0.12]} c="#2b1d16" />
      <group ref={door} position={[0, 0.25, 0.37]}>
        <Box p={[0, 0.3, 0]} s={[0.85, 0.6, 0.05]} c="#3a3a3a" />
        <Box p={[0, 0.34, 0.03]} s={[0.55, 0.3, 0.02]} c="#e0a35a" emissive="#ff8a1f" glow={0.3} />
        <Box p={[0, 0.56, 0.06]} s={[0.5, 0.04, 0.04]} c="#c9c9c9" />
      </group>
      {[-0.3, 0, 0.3].map((x) => (
        <Cyl key={x} p={[x, 1.05, 0.36]} r={[HALF_PI, 0, 0]} rt={0.05} h={0.05} c="#f7f4ee" />
      ))}
      <group ref={bread} position={[0, 0.55, 0.1]}>
        <Sph rad={0.18} sc={[1.6, 0.7, 0.9]} c="#d99a4e" />
        <Box p={[0, 0.1, 0]} r={[0, 0, 0.3]} s={[0.04, 0.02, 0.18]} c="#b8743a" />
        <Box p={[0.12, 0.09, 0]} r={[0, 0, 0.3]} s={[0.04, 0.02, 0.18]} c="#b8743a" />
      </group>
      {[0, 1, 2].map((i) => (
        <Sph key={i} ref={(m) => void (puffs.current[i] = m)} rad={1} c="#f7f4ee" />
      ))}
    </group>
  );
}

/* ---------- decor ---------- */
function CafeTable({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <Cyl p={[0, 0.78, 0]} rt={0.65} h={0.06} seg={24} c="#f7f4ee" />
      <Cyl p={[0, 0.4, 0]} rt={0.05} h={0.75} c="#3d2140" />
      <Cyl p={[0, 0.02, 0]} rt={0.3} h={0.04} c="#3d2140" />
      {[0, Math.PI].map((a) => (
        <group key={a} rotation={[0, a + 0.5, 0]}>
          <Box p={[0.95, 0.45, 0]} s={[0.45, 0.06, 0.45]} c="#2f8f5b" />
          <Box p={[1.15, 0.75, 0]} s={[0.06, 0.6, 0.45]} c="#2f8f5b" />
          <Box p={[0.95, 0.22, 0]} s={[0.05, 0.45, 0.05]} c="#3d2140" />
        </group>
      ))}
    </group>
  );
}

function Decor() {
  return (
    <group>
      {/* bar counter */}
      <Box p={[-1.9, 0.55, -3.3]} s={[4.1, 1.1, 1.0]} c="#6b4a3a" />
      <Box p={[-1.9, 1.13, -3.3]} s={[4.25, 0.07, 1.1]} c="#e9d8b4" />
      {[-3.2, -2.2, -1.2].map((x) => (
        <group key={x} position={[x, 0, -2.45]}>
          <Cyl p={[0, 0.7, 0]} rt={0.2} h={0.08} c="#d64545" />
          <Cyl p={[0, 0.35, 0]} rt={0.03} h={0.7} c="#3d2140" />
        </group>
      ))}
      {/* shelf with jars behind the bar */}
      <Box p={[-1.9, 2.3, -3.88]} s={[3.2, 0.06, 0.3]} c="#8a5433" />
      {[-3.1, -2.6, -2.1, -1.6, -1.1, -0.6].map((x, i) => (
        <Cyl key={x} p={[x, 2.48, -3.88]} rt={0.09} h={0.3} c={["#e0a35a", "#5b3a26", "#f7f4ee", "#d64545"][i % 4]} />
      ))}
      {/* menu board on the left wall */}
      <Box p={[-3.95, 2.4, 1.4]} s={[0.06, 1.1, 1.5]} c="#2b3a2f" />
      {[0.25, 0.05, -0.15, -0.35].map((y, i) => (
        <Box key={y} p={[-3.91, 2.4 + y, 1.4 - 0.1 * (i % 2)]} s={[0.02, 0.05, 1.0 - 0.2 * (i % 2)]} c="#f4efe6" />
      ))}
      {/* awning stripe above the window */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Box key={i} p={[1.05 + i * 0.3, 3.2, -3.8]} r={[0.5, 0, 0]} s={[0.3, 0.05, 0.6]} c={i % 2 ? "#f7f4ee" : "#d64545"} />
      ))}
      <CafeTable p={[1.2, 0, 0.3]} />
      <CafeTable p={[2.4, 0, 2.6]} />
      {/* floor tiles */}
      {Array.from({ length: 16 }, (_, i) => (
        <Box key={i} p={[-3 + (i % 4) * 2, 0.005, -3 + Math.floor(i / 4) * 2]} s={[1, 0.01, 1]} c="#c4b08c" />
      ))}
      {Array.from({ length: 16 }, (_, i) => (
        <Box key={`b${i}`} p={[-2 + (i % 4) * 2, 0.005, -2 + Math.floor(i / 4) * 2]} s={[1, 0.01, 1]} c="#c4b08c" />
      ))}
    </group>
  );
}

export function Cafeteria() {
  return (
    <group>
      <RoomShell floor="#e9dcc0" wallLeft="#a9cdb0" wallBack="#bddcc2" trim="#5b3a26" />
      <Decor />
      <Slot id="espresso_machine_01" anim="anim_espresso_steam_loop" position={[-2.3, 1.165, -3.45]} markerY={1.5}>
        <EspressoMachine />
      </Slot>
      <Slot id="window_rain_01" anim="anim_rain_fall_loop" position={[1.8, 2.2, -3.97]} markerY={1.35}>
        <RainWindow />
      </Slot>
      <Slot id="dog_01" anim="anim_dog_sleep_loop" position={[-0.4, 0, 1.9]} rotation={[0, -0.4, 0]} markerY={0.9}>
        <Dog />
      </Slot>
      <Slot id="cups_table_01" anim="anim_cups_serve_once" position={[1.2, 0.81, 0.3]} markerY={0.75}>
        <CupsServe />
      </Slot>
      <Slot id="oven_01" anim="anim_oven_bread_once" position={[-3.55, 0, 0.1]} rotation={[0, HALF_PI, 0]} markerY={1.7}>
        <Oven />
      </Slot>
    </group>
  );
}

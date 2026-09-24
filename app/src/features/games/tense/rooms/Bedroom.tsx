"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { Box, Cyl, RoomShell, Sph } from "../objects/parts";
import { Globe, Phone, HALF_PI, clamp01 } from "../objects/common";
import { Slot, useSlot } from "../slot";
import { easeOutBounce, onceProgress, useGameTime } from "../time";


/* ---------- window_clouds_01 · imperfect loop: clouds drift across a grey sky ---------- */
function CloudWindow() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const clouds = useRef<(Group | null)[]>([]);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    clouds.current.forEach((c, i) => {
      if (!c) return;
      const u = (i / 3 + lt * 0.07) % 1; // 0..1 across the pane
      c.position.set(-0.6 + u * 1.2, 0.3 - i * 0.28, 0.08);
      c.scale.setScalar(Math.sin(u * Math.PI) * (on ? 1 : 0.8)); // shrink at edges = stays in frame
    });
  });
  return (
    <group>
      <Box s={[1.6, 1.4, 0.1]} c="#f7f4ee" />
      <Box p={[0, 0, 0.04]} s={[1.4, 1.2, 0.04]} c={on ? "#8fa3b8" : "#b7c4d1"} />
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(g) => void (clouds.current[i] = g)}>
          <Sph rad={0.13} sc={[1.3, 0.8, 0.4]} c="#e6ebf0" />
          <Sph p={[0.14, 0.05, 0]} rad={0.1} sc={[1, 0.9, 0.4]} c="#d7dde4" />
          <Sph p={[-0.14, -0.01, 0]} rad={0.09} sc={[1, 0.8, 0.4]} c="#d7dde4" />
        </group>
      ))}
      <Box p={[0, 0, 0.12]} s={[0.05, 1.2, 0.04]} c="#f7f4ee" />
      <Box p={[0, -0.72, 0.1]} s={[1.8, 0.07, 0.25]} c="#f7f4ee" />
      {/* curtains */}
      <Box p={[-0.85, 0.05, 0.14]} s={[0.25, 1.5, 0.06]} c="#b0508a" />
      <Box p={[0.85, 0.05, 0.14]} s={[0.25, 1.5, 0.06]} c="#b0508a" />
    </group>
  );
}

/* ---------- bookshelf_01 · preterite once: a book falls off the shelf ---------- */
const SHELF_BOOKS = ["#d64545", "#4f7fbf", "#ffd23f", "#2f8f5b", "#b0508a", "#e8883a"];

function Bookshelf() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const book = useRef<Group>(null);
  useFrame(() => {
    const p = on ? onceProgress(time.current.t, since.current, 1.2) : 0;
    const tip = clamp01(p / 0.3);
    const fall = clamp01((p - 0.3) / 0.5);
    const settle = clamp01((p - 0.8) / 0.2);
    const b = book.current;
    if (!b) return;
    // Tip forward out of the shelf, drop to the floor, land flat.
    b.position.set(0.5 + 0.1 * fall, 1.86 + 0.02 * tip - 1.8 * fall * fall + Math.sin(settle * Math.PI) * 0.05, 0.05 + 0.2 * tip + 0.75 * fall);
    b.rotation.set(0.5 * tip * (1 - fall), 0, HALF_PI * easeOutBounce(fall));
  });
  return (
    <group>
      <Box p={[0, 1.15, -0.2]} s={[1.5, 2.3, 0.05]} c="#5b3a26" />
      <Box p={[-0.72, 1.15, 0]} s={[0.07, 2.3, 0.45]} c="#8a5433" />
      <Box p={[0.72, 1.15, 0]} s={[0.07, 2.3, 0.45]} c="#8a5433" />
      {[0.05, 0.62, 1.2, 1.64, 2.28].map((y) => (
        <Box key={y} p={[0, y, 0]} s={[1.5, 0.06, 0.45]} c="#8a5433" />
      ))}
      {[0.1, 0.67, 1.25].map((y, row) =>
        Array.from({ length: 7 }, (_, i) => {
          const h = 0.34 + ((i * 7 + row * 3) % 5) * 0.03;
          return (
            <Box key={`${row}-${i}`} p={[-0.55 + i * 0.13, y + h / 2, 0.02]} s={[0.1, h, 0.3]} c={SHELF_BOOKS[(i + row * 2) % SHELF_BOOKS.length]} />
          );
        }),
      )}
      {[0, 1, 2, 3].map((i) => (
        <Box key={`top${i}`} p={[-0.55 + i * 0.13, 1.84, 0.02]} s={[0.1, 0.36, 0.3]} c={SHELF_BOOKS[(i + 3) % SHELF_BOOKS.length]} />
      ))}
      <group ref={book} position={[0.5, 1.86, 0.05]}>
        <Box s={[0.12, 0.4, 0.3]} c="#d64545" />
        <Box p={[0.062, 0, 0]} s={[0.005, 0.3, 0.2]} c="#ffd23f" />
      </group>
    </group>
  );
}

/* ---------- vase_01 · preterite once: flowers from the market appear ---------- */
const FLOWERS: { x: number; z: number; lean: number; c: string; h: number }[] = [
  { x: 0, z: 0, lean: 0, c: "#d64545", h: 0.55 },
  { x: -0.05, z: 0.03, lean: 0.3, c: "#ffd23f", h: 0.45 },
  { x: 0.05, z: -0.02, lean: -0.35, c: "#f7f4ee", h: 0.48 },
];

function Vase() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const stems = useRef<(Group | null)[]>([]);
  useFrame(() => {
    const p = on ? onceProgress(time.current.t, since.current, 1.4) : 0;
    stems.current.forEach((s, i) => {
      if (!s) return;
      const g = easeOutBounce(clamp01((p - i * 0.15) / 0.7));
      s.visible = g > 0.001;
      s.scale.setScalar(Math.max(0.001, g));
    });
  });
  return (
    <group>
      <Cyl p={[0, 0.18, 0]} rt={0.09} rb={0.14} h={0.36} c="#2f8f8b" />
      <Cyl p={[0, 0.37, 0]} rt={0.1} rb={0.08} h={0.04} c="#2f8f8b" />
      {FLOWERS.map((f, i) => (
        <group key={i} ref={(g) => void (stems.current[i] = g)} position={[f.x, 0.35, f.z]} rotation={[0, 0, f.lean]}>
          <Cyl p={[0, f.h / 2, 0]} rt={0.015} h={f.h} seg={6} c="#3f8f3f" />
          <Sph p={[0, f.h, 0]} rad={0.09} sc={[1, 0.7, 1]} c={f.c} />
          <Sph p={[0, f.h + 0.03, 0]} rad={0.04} c="#e8883a" />
        </group>
      ))}
    </group>
  );
}

/* ---------- decor ---------- */
function Decor() {
  return (
    <group>
      {/* bed along the left wall */}
      <group position={[-2.9, 0, 2.0]}>
        <Box p={[0, 0.25, 0]} s={[1.9, 0.3, 2.8]} c="#8a5433" />
        <Box p={[0, 0.5, 0]} s={[1.8, 0.2, 2.7]} c="#f7f4ee" />
        <Box p={[0, 0.63, 0.35]} s={[1.85, 0.08, 2.0]} c="#4f7fbf" />
        <Box p={[0, 0.66, -1.05]} s={[1.2, 0.18, 0.45]} c="#f2e3c6" />
        <Box p={[0, 0.8, -1.4]} s={[1.9, 1.2, 0.12]} c="#6b4a3a" />
      </group>
      {/* nightstand */}
      <Box p={[-3.45, 0.33, -0.1]} s={[0.7, 0.66, 0.6]} c="#8a5433" />
      <Box p={[-3.15, 0.45, -0.1]} s={[0.04, 0.2, 0.4]} c="#6b4a3a" />
      {/* desk + chair */}
      <Box p={[1.4, 0.8, -3.5]} s={[2.4, 0.08, 0.9]} c="#b57a4a" />
      {[
        [0.3, -3.1],
        [2.5, -3.1],
        [0.3, -3.85],
        [2.5, -3.85],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} p={[x, 0.38, z]} s={[0.08, 0.76, 0.08]} c="#8a5433" />
      ))}
      <Box p={[1.4, 0.45, -2.5]} s={[0.55, 0.08, 0.55]} c="#b0508a" />
      <Box p={[1.4, 0.2, -2.5]} s={[0.08, 0.4, 0.08]} c="#5b3a26" />
      <Box p={[1.4, 0.75, -2.25]} s={[0.55, 0.55, 0.06]} c="#b0508a" />
      {/* poster: world map */}
      <Box p={[1.4, 2.4, -3.97]} s={[1.4, 0.9, 0.04]} c="#f2e3c6" />
      <Box p={[1.1, 2.45, -3.94]} s={[0.4, 0.3, 0.02]} c="#5fae5a" />
      <Box p={[1.7, 2.3, -3.94]} s={[0.35, 0.4, 0.02]} c="#5fae5a" />
      {/* rug */}
      <Cyl p={[0.4, 0.01, 0.8]} rt={1.5} h={0.02} seg={32} c="#ffd23f" />
      <Cyl p={[0.4, 0.02, 0.8]} rt={1.2} h={0.02} seg={32} c="#b0508a" />
      {/* toy box */}
      <Box p={[2.8, 0.3, 2.5]} s={[1.0, 0.6, 0.7]} c="#e8883a" />
      <Sph p={[2.6, 0.72, 2.5]} rad={0.14} c="#d64545" />
    </group>
  );
}

export function Bedroom() {
  return (
    <group>
      <RoomShell floor="#9b7a62" wallLeft="#cdb4db" wallBack="#bda0cf" trim="#5b4370" />
      <Decor />
      <Slot id="globe_01" anim="anim_globe_spin_loop" position={[2.2, 0.84, -3.5]} markerY={1.35}>
        <Globe />
      </Slot>
      <Slot id="window_clouds_01" anim="anim_clouds_drift_loop" position={[-3.97, 2.4, -1.4]} rotation={[0, HALF_PI, 0]} markerY={1.0}>
        <CloudWindow />
      </Slot>
      <Slot id="phone_01" anim="anim_phone_ring_loop" position={[-3.45, 0.66, -0.1]} rotation={[0, HALF_PI, 0]} markerY={0.75}>
        <Phone />
      </Slot>
      <Slot id="bookshelf_01" anim="anim_book_fall_once" position={[-1.6, 0, -3.72]} markerY={2.7}>
        <Bookshelf />
      </Slot>
      <Slot id="vase_01" anim="anim_flowers_bloom_once" position={[0.8, 0.84, -3.55]} markerY={0.8}>
        <Vase />
      </Slot>
    </group>
  );
}

"use client";

/**
 * Objects shared across rooms. Each implements one anim_trigger (see the
 * `anim` prop on its <Slot>), so content can reuse them in any room.
 */
import { useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import type { Group, Mesh, MeshToonMaterial, PointLight } from "three";
import { useSlot } from "../slot";
import { easeOutBounce, easeOutCubic, onceProgress, useGameTime } from "../time";
import { Toon } from "../toon";
import { Box, Cyl, Note, Sph } from "./parts";

export const HALF_PI = Math.PI / 2;
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Deterministic pseudo-random, so layouts are stable across renders. */
export const rand = (i: number) => {
  const x = Math.sin(i * 91.7 + 13.1) * 43758.5453;
  return x - Math.floor(x);
};

/* ---------- radio_vintage_01 · imperfect loop: music plays ---------- */
export function Radio() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const body = useRef<Group>(null);
  const notes = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    if (body.current) body.current.scale.y = on ? 1 + Math.abs(Math.sin(lt * 7)) * 0.05 : 1;
    notes.current.forEach((n, i) => {
      if (!n) return;
      n.visible = on;
      const f = (lt * 0.45 + i / 3) % 1;
      n.position.set(-0.2 + Math.sin(f * 6 + i) * 0.25, 0.6 + f * 1.1, 0.1);
      n.scale.setScalar(Math.sin(f * Math.PI));
    });
  });
  return (
    <group>
      <group ref={body}>
        <Box p={[0, 0.27, 0]} s={[0.85, 0.54, 0.36]} c="#2f8f8b" />
        <Box p={[0, 0.56, 0]} s={[0.7, 0.06, 0.3]} c="#f2e3c6" />
        <Cyl p={[-0.18, 0.27, 0.18]} r={[HALF_PI, 0, 0]} rt={0.15} h={0.03} c="#e9d8b4" />
        <Cyl p={[0.24, 0.33, 0.18]} r={[HALF_PI, 0, 0]} rt={0.07} h={0.04} c={on ? "#ffd23f" : "#b5a98f"} emissive="#ffb100" glow={on ? 0.8 : 0} />
        <Cyl p={[0.24, 0.14, 0.18]} r={[HALF_PI, 0, 0]} rt={0.045} h={0.04} c="#6a3b2a" />
      </group>
      <Box p={[0.25, 0.85, -0.08]} r={[0, 0, -0.45]} s={[0.025, 0.6, 0.025]} c="#3d2140" />
      {[0, 1, 2].map((i) => (
        <Note key={i} ref={(m) => void (notes.current[i] = m)} c={i === 1 ? "#d64545" : "#3d2140"} />
      ))}
    </group>
  );
}

/* ---------- clock_wall_01 · imperfect loop: pendulum swings ---------- */
export function WallClock() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const pendulum = useRef<Group>(null);
  const hand = useRef<Mesh>(null);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    if (pendulum.current) pendulum.current.rotation.z = on ? Math.sin(lt * 3.2) * 0.32 : 0;
    if (hand.current) hand.current.rotation.z = -lt * 0.6;
  });
  return (
    <group>
      <Box p={[0, 0, 0]} s={[0.62, 1.4, 0.16]} c="#8a5433" />
      <Box p={[0, 0.72, 0]} s={[0.72, 0.1, 0.2]} c="#6a3b2a" />
      <Cyl p={[0, 0.34, 0.09]} r={[HALF_PI, 0, 0]} rt={0.24} h={0.03} c="#f7ecd2" />
      <Box ref={hand} p={[0, 0.34, 0.12]} s={[0.03, 0.2, 0.02]} c="#3d2140" />
      <Box p={[0.05, 0.34, 0.12]} r={[0, 0, -1.2]} s={[0.03, 0.12, 0.02]} c="#3d2140" />
      <Box p={[0, -0.3, 0.07]} s={[0.44, 0.66, 0.04]} c="#3a2418" />
      <group ref={pendulum} position={[0, 0.02, 0.11]}>
        <Box p={[0, -0.25, 0]} s={[0.025, 0.5, 0.02]} c="#c9a227" />
        <Cyl p={[0, -0.55, 0]} r={[HALF_PI, 0, 0]} rt={0.08} h={0.03} c="#e0b83a" />
      </group>
    </group>
  );
}

/* ---------- lamp_kitchen_01 · imperfect loop: warm light glows ---------- */
export function PendantLamp() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const sway = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    if (sway.current) sway.current.rotation.z = on ? Math.sin(lt * 1.3) * 0.06 : 0;
    if (light.current) light.current.intensity = on ? 9 + Math.sin(lt * 9) * 0.6 + Math.sin(lt * 23) * 0.4 : 0;
  });
  return (
    <group ref={sway}>
      <Box p={[0, 1.2, 0]} s={[0.03, 1.8, 0.03]} c="#3d2140" />
      <Cyl p={[0, 0.2, 0]} rt={0.14} rb={0.46} h={0.42} c="#3f8f5f" />
      <Sph p={[0, -0.02, 0]} rad={0.12} c={on ? "#fff3b0" : "#8d8a78"} emissive="#ffd86b" glow={on ? 1.2 : 0} />
      <pointLight ref={light} position={[0, -0.35, 0]} color="#ffcf7a" distance={6} decay={1.4} intensity={0} />
    </group>
  );
}

/* ---------- windows · imperfect loops: weather behind the glass ---------- */
function WindowFrame({ sky, children }: { sky: string; children?: ReactNode }) {
  return (
    <group>
      <Box s={[1.8, 1.5, 0.1]} c="#f4efe6" />
      <Box p={[0, 0, 0.04]} s={[1.6, 1.3, 0.04]} c={sky} />
      {children}
      <Box p={[0, 0, 0.1]} s={[0.05, 1.3, 0.04]} c="#f4efe6" />
      <Box p={[0, 0.05, 0.1]} s={[1.6, 0.05, 0.04]} c="#f4efe6" />
      <Box p={[0, -0.8, 0.12]} s={[2.0, 0.08, 0.3]} c="#f4efe6" />
    </group>
  );
}

const DROPS = Array.from({ length: 26 }, (_, i) => ({ x: rand(i) * 1.5 - 0.75, o: rand(i + 50), v: 0.6 + rand(i + 99) * 0.6 }));

/** window_snow_01 · anim_snow_fall_loop */
export function SnowWindow() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const flakes = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    flakes.current.forEach((f, i) => {
      if (!f) return;
      f.visible = on;
      const { x, o, v } = DROPS[i];
      const fall = (o + lt * 0.18 * v) % 1;
      f.position.set(x + Math.sin(lt * 1.5 + i) * 0.05, 0.6 - fall * 1.2, 0.07);
    });
  });
  return (
    <WindowFrame sky="#233b5e">
      <Box p={[0, -0.6, 0.06]} s={[1.6, 0.1, 0.04]} c={on ? "#ffffff" : "#233b5e"} />
      {DROPS.map((_, i) => (
        <Sph key={i} ref={(m) => void (flakes.current[i] = m)} rad={0.035} c="#ffffff" />
      ))}
    </WindowFrame>
  );
}

/** window_rain_01 · anim_rain_fall_loop; with `storm`, lightning flashes the sky. */
export function RainWindow({ storm = false }: { storm?: boolean }) {
  const { on, since } = useSlot();
  const time = useGameTime();
  const drops = useRef<(Mesh | null)[]>([]);
  const sky = useRef<Mesh>(null);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    drops.current.forEach((d, i) => {
      if (!d) return;
      d.visible = on;
      const { x, o, v } = DROPS[i];
      const fall = (o + lt * 0.9 * v) % 1;
      d.position.set(x - fall * 0.1, 0.55 - fall * 1.1, 0.07);
    });
    const m = sky.current?.material as MeshToonMaterial | undefined;
    if (m) m.emissiveIntensity = storm && on && lt % 3.2 < 0.12 ? 1.2 : 0;
  });
  return (
    <WindowFrame sky={storm ? "#1f2a38" : "#6f8196"}>
      <Box ref={sky} p={[0, 0, 0.045]} s={[1.58, 1.28, 0.03]} c={storm ? "#1f2a38" : "#6f8196"} emissive="#e8ecff" glow={0} />
      {DROPS.map((_, i) => (
        <Box key={i} ref={(m) => void (drops.current[i] = m)} r={[0, 0, 0.12]} s={[0.018, 0.16, 0.02]} c="#dfe8f2" />
      ))}
    </WindowFrame>
  );
}

/** window_sea_01 · anim_sea_waves_loop: waves roll, a little boat bobs. */
export function SeaWindow() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const waves = useRef<(Mesh | null)[]>([]);
  const boat = useRef<Group>(null);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    waves.current.forEach((w, i) => {
      if (w) w.position.set(-0.6 + ((i * 0.3 + lt * 0.15) % 1.2), -0.25 - (i % 3) * 0.15 + Math.sin(lt * 2 + i) * 0.02, 0.07);
    });
    if (boat.current) {
      boat.current.position.y = -0.12 + Math.sin(lt * 1.8) * 0.03;
      boat.current.rotation.z = Math.sin(lt * 1.4) * 0.12;
    }
  });
  return (
    <WindowFrame sky="#9fd3e8">
      <Box p={[0, -0.35, 0.05]} s={[1.6, 0.6, 0.03]} c="#2f7fb0" />
      <Sph p={[0.45, 0.35, 0.06]} rad={0.13} c="#ffd23f" emissive="#ffb100" glow={0.3} />
      {Array.from({ length: 8 }, (_, i) => (
        <Box key={i} ref={(m) => void (waves.current[i] = m)} s={[0.18, 0.025, 0.02]} c="#e8f4fa" />
      ))}
      <group ref={boat} position={[-0.3, -0.12, 0.08]}>
        <Box s={[0.3, 0.07, 0.03]} c="#b8433a" />
        <Box p={[0, 0.14, 0]} s={[0.02, 0.22, 0.02]} c="#3d2140" />
        <Box p={[0.06, 0.15, 0]} r={[0, 0, -0.2]} s={[0.1, 0.16, 0.01]} c="#ffffff" />
      </group>
    </WindowFrame>
  );
}

/* ---------- photo_frame_01 · imperfect loop: the old photo glows back to colour ---------- */
export function PhotoFrame() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const frame = useRef<Group>(null);
  const photo = useRef<Mesh>(null);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    if (frame.current) frame.current.rotation.z = on ? Math.sin(lt * 1.1) * 0.04 : 0;
    const m = photo.current?.material as MeshToonMaterial | undefined;
    if (m) m.emissiveIntensity = on ? 0.15 + (Math.sin(lt * 2) + 1) * 0.12 : 0;
  });
  const skin = on ? "#e7b48a" : "#a7a19a";
  return (
    <group ref={frame}>
      <Box s={[1.0, 0.8, 0.06]} c="#c9a227" />
      <Box ref={photo} p={[0, 0, 0.035]} s={[0.84, 0.64, 0.02]} c={on ? "#e6c797" : "#b9b3a9"} emissive="#ffcf7a" glow={0} />
      <Sph p={[-0.16, 0.08, 0.06]} rad={0.08} c={skin} />
      <Box p={[-0.16, -0.14, 0.055]} s={[0.2, 0.26, 0.02]} c={on ? "#4f7fbf" : "#77736d"} />
      <Sph p={[0.16, 0.1, 0.06]} rad={0.08} c={skin} />
      <Box p={[0.16, -0.14, 0.055]} s={[0.22, 0.28, 0.02]} c={on ? "#d64545" : "#8a857e"} />
      <Box p={[0, 0.5, -0.02]} r={[0, 0, 0.9]} s={[0.02, 0.3, 0.02]} c="#3d2140" />
    </group>
  );
}

/* ---------- door_01 · preterite once: the door opens (someone arrives) or closes for good ---------- */
type DoorItem = "gift" | "backpack" | null;

/**
 * anim_door_open_once: opens; `item` then drops in front of the door.
 * With `closing`, starts open and anim_door_close_once shuts it.
 */
export function Door({ item = "gift", closing = false }: { item?: DoorItem; closing?: boolean }) {
  const { on, since } = useSlot();
  const time = useGameTime();
  const leaf = useRef<Group>(null);
  const drop = useRef<Group>(null);
  useFrame(() => {
    const p = on ? onceProgress(time.current.t, since.current, 1.6) : 0;
    const k = easeOutCubic(clamp01(p / 0.5));
    if (leaf.current) leaf.current.rotation.y = -(closing ? 1 - (p === 1 ? 1 : easeOutBounce(clamp01(p / 0.6))) : k) * 1.75;
    const g = drop.current;
    if (g) {
      const d = clamp01((p - 0.4) / 0.6);
      g.visible = d > 0;
      g.position.set(0.2, 1.2 * (1 - easeOutBounce(d)), 1.0);
      g.rotation.y = 0.4 * d;
    }
  });
  return (
    <group>
      <Box p={[0, 1.3, 0]} s={[1.4, 2.6, 0.1]} c="#6b4a3a" />
      <Box p={[0, 1.2, 0.04]} s={[1.15, 2.35, 0.04]} c="#1c2c46" />
      <Sph p={[0.2, 2.0, 0.06]} rad={0.05} c="#ffffff" />
      <Sph p={[-0.25, 1.6, 0.06]} rad={0.04} c="#ffffff" />
      <group ref={leaf} position={[-0.56, 0, 0.1]} rotation={[0, closing ? -1.75 : 0, 0]}>
        <Box p={[0.56, 1.18, 0]} s={[1.12, 2.34, 0.08]} c="#b8433a" />
        <Box p={[0.56, 1.7, 0.05]} s={[0.8, 0.8, 0.02]} c="#9c342d" />
        <Box p={[0.56, 0.6, 0.05]} s={[0.8, 0.8, 0.02]} c="#9c342d" />
        <Sph p={[0.98, 1.15, 0.07]} rad={0.05} c="#e0b83a" />
      </group>
      {!closing && item === "gift" && (
        <group ref={drop}>
          <Box p={[0, 0.22, 0]} s={[0.55, 0.44, 0.55]} c="#2f8f5b" />
          <Box p={[0, 0.22, 0]} s={[0.1, 0.46, 0.57]} c="#ffd23f" />
          <Box p={[0, 0.22, 0]} s={[0.57, 0.46, 0.1]} c="#ffd23f" />
          <Sph p={[0, 0.5, 0]} rad={0.09} sc={[1.4, 0.8, 0.8]} c="#ffd23f" />
        </group>
      )}
      {!closing && item === "backpack" && (
        <group ref={drop}>
          <Box p={[0, 0.25, 0]} s={[0.45, 0.5, 0.25]} c="#4f7fbf" />
          <Box p={[0, 0.18, 0.14]} s={[0.32, 0.22, 0.06]} c="#3b6aa8" />
          <Box p={[0, 0.52, -0.02]} r={[HALF_PI, 0, 0]} s={[0.2, 0.04, 0.12]} c="#3d2140" />
        </group>
      )}
    </group>
  );
}

/* ---------- globe_01 · imperfect loop: the globe keeps spinning (childhood dreams) ---------- */
const LAND: [number, number, number][] = [
  [0.4, 0.3, 0.1],
  [-0.2, 0.5, 0.3],
  [2.2, -0.2, 0.2],
  [3.4, 0.1, 0.13],
  [4.8, -0.4, 0.16],
  [1.2, -0.6, 0.1],
];

export function Globe() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const ball = useRef<Group>(null);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    if (ball.current) ball.current.rotation.y = lt * 1.4;
  });
  return (
    <group>
      <Cyl p={[0, 0.03, 0]} rt={0.18} rb={0.22} h={0.06} c="#6b4a3a" />
      <Cyl p={[0, 0.2, 0]} rt={0.025} h={0.32} c="#c9a227" />
      <group position={[0, 0.62, 0]} rotation={[0, 0, 0.4]}>
        <group ref={ball}>
          <Sph rad={0.32} c="#3b8ec4" />
          {LAND.map(([lon, lat, size], i) => (
            <Sph
              key={i}
              p={[0.3 * Math.cos(lat) * Math.cos(lon), 0.3 * Math.sin(lat), 0.3 * Math.cos(lat) * Math.sin(lon)]}
              rad={size * 0.55}
              sc={[1, 0.6, 1]}
              c="#5fae5a"
            />
          ))}
        </group>
        <mesh rotation={[0, HALF_PI, 0]}>
          <torusGeometry args={[0.38, 0.018, 8, 32, Math.PI]} />
          <Toon color="#c9a227" />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- phone_01 · imperfect loop: the phone is ringing ---------- */
export function Phone() {
  const { on, since } = useSlot();
  const time = useGameTime();
  const handset = useRef<Group>(null);
  const rings = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    const s = since.current;
    const lt = on && s !== null ? time.current.t - s : 0;
    const ringing = on && lt % 1.6 < 0.9;
    const h = handset.current;
    if (h) {
      h.position.y = 0.2 + (ringing ? Math.abs(Math.sin(lt * 40)) * 0.04 : 0);
      h.rotation.z = ringing ? Math.sin(lt * 55) * 0.1 : 0;
    }
    rings.current.forEach((r, i) => {
      if (!r) return;
      const f = ((lt % 1.6) / 0.9 + i * 0.5) % 1;
      r.visible = ringing;
      r.scale.setScalar(0.4 + f * 1.4);
      (r.material as MeshToonMaterial).opacity = 1 - f;
    });
  });
  return (
    <group>
      <Box p={[0, 0.08, 0]} s={[0.45, 0.16, 0.36]} c="#d64545" />
      <Cyl p={[0, 0.165, 0.08]} rt={0.1} h={0.02} c="#f7f4ee" />
      <group ref={handset} position={[0, 0.2, -0.06]}>
        <Box s={[0.5, 0.06, 0.1]} c="#b8322f" />
        <Box p={[-0.22, -0.04, 0]} s={[0.1, 0.08, 0.13]} c="#b8322f" />
        <Box p={[0.22, -0.04, 0]} s={[0.1, 0.08, 0.13]} c="#b8322f" />
      </group>
      {[0, 1].map((i) => (
        <mesh key={i} ref={(m) => void (rings.current[i] = m)} position={[0, 0.3, 0]} rotation={[HALF_PI, 0, 0]}>
          <torusGeometry args={[0.35, 0.015, 6, 32]} />
          <Toon color="#ffd23f" transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
}


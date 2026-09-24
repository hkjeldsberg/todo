"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { ExtrudeGeometry, Shape, type Group, type Sprite } from "three";
import type { MapBuilding, V3 } from "./layouts";
import { facade, fabric, puff } from "./paper";
import { Ball, Blob, Block, Cyl, damp, paperMat, Soft } from "./prims";

// ─────────────────────────────────────────────────────────────── cat

export type CatMode = "hidden" | "under" | "roam";

/**
 * Paper cat. Hidden until found under the sofa, then it sits there (for the label task),
 * then roams between hiding spots with a flicking tail.
 */
export function Cat({ mode, under, spots }: { mode: CatMode; under: V3; spots: V3[] }) {
  const root = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const head = useRef<Group>(null);
  const st = useRef({ i: 0, wait: 2, pos: [...under] as V3, yaw: Math.PI / 2 });

  useFrame(({ clock }, dt) => {
    const g = root.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const s = st.current;
    g.visible = mode !== "hidden";
    let walking = false;
    if (mode === "roam") {
      const target = spots[s.i];
      const dx = target[0] - s.pos[0];
      const dz = target[2] - s.pos[2];
      const d = Math.hypot(dx, dz);
      if (d > 0.05) {
        walking = true;
        const step = Math.min(d, dt * 0.9);
        s.pos[0] += (dx / d) * step;
        s.pos[2] += (dz / d) * step;
        const want = Math.atan2(dx, dz);
        let diff = want - s.yaw;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        s.yaw += diff * Math.min(1, dt * 6);
      } else {
        s.wait -= dt;
        if (s.wait <= 0) {
          s.i = (s.i + 1) % spots.length;
          s.wait = 2.5 + (s.i % 3);
        }
      }
    } else {
      s.pos = [...under];
      s.yaw = Math.PI / 2;
    }
    g.position.set(s.pos[0], s.pos[1] + (walking ? Math.abs(Math.sin(t * 9)) * 0.03 : 0), s.pos[2]);
    g.rotation.y = s.yaw;
    if (tail.current) tail.current.rotation.x = -0.6 + Math.sin(t * (walking ? 6 : 2.2)) * (walking ? 0.25 : 0.4);
    if (tail.current) tail.current.rotation.z = Math.sin(t * 3.1) * 0.35;
    if (head.current) head.current.rotation.y = walking ? 0 : Math.sin(t * 0.7) * 0.5;
  });

  const fur = "#e39a52";
  return (
    <group ref={root}>
      <Blob position={[0, 0.01, 0]} size={[0.6, 0.9]} opacity={0.7} />
      <Soft size={[0.32, 0.26, 0.6]} radius={0.12} color={fur} map={fabric(fur, "rgba(255,255,255,0.18)")} position={[0, 0.2, 0]} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} r={0.04} h={0.12} color={fur} position={[sx * 0.1, 0.06, sz * 0.2]} cast={false} />),
      )}
      <group ref={head} position={[0, 0.36, 0.3]}>
        <Ball r={0.15} color={fur} />
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * 0.08, 0.13, 0]} rotation={[0, 0, -sx * 0.3]} castShadow material={paperMat(fur)}>
            <coneGeometry args={[0.05, 0.12, 4]} />
          </mesh>
        ))}
        {[-1, 1].map((sx) => (
          <Ball key={sx} r={0.022} color="#3d2140" position={[sx * 0.06, 0.03, 0.13]} cast={false} />
        ))}
        <Ball r={0.02} color="#e46d8e" position={[0, -0.02, 0.15]} cast={false} />
      </group>
      <group ref={tail} position={[0, 0.25, -0.3]}>
        <Cyl r={0.035} top={0.025} h={0.45} color="#d98a44" position={[0, 0.22, 0]} />
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────── plaza

/** Stone fountain with a bobbing water sheet and spray puffs. */
export function Fountain() {
  const water = useRef<Group>(null);
  const spray = useRef<(Sprite | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (water.current) water.current.position.y = 0.42 + Math.sin(t * 2) * 0.012;
    spray.current.forEach((p, i) => {
      if (!p) return;
      const k = (t * 0.8 + i / 4) % 1;
      const a = (i / 4) * Math.PI * 2 + t * 0.2;
      p.position.set(Math.cos(a) * k * 0.35, 1.25 + Math.sin(k * Math.PI) * 0.35 - k * 0.5, Math.sin(a) * k * 0.35);
      p.scale.setScalar(0.12 + k * 0.1);
      p.material.opacity = (1 - k) * 0.8;
    });
  });
  return (
    <group>
      <Blob position={[0, 0.012, 0]} size={[2.4, 2.4]} />
      <Cyl r={0.95} h={0.5} color="#d9d0c2" position={[0, 0.25, 0]} seg={24} />
      <Cyl r={0.82} h={0.02} color="#9fcfe0" position={[0, 0.51, 0]} seg={24} cast={false} />
      <group ref={water}>
        <Cyl r={0.8} h={0.02} color="#bfe3ee" position={[0, 0.1, 0]} seg={24} cast={false} />
      </group>
      <Cyl r={0.12} h={0.8} color="#d9d0c2" position={[0, 0.8, 0]} />
      <Cyl r={0.35} top={0.1} h={0.16} color="#e6ddcf" position={[0, 1.2, 0]} />
      {[0, 1, 2, 3].map((i) => (
        <sprite
          key={i}
          ref={(el) => {
            spray.current[i] = el;
          }}
        >
          <spriteMaterial map={puff()} color="#dff3fa" transparent depthWrite={false} opacity={0} />
        </sprite>
      ))}
    </group>
  );
}

/** Folded-paper newspaper kiosk. */
export function Kiosk() {
  return (
    <group>
      <Blob position={[0, 0.012, 0]} size={[1.6, 1.6]} />
      <Block size={[0.95, 1.2, 0.95]} color="#5f9e8f" position={[0, 0.6, 0]} />
      <Block size={[0.7, 0.45, 0.02]} color="#fbf6ea" position={[0, 0.75, 0.49]} cast={false} />
      <mesh position={[0, 1.42, 0]} castShadow material={paperMat("#e46d5a")}>
        <coneGeometry args={[0.85, 0.45, 4]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <Block key={i} size={[0.2, 0.26, 0.02]} color={["#f0e6d0", "#f7d9a8", "#dfe9ef"][i]} position={[-0.22 + i * 0.22, 0.75, 0.51]} cast={false} />
      ))}
    </group>
  );
}

/** Red bicycle made of paper strips and discs. */
export function Bike() {
  const frame = "#d9534f";
  return (
    <group>
      <Blob position={[0, 0.012, 0]} size={[0.7, 1.4]} opacity={0.6} />
      {[-0.42, 0.42].map((z) => (
        <mesh key={z} position={[0, 0.3, z]} rotation={[0, Math.PI / 2, 0]} castShadow material={paperMat("#3d2140")}>
          <torusGeometry args={[0.26, 0.035, 8, 24]} />
        </mesh>
      ))}
      <Block size={[0.05, 0.05, 0.8]} color={frame} position={[0, 0.5, 0]} rotation={[0.3, 0, 0]} />
      <Block size={[0.05, 0.45, 0.05]} color={frame} position={[0, 0.5, -0.2]} rotation={[0.3, 0, 0]} />
      <Block size={[0.05, 0.45, 0.05]} color={frame} position={[0, 0.5, 0.36]} rotation={[-0.2, 0, 0]} />
      <Block size={[0.12, 0.05, 0.22]} color="#3d2140" position={[0, 0.72, -0.24]} />
      <Block size={[0.4, 0.04, 0.04]} color="#3d2140" position={[0, 0.75, 0.42]} />
      <Block size={[0.3, 0.12, 0.25]} color="#c9a36b" position={[0, 0.62, 0.5]} />
    </group>
  );
}

/** Café chair (for the terrace task). */
export function CafeChair() {
  const c = "#3f6f8a";
  return (
    <group>
      <Blob position={[0, 0.012, 0]} size={[0.9, 0.9]} opacity={0.7} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} r={0.03} h={0.45} color={c} position={[sx * 0.2, 0.225, sz * 0.2]} />),
      )}
      <Cyl r={0.28} h={0.06} color="#f2e6d0" position={[0, 0.48, 0]} />
      <Block size={[0.5, 0.35, 0.05]} color={c} position={[0, 0.72, -0.24]} />
    </group>
  );
}

/** Round café table with a striped parasol and two cups. */
export function CafeTable({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Blob position={[0, 0.012, 0]} size={[1.4, 1.4]} />
      <Cyl r={0.05} h={0.75} color="#6a5a4a" position={[0, 0.375, 0]} />
      <Cyl r={0.5} h={0.06} color="#f7f1e3" position={[0, 0.77, 0]} />
      <Cyl r={0.03} h={1.9} color="#6a5a4a" position={[0, 1.3, 0]} cast={false} />
      <mesh position={[0, 2.2, 0]} castShadow material={paperMat("#ffffff", { map: fabric("#f28b82", "rgba(255,255,255,0.4)"), double: true })}>
        <coneGeometry args={[1.25, 0.45, 8, 1, true]} />
      </mesh>
      <Cyl r={0.07} h={0.1} color="#ffffff" position={[0.2, 0.85, 0.1]} />
      <Cyl r={0.07} h={0.1} color="#ffffff" position={[-0.2, 0.85, -0.12]} />
    </group>
  );
}

export function Bench({ position, rot = 0 }: { position: V3; rot?: number }) {
  return (
    <group position={position} rotation={[0, rot, 0]}>
      <Blob position={[0, 0.012, 0]} size={[2.0, 1.0]} opacity={0.7} />
      {[-0.7, 0.7].map((x) => (
        <Block key={x} size={[0.08, 0.45, 0.45]} color="#4d4a55" position={[x, 0.225, 0]} />
      ))}
      <Block size={[1.7, 0.07, 0.45]} color="#c79a66" position={[0, 0.48, 0]} />
      <Block size={[1.7, 0.3, 0.06]} color="#c79a66" position={[0, 0.75, -0.2]} />
    </group>
  );
}

/** Lollipop tree: trunk + stacked paper discs, gently swaying. */
export function Tree({ position, scale = 1, color = "#86b86b" }: { position: V3; scale?: number; color?: string }) {
  const top = useRef<Group>(null);
  const ph = position[0] * 1.3 + position[2];
  useFrame(({ clock }) => {
    if (top.current) top.current.rotation.z = Math.sin(clock.elapsedTime * 0.9 + ph) * 0.04;
  });
  return (
    <group position={position} scale={scale}>
      <Blob position={[0, 0.012, 0]} size={[1.3, 1.3]} />
      <Cyl r={0.08} top={0.06} h={1.0} color="#8a6a4a" position={[0, 0.5, 0]} />
      <group ref={top} position={[0, 1.0, 0]}>
        <mesh position={[0, 0.45, 0]} castShadow material={paperMat(color)}>
          <icosahedronGeometry args={[0.55, 0]} />
        </mesh>
        <mesh position={[0.2, 0.8, 0.1]} castShadow material={paperMat("#9ccc7e")}>
          <icosahedronGeometry args={[0.35, 0]} />
        </mesh>
      </group>
    </group>
  );
}

export function LampPost({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Cyl r={0.05} h={2.2} color="#3d2140" position={[0, 1.1, 0]} />
      <mesh position={[0, 2.3, 0]} material={paperMat("#fff1c9", { emissive: "#ffd98a" })}>
        <sphereGeometry args={[0.16, 12, 10]} />
      </mesh>
    </group>
  );
}

/** Pigeons pecking and walking in little loops. */
export function Pigeons({ center, count = 5 }: { center: V3; count?: number }) {
  const birds = useRef<(Group | null)[]>([]);
  const heads = useRef<(Group | null)[]>([]);
  const spec = useMemo(() => Array.from({ length: count }, (_, i) => ({ r: 0.6 + (i % 3) * 0.45, speed: 0.12 + (i % 4) * 0.05, off: i * 1.9 })), [count]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    spec.forEach((sp, i) => {
      const b = birds.current[i];
      if (!b) return;
      const a = sp.off + t * sp.speed;
      b.position.set(center[0] + Math.cos(a) * sp.r, center[1], center[2] + Math.sin(a) * sp.r);
      b.rotation.y = -a;
      const h = heads.current[i];
      if (h) h.rotation.x = Math.max(0, Math.sin(t * 5 + sp.off)) * 0.7;
    });
  });
  return (
    <group>
      {spec.map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            birds.current[i] = el;
          }}
        >
          <Soft size={[0.16, 0.16, 0.28]} radius={0.07} color="#9aa0ac" position={[0, 0.12, 0]} />
          <group
            position={[0, 0.2, 0.13]}
            ref={(el) => {
              heads.current[i] = el;
            }}
          >
            <Ball r={0.065} color="#7d8391" position={[0, 0.03, 0.04]} />
            <Ball r={0.02} color="#e4b04a" position={[0, 0.02, 0.1]} cast={false} />
          </group>
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────── plaza buildings

/** A folded-paper building for the plaza (bank, bakery): facade texture + awning. */
export function PlazaBuilding({ position, size, color, sign, awning }: { position: V3; size: V3; color: string; sign: string; awning?: string }) {
  const [w, h, d] = size;
  const front = paperMat("#ffffff", { map: facade(color, sign, 2), key: `pf:${color}:${sign}` });
  const side = paperMat(color);
  return (
    <group position={position}>
      <Blob position={[0, 0.012, 0]} size={[w + 1, d + 1]} />
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow material={[side, side, paperMat("#e8dccb"), side, front, side]}>
        <boxGeometry args={size} />
      </mesh>
      <Block size={[w + 0.12, 0.14, d + 0.12]} color="#f4ecdd" position={[0, h + 0.07, 0]} />
      {awning && (
        <mesh position={[0, h * 0.42, d / 2 + 0.28]} rotation={[0.5, 0, 0]} castShadow material={paperMat("#ffffff", { map: fabric(awning, "rgba(255,255,255,0.45)"), double: true })}>
          <planeGeometry args={[w * 0.8, 0.65]} />
        </mesh>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────── map

/** Folded-card gable roof: a triangular prism, ridge along local z (yaw it for x). */
export function GableRoof({ span, length, height, color, position, yaw = 0 }: { span: number; length: number; height: number; color: string; position: V3; yaw?: number }) {
  const geo = useMemo(() => {
    const sh = new Shape();
    sh.moveTo(-span / 2 - 0.07, 0);
    sh.lineTo(span / 2 + 0.07, 0);
    sh.lineTo(0, height);
    sh.closePath();
    const g = new ExtrudeGeometry(sh, { depth: length + 0.12, bevelEnabled: false });
    g.translate(0, 0, -(length + 0.12) / 2);
    return g;
  }, [span, length, height]);
  return <mesh geometry={geo} position={position} rotation={[0, yaw, 0]} castShadow receiveShadow material={paperMat(color)} />;
}

/** Folded-paper building block on the map. */
export function MapBlock({ b }: { b: MapBuilding }) {
  const [w, h, d] = b.size;
  const front = paperMat("#ffffff", { map: facade(b.color, b.sign ?? "", 2), key: `mf:${b.color}:${b.sign ?? ""}` });
  const side = paperMat(b.color);
  return (
    <group position={b.pos}>
      <Blob position={[0, 0.012, 0]} size={[w + 0.8, d + 0.8]} />
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow material={[front, front, paperMat("#efe6d6"), side, front, front]}>
        <boxGeometry args={b.size} />
      </mesh>
      {b.roof === "gable" &&
        (w >= d ? <GableRoof span={d} length={w} height={0.55} color="#d9776b" position={[0, h, 0]} yaw={Math.PI / 2} /> : <GableRoof span={w} length={d} height={0.55} color="#d9776b" position={[0, h, 0]} />)}
      {b.sign === "+" && (
        <group position={[0, h + 0.3, 0]}>
          <Block size={[0.5, 0.14, 0.14]} color="#3aa66b" />
          <Block size={[0.14, 0.5, 0.14]} color="#3aa66b" />
        </group>
      )}
    </group>
  );
}

/** The house with its front door facing the main street (+z). */
export function House({ position, size }: { position: V3; size: V3 }) {
  const [w, h, d] = size;
  return (
    <group position={position}>
      <Blob position={[0, 0.012, 0]} size={[w + 0.8, d + 0.8]} />
      <Block size={size} color="#fbe3c8" position={[0, h / 2, 0]} />
      <GableRoof span={d} length={w} height={0.7} color="#c9584c" position={[0, h, 0]} yaw={Math.PI / 2} />
      <Block size={[0.35, 0.65, 0.04]} color="#6b4a36" position={[0, 0.33, d / 2 + 0.02]} />
      <Block size={[0.3, 0.3, 0.04]} color="#fff3cf" position={[-0.5, 0.9, d / 2 + 0.02]} cast={false} />
      <Block size={[0.3, 0.3, 0.04]} color="#fff3cf" position={[0.5, 0.9, d / 2 + 0.02]} cast={false} />
      <Block size={[0.9, 0.03, 0.4]} color="#d9d0c2" position={[0, 0.015, d / 2 + 0.2]} cast={false} />
    </group>
  );
}

export function Church({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Blob position={[0, 0.012, 0]} size={[2.4, 2.2]} />
      <Block size={[1.3, 1.3, 1.6]} color="#f1e3c6" position={[0, 0.65, 0.1]} />
      <GableRoof span={1.3} length={1.6} height={0.7} color="#b56b58" position={[0, 1.3, 0.1]} />
      <Block size={[0.6, 2.6, 0.6]} color="#ead8b6" position={[0, 1.3, -0.8]} />
      <mesh position={[0, 2.9, -0.8]} castShadow material={paperMat("#b56b58")}>
        <coneGeometry args={[0.45, 0.8, 4]} />
      </mesh>
      <Block size={[0.06, 0.3, 0.06]} color="#3d2140" position={[0, 3.45, -0.8]} />
      <Block size={[0.2, 0.06, 0.06]} color="#3d2140" position={[0, 3.5, -0.8]} />
    </group>
  );
}

/** Paper car. Taxis are yellow with a roof sign. */
export function Car({ color = "#f2c230", taxi = false }: { color?: string; taxi?: boolean }) {
  return (
    <group>
      <Blob position={[0, 0.01, 0]} size={[1.3, 0.8]} opacity={0.6} />
      <Soft size={[1.0, 0.3, 0.5]} radius={0.08} color={color} position={[0, 0.25, 0]} />
      <Soft size={[0.55, 0.24, 0.44]} radius={0.07} color={color} position={[-0.05, 0.5, 0]} />
      <Block size={[0.5, 0.16, 0.46]} color="#cfe6ee" position={[-0.05, 0.5, 0]} cast={false} />
      {taxi && <Block size={[0.22, 0.1, 0.14]} color="#3d2140" position={[-0.05, 0.67, 0]} />}
      {taxi && <Block size={[0.9, 0.06, 0.52]} color="#3d2140" position={[0, 0.3, 0]} cast={false} />}
      {[-0.32, 0.32].map((x) =>
        [-0.26, 0.26].map((z) => <Cyl key={`${x}${z}`} r={0.1} h={0.06} color="#3d2140" position={[x, 0.1, z]} rotation={[Math.PI / 2, 0, 0]} cast={false} />),
      )}
    </group>
  );
}

/** Traffic: cars driving along a straight lane, popping in and out at the ends. */
export function Traffic({ from, to, count, colors, speed = 1.2, offset = 0 }: { from: V3; to: V3; count: number; colors: string[]; speed?: number; offset?: number }) {
  const cars = useRef<(Group | null)[]>([]);
  const len = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const yaw = Math.atan2(to[2] - from[2], to[0] - from[0]);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime * speed + offset;
    cars.current.forEach((c, i) => {
      if (!c) return;
      const k = ((t / len + i / count) % 1 + 1) % 1;
      c.position.set(from[0] + (to[0] - from[0]) * k, from[1], from[2] + (to[2] - from[2]) * k);
      const edge = Math.min(k, 1 - k) * len;
      c.scale.setScalar(damp(c.scale.x, edge < 0.4 ? 0.01 : 1, 10, dt));
    });
  });
  return (
    <group>
      {colors.slice(0, count).map((col, i) => (
        <group
          key={i}
          rotation={[0, -yaw, 0]}
          ref={(el) => {
            cars.current[i] = el;
          }}
        >
          <Car color={col} taxi={col === "#f2c230"} />
        </group>
      ))}
    </group>
  );
}

const PIN_START: V3 = [0, 2.5, 0];

/** Red push-pin dropped into a found building. */
export function Pin({ position }: { position: V3 }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.position.y = damp(ref.current.position.y, 0, 9, dt);
  });
  return (
    <group position={position}>
      <group ref={ref} position={PIN_START}>
        <Cyl r={0.02} h={0.45} color="#9a9a9a" position={[0, 0.22, 0]} />
        <Ball r={0.16} color="#e0344e" position={[0, 0.5, 0]} />
      </group>
    </group>
  );
}

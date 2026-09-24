"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { warm } from "../lib/color";
import type { Island } from "../lib/islands";
import { toonGradient } from "./toon";

function Toon({ color }: { color: string }) {
  return <meshToonMaterial color={color} gradientMap={toonGradient()} />;
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Ring of prop positions outside the room, avoiding the corridor volume behind the north wall. */
function spots(seed: number, count: number, rMin = 12, rMax = 40): [number, number][] {
  const r = rng(seed);
  const out: [number, number][] = [];
  while (out.length < count) {
    const a = r() * Math.PI * 2;
    const d = rMin + r() * (rMax - rMin);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (Math.abs(x) < 9 && z < -4 && z > -46) continue;
    out.push([x, z]);
  }
  return out;
}

function DragonTree({ p, s }: { p: [number, number]; s: number }) {
  return (
    <group position={[p[0], 0, p[1]]} scale={s}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.35, 0.6, 3, 7]} />
        <Toon color={warm("#7f5539")} />
      </mesh>
      {[-1, 0, 1].map((i) => (
        <group key={i} position={[i * 0.9, 3.4 + Math.abs(i) * -0.3, 0]} rotation={[0, 0, -i * 0.5]}>
          <mesh>
            <cylinderGeometry args={[0.15, 0.25, 1.4, 6]} />
            <Toon color={warm("#7f5539")} />
          </mesh>
          <mesh position={[0, 1, 0]}>
            <sphereGeometry args={[0.9, 7, 5]} />
            <Toon color={warm("#386641")} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Palm({ p, s }: { p: [number, number]; s: number }) {
  return (
    <group position={[p[0], 0, p[1]]} scale={s}>
      <mesh position={[0, 2.5, 0]} rotation={[0, 0, 0.12]}>
        <cylinderGeometry args={[0.18, 0.3, 5, 6]} />
        <Toon color={warm("#a47148")} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0.3, 5, 0]} rotation={[0, (i / 6) * Math.PI * 2, 0.9]}>
          <coneGeometry args={[0.35, 2.6, 4]} />
          <Toon color={warm("#588157")} />
        </mesh>
      ))}
    </group>
  );
}

function Volcano({ p, s, color, rim }: { p: [number, number]; s: number; color: string; rim: string }) {
  return (
    <group position={[p[0], 0, p[1]]} scale={s}>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[1.8, 6, 6, 9, 1, true]} />
        <meshToonMaterial color={color} gradientMap={toonGradient()} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 5.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.8, 9]} />
        <Toon color={rim} />
      </mesh>
    </group>
  );
}

function Dune({ p, s, color }: { p: [number, number]; s: number; color: string }) {
  return (
    <mesh position={[p[0], -1.2 * s, p[1]]} scale={[3 * s, 1.4 * s, 2 * s]}>
      <sphereGeometry args={[1.6, 12, 8]} />
      <Toon color={color} />
    </mesh>
  );
}

function Windmill({ p, s }: { p: [number, number]; s: number }) {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.z += dt * 1.2;
  });
  return (
    <group position={[p[0], 0, p[1]]} scale={s} rotation={[0, Math.atan2(-p[0], -p[1]), 0]}>
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.9, 1.4, 5, 8]} />
        <Toon color={warm("#f1faee")} />
      </mesh>
      <mesh position={[0, 5.4, 0]}>
        <coneGeometry args={[1.1, 1.2, 8]} />
        <Toon color={warm("#9c6644")} />
      </mesh>
      <group ref={blades} position={[0, 4.6, 1.2]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} position={[0, 0, 0]}>
            <boxGeometry args={[0.35, 5, 0.08]} />
            <Toon color={warm("#5c4033")} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Dome({ p, s }: { p: [number, number]; s: number }) {
  return (
    <group position={[p[0], 0, p[1]]} scale={s}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[2, 2, 3, 16]} />
        <Toon color={warm("#e5e5e5")} />
      </mesh>
      <mesh position={[0, 3, 0]}>
        <sphereGeometry args={[2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Toon color={warm("#f8f9fa")} />
      </mesh>
      <mesh position={[0, 3.6, 1.2]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.6, 0.3, 1.5]} />
        <Toon color={warm("#14213d")} />
      </mesh>
    </group>
  );
}

function ForestTree({ p, s, color }: { p: [number, number]; s: number; color: string }) {
  return (
    <group position={[p[0], 0, p[1]]} scale={s}>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.2, 0.35, 4, 6]} />
        <Toon color={warm("#3e2c1c")} />
      </mesh>
      <mesh position={[0, 4.6, 0]}>
        <icosahedronGeometry args={[1.8, 0]} />
        <Toon color={color} />
      </mesh>
      <mesh position={[0.9, 3.7, 0.3]}>
        <icosahedronGeometry args={[1.1, 0]} />
        <Toon color={color} />
      </mesh>
    </group>
  );
}

function Lighthouse({ p, s }: { p: [number, number]; s: number }) {
  return (
    <group position={[p[0], 0, p[1]]} scale={s}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 1 + i * 2, 0]}>
          <cylinderGeometry args={[1.2 - i * 0.15, 1.3 - i * 0.15, 2, 12]} />
          <Toon color={i % 2 ? warm("#d62828") : warm("#f8f9fa")} />
        </mesh>
      ))}
      <mesh position={[0, 8.6, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 1.2, 8]} />
        <meshBasicMaterial color={warm("#ffd23f")} />
      </mesh>
      <mesh position={[0, 9.6, 0]}>
        <coneGeometry args={[0.9, 0.9, 8]} />
        <Toon color={warm("#1a120b")} />
      </mesh>
    </group>
  );
}

function BentJuniper({ p, s }: { p: [number, number]; s: number }) {
  return (
    <group position={[p[0], 0, p[1]]} scale={s}>
      <mesh position={[0.6, 1, 0]} rotation={[0, 0, -0.9]}>
        <cylinderGeometry args={[0.2, 0.4, 2.8, 6]} />
        <Toon color={warm("#5c4033")} />
      </mesh>
      <mesh position={[1.9, 1.6, 0]} scale={[2, 0.6, 1.2]}>
        <icosahedronGeometry args={[1, 0]} />
        <Toon color={warm("#2d6a4f")} />
      </mesh>
    </group>
  );
}

/** Falling debris for El Hierro's collapsing gauntlet; intensity 0..1. */
function Debris({ intensity }: { intensity: number }) {
  const count = 24;
  const rocks = useRef<THREE.InstancedMesh>(null);
  const state = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: count }, () => ({
      x: (r() - 0.5) * 50,
      z: (r() - 0.5) * 50,
      y: r() * 30,
      v: 4 + r() * 6,
    })).filter((d) => !(Math.abs(d.x) < 9 && d.z < 8));
  }, []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame((_, dt) => {
    if (!rocks.current) return;
    state.forEach((d, i) => {
      d.y -= d.v * dt * (0.3 + intensity * 2);
      if (d.y < -2) d.y = 25 + Math.random() * 10;
      m.makeTranslation(d.x, d.y, d.z);
      rocks.current!.setMatrixAt(i, m);
    });
    rocks.current.count = Math.round(state.length * Math.min(1, 0.2 + intensity));
    rocks.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={rocks} args={[undefined, undefined, state.length]}>
      <dodecahedronGeometry args={[0.8, 0]} />
      <meshToonMaterial color={warm("#3c2a21")} gradientMap={toonGradient()} />
    </instancedMesh>
  );
}

export function Biome({ island, collapse = 0 }: { island: Island; collapse?: number }) {
  const pal = island.palette;
  const content = useMemo(() => {
    switch (island.zone) {
      case "tenerife":
        return (
          <>
            <group position={[-30, 0, -70]}>
              <Volcano p={[0, 0]} s={5} color={warm("#7f5539")} rim={warm("#ffffff")} />
            </group>
            {spots(1, 14).map((p, i) => (
              <DragonTree key={i} p={p} s={1 + (i % 3) * 0.3} />
            ))}
          </>
        );
      case "gran_canaria":
        return (
          <>
            {spots(2, 16, 12, 45).map((p, i) => (
              <Dune key={i} p={p} s={1.5 + (i % 4) * 0.6} color={i % 2 ? pal.floor : pal.prop} />
            ))}
            {spots(3, 6, 14, 30).map((p, i) => (
              <Palm key={i} p={p} s={1.2} />
            ))}
            <Lighthouse p={[28, 30]} s={1.5} />
          </>
        );
      case "lanzarote":
        return spots(4, 12, 14, 50).map((p, i) => (
          <Volcano key={i} p={p} s={0.8 + (i % 3) * 0.5} color={i % 2 ? warm("#8d0801") : warm("#1b1b1e")} rim={warm("#d90429")} />
        ));
      case "fuerteventura":
        return (
          <>
            {spots(5, 5, 14, 30).map((p, i) => (
              <Windmill key={i} p={p} s={1.3} />
            ))}
            {spots(6, 10, 15, 45).map((p, i) => (
              <Dune key={i} p={p} s={1.4 + (i % 3) * 0.5} color={pal.floor} />
            ))}
          </>
        );
      case "la_palma":
        return (
          <>
            {spots(7, 5, 15, 35).map((p, i) => (
              <Dome key={i} p={p} s={1 + (i % 2) * 0.4} />
            ))}
            {spots(8, 10, 12, 40).map((p, i) => (
              <ForestTree key={i} p={p} s={1} color={warm("#2d6a4f")} />
            ))}
            <Stars />
          </>
        );
      case "la_gomera":
        return spots(9, 40, 10, 35).map((p, i) => (
          <ForestTree key={i} p={p} s={1 + (i % 4) * 0.25} color={i % 3 ? warm("#1f3b16") : warm("#386641")} />
        ));
      case "el_hierro":
        return (
          <>
            <Lighthouse p={[-22, 24]} s={2} />
            {spots(10, 10, 12, 35).map((p, i) => (
              <BentJuniper key={i} p={p} s={1.2} />
            ))}
          </>
        );
    }
  }, [island.zone, pal.floor, pal.prop]);

  return (
    <group>
      {/* ground plane beyond the room */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[120, 32]} />
        <Toon color={pal.prop} />
      </mesh>
      {content}
      {island.zone === "el_hierro" && <Debris intensity={collapse} />}
    </group>
  );
}

function Stars() {
  const geo = useMemo(() => {
    const r = rng(11);
    const pts: number[] = [];
    for (let i = 0; i < 400; i++) {
      const a = r() * Math.PI * 2;
      const e = 0.15 + r() * 1.2;
      pts.push(Math.cos(a) * Math.cos(e) * 90, Math.sin(e) * 90, Math.sin(a) * Math.cos(e) * 90);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color={warm("#ffffff")} size={0.6} sizeAttenuation />
    </points>
  );
}

"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { PlaneGeometry, Shape, ShapeGeometry, type Group, type Mesh, type Sprite } from "three";
import type { V3 } from "./layouts";
import { cardstock, checkerRug, corrugated, fabric, kraft, polaroid, puff, sketchSheet, tiled } from "./paper";
import { Ball, Blob, Block, Cyl, damp, paperMat, Sheet, Soft } from "./prims";

const SOFA = "#a9a6a2";
const WOOD = "#c79a66";
const WOOD_DARK = "#a8794b";

// ─────────────────────────────────────────────────────────────── sofa

/**
 * Grey fabric sofa facing +x. `skirtOpen` lifts the fabric skirt that hides the gap under it;
 * `cushionOpen` flips the throw cushion up. Both are the flap covers of the apt_cat task.
 */
export function Sofa({ position, len, depth, skirtOpen, cushionOpen }: { position: V3; len: number; depth: number; skirtOpen: boolean; cushionOpen: boolean }) {
  const skirt = useRef<Group>(null);
  const cushion = useRef<Group>(null);
  const fab = fabric(SOFA);
  const legH = 0.42;
  const baseH = 0.5;
  useFrame((_, dt) => {
    if (skirt.current) skirt.current.rotation.z = damp(skirt.current.rotation.z, skirtOpen ? 1.35 : 0, 6, dt);
    if (cushion.current) {
      cushion.current.rotation.z = damp(cushion.current.rotation.z, cushionOpen ? -1.1 : 0, 6, dt);
      cushion.current.position.y = damp(cushion.current.position.y, cushionOpen ? 0.35 : 0, 6, dt);
    }
  });
  const seatTop = legH + baseH;
  return (
    <group position={position}>
      <Blob position={[0, 0.012, 0]} size={[depth + 1.0, len + 1.0]} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} r={0.07} top={0.09} h={legH} color={WOOD_DARK} position={[sx * (depth / 2 - 0.2), legH / 2, sz * (len / 2 - 0.2)]} />),
      )}
      <Soft size={[depth, baseH, len]} radius={0.1} color="#ffffff" map={fab} position={[0, legH + baseH / 2, 0]} />
      {/* seat cushions */}
      {[-1, 1].map((sz) => (
        <Soft key={sz} size={[depth - 0.55, 0.3, len / 2 - 0.45]} radius={0.12} color="#b3b0ac" map={fab} position={[0.18, seatTop + 0.15, sz * (len / 4 - 0.12)]} />
      ))}
      {/* backrest */}
      <Soft size={[0.45, 1.05, len - 0.5]} radius={0.16} color="#ffffff" map={fab} position={[-depth / 2 + 0.25, seatTop + 0.5, 0]} />
      {[-1, 1].map((sz) => (
        <Soft key={sz} size={[0.35, 0.75, len / 2 - 0.5]} radius={0.14} color="#b8b5b1" map={fab} position={[-depth / 2 + 0.6, seatTop + 0.5, sz * (len / 4 - 0.12)]} />
      ))}
      {/* arms */}
      {[-1, 1].map((sz) => (
        <Soft key={sz} size={[depth, 0.85, 0.42]} radius={0.14} color="#ffffff" map={fab} position={[0, legH + 0.42, sz * (len / 2 - 0.21)]} />
      ))}
      {/* yellow cushion (fixed) */}
      <Soft size={[0.28, 0.6, 0.65]} radius={0.12} color="#e9cf86" map={fabric("#e9cf86")} position={[-depth / 2 + 0.85, seatTop + 0.5, -len / 4]} rotation={[0.15, 0, -0.25]} />
      {/* throw cushion: the "cushion flap" */}
      <group position={[0.2, seatTop + 0.3, len / 2 - 1.0]}>
        <group ref={cushion}>
          <Soft size={[0.7, 0.26, 0.7]} radius={0.11} color="#e5b98f" map={fabric("#e5b98f")} rotation={[0, 0.3, 0]} />
        </group>
      </group>
      {/* dust bunny revealed under the throw cushion */}
      <Ball r={0.1} color="#d8d2c8" position={[0.25, seatTop + 0.33, len / 2 - 1.0]} scale={[1.3, 0.6, 1]} />
      {/* skirt: fabric flap hinged at the seat base, hiding the gap under the sofa */}
      <group position={[depth / 2 + 0.01, legH + 0.02, 0]}>
        <group ref={skirt}>
          <mesh position={[0.005, -legH / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow material={paperMat("#9c9995", { map: fab, double: true })}>
            <planeGeometry args={[len - 0.1, legH + 0.02]} />
          </mesh>
          {/* scalloped paper trim */}
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} position={[0.012, -legH, -len / 2 + 0.3 + (i * (len - 0.6)) / 8]} rotation={[0, Math.PI / 2, 0]} material={paperMat("#8f8c88", { double: true })}>
              <circleGeometry args={[0.1, 10, 0, Math.PI]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────── tables & chairs

/** Kraft-cardboard coffee table with corrugated top edge, sketch papers, a mug and a phone. */
export function CoffeeTable({ position }: { position: V3 }) {
  const top = paperMat("#ffffff", { map: tiled(kraft(), 1, 1) });
  const edge = paperMat("#ffffff", { map: tiled(corrugated(), 6, 1), key: "table-edge" });
  const h = 1.0;
  const w = 2.6;
  const d = 1.5;
  return (
    <group position={position}>
      <Blob position={[0, 0.013, 0]} size={[w + 1.2, d + 1.2]} />
      <mesh position={[0, h - 0.06, 0]} castShadow receiveShadow material={[edge, edge, top, top, edge, edge]}>
        <boxGeometry args={[w, 0.13, d]} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Block key={`${sx}${sz}`} size={[0.16, h - 0.12, 0.16]} color={WOOD} position={[sx * (w / 2 - 0.2), (h - 0.12) / 2, sz * (d / 2 - 0.2)]} />),
      )}
      <Block size={[w - 0.4, 0.06, 0.1]} color={WOOD_DARK} position={[0, 0.25, d / 2 - 0.2]} />
      <Flutter position={[-0.4, h + 0.01, 0.1]} rot={0.35} />
      <Sheet size={[0.7, 0.85]} map={sketchSheet()} alpha position={[0.25, h + 0.012, -0.15]} rotation={[-Math.PI / 2, 0, -0.5]} />
      <Mug position={[0.6, h, 0.35]} />
      <Block size={[0.22, 0.03, 0.4]} color="#4a4453" position={[0.95, h + 0.015, -0.3]} rotation={[0, 0.4, 0]} />
    </group>
  );
}

/** A loose sketch sheet whose corner lifts in the draught. */
function Flutter({ position, rot }: { position: V3; rot: number }) {
  const geo = useMemo(() => new PlaneGeometry(0.75, 0.9, 6, 6), []);
  const mesh = useRef<Mesh>(null);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const pos = m.geometry.attributes.position;
    const t = clock.elapsedTime;
    const lift = 0.5 + 0.5 * Math.sin(t * 1.3) * Math.sin(t * 0.7);
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const k = Math.max(0, x / 0.375 + y / 0.45 - 0.6);
      pos.setZ(i, k * k * 0.09 * lift);
    }
    pos.needsUpdate = true;
  });
  return (
    <mesh ref={mesh} geometry={geo} position={position} rotation={[-Math.PI / 2, 0, rot]} receiveShadow material={paperMat("#ffffff", { map: sketchSheet(), double: true, key: "flutter" })} />
  );
}

/** Blue mug with rising steam puffs. */
export function Mug({ position }: { position: V3 }) {
  const puffs = useRef<(Sprite | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    puffs.current.forEach((p, i) => {
      if (!p) return;
      const k = (t * 0.45 + i / 3) % 1;
      p.position.set(Math.sin(t * 2 + i) * 0.04, 0.32 + k * 0.6, 0);
      p.scale.setScalar(0.1 + k * 0.18);
      p.material.opacity = Math.sin(k * Math.PI) * 0.7;
    });
  });
  return (
    <group position={position}>
      <Cyl r={0.13} h={0.26} color="#6f8fb3" position={[0, 0.13, 0]} />
      <Cyl r={0.11} h={0.01} color="#6b4a36" position={[0, 0.255, 0]} cast={false} />
      <mesh position={[0.15, 0.14, 0]} castShadow material={paperMat("#6f8fb3")}>
        <torusGeometry args={[0.07, 0.022, 8, 14]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <sprite
          key={i}
          ref={(el) => {
            puffs.current[i] = el;
          }}
        >
          <spriteMaterial map={puff()} transparent depthWrite={false} opacity={0} />
        </sprite>
      ))}
    </group>
  );
}

/** Wooden chair with a cream seat pad, turned to face `face` radians. */
export function Chair({ position, face = 0, color = WOOD }: { position: V3; face?: number; color?: string }) {
  return (
    <group position={position} rotation={[0, face, 0]}>
      <Blob position={[0, 0.012, 0]} size={[1.5, 1.5]} opacity={0.8} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Block key={`${sx}${sz}`} size={[0.1, 0.62, 0.1]} color={color} position={[sx * 0.36, 0.31, sz * 0.36]} />),
      )}
      <Block size={[0.9, 0.08, 0.9]} color={color} position={[0, 0.66, 0]} />
      <Soft size={[0.8, 0.12, 0.8]} radius={0.05} color="#efe0b8" map={fabric("#efe0b8")} position={[0, 0.76, 0.02]} />
      {[-1, 1].map((sx) => (
        <Block key={sx} size={[0.1, 0.8, 0.1]} color={color} position={[sx * 0.36, 1.06, -0.36]} />
      ))}
      <Block size={[0.82, 0.32, 0.07]} color={color} position={[0, 1.3, -0.37]} />
      {[-1, 1].map((sx) => (
        <Block key={sx} size={[0.08, 0.07, 0.8]} color={color} position={[sx * 0.4, 1.0, 0]} />
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────── plant, lamp, rug

let leafGeo: ShapeGeometry | null = null;
function leaf(): ShapeGeometry {
  if (!leafGeo) {
    const s = new Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.34, 0.12, 0.3, 0.5, 0, 0.72);
    s.bezierCurveTo(-0.3, 0.5, -0.34, 0.12, 0, 0);
    leafGeo = new ShapeGeometry(s, 6);
  }
  return leafGeo;
}

/** Terracotta pot with paper leaves that bob gently. */
export function Plant({ position, scale = 1, leafColor = "#6fae7a" }: { position: V3; scale?: number; leafColor?: string }) {
  const leaves = useRef<(Group | null)[]>([]);
  const spec = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        a: (i / 9) * Math.PI * 2 + (i % 2) * 0.3,
        tilt: 0.35 + (i % 3) * 0.22,
        h: 0.9 + (i % 4) * 0.28,
        s: 0.9 + (i % 3) * 0.2,
      })),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    leaves.current.forEach((l, i) => {
      if (l) l.rotation.x = spec[i].tilt + Math.sin(t * 1.4 + i * 1.7) * 0.06;
    });
  });
  const leafMat = paperMat(leafColor, { double: true });
  return (
    <group position={position} scale={scale}>
      <Blob position={[0, 0.012, 0]} size={[1.4, 1.4]} />
      <Cyl r={0.38} top={0.48} h={0.7} color="#c96f4a" position={[0, 0.35, 0]} />
      <Cyl r={0.5} h={0.1} color="#b86240" position={[0, 0.72, 0]} />
      <Cyl r={0.44} h={0.02} color="#5d4030" position={[0, 0.76, 0]} cast={false} />
      {spec.map((sp, i) => (
        <group key={i} position={[0, 0.75, 0]} rotation={[0, sp.a, 0]}>
          <Cyl r={0.018} h={sp.h} color="#5e8d52" position={[0, sp.h / 2, 0]} cast={false} />
          <group
            position={[0, sp.h, 0]}
            ref={(el) => {
              leaves.current[i] = el;
            }}
          >
            <mesh geometry={leaf()} material={leafMat} scale={sp.s} castShadow />
          </group>
        </group>
      ))}
    </group>
  );
}

/** Floor lamp with a paper shade that glows a little. */
export function FloorLamp({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Blob position={[0, 0.012, 0]} size={[1, 1]} />
      <Cyl r={0.28} h={0.06} color="#5c4a3d" position={[0, 0.03, 0]} />
      <Cyl r={0.035} h={2.6} color="#5c4a3d" position={[0, 1.3, 0]} />
      <mesh position={[0, 2.75, 0]} castShadow material={paperMat("#f6e7c4", { emissive: "#ffd9a0", double: true })}>
        <cylinderGeometry args={[0.3, 0.48, 0.55, 18, 1, true]} />
      </mesh>
    </group>
  );
}

export function Rug({ position, size, colors }: { position: V3; size: [number, number]; colors?: [string, string] }) {
  return <Sheet size={size} map={checkerRug(...(colors ?? ["#f3b99a", "#fbe3d3"]))} alpha position={position} rotation={[-Math.PI / 2, 0, 0]} />;
}

// ─────────────────────────────────────────────────────────────── cardboard box, laundry, frames

/** Cardboard box: the back half closed by folded flaps (a lid to put things on), the front half open. */
export function CardboardBox({ position, size }: { position: V3; size: V3 }) {
  const [w, h, d] = size;
  const t = 0.05;
  const col = "#c89a64";
  const map = tiled(kraft(), 1, 1);
  return (
    <group position={position}>
      <Blob position={[0, 0.012, 0]} size={[w + 1, d + 1]} />
      <Block size={[w, 0.04, d]} color={col} map={map} position={[0, 0.02, 0]} />
      <Block size={[w, h, t]} color={col} map={map} position={[0, h / 2, -d / 2]} />
      <Block size={[w, h, t]} color={col} map={map} position={[0, h / 2, d / 2]} />
      <Block size={[t, h, d]} color={col} map={map} position={[-w / 2, h / 2, 0]} />
      <Block size={[t, h, d]} color={col} map={map} position={[w / 2, h / 2, 0]} />
      {/* closed lid over the back half */}
      <Block size={[w + 0.04, 0.05, d / 2]} color="#d2a670" map={map} position={[0, h + 0.02, -d / 4]} />
      <Block size={[w * 0.8, 0.012, 0.12]} color="#e9dcb4" position={[0, h + 0.05, -d / 4]} cast={false} />
      {/* front flaps folded open */}
      <Block size={[w, 0.04, d / 2]} color="#caa06a" map={map} position={[0, h + d / 4 - 0.05, d / 2 + 0.16]} rotation={[1.2, 0, 0]} />
      {/* a pencil doodle on the side */}
      <Sheet size={[0.8, 0.5]} map={polaroid("chair")} position={[w / 2 + 0.03, h / 2, 0.2]} rotation={[0, Math.PI / 2, 0.08]} alpha />
    </group>
  );
}

/** Wicker laundry basket with folded clothes (the "downstairs" pick). */
export function Laundry({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Blob position={[0, 0.012, 0]} size={[1.5, 1.4]} />
      <Cyl r={0.5} top={0.58} h={0.75} color="#d4b27c" map={fabric("#d4b27c", "rgba(120,80,30,0.25)")} position={[0, 0.375, 0]} />
      <Soft size={[0.7, 0.2, 0.5]} radius={0.08} color="#9fc4d8" position={[-0.05, 0.8, 0]} rotation={[0, 0.3, 0.1]} />
      <Soft size={[0.6, 0.18, 0.45]} radius={0.08} color="#f2e6d0" position={[0.08, 0.95, 0.05]} rotation={[0, -0.2, -0.1]} />
    </group>
  );
}

/** Framed polaroid pinned to a wall (wall-local coordinates). */
export function Frame({ position, kind, size = [0.9, 1.05], tilt = 0 }: { position: V3; kind: "room" | "window" | "plant" | "chair"; size?: [number, number]; tilt?: number }) {
  return (
    <group position={position} rotation={[0, 0, tilt]}>
      <Block size={[size[0] + 0.1, size[1] + 0.1, 0.05]} color="#8a6a4a" position={[0, 0, 0.025]} cast={false} />
      <Sheet size={size} map={polaroid(kind)} position={[0, 0, 0.056]} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────── curtains

/** Fabric curtain hanging from `top`; sways, and slides aside when `open`. */
export function Curtain({ position, height, width = 0.9, color = "#efe6d2", open = false, phase = 0 }: { position: V3; height: number; width?: number; color?: string; open?: boolean; phase?: number }) {
  const geo = useMemo(() => {
    const g = new PlaneGeometry(width, height, 14, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / width) * Math.PI * 7) * 0.06 + 0.07);
    g.computeVertexNormals();
    g.translate(0, -height / 2, 0);
    return g;
  }, [width, height]);
  const ref = useRef<Group>(null);
  useFrame(({ clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.rotation.x = 0.035 * Math.sin(t * 0.9 + phase) + 0.02 * Math.sin(t * 2.1 + phase);
    g.scale.x = damp(g.scale.x, open ? 0.35 : 1, 6, dt);
    g.position.x = damp(g.position.x, open ? -width * 0.45 : 0, 6, dt);
  });
  return (
    <group position={position}>
      <group ref={ref}>
        <mesh geometry={geo} castShadow receiveShadow material={paperMat("#ffffff", { map: fabric(color), double: true, key: `curtain:${color}` })} />
      </group>
    </group>
  );
}

/** Wooden curtain rod with rings (wall-local). */
export function Rod({ position, length }: { position: V3; length: number }) {
  return (
    <group position={position}>
      <Cyl r={0.04} h={length} color={WOOD_DARK} rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0.12]} cast={false} />
      {[-1, 1].map((s) => (
        <Ball key={s} r={0.07} color={WOOD_DARK} position={[(s * length) / 2, 0, 0.12]} cast={false} />
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────── bedroom

/** Girl's bed: wooden frame on legs (a visible gap underneath), pink blanket, pillow. */
export function Bed({ position, size, legH }: { position: V3; size: V3; legH: number }) {
  const [w, h, d] = size;
  return (
    <group position={position}>
      <Blob position={[0, 0.012, 0]} size={[w + 1, d + 1]} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Block key={`${sx}${sz}`} size={[0.14, legH, 0.14]} color={WOOD} position={[sx * (w / 2 - 0.1), legH / 2, sz * (d / 2 - 0.1)]} />),
      )}
      <Block size={[w, 0.16, d]} color={WOOD} position={[0, legH + 0.08, 0]} />
      <Soft size={[w - 0.1, h - legH - 0.2, d - 0.1]} radius={0.12} color="#f6f1e6" map={fabric("#f6f1e6")} position={[0, legH + 0.16 + (h - legH - 0.2) / 2, 0]} />
      <Soft size={[w + 0.02, 0.1, d * 0.62]} radius={0.05} color="#f2a7b8" map={fabric("#f2a7b8")} position={[0, h + 0.02, d * 0.19]} />
      <Soft size={[w - 0.6, 0.22, 0.75]} radius={0.1} color="#ffffff" map={fabric("#fdf8ee")} position={[0, h + 0.1, -d / 2 + 0.55]} />
      <Block size={[w, 1.4, 0.14]} color={WOOD} position={[0, 0.7 + legH * 0.3, -d / 2 - 0.02]} />
      <Block size={[w, 0.8, 0.12]} color={WOOD} position={[0, 0.4 + legH * 0.3, d / 2 + 0.02]} />
      {/* plush bunny on the pillow */}
      <group position={[w / 2 - 0.55, h + 0.22, -d / 2 + 0.6]}>
        <Ball r={0.14} color="#f7e9dc" position={[0, 0.1, 0]} />
        <Ball r={0.1} color="#f7e9dc" position={[0, 0.3, 0]} />
        <Soft size={[0.05, 0.2, 0.08]} radius={0.02} color="#f7e9dc" position={[-0.04, 0.46, 0]} />
        <Soft size={[0.05, 0.2, 0.08]} radius={0.02} color="#f7e9dc" position={[0.04, 0.46, 0]} />
      </group>
    </group>
  );
}

/** Clothes rail with a dress and a shirt on hangers (the "upstairs" pick). */
export function ClothesRack({ position }: { position: V3 }) {
  const sway = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (sway.current) sway.current.rotation.x = Math.sin(clock.elapsedTime * 1.1) * 0.04;
  });
  return (
    <group position={position}>
      <Blob position={[0, 0.012, 0]} size={[1.2, 2.6]} />
      {[-1, 1].map((sz) => (
        <group key={sz}>
          <Cyl r={0.04} h={2.4} color="#8a6a4a" position={[0, 1.2, sz * 1.0]} />
          <Block size={[0.7, 0.05, 0.1]} color="#8a6a4a" position={[0, 0.03, sz * 1.0]} />
        </group>
      ))}
      <Cyl r={0.035} h={2.1} color="#8a6a4a" rotation={[Math.PI / 2, 0, 0]} position={[0, 2.35, 0]} />
      <group position={[0, 2.3, 0]} ref={sway}>
        {/* dress */}
        <group position={[0, 0, -0.3]}>
          <Cyl r={0.02} h={0.12} color="#555" position={[0, 0, 0]} />
          <mesh position={[0, -0.75, 0]} castShadow material={paperMat("#e46d8e", { map: fabric("#e46d8e") })}>
            <cylinderGeometry args={[0.16, 0.5, 1.3, 16]} />
          </mesh>
          <Block size={[0.46, 0.12, 0.22]} color="#e46d8e" position={[0, -0.12, 0]} />
        </group>
        {/* shirt */}
        <group position={[0, 0, 0.45]}>
          <Soft size={[0.2, 0.85, 0.7]} radius={0.06} color="#8ec3d6" map={fabric("#8ec3d6")} position={[0, -0.52, 0]} />
        </group>
      </group>
    </group>
  );
}

/** Desk with a lamp, books and pencils. */
export function Desk({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Blob position={[0, 0.012, 0]} size={[2.6, 1.6]} />
      <Block size={[2.0, 0.1, 0.9]} color={WOOD} position={[0, 1.05, 0]} />
      {[-1, 1].map((sx) => (
        <Block key={sx} size={[0.1, 1.0, 0.8]} color={WOOD_DARK} position={[sx * 0.92, 0.5, 0]} />
      ))}
      <Cyl r={0.12} h={0.04} color="#e4b6c4" position={[-0.6, 1.12, 0]} />
      <Cyl r={0.02} h={0.5} color="#e4b6c4" position={[-0.6, 1.36, 0]} rotation={[0, 0, 0.2]} />
      <mesh position={[-0.5, 1.62, 0.05]} rotation={[0.4, 0, 0.4]} material={paperMat("#f7d6de", { emissive: "#ffd9a0", double: true })}>
        <coneGeometry args={[0.18, 0.25, 14, 1, true]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <Block key={i} size={[0.16, 0.5 - i * 0.06, 0.4]} color={["#7fb0c9", "#e9cf86", "#e38c9a"][i]} position={[0.4 + i * 0.18, 1.1 + (0.5 - i * 0.06) / 2, -0.15]} />
      ))}
    </group>
  );
}

/** Wall shelf with books and a small plant (wall-local). */
export function Shelf({ position, width = 2.0 }: { position: V3; width?: number }) {
  return (
    <group position={position}>
      <Block size={[width, 0.08, 0.45]} color={WOOD} position={[0, 0, 0.23]} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Block key={i} size={[0.14, 0.45 + (i % 3) * 0.07, 0.34]} color={["#d97b6c", "#7fb0c9", "#e9cf86", "#9fc49b", "#c9a0d8"][i]} position={[-width / 2 + 0.3 + i * 0.17, 0.26 + (i % 3) * 0.035, 0.22]} rotation={[0, 0, i === 4 ? 0.25 : 0]} />
      ))}
      <Cyl r={0.12} top={0.15} h={0.22} color="#c96f4a" position={[width / 2 - 0.35, 0.15, 0.22]} />
      <Ball r={0.18} color="#7fb07f" position={[width / 2 - 0.35, 0.38, 0.22]} scale={[1, 0.8, 1]} />
    </group>
  );
}

/** Star garland across a wall (wall-local): little paper stars on a string. */
export function Garland({ position, width }: { position: V3; width: number }) {
  return (
    <group position={position}>
      {Array.from({ length: 7 }, (_, i) => {
        const x = -width / 2 + (i * width) / 6;
        const y = -0.25 * Math.sin((i / 6) * Math.PI);
        return (
          <mesh key={i} position={[x, y, 0.05]} rotation={[0, 0, i * 0.4]} material={paperMat(["#f6c945", "#f29bb2", "#8fc9e0"][i % 3], { double: true })}>
            <circleGeometry args={[0.12, 5]} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Wall-local shape of a flat paper cut-out cloud — used on the bedroom wall. */
export function PaperCloud({ position }: { position: V3 }) {
  return (
    <group position={position}>
      {[
        [0, 0, 0.3],
        [0.3, 0.08, 0.25],
        [-0.3, 0.05, 0.22],
      ].map(([x, y, r], i) => (
        <mesh key={i} position={[x, y, 0.02 + i * 0.002]} material={paperMat("#ffffff", { map: cardstock("#fbfbf7"), double: true })}>
          <circleGeometry args={[r, 16]} />
        </mesh>
      ))}
    </group>
  );
}


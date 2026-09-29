"use client";

import type { ReactNode } from "react";
import type { Body } from "../model/layouts";
import { flat, unlit } from "./materials";

/**
 * Low-poly props, one per PropKind, sized from the layout footprint so the
 * picture always matches what the relation engine measures. Coordinates are
 * local to the footprint centre on the ground.
 */

type V3 = [number, number, number];

export interface PropProps {
  body: Body;
  /** The gnome is inside/under it: fade the parts that would hide him. */
  ghost: boolean;
}

function Box({ size, at, color, ghost, rot }: { size: V3; at: V3; color: string; ghost?: boolean; rot?: V3 }) {
  return (
    <mesh position={at} rotation={rot} material={flat(color, { ghost })}>
      <boxGeometry args={size} />
    </mesh>
  );
}

function Cyl({ r, h, at, color, seg = 8, top, ghost, open, rot }: { r: number; h: number; at: V3; color: string; seg?: number; top?: number; ghost?: boolean; open?: boolean; rot?: V3 }) {
  return (
    <mesh position={at} rotation={rot} material={flat(color, { ghost, double: open })}>
      <cylinderGeometry args={[top ?? r, r, h, seg, 1, open]} />
    </mesh>
  );
}

function Ball({ r, at, color, ghost, scale }: { r: number; at: V3; color: string; ghost?: boolean; scale?: V3 }) {
  return (
    <mesh position={at} scale={scale} material={flat(color, { ghost })}>
      <icosahedronGeometry args={[r, 0]} />
    </mesh>
  );
}

/** Soft dark disc under a prop: cheap contact shadow. */
export function Shadow({ w, d, round = false }: { w: number; d: number; round?: boolean }) {
  return (
    <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={unlit("#1d2b12", 0.18)}>
      {round ? <circleGeometry args={[Math.max(w, d) / 2 + 0.1, 12]} /> : <planeGeometry args={[w + 0.15, d + 0.15]} />}
    </mesh>
  );
}

const STONE = "#A7A2A9";
const STONE_DARK = "#7F7984";
const WOOD = "#9A6437";
const WOOD_DARK = "#6E4426";
const IRON = "#3D2140";
const LEAF = "#4E9A3F";
const LEAF_DARK = "#3C7F33";
const TERRACOTTA = "#D2704B";

function Hedge({ body, ghost }: PropProps) {
  const [w, d] = body.size;
  return (
    <>
      <Shadow w={w} d={d} />
      <Box size={[w, body.h * 0.85, d]} at={[0, body.h * 0.425, 0]} color={LEAF_DARK} ghost={ghost} />
      <Box size={[w - 0.1, body.h * 0.15, d - 0.1]} at={[0, body.h * 0.925, 0]} color={LEAF} ghost={ghost} />
      {Array.from({ length: Math.max(1, Math.round(w / 0.7)) }, (_, i) => (
        <Ball key={i} r={0.22} at={[-w / 2 + 0.35 + i * ((w - 0.7) / Math.max(1, Math.round(w / 0.7) - 1)), body.h, (i % 2) * 0.1 - 0.05]} color={LEAF} ghost={ghost} />
      ))}
    </>
  );
}

function Statue({ body, ghost }: PropProps) {
  const [w] = body.size;
  return (
    <>
      <Shadow w={w} d={w} />
      <Box size={[w, 0.6, w]} at={[0, 0.3, 0]} color={STONE_DARK} ghost={ghost} />
      <Cyl r={0.28} top={0.2} h={1.1} at={[0, 1.15, 0]} color={STONE} ghost={ghost} />
      <Ball r={0.24} at={[0, 1.85, 0]} color={STONE} ghost={ghost} />
      <Box size={[0.9, 0.12, 0.2]} at={[0, 1.4, 0]} color={STONE} ghost={ghost} />
      <Box size={[0.5, 0.06, 0.5]} at={[0, 2.17, 0]} color={STONE_DARK} ghost={ghost} />
    </>
  );
}

function Urn({ body }: PropProps) {
  const r = body.size[0] / 2;
  return (
    <>
      <Shadow w={r * 2} d={r * 2} round />
      <Cyl r={r * 0.7} top={r} h={body.h} at={[0, body.h / 2, 0]} color={TERRACOTTA} seg={10} open />
      <Cyl r={r * 0.7} h={0.04} at={[0, 0.03, 0]} color="#8C3F25" seg={10} />
      <mesh position={[0, body.h, 0]} rotation={[Math.PI / 2, 0, 0]} material={flat("#E48A62")}>
        <torusGeometry args={[r, 0.06, 4, 12]} />
      </mesh>
    </>
  );
}

function Bench({ body, ghost }: PropProps) {
  const [w, d] = body.size;
  const back = body.front === "n" ? d / 2 - 0.08 : -(d / 2 - 0.08);
  return (
    <>
      <Shadow w={w} d={d} />
      <Box size={[w, 0.1, d]} at={[0, body.h - 0.05, 0]} color={WOOD} ghost={ghost} />
      <Box size={[w, 0.45, 0.08]} at={[0, body.h + 0.25, back]} color={WOOD_DARK} ghost={ghost} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Box key={`${sx}${sz}`} size={[0.08, body.h, 0.08]} at={[sx * (w / 2 - 0.1), body.h / 2, sz * (d / 2 - 0.1)]} color={IRON} />),
      )}
    </>
  );
}

function Tree({ body, ghost, dead }: PropProps & { dead?: boolean }) {
  const [w] = body.size;
  const clear = body.clear ?? 1.2;
  return (
    <>
      <Shadow w={w} d={w} round />
      <Cyl r={0.2} top={0.14} h={clear + 0.6} at={[0, (clear + 0.6) / 2, 0]} color={dead ? "#6B5A55" : WOOD_DARK} seg={6} />
      {dead ? (
        <>
          <Cyl r={0.07} h={1.3} at={[0.35, clear + 0.9, 0]} rot={[0, 0, -0.7]} color="#6B5A55" seg={5} />
          <Cyl r={0.07} h={1.2} at={[-0.3, clear + 1.0, 0.15]} rot={[0.3, 0, 0.8]} color="#6B5A55" seg={5} />
          <Cyl r={0.06} h={1.0} at={[0, clear + 1.2, -0.3]} rot={[-0.7, 0, 0]} color="#6B5A55" seg={5} />
          <Cyl r={0.05} h={0.8} at={[0.1, clear + 1.55, 0.1]} color="#6B5A55" seg={5} />
        </>
      ) : (
        <>
          <Ball r={w * 0.48} at={[0, clear + (body.h - clear) * 0.45, 0]} scale={[1, 0.75, 1]} color={LEAF_DARK} ghost={ghost} />
          <Ball r={w * 0.34} at={[0.15, body.h - 0.35, -0.1]} color={LEAF} ghost={ghost} />
          <Ball r={w * 0.25} at={[-0.45, clear + 0.9, 0.35]} color={LEAF} ghost={ghost} />
        </>
      )}
    </>
  );
}

function Chest({ body }: PropProps) {
  const [w, d] = body.size;
  return (
    <>
      <Shadow w={w} d={d} />
      <Box size={[w, body.h * 0.7, d]} at={[0, body.h * 0.35, 0]} color={WOOD} />
      <Box size={[w + 0.04, body.h * 0.3, d + 0.04]} at={[0, body.h * 0.85, 0]} color={WOOD_DARK} />
      <Box size={[0.16, 0.18, 0.04]} at={[0, body.h * 0.65, d / 2 + 0.03]} color="#F2C230" />
    </>
  );
}

function Flowers({ body }: PropProps) {
  const [w, d] = body.size;
  const cols = ["#FF5FA2", "#FFE066", "#FFFFFF", "#FF8FC0"];
  const dots: ReactNode[] = [];
  let k = 0;
  for (let x = -w / 2 + 0.25; x < w / 2; x += 0.42)
    for (let z = -d / 2 + 0.22; z < d / 2; z += 0.38) {
      dots.push(<Ball key={k} r={0.09} at={[x + ((k * 13) % 5) * 0.03, 0.28, z]} color={cols[k % cols.length]} />);
      k++;
    }
  return (
    <>
      <Box size={[w, 0.12, d]} at={[0, 0.06, 0]} color="#7A5A3A" />
      <Box size={[w - 0.1, 0.14, d - 0.1]} at={[0, 0.16, 0]} color={LEAF_DARK} />
      {dots}
    </>
  );
}

function Gate({ body }: PropProps) {
  const [w, d] = body.size;
  const long = Math.max(w, d);
  const alongX = w >= d;
  const bars = Math.max(3, Math.round(long / 0.2));
  return (
    <>
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.18, body.h + 0.1, 0.18]} at={alongX ? [s * (long / 2), (body.h + 0.1) / 2, 0] : [0, (body.h + 0.1) / 2, s * (long / 2)]} color={STONE_DARK} />
      ))}
      {Array.from({ length: bars }, (_, i) => {
        const o = -long / 2 + ((i + 0.5) * long) / bars;
        return <Box key={i} size={[0.04, body.h, 0.04]} at={alongX ? [o, body.h / 2, 0] : [0, body.h / 2, o]} color={IRON} />;
      })}
      {[0.25, body.h - 0.1].map((y) => (
        <Box key={y} size={alongX ? [long, 0.05, 0.05] : [0.05, 0.05, long]} at={[0, y, 0]} color={IRON} />
      ))}
    </>
  );
}

function Fountain({ body }: PropProps) {
  const r = body.size[0] / 2;
  return (
    <>
      <Shadow w={r * 2} d={r * 2} round />
      <Cyl r={r} h={body.h} at={[0, body.h / 2, 0]} color={STONE} seg={8} open />
      <Cyl r={r - 0.02} h={0.05} at={[0, body.h - 0.2, 0]} color="#5FB7E5" seg={8} />
      <Cyl r={0.18} h={1.1} at={[0, 0.55, 0]} color={STONE_DARK} seg={6} />
      <Cyl r={0.45} top={0.5} h={0.12} at={[0, 1.1, 0]} color={STONE} seg={8} />
      <Cyl r={0.4} h={0.03} at={[0, 1.17, 0]} color="#8FD3F2" seg={8} />
    </>
  );
}

function Well({ body }: PropProps) {
  const r = body.size[0] / 2;
  return (
    <>
      <Shadow w={r * 2} d={r * 2} round />
      <Cyl r={r} h={body.h} at={[0, body.h / 2, 0]} color={STONE} seg={8} open />
      <Cyl r={r - 0.05} h={0.04} at={[0, 0.03, 0]} color="#22303A" seg={8} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.1, 1.1, 0.1]} at={[s * (r - 0.05), body.h + 0.55, 0]} color={WOOD_DARK} />
      ))}
      <Box size={[r * 2 + 0.3, 0.08, 0.7]} at={[0, body.h + 1.15, -0.12]} rot={[0.5, 0, 0]} color="#C8573F" />
      <Box size={[r * 2 + 0.3, 0.08, 0.7]} at={[0, body.h + 1.15, 0.12]} rot={[-0.5, 0, 0]} color="#B0492F" />
    </>
  );
}

function Stall({ body, ghost }: PropProps) {
  const [w, d] = body.size;
  const counter = body.clear ?? 0.8;
  const fruit = ["#F2C230", "#E0513A", "#8CC152", "#F28C28"];
  return (
    <>
      <Shadow w={w} d={d} />
      <Box size={[w, 0.12, d]} at={[0, counter, 0]} color={WOOD} ghost={ghost} />
      <Box size={[w, counter - 0.1, 0.06]} at={[0, (counter - 0.1) / 2, -d / 2 + 0.05]} color={WOOD_DARK} ghost={ghost} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Box key={`${sx}${sz}`} size={[0.08, body.h, 0.08]} at={[sx * (w / 2 - 0.06), body.h / 2, sz * (d / 2 - 0.06)]} color={WOOD_DARK} ghost={ghost} />),
      )}
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} size={[w / 6, 0.07, d + 0.25]} at={[-w / 2 + w / 12 + (i * w) / 6, body.h + 0.05, 0.1]} rot={[0.18, 0, 0]} color={i % 2 ? "#FFFFFF" : "#E0513A"} ghost={ghost} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <Ball key={i} r={0.11} at={[-w / 2 + 0.25 + (i % 4) * ((w - 0.5) / 3), counter + 0.14, i < 4 ? -0.15 : 0.18]} color={fruit[i % fruit.length]} ghost={ghost} />
      ))}
    </>
  );
}

function Lamp({ body }: PropProps) {
  return (
    <>
      <Shadow w={0.4} d={0.4} round />
      <Box size={[0.3, 0.2, 0.3]} at={[0, 0.1, 0]} color={IRON} />
      <Cyl r={0.06} h={body.h} at={[0, body.h / 2, 0]} color={IRON} seg={6} />
      {/* The arm reaches west, over the stall: the gnome hangs from it. */}
      <Box size={[0.9, 0.06, 0.06]} at={[-0.45, body.h - 0.25, 0]} color={IRON} />
      <Box size={[0.26, 0.3, 0.26]} at={[0, body.h + 0.12, 0]} color="#FFE066" />
      <Cyl r={0.2} top={0.02} h={0.2} at={[0, body.h + 0.37, 0]} color={IRON} seg={4} />
    </>
  );
}

function Crate({ body }: PropProps) {
  const [w, d] = body.size;
  return (
    <>
      <Shadow w={w} d={d} />
      <Box size={[w, body.h, d]} at={[0, body.h / 2, 0]} color="#C08A4C" />
      <Box size={[w + 0.02, 0.08, d + 0.02]} at={[0, body.h - 0.04, 0]} color={WOOD_DARK} />
      <Box size={[w + 0.02, 0.08, d + 0.02]} at={[0, 0.04, 0]} color={WOOD_DARK} />
      <Box size={[0.08, body.h, d + 0.03]} at={[0, body.h / 2, 0]} rot={[0, 0, 0.8]} color={WOOD_DARK} />
    </>
  );
}

function Cart({ body, ghost }: PropProps) {
  const [w, d] = body.size;
  const base = body.clear ?? 0.45;
  return (
    <>
      <Shadow w={w} d={d} />
      <Box size={[w, 0.1, d]} at={[0, base, 0]} color={WOOD} ghost={ghost} />
      <Box size={[w, body.h - base, 0.06]} at={[0, (base + body.h) / 2, d / 2]} color={WOOD_DARK} ghost={ghost} />
      <Box size={[w, body.h - base, 0.06]} at={[0, (base + body.h) / 2, -d / 2]} color={WOOD_DARK} ghost={ghost} />
      <Box size={[0.06, body.h - base, d]} at={[w / 2, (base + body.h) / 2, 0]} color={WOOD_DARK} ghost={ghost} />
      {[-1, 1].map((s) => (
        <Cyl key={s} r={0.32} h={0.08} at={[0, 0.32, s * (d / 2 + 0.05)]} rot={[Math.PI / 2, 0, 0]} color={IRON} seg={8} />
      ))}
      <Box size={[0.9, 0.06, 0.06]} at={[-w / 2 - 0.4, base, 0.25]} color={WOOD_DARK} />
      <Box size={[0.9, 0.06, 0.06]} at={[-w / 2 - 0.4, base, -0.25]} color={WOOD_DARK} />
      <Ball r={0.18} at={[0.2, body.h - 0.05, 0]} color="#8CC152" />
      <Ball r={0.16} at={[-0.25, body.h - 0.08, 0.1]} color="#F28C28" />
    </>
  );
}

function Street({ body }: PropProps) {
  const [w, d] = body.size;
  const alongX = w >= d;
  return (
    <>
      <Box size={[w, 0.04, d]} at={[0, 0.02, 0]} color="#8E8A93" />
      {Array.from({ length: Math.floor(Math.max(w, d) / 1.2) }, (_, i) => {
        const o = -Math.max(w, d) / 2 + 0.6 + i * 1.2;
        return <Box key={i} size={alongX ? [0.5, 0.01, 0.08] : [0.08, 0.01, 0.5]} at={alongX ? [o, 0.045, 0] : [0, 0.045, o]} color="#D8D2C4" />;
      })}
    </>
  );
}

function Gravestone({ body }: PropProps) {
  const [w, d] = body.size;
  const broken = body.tint === "broken";
  return (
    <>
      <Shadow w={w} d={d + 0.3} />
      <group rotation={[0, 0, broken ? 0.12 : 0]}>
        <Box size={[w, body.h - w / 2, d]} at={[0, (body.h - w / 2) / 2, 0]} color={STONE} />
        {!broken && <Cyl r={w / 2} h={d} at={[0, body.h - w / 2, 0]} rot={[Math.PI / 2, 0, 0]} color={STONE} seg={10} />}
        <Box size={[w * 0.5, 0.06, 0.02]} at={[0, body.h * 0.5, d / 2 + 0.01]} color={STONE_DARK} />
      </group>
      <Box size={[w + 0.3, 0.06, 0.9]} at={[0, 0.03, d / 2 + 0.45]} color="#6E7F5C" />
    </>
  );
}

function Fence({ body }: PropProps) {
  const [w] = body.size;
  const posts = Math.round(w / 0.5) + 1;
  return (
    <>
      {Array.from({ length: posts }, (_, i) => (
        <group key={i} position={[-w / 2 + (i * w) / (posts - 1), 0, 0]}>
          <Box size={[0.06, body.h, 0.06]} at={[0, body.h / 2, 0]} color={IRON} />
          <Cyl r={0.06} top={0} h={0.16} at={[0, body.h + 0.08, 0]} color={IRON} seg={4} />
        </group>
      ))}
      {[0.3, body.h - 0.15].map((y) => (
        <Box key={y} size={[w, 0.05, 0.05]} at={[0, y, 0]} color={IRON} />
      ))}
    </>
  );
}

function Crypt({ body }: PropProps) {
  const [w, d] = body.size;
  const t = 0.18;
  const door = body.front === "e";
  return (
    <>
      <Shadow w={w} d={d} />
      <Box size={[w, 0.08, d]} at={[0, 0.04, 0]} color={STONE_DARK} />
      {/* A roofless ruin: the stair down to the basement shows from above. */}
      <Box size={[0.8, 0.02, 0.8]} at={[0, 0.09, 0]} color="#1E1622" />
      {[0.25, 0.45].map((o, i) => (
        <Box key={i} size={[0.8, 0.02, 0.12]} at={[0, 0.1, -0.4 + o * 0.9 + i * 0.1]} color="#4A3F4F" />
      ))}
      <Box size={[w, body.h, t]} at={[0, body.h / 2, -d / 2 + t / 2]} color={STONE} />
      <Box size={[w, body.h * 0.8, t]} at={[0, (body.h * 0.8) / 2, d / 2 - t / 2]} color={STONE} />
      <Box size={[t, body.h, d]} at={[-w / 2 + t / 2, body.h / 2, 0]} color={STONE} />
      {door ? (
        <>
          <Box size={[t, body.h, d * 0.3]} at={[w / 2 - t / 2, body.h / 2, -d * 0.35]} color={STONE} />
          <Box size={[t, body.h, d * 0.3]} at={[w / 2 - t / 2, body.h / 2, d * 0.35]} color={STONE} />
          <Box size={[t, 0.35, d * 0.4]} at={[w / 2 - t / 2, body.h - 0.17, 0]} color={STONE_DARK} />
        </>
      ) : (
        <Box size={[t, body.h, d]} at={[w / 2 - t / 2, body.h / 2, 0]} color={STONE} />
      )}
      <Box size={[0.2, 0.7, 0.08]} at={[0, body.h + 0.3, -d / 2 + t / 2]} color={STONE_DARK} />
      <Box size={[0.5, 0.12, 0.08]} at={[0, body.h + 0.45, -d / 2 + t / 2]} color={STONE_DARK} />
    </>
  );
}

function Coffin({ body }: PropProps) {
  const [w, d] = body.size;
  const t = 0.07;
  return (
    <>
      <Shadow w={w} d={d} />
      <Box size={[w, 0.06, d]} at={[0, 0.03, 0]} color="#3A2530" />
      <Box size={[w, body.h, t]} at={[0, body.h / 2, -d / 2]} color={WOOD_DARK} />
      <Box size={[w, body.h, t]} at={[0, body.h / 2, d / 2]} color={WOOD_DARK} />
      <Box size={[t, body.h, d]} at={[-w / 2, body.h / 2, 0]} color={WOOD_DARK} />
      <Box size={[t, body.h, d]} at={[w / 2, body.h / 2, 0]} color={WOOD_DARK} />
      {/* The lid, propped against the side. */}
      <Box size={[0.06, w + 0.1, d + 0.05]} at={[w / 2 + 0.35, 0.4, 0]} rot={[0, 0, -0.45]} color={WOOD} />
    </>
  );
}

function Tower({ body }: PropProps) {
  const [w] = body.size;
  const wall = body.h - 0.8;
  return (
    <>
      <Shadow w={w} d={w} />
      <Cyl r={w / 2} h={wall} at={[0, wall / 2, 0]} color={STONE} seg={8} />
      <Cyl r={w / 2 + 0.08} h={0.12} at={[0, wall, 0]} color={STONE_DARK} seg={8} />
      <Cyl r={w / 2 + 0.08} top={0.04} h={0.8} at={[0, wall + 0.4, 0]} color="#5A6DB0" seg={8} />
      {[1.2, 2.3].map((y) => (
        <Box key={y} size={[0.25, 0.4, 0.05]} at={[0, y, w / 2 - 0.02]} color="#1E1622" />
      ))}
      <Box size={[0.5, 0.9, 0.05]} at={[0, 0.45, w / 2 - 0.02]} color={WOOD_DARK} />
    </>
  );
}

function Hill({ body }: PropProps) {
  const [w, d] = body.size;
  return (
    <>
      <Box size={[w, body.h * 0.5, d]} at={[0, body.h * 0.25, 0]} color="#5E9E48" />
      <Box size={[w * 0.66, body.h * 0.5, d * 0.66]} at={[0, body.h * 0.75, 0]} color="#72B356" />
      <Box size={[w * 0.66 + 0.02, 0.02, 0.3]} at={[0, body.h * 0.5 + 0.01, d * 0.4]} color="#C9AE7D" />
    </>
  );
}

function Pond({ body }: PropProps) {
  const [w, d] = body.size;
  return (
    <>
      <Box size={[w + 0.2, 0.05, d + 0.2]} at={[0, 0.025, 0]} color="#8C8C7A" />
      <Box size={[w, 0.06, d]} at={[0, 0.035, 0]} color="#4FA3D9" />
      <Box size={[w * 0.3, 0.005, 0.08]} at={[-w * 0.15, 0.07, -d * 0.2]} color="#9BD3F2" />
      <Box size={[w * 0.2, 0.005, 0.08]} at={[w * 0.2, 0.07, d * 0.15]} color="#9BD3F2" />
      <Cyl r={0.18} h={0.02} at={[w * 0.25, 0.08, -d * 0.25]} color="#5E9E48" seg={7} />
      <Cyl r={0.14} h={0.02} at={[-w * 0.3, 0.08, d * 0.2]} color="#5E9E48" seg={7} />
    </>
  );
}

function Path({ body }: PropProps) {
  const [w, d] = body.size;
  const n = Math.floor(d / 0.7);
  return (
    <>
      <Box size={[w, 0.03, d]} at={[0, 0.015, 0]} color="#D9C08E" />
      {Array.from({ length: n }, (_, i) => (
        <Box key={i} size={[w * 0.45, 0.02, 0.35]} at={[(i % 2 ? 0.15 : -0.15) * w, 0.035, -d / 2 + 0.35 + i * 0.7]} color="#BFA274" />
      ))}
    </>
  );
}

function HedgeWall({ body, gap }: PropProps & { gap: number }) {
  const [w, d] = body.size;
  const seg = (w - gap) / 2;
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (gap / 2 + seg / 2), 0, 0]}>
          <Shadow w={seg} d={d} />
          <Box size={[seg, body.h, d]} at={[0, body.h / 2, 0]} color="#2F6E3A" />
          <Box size={[seg - 0.08, 0.1, d - 0.08]} at={[0, body.h + 0.05, 0]} color="#3E8A48" />
        </group>
      ))}
    </>
  );
}

/** The prop for a body, or null (rooms, groups). */
export function Prop({ body, ghost }: PropProps) {
  switch (body.kind) {
    case "hedge":
      return <Hedge body={body} ghost={ghost} />;
    case "statue":
      return <Statue body={body} ghost={ghost} />;
    case "urn":
      return <Urn body={body} ghost={ghost} />;
    case "bench":
      return <Bench body={body} ghost={ghost} />;
    case "tree":
      return <Tree body={body} ghost={ghost} />;
    case "deadtree":
      return <Tree body={body} ghost={ghost} dead />;
    case "chest":
      return <Chest body={body} ghost={ghost} />;
    case "flowers":
      return <Flowers body={body} ghost={ghost} />;
    case "gate":
    case "reja":
      return <Gate body={body} ghost={ghost} />;
    case "fountain":
      return <Fountain body={body} ghost={ghost} />;
    case "well":
      return <Well body={body} ghost={ghost} />;
    case "stall":
      return <Stall body={body} ghost={ghost} />;
    case "lamp":
      return <Lamp body={body} ghost={ghost} />;
    case "crate":
      return <Crate body={body} ghost={ghost} />;
    case "cart":
      return <Cart body={body} ghost={ghost} />;
    case "street":
      return <Street body={body} ghost={ghost} />;
    case "gravestone":
      return <Gravestone body={body} ghost={ghost} />;
    case "fence":
      return <Fence body={body} ghost={ghost} />;
    case "crypt":
      return <Crypt body={body} ghost={ghost} />;
    case "coffin":
      return <Coffin body={body} ghost={ghost} />;
    case "tower":
      return <Tower body={body} ghost={ghost} />;
    case "hill":
      return <Hill body={body} ghost={ghost} />;
    case "pond":
      return <Pond body={body} ghost={ghost} />;
    case "path":
      return <Path body={body} ghost={ghost} />;
    case "hedgewall":
      return <HedgeWall body={body} ghost={ghost} gap={1.6} />;
    default:
      return null;
  }
}

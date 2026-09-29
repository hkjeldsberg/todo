"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { BackSide, MeshBasicMaterial, type Group, type Mesh } from "three";
import type { Dir, Pose } from "../model/layouts";
import { flat, unlit } from "./materials";

/**
 * The gnome: red hat, white beard, blue coat. He scurries (little hops) from
 * wherever he is to the next hiding spot, then takes the spot's pose and
 * pulses with a pink outline so he can always be found.
 */

export interface GnomeTarget {
  key: string;
  at: [number, number];
  y: number;
  pose: Pose;
  face?: Dir;
  /** Centre he circles around (pose "circle"). */
  orbit?: [number, number];
  /** Where the thing he leans on is (pose "lean"). */
  leanTo?: [number, number];
}

const FACE: Record<Dir, number> = { s: 0, e: Math.PI / 2, n: Math.PI, w: -Math.PI / 2 };
const HEIGHT = 0.82;

/** The pink pulse outline. One gnome, one material: animated from useFrame. */
const OUTLINE = new MeshBasicMaterial({ color: "#FF5FA2", side: BackSide, transparent: true, opacity: 0.8, depthWrite: false });

function Parts({ outline }: { outline?: MeshBasicMaterial }) {
  const m = (c: string) => outline ?? flat(c);
  return (
    <>
      {/* boots */}
      <mesh position={[-0.09, 0.05, 0.02]} material={m("#4A2E1E")}>
        <boxGeometry args={[0.12, 0.1, 0.18]} />
      </mesh>
      <mesh position={[0.09, 0.05, 0.02]} material={m("#4A2E1E")}>
        <boxGeometry args={[0.12, 0.1, 0.18]} />
      </mesh>
      {/* coat */}
      <mesh position={[0, 0.27, 0]} material={m("#3E6FC7")}>
        <cylinderGeometry args={[0.13, 0.2, 0.36, 7]} />
      </mesh>
      <mesh position={[0, 0.2, 0]} material={m("#3D2140")}>
        <cylinderGeometry args={[0.185, 0.19, 0.05, 7]} />
      </mesh>
      {/* face + nose */}
      <mesh position={[0, 0.5, 0]} material={m("#F4C7A1")}>
        <icosahedronGeometry args={[0.13, 1]} />
      </mesh>
      <mesh position={[0, 0.5, 0.13]} material={m("#E89A7C")}>
        <icosahedronGeometry args={[0.04, 0]} />
      </mesh>
      {/* beard */}
      <mesh position={[0, 0.38, 0.08]} rotation={[Math.PI + 0.25, 0, 0]} material={m("#FFFFFF")}>
        <coneGeometry args={[0.12, 0.26, 6]} />
      </mesh>
      {/* hat */}
      <mesh position={[0, 0.66, -0.02]} rotation={[-0.15, 0, 0]} material={m("#E0413A")}>
        <coneGeometry args={[0.15, 0.36, 7]} />
      </mesh>
    </>
  );
}

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function Gnome({ target, reducedMotion, onArrive }: { target: GnomeTarget; reducedMotion: boolean; onArrive: (key: string) => void }) {
  const root = useRef<Group>(null);
  const pose = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const trip = useRef({ key: "", from: [0, 0, 0] as [number, number, number], t: 1, dur: 1, arrived: true, orbit: 0 });

  useFrame(({ clock }, dt) => {
    const g = root.current;
    const p = pose.current;
    if (!g || !p) return;
    const tr = trip.current;
    const [tx, tz] = target.at;
    const ty = target.y;

    if (tr.key !== target.key) {
      const first = tr.key === "";
      tr.key = target.key;
      tr.from = first ? [tx, ty, tz + 7] : [g.position.x, g.position.y, g.position.z];
      const dist = Math.hypot(tx - tr.from[0], tz - tr.from[2]) + Math.abs(ty - tr.from[1]);
      tr.dur = reducedMotion ? 0.01 : Math.max(0.9, Math.min(2.2, dist / 5.5));
      tr.t = 0;
      tr.arrived = false;
    }

    const time = clock.elapsedTime;
    if (!tr.arrived) {
      tr.t = Math.min(1, tr.t + dt / tr.dur);
      const k = ease(tr.t);
      const [fx, fy, fz] = tr.from;
      const x = fx + (tx - fx) * k;
      const z = fz + (tz - fz) * k;
      const climb = Math.max(fy, ty) + 0.5;
      const arc = Math.sin(Math.PI * tr.t) * (climb - (fy + (ty - fy) * k)) * 0.9;
      const hops = Math.abs(Math.sin(tr.t * Math.PI * 7)) * 0.12;
      g.position.set(x, fy + (ty - fy) * k + arc + hops, z);
      g.rotation.y = Math.atan2(tx - fx, tz - fz);
      p.rotation.set(0, 0, Math.sin(time * 22) * 0.12);
      p.position.set(0, 0, 0);
      p.scale.set(1, 1, 1);
      if (tr.t >= 1) {
        tr.arrived = true;
        onArrive(tr.key);
      }
    } else {
      let x = tx;
      let z = tz;
      let yaw = target.face ? FACE[target.face] : 0;
      if (target.pose === "circle" && target.orbit) {
        const [cx, cz] = target.orbit;
        const r = Math.hypot(tx - cx, tz - cz);
        tr.orbit += reducedMotion ? 0 : dt * 1.6;
        const a = Math.atan2(tx - cx, tz - cz) + tr.orbit;
        x = cx + Math.sin(a) * r;
        z = cz + Math.cos(a) * r;
        yaw = a + Math.PI / 2;
      }
      if (target.pose === "lean" && target.leanTo) yaw = Math.atan2(target.leanTo[0] - tx, target.leanTo[1] - tz) + Math.PI;
      const bob = reducedMotion || target.pose === "circle" ? 0 : Math.sin(time * 3) * 0.015;
      g.position.set(x, ty + bob, z);
      g.rotation.y = yaw;
      p.scale.set(1, 1, 1);
      p.position.set(0, 0, 0);
      p.rotation.set(0, 0, 0);
      switch (target.pose) {
        case "crouch":
          p.scale.set(1.05, 0.72, 1.05);
          break;
        case "sit":
          p.scale.set(1, 0.85, 1);
          break;
        case "lie_up":
          p.rotation.set(-Math.PI / 2, 0, 0);
          p.position.set(0, 0.16, -0.35);
          break;
        case "lie_down":
          p.rotation.set(Math.PI / 2, 0, 0);
          p.position.set(0, 0.16, 0.35);
          break;
        case "upside":
          p.rotation.set(0, 0, Math.PI + Math.sin(time * 2) * 0.1);
          p.position.set(0, HEIGHT, 0);
          break;
        case "hang":
          p.rotation.set(0, 0, Math.sin(time * 2) * 0.12);
          break;
        case "lean":
          p.rotation.set(-0.22, 0, 0);
          break;
        case "circle":
          p.rotation.set(0, 0, Math.sin(time * 22) * 0.1);
          p.position.set(0, Math.abs(Math.sin(time * 11)) * 0.08, 0);
          break;
      }
    }
    OUTLINE.opacity = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(time * 4));
    const r = ring.current;
    if (r) {
      const s = 1 + 0.18 * (0.5 + 0.5 * Math.sin(time * 4));
      r.scale.set(s, s, s);
      r.visible = tr.arrived && target.pose !== "circle";
    }
  });

  return (
    <group ref={root} scale={1.35}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} material={unlit("#FF5FA2", 0.55)}>
        <ringGeometry args={[0.34, 0.42, 20]} />
      </mesh>
      <group ref={pose}>
        <Parts />
        <group scale={[1.16, 1.08, 1.16]} position={[0, -0.03, 0]}>
          <Parts outline={OUTLINE} />
        </group>
      </group>
    </group>
  );
}

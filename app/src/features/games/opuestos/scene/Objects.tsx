"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ComponentType, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { angleOf, type Room, type SimObject } from "../lib/room";
import type { LayoutObject, ObjectKind, Rect, Word } from "../lib/types";
import { KIND_COLOR, MEMO, lookFor, toonGradient, type Look } from "./look";

/**
 * One component per layout object. Physics lives in the Room (lib/room.ts);
 * these only follow it every frame through refs, so React never re-renders
 * during play. Words re-render an object once, to swap its material.
 */

const DEPTH = 2;
const DYN_DEPTH = 0.9;
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitSphere = new THREE.SphereGeometry(0.5, 32, 18);

export interface ObjectViewProps {
  spec: LayoutObject;
  roomRef: RefObject<Room | null>;
  /** Active words on this object, in the order they were fired. */
  words: Word[];
  /** Hovered or zapped: pink rim. */
  highlight: boolean;
}

/** Toon material driven by a Look; pulses when hot. */
function ToonMat({ look, side }: { look: Look; side?: THREE.Side }) {
  const ref = useRef<THREE.MeshToonMaterial>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (m && look.pulse) m.emissiveIntensity = 0.45 + 0.35 * Math.sin(clock.elapsedTime * 6);
  });
  return (
    <meshToonMaterial
      ref={ref}
      color={look.color}
      gradientMap={toonGradient()}
      emissive={look.emissive}
      emissiveIntensity={look.emissiveIntensity}
      transparent={look.opacity < 1}
      opacity={look.opacity}
      map={look.map}
      bumpMap={look.bumpMap}
      bumpScale={look.bumpMap ? 8 : 1}
      side={side}
    />
  );
}

/** A back-face shell: pink selection rim, hot glow, frost. */
function Shell({ color, pulse, geometry }: { color: string; pulse?: boolean; geometry: THREE.BufferGeometry }) {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (ref.current && pulse) ref.current.opacity = 0.35 + 0.25 * Math.sin(clock.elapsedTime * 6);
  });
  return (
    <mesh geometry={geometry} scale={1.14} raycast={() => null}>
      <meshBasicMaterial ref={ref} color={color} side={THREE.BackSide} transparent opacity={0.55} depthWrite={false} />
    </mesh>
  );
}

/** Follows the body: position, spin, and eased size. Returns the eased size for children. */
function useFollow(spec: LayoutObject, roomRef: RefObject<Room | null>, onFrame?: (obj: SimObject | undefined, dt: number, t: number) => void) {
  const group = useRef<THREE.Group>(null);
  const scaled = useRef<THREE.Group>(null);
  const size = useRef({ w: spec.size?.[0] ?? 1, h: spec.kind === "pipe" ? (spec.opening ?? 1) : (spec.size?.[1] ?? 1) });
  useFrame(({ clock }, dt) => {
    const obj = roomRef.current?.objects.get(spec.id);
    const g = group.current;
    if (!g) return;
    if (obj) {
      const t = obj.body.translation();
      g.position.set(t.x, t.y, 0);
      g.rotation.z = angleOf(obj.body);
      const k = Math.min(1, dt * 9);
      size.current.w += (obj.w - size.current.w) * k;
      size.current.h += (obj.h - size.current.h) * k;
    }
    if (scaled.current && spec.kind !== "pipe") {
      const depth = spec.kind === "ball" ? size.current.w : ["box", "bucket"].includes(spec.kind) ? DYN_DEPTH : DEPTH;
      scaled.current.scale.set(size.current.w, size.current.h, depth);
    }
    onFrame?.(obj, dt, clock.elapsedTime);
  });
  return { group, scaled, size };
}

function Frame({
  spec,
  roomRef,
  children,
  onFrame,
}: {
  spec: LayoutObject;
  roomRef: RefObject<Room | null>;
  children: ReactNode;
  onFrame?: (obj: SimObject | undefined, dt: number, t: number) => void;
}) {
  const { group, scaled } = useFollow(spec, roomRef, onFrame);
  return (
    <group ref={group} position={[spec.pos[0], spec.pos[1], 0]} rotation={[0, 0, ((spec.angle ?? 0) * Math.PI) / 180]}>
      <group ref={scaled}>{children}</group>
    </group>
  );
}

// ─── kinds ────────────────────────────────────────────────────────────────

function Solid({ spec, roomRef, words, highlight }: ObjectViewProps) {
  const look = useMemo(() => lookFor(spec.kind, words, spec.color), [spec.kind, spec.color, words]);
  const wobble = useRef<THREE.Mesh>(null);
  return (
    <Frame
      spec={spec}
      roomRef={roomRef}
      onFrame={(_, __, t) => {
        if (wobble.current) {
          const s = look.wobble ? 1 + Math.sin(t * 9) * 0.04 : 1;
          wobble.current.scale.set(1 / s, s, 1);
        }
      }}
    >
      <mesh ref={wobble} geometry={spec.kind === "ball" ? unitSphere : unitBox}>
        <ToonMat look={look} />
      </mesh>
      {spec.kind === "ball" && (
        // A band so you can see it roll.
        <mesh rotation={[0, Math.PI / 2, 0]} scale={1.005}>
          <torusGeometry args={[0.5, 0.05, 8, 40]} />
          <meshToonMaterial color="#ffffff" gradientMap={toonGradient()} />
        </mesh>
      )}
      {spec.kind === "box" && (
        <mesh scale={[0.2, 1.01, 1.01]}>
          <boxGeometry />
          <meshToonMaterial color="#f7d9a8" gradientMap={toonGradient()} />
        </mesh>
      )}
      {look.halo && <Shell color={look.halo} pulse={look.pulse} geometry={spec.kind === "ball" ? unitSphere : unitBox} />}
      {highlight && <Shell color={MEMO.accent} geometry={spec.kind === "ball" ? unitSphere : unitBox} />}
    </Frame>
  );
}

function Bucket({ spec, roomRef, words, highlight }: ObjectViewProps) {
  const look = useMemo(() => lookFor(spec.kind, words, spec.color), [spec.kind, spec.color, words]);
  const fill = words.find((w) => w.engine_target === "fill");
  const level = fill ? (fill.value_modifier > 1 ? 0.85 : 0.08) : 0.4;
  return (
    <Frame spec={spec} roomRef={roomRef}>
      <mesh>
        <cylinderGeometry args={[0.5, 0.4, 1, 24, 1, true]} />
        <ToonMat look={look} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 24]} />
        <ToonMat look={look} />
      </mesh>
      <mesh position={[0, -0.5 + level / 2, 0]} scale={[1, level, 1]}>
        <cylinderGeometry args={[0.46, 0.4, 1, 24]} />
        <meshToonMaterial color="#5fb7ff" gradientMap={toonGradient()} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <torusGeometry args={[0.46, 0.03, 6, 24, Math.PI]} />
        <meshToonMaterial color={MEMO.ink} gradientMap={toonGradient()} />
      </mesh>
      {highlight && <Shell color={MEMO.accent} geometry={unitBox} />}
    </Frame>
  );
}

/** Glass: shatters into shards once the room says it broke. */
function Glass({ spec, roomRef, words, highlight }: ObjectViewProps) {
  const look = useMemo(() => lookFor(spec.kind, words, spec.color), [spec.kind, spec.color, words]);
  const pane = useRef<THREE.Group>(null);
  const shards = useRef<THREE.Group>(null);
  const brokenAt = useRef<number | null>(null);
  const [w, h] = spec.size!;
  const pieces = useMemo(() => {
    const out: { x: number; y: number; vx: number; vy: number; spin: number; s: number }[] = [];
    let seed = 5;
    const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 12; i++) {
      out.push({ x: (r() - 0.5) * w, y: (r() - 0.5) * h, vx: (r() - 0.5) * 3, vy: r() * 2, spin: (r() - 0.5) * 12, s: 0.12 + r() * 0.2 });
    }
    return out;
  }, [w, h]);
  return (
    <group>
      <Frame
        spec={spec}
        roomRef={roomRef}
        onFrame={(obj, _, t) => {
          const broken = !!obj?.broken;
          if (broken && brokenAt.current === null) brokenAt.current = t;
          if (!broken) brokenAt.current = null;
          if (pane.current) pane.current.visible = !broken;
          const g = shards.current;
          if (!g) return;
          g.visible = broken && t - (brokenAt.current ?? t) < 2;
          if (!g.visible) return;
          const dt = t - brokenAt.current!;
          g.children.forEach((m, i) => {
            const p = pieces[i];
            m.position.set(p.x + p.vx * dt, p.y + p.vy * dt - 4.9 * dt * dt, 0.3);
            m.rotation.set(p.spin * dt, p.spin * dt * 0.5, p.spin * dt);
          });
        }}
      >
        <group ref={pane}>
          <mesh geometry={unitBox}>
            <ToonMat look={look} />
          </mesh>
          {highlight && <Shell color={MEMO.accent} geometry={unitBox} />}
        </group>
      </Frame>
      <group position={[spec.pos[0], spec.pos[1], 0]}>
        <group ref={shards} visible={false}>
          {pieces.map((p, i) => (
            <mesh key={i} scale={[p.s, p.s * 0.6, 0.05]}>
              <boxGeometry />
              <meshToonMaterial color={KIND_COLOR.glass} gradientMap={toonGradient()} transparent opacity={0.8} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/** Ice: slumps into a puddle when melted. */
function Ice({ spec, roomRef, words, highlight }: ObjectViewProps) {
  const look = useMemo(() => lookFor(spec.kind, words, spec.color), [spec.kind, spec.color, words]);
  const block = useRef<THREE.Group>(null);
  const puddle = useRef<THREE.Mesh>(null);
  const melt = useRef(0);
  const [, h] = spec.size!;
  return (
    <Frame
      spec={spec}
      roomRef={roomRef}
      onFrame={(obj, dt) => {
        const target = obj?.melted ? 1 : 0;
        melt.current += (target - melt.current) * Math.min(1, dt * 2.5);
        const m = melt.current;
        if (block.current) {
          block.current.scale.set(1, Math.max(0.001, 1 - m), 1);
          block.current.position.y = -0.5 * m;
          block.current.visible = m < 0.98;
        }
        if (puddle.current) {
          puddle.current.visible = m > 0.05;
          puddle.current.scale.set(1 + m * 1.2, 0.04 / h, 1);
          puddle.current.position.y = -0.5 + 0.02 / h;
        }
      }}
    >
      <group ref={block}>
        <mesh geometry={unitBox}>
          <ToonMat look={look} />
        </mesh>
        {highlight && <Shell color={MEMO.accent} geometry={unitBox} />}
      </group>
      <mesh ref={puddle} geometry={unitBox} visible={false}>
        <meshToonMaterial color={KIND_COLOR.water} gradientMap={toonGradient()} transparent opacity={0.7} />
      </mesh>
    </Frame>
  );
}

/** Water pool in its zone; freezes into a pale slab. */
function Water({ spec, words, roomRef, highlight }: ObjectViewProps) {
  const [x0, y0, x1, y1] = spec.zone!;
  const w = x1 - x0;
  const h = y1 - y0;
  const look = useMemo(() => lookFor(spec.kind, words, spec.color), [spec.kind, spec.color, words]);
  const mat = useRef<THREE.MeshToonMaterial>(null);
  const slab = useRef<THREE.Mesh>(null);
  const surface = useRef<THREE.Mesh>(null);
  const water = useMemo(() => new THREE.Color(KIND_COLOR.water), []);
  const ice = useMemo(() => new THREE.Color("#e4f5ff"), []);
  const freeze = useRef(spec.frozen ? 1 : 0);
  useFrame(({ clock }, dt) => {
    const obj = roomRef.current?.objects.get(spec.id);
    const target = obj?.frozen ? 1 : 0;
    freeze.current += (target - freeze.current) * Math.min(1, dt * 3);
    const f = freeze.current;
    if (mat.current) mat.current.color.copy(water).lerp(ice, f * 0.5);
    if (slab.current) {
      slab.current.visible = f > 0.02;
      slab.current.scale.set(w, 0.4 * f, DEPTH * 0.98);
      slab.current.position.y = y1 - 0.2 * f;
    }
    if (surface.current) surface.current.position.y = y1 - 0.06 + Math.sin(clock.elapsedTime * 2.2) * 0.03 * (1 - f);
  });
  return (
    <group position={[(x0 + x1) / 2, 0, 0]}>
      <mesh position={[0, y0 + h / 2, 0]} scale={[w, h, DEPTH * 0.96]}>
        <boxGeometry />
        <meshToonMaterial ref={mat} color={look.color} gradientMap={toonGradient()} transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <mesh ref={surface} scale={[w, 0.12, DEPTH * 0.97]}>
        <boxGeometry />
        <meshToonMaterial color="#a8dcff" gradientMap={toonGradient()} transparent opacity={0.8} />
      </mesh>
      <mesh ref={slab} visible={false}>
        <boxGeometry />
        <meshToonMaterial color="#e8f7ff" gradientMap={toonGradient()} map={look.map} />
      </mesh>
      {highlight && (
        <mesh position={[0, y0 + h / 2, 0]} scale={[w + 0.15, h + 0.15, DEPTH]}>
          <boxGeometry />
          <meshBasicMaterial color={MEMO.accent} side={THREE.BackSide} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/** Door: slides up out of the way. */
function Door({ spec, roomRef, words, highlight }: ObjectViewProps) {
  const look = useMemo(() => lookFor(spec.kind, words, spec.color), [spec.kind, spec.color, words]);
  const panel = useRef<THREE.Group>(null);
  const open = useRef(spec.open ? 1 : 0);
  return (
    <Frame
      spec={spec}
      roomRef={roomRef}
      onFrame={(obj, dt) => {
        open.current += ((obj?.open ? 1 : 0) - open.current) * Math.min(1, dt * 5);
        if (panel.current) panel.current.position.y = open.current * 0.95;
      }}
    >
      <group ref={panel}>
        <mesh geometry={unitBox}>
          <ToonMat look={look} />
        </mesh>
        <mesh position={[0, 0, 0.5]} scale={[0.35, 0.05, 0.1]}>
          <boxGeometry />
          <meshToonMaterial color={MEMO.ink} gradientMap={toonGradient()} />
        </mesh>
        {highlight && <Shell color={MEMO.accent} geometry={unitBox} />}
      </group>
    </Frame>
  );
}

/** Pressure plate: sinks and turns pink under enough weight. */
function Plate({ spec, roomRef }: ObjectViewProps) {
  const mat = useRef<THREE.MeshToonMaterial>(null);
  const cap = useRef<THREE.Mesh>(null);
  const off = useMemo(() => new THREE.Color(KIND_COLOR.plate), []);
  const on = useMemo(() => new THREE.Color(MEMO.accent), []);
  return (
    <Frame
      spec={spec}
      roomRef={roomRef}
      onFrame={(obj) => {
        const pressed = !!obj?.pressed;
        mat.current?.color.copy(pressed ? on : off);
        if (cap.current) cap.current.position.y = pressed ? -0.25 : 0.1;
      }}
    >
      <mesh ref={cap} geometry={unitBox}>
        <meshToonMaterial ref={mat} color={KIND_COLOR.plate} gradientMap={toonGradient()} />
      </mesh>
    </Frame>
  );
}

/** Fan: housing, spinning rotor, and wind streaks through its zone while on. */
function Fan({ spec, roomRef, words, highlight }: ObjectViewProps) {
  const look = useMemo(() => lookFor(spec.kind, words, spec.color), [spec.kind, spec.color, words]);
  const rotor = useRef<THREE.Group>(null);
  const wind = useRef<THREE.Group>(null);
  const [dx, dy] = spec.dir!;
  const n = Math.hypot(dx, dy) || 1;
  const angle = Math.atan2(dy / n, dx / n) - Math.PI / 2;
  const [x0, y0, x1, y1] = spec.zone!;
  const [w, h] = spec.size ?? [1, 0.35];
  const streaks = useMemo(() => Array.from({ length: 10 }, (_, i) => ({ u: (i * 0.37) % 1, v: ((i * 0.61) % 1) - 0.5 })), []);
  const spin = useRef(0);
  useFrame((_, dt) => {
    const obj = roomRef.current?.objects.get(spec.id);
    const on = !!obj?.on;
    const speed = on ? (obj?.slots.speed?.value_modifier ?? 1) : 0;
    spin.current += dt * 18 * speed;
    if (rotor.current) rotor.current.rotation.y = spin.current;
    const g = wind.current;
    if (!g) return;
    g.visible = on;
    if (!on) return;
    const len = Math.hypot(x1 - x0, y1 - y0) * 0.8;
    g.children.forEach((m, i) => {
      const s = streaks[i];
      const u = (s.u + spin.current * 0.02) % 1;
      m.position.set(s.v * (x1 - x0) * 0.8, u * len, 0.6);
      m.scale.set(0.05, 0.35 + 0.3 * Math.sin(u * Math.PI), 0.05);
    });
  });
  return (
    <group>
      <group position={[spec.pos[0], spec.pos[1], 0]}>
        <mesh scale={[w, h, 1.2]}>
          <boxGeometry />
          <ToonMat look={look} />
        </mesh>
        <group rotation={[0, 0, angle]}>
          <group ref={rotor} position={[0, h / 2 + 0.05, 0]}>
            {[0, 1, 2].map((i) => (
              <mesh key={i} rotation={[0, (i * Math.PI * 2) / 3, 0.35]} position={[0, 0, 0]} scale={[w * 0.85, 0.05, 0.22]}>
                <boxGeometry />
                <meshToonMaterial color="#ffffff" gradientMap={toonGradient()} />
              </mesh>
            ))}
          </group>
        </group>
        {highlight && (
          <mesh scale={[w + 0.2, h + 0.2, 1.3]}>
            <boxGeometry />
            <meshBasicMaterial color={MEMO.accent} side={THREE.BackSide} transparent opacity={0.55} depthWrite={false} />
          </mesh>
        )}
      </group>
      <group position={[spec.pos[0], spec.pos[1] + h / 2, 0]} rotation={[0, 0, angle]}>
        <group ref={wind} visible={false}>
          {streaks.map((_, i) => (
            <mesh key={i}>
              <boxGeometry />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/** Lift: the platform on a piston, with rails down the shaft. */
function Lift({ spec, roomRef, words, highlight }: ObjectViewProps) {
  const look = useMemo(() => lookFor(spec.kind, words, spec.color), [spec.kind, spec.color, words]);
  const piston = useRef<THREE.Mesh>(null);
  const [w, h] = spec.size!;
  const [down, up] = spec.travel!;
  const base = down - h / 2 - 0.2;
  const railH = up - base + 0.4;
  useFrame(() => {
    const obj = roomRef.current?.objects.get(spec.id);
    const m = piston.current;
    if (!obj || !m) return;
    const len = Math.max(0.05, obj.liftY - h / 2 - base);
    m.scale.set(0.16, len, 0.16);
    m.position.set(spec.pos[0], base + len / 2, 0);
  });
  return (
    <group>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[spec.pos[0] + side * (w / 2 - 0.08), base + railH / 2, -0.8]} scale={[0.1, railH, 0.1]}>
          <boxGeometry />
          <meshToonMaterial color={MEMO.ink} gradientMap={toonGradient()} />
        </mesh>
      ))}
      <mesh ref={piston}>
        <cylinderGeometry args={[0.5, 0.5, 1, 12]} />
        <meshToonMaterial color="#8a7690" gradientMap={toonGradient()} />
      </mesh>
      <Frame spec={{ ...spec, pos: [spec.pos[0], spec.start === "up" ? up : down] }} roomRef={roomRef}>
        <mesh geometry={unitBox}>
          <ToonMat look={look} />
        </mesh>
        {highlight && <Shell color={MEMO.accent} geometry={unitBox} />}
      </Frame>
    </group>
  );
}

/** Pipe: floor and roof slabs with a dark back wall; the roof rises when the pipe grows. */
function Pipe({ spec, roomRef, words, highlight }: ObjectViewProps) {
  const look = useMemo(() => lookFor(spec.kind, words, spec.color), [spec.kind, spec.color, words]);
  const roof = useRef<THREE.Group>(null);
  const back = useRef<THREE.Mesh>(null);
  const opening = useRef(spec.opening ?? 1);
  const [len, t] = spec.size!;
  return (
    <Frame
      spec={spec}
      roomRef={roomRef}
      onFrame={(obj, dt) => {
        if (obj) opening.current += (obj.h - opening.current) * Math.min(1, dt * 9);
        if (roof.current) roof.current.position.y = opening.current + t / 2;
        if (back.current) {
          back.current.scale.set(len, opening.current, 0.1);
          back.current.position.y = opening.current / 2;
        }
      }}
    >
      <mesh position={[0, -t / 2, 0]} scale={[len, t, DEPTH]}>
        <boxGeometry />
        <ToonMat look={look} />
      </mesh>
      <group ref={roof}>
        <mesh scale={[len, t, DEPTH]}>
          <boxGeometry />
          <ToonMat look={look} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[(side * len) / 2, 0, 0]} scale={[0.12, t * 1.6, DEPTH * 1.02]}>
            <boxGeometry />
            <meshToonMaterial color="#4d9c80" gradientMap={toonGradient()} />
          </mesh>
        ))}
        {highlight && (
          <mesh scale={[len + 0.15, t + 0.15, DEPTH]}>
            <boxGeometry />
            <meshBasicMaterial color={MEMO.accent} side={THREE.BackSide} transparent opacity={0.55} depthWrite={false} />
          </mesh>
        )}
      </group>
      <mesh ref={back} position={[0, 0, -0.95]}>
        <boxGeometry />
        <meshToonMaterial color="#3f7f68" gradientMap={toonGradient()} />
      </mesh>
    </Frame>
  );
}

/** Planks that can break shatter like glass; the rest are plain blocks. */
function Plank(props: ObjectViewProps) {
  return props.spec.strength !== undefined ? <Glass {...props} /> : <Solid {...props} />;
}

/** Layout kind → renderer. Typed as a full Record so a new kind can't be forgotten. */
export const VIEWS: Record<ObjectKind, ComponentType<ObjectViewProps>> = {
  ground: Solid,
  ramp: Solid,
  plank: Plank,
  wall: Solid,
  glass: Glass,
  ice: Ice,
  water: Water,
  door: Door,
  plate: Plate,
  fan: Fan,
  lift: Lift,
  pipe: Pipe,
  ball: Solid,
  box: Solid,
  bucket: Bucket,
};

export function ObjectView(props: ObjectViewProps) {
  const View = VIEWS[props.spec.kind];
  return <View {...props} />;
}

/** Goal: a soft pink zone with a flag. */
export function Goal({ zone }: { zone: Rect }) {
  const [x0, y0, x1, y1] = zone;
  const flag = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 3) * 0.25;
  });
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.7, -0.22);
    s.lineTo(0, -0.44);
    s.closePath();
    return s;
  }, []);
  const top = y1 + 1.1;
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, 0]} scale={[x1 - x0, y1 - y0, DEPTH * 0.9]} raycast={() => null}>
        <boxGeometry />
        <meshBasicMaterial color={MEMO.accent} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <mesh position={[x1 - 0.25, (y0 + top) / 2, 0.4]} scale={[0.07, top - y0, 0.07]}>
        <boxGeometry />
        <meshToonMaterial color={MEMO.ink} gradientMap={toonGradient()} />
      </mesh>
      <mesh ref={flag} position={[x1 - 0.25, top, 0.4]}>
        <shapeGeometry args={[shape]} />
        <meshToonMaterial color={MEMO.accent} gradientMap={toonGradient()} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

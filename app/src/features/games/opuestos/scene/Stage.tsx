"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { Physics, useAfterPhysicsStep, useBeforePhysicsStep, useRapier } from "@react-three/rapier";
import { PerformanceMonitor } from "@react-three/drei";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { isTarget, Room, STEP, type RoomEvent } from "../lib/room";
import type { Level, Rect, Word } from "../lib/types";
import { InkOutline } from "./InkOutline";
import { MEMO, paper, toonGradient } from "./look";
import { Goal, ObjectView } from "./Objects";

/** Screen-space helpers the DOM layer uses for tapping objects and pinning labels. */
export interface Probe {
  /** Screen box (CSS px, canvas-relative) of an object, or null. */
  box(id: string): { x: number; y: number; w: number; h: number } | null;
  /** The target under a tap, with a finger-sized margin. */
  pick(x: number, y: number): string | null;
}

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Builds the Room inside @react-three/rapier's world and drives its rules
 * from the fixed-step hooks. A new `key` (reset) disposes and rebuilds it.
 */
function RoomSim({
  level,
  roomRef,
  onEvents,
}: {
  level: Level;
  roomRef: RefObject<Room | null>;
  onEvents: (events: RoomEvent[]) => void;
}) {
  const { world, rapier } = useRapier();
  useEffect(() => {
    const room = new Room(rapier, world, level);
    roomRef.current = room;
    return () => {
      room.dispose();
      if (roomRef.current === room) roomRef.current = null;
    };
  }, [rapier, world, level, roomRef]);
  useBeforePhysicsStep(() => roomRef.current?.beforeStep());
  useAfterPhysicsStep(() => {
    const room = roomRef.current;
    if (!room) return;
    room.afterStep();
    const events = room.drain();
    if (events.length) onEvents(events);
  });
  return null;
}

/**
 * Isometric-ish orthographic view that fits the level's frame into the space
 * the HUD leaves free (top card, bottom tray).
 */
function CameraRig({ view, insets }: { view: Rect; insets: Insets }) {
  const get = useThree((s) => s.get);
  const { width, height } = useThree((s) => s.size);
  useLayoutEffect(() => {
    const camera = get().camera as THREE.OrthographicCamera;
    const [x0, y0, x1, y1] = view;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    camera.position.set(cx + 5, cy + 7, 30);
    camera.up.set(0, 1, 0);
    camera.lookAt(cx, cy, 0);
    camera.zoom = 1;
    camera.updateMatrixWorld();
    const inv = camera.matrixWorldInverse;
    const v = new THREE.Vector3();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const x of [x0, x1])
      for (const y of [y0, y1])
        for (const z of [-1, 1]) {
          v.set(x, y, z).applyMatrix4(inv);
          minX = Math.min(minX, v.x);
          maxX = Math.max(maxX, v.x);
          minY = Math.min(minY, v.y);
          maxY = Math.max(maxY, v.y);
        }
    const availW = Math.max(100, width - insets.left - insets.right);
    const availH = Math.max(100, height - insets.top - insets.bottom);
    const zoom = Math.min(availW / (maxX - minX), availH / (maxY - minY));
    camera.zoom = zoom;
    // Slide the camera so the room's centre lands in the middle of the free area.
    const targetX = (insets.left + availW / 2 - width / 2) / zoom;
    const targetY = (height / 2 - (insets.top + availH / 2)) / zoom;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    camera.position.addScaledVector(right, (minX + maxX) / 2 - targetX).addScaledVector(up, (minY + maxY) / 2 - targetY);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
  }, [get, width, height, view, insets]);
  return null;
}

/** Graph-paper back wall. */
function Backdrop({ view }: { view: Rect }) {
  const [x0, y0, x1, y1] = view;
  // Far larger than any frame, so its edges never show (they'd get inked).
  const w = 200;
  const h = 200;
  const tex = useMemo(() => {
    const t = paper().clone();
    t.needsUpdate = true;
    t.repeat.set(w / 1.2, h / 1.2);
    return t;
  }, [w, h]);
  return (
    <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, -1.3]} raycast={() => null}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  );
}

/**
 * El Rayo: a little emitter in the corner and a pink beam to the zapped
 * object while the word menu is open (and for a moment after firing).
 */
function Ray({ view, target, roomRef }: { view: Rect; target: string | null; roomRef: RefObject<Room | null> }) {
  const beam = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const [x0, y0] = view;
  const origin = useMemo(() => new THREE.Vector3(x0 + 0.5, y0 + 0.35, 1.3), [x0, y0]);
  const tmp = useMemo(() => ({ to: new THREE.Vector3(), dir: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }), []);
  useFrame(({ clock }) => {
    const obj = target ? roomRef.current?.objects.get(target) : undefined;
    const b = beam.current;
    const r = ring.current;
    if (!b || !r) return;
    b.visible = r.visible = !!obj;
    if (!obj) return;
    if (obj.spec.kind === "water") {
      const [zx0, zy0, zx1, zy1] = obj.spec.zone!;
      tmp.to.set((zx0 + zx1) / 2, (zy0 + zy1) / 2, 0);
    } else {
      const t = obj.body.translation();
      tmp.to.set(t.x, obj.spec.kind === "pipe" ? t.y + obj.h / 2 : t.y, 0);
    }
    tmp.dir.subVectors(tmp.to, origin);
    const len = tmp.dir.length();
    b.position.copy(origin).addScaledVector(tmp.dir, 0.5);
    b.quaternion.setFromUnitVectors(tmp.up, tmp.dir.normalize());
    const flicker = 1 + Math.sin(clock.elapsedTime * 40) * 0.15;
    b.scale.set(flicker, len, flicker);
    r.position.copy(tmp.to).setZ(1.05);
    r.rotation.z = clock.elapsedTime * 3;
    const s = 0.55 + Math.max(obj.w, Math.min(obj.h, 2)) * 0.35;
    r.scale.setScalar(s * (1 + Math.sin(clock.elapsedTime * 8) * 0.06));
  });
  return (
    <group>
      <group position={origin} rotation={[0, 0, -0.75]}>
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.2, 0.26, 0.3, 20]} />
          <meshToonMaterial color={MEMO.ink} gradientMap={toonGradient()} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.09, 0.14, 0.4, 16]} />
          <meshToonMaterial color="#ffffff" gradientMap={toonGradient()} />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <sphereGeometry args={[0.11, 16, 10]} />
          <meshToonMaterial color={MEMO.accent} emissive={MEMO.accent} emissiveIntensity={0.7} gradientMap={toonGradient()} />
        </mesh>
      </group>
      <group ref={beam} visible={false}>
        <mesh>
          <cylinderGeometry args={[0.035, 0.035, 1, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.085, 0.085, 1, 12]} />
          <meshBasicMaterial color={MEMO.accent} transparent opacity={0.8} depthWrite={false} />
        </mesh>
      </group>
      <mesh ref={ring} visible={false}>
        <torusGeometry args={[0.6, 0.05, 8, 40]} />
        <meshBasicMaterial color={MEMO.accent} />
      </mesh>
    </group>
  );
}

/** Screen boxes for picking and label pins (rewritten into DOM nodes every frame). */
function Projector({
  level,
  roomRef,
  probeRef,
  onPin,
}: {
  level: Level;
  roomRef: RefObject<Room | null>;
  probeRef: RefObject<Probe | null>;
  onPin: (id: string, x: number, y: number) => void;
}) {
  const get = useThree((s) => s.get);
  const targets = useMemo(() => level.layout.objects.filter(isTarget), [level]);

  useEffect(() => {
    const v = new THREE.Vector3();
    const project = (x: number, y: number, z: number) => {
      const { camera, size } = get();
      v.set(x, y, z).project(camera);
      return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
    };
    const worldBox = (id: string): Rect | null => {
      const obj = roomRef.current?.objects.get(id);
      if (!obj || obj.broken || obj.melted) return null;
      const spec = obj.spec;
      if (spec.kind === "water" || spec.kind === "fan") {
        if (spec.kind === "water") return spec.zone!;
        const [w, h] = spec.size ?? [1, 0.35];
        return [spec.pos[0] - w / 2, spec.pos[1] - h / 2, spec.pos[0] + w / 2, spec.pos[1] + h / 2];
      }
      const t = obj.body.translation();
      if (spec.kind === "pipe") return [t.x - obj.w / 2, t.y - 0.3, t.x + obj.w / 2, t.y + obj.h + 0.3];
      const a = spec.angle ? (spec.angle * Math.PI) / 180 : 0;
      const hw = (Math.abs(Math.cos(a)) * obj.w + Math.abs(Math.sin(a)) * obj.h) / 2;
      const hh = (Math.abs(Math.sin(a)) * obj.w + Math.abs(Math.cos(a)) * obj.h) / 2;
      return [t.x - hw, t.y - hh, t.x + hw, t.y + hh];
    };
    probeRef.current = {
      box(id) {
        const r = worldBox(id);
        if (!r) return null;
        const a = project(r[0], r[3], 0.9);
        const b = project(r[2], r[1], 0.9);
        return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
      },
      pick(x, y) {
        let best: string | null = null;
        let bestScore = Infinity;
        for (const spec of targets) {
          const box = this.box(spec.id);
          if (!box) continue;
          // Finger margin: small things get a bigger halo.
          const m = Math.max(10, 26 - Math.min(box.w, box.h) / 3);
          const dx = Math.max(box.x - m - x, 0, x - (box.x + box.w + m));
          const dy = Math.max(box.y - m - y, 0, y - (box.y + box.h + m));
          if (dx > 0 || dy > 0) continue;
          // Prefer the smallest box containing the tap (a ball on a ramp beats the ramp).
          const score = box.w * box.h;
          if (score < bestScore) {
            bestScore = score;
            best = spec.id;
          }
        }
        return best;
      },
    };
    return () => {
      probeRef.current = null;
    };
  }, [get, roomRef, probeRef, targets]);

  useFrame(() => {
    const room = roomRef.current;
    if (!room) return;
    const { camera, size } = get();
    const v = new THREE.Vector3();
    for (const { id } of targets) {
      const obj = room.objects.get(id);
      if (!obj) continue;
      let x: number;
      let top: number;
      if (obj.spec.kind === "water") {
        const [zx0, , zx1, zy1] = obj.spec.zone!;
        x = (zx0 + zx1) / 2;
        top = zy1;
      } else {
        const t = obj.body.translation();
        x = t.x;
        top = t.y + (obj.spec.kind === "pipe" ? obj.h + 0.3 : obj.h / 2);
      }
      v.set(x, top + 0.15, 1).project(camera);
      onPin(id, ((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height);
    }
  });
  return null;
}

export interface StageProps {
  level: Level;
  view: Rect;
  runKey: number;
  roomRef: RefObject<Room | null>;
  probeRef: RefObject<Probe | null>;
  /** Called every frame with each target's label anchor (CSS px). */
  onPin: (id: string, x: number, y: number) => void;
  /** Active words per object id, in firing order. */
  mods: Record<string, Word[]>;
  highlight: string | null;
  rayTarget: string | null;
  paused: boolean;
  visible: boolean;
  insets: Insets;
  onEvents: (events: RoomEvent[]) => void;
}

export function Stage(p: StageProps) {
  // Weak GPU: drop to 1× pixels (the ink pass costs per pixel).
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);
  return (
    <Canvas
      flat
      orthographic
      dpr={dpr}
      frameloop={p.visible ? "always" : "never"}
      camera={{ position: [5, 7, 30], zoom: 50, near: 0.1, far: 100 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      style={{ touchAction: "none" }}
    >
      <PerformanceMonitor onDecline={() => setDpr([1, 1])} />
      <color attach="background" args={[MEMO.page]} />
      <CameraRig view={p.view} insets={p.insets} />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#fff6e0", "#8a7a6a", 0.6]} />
      <directionalLight position={[4, 9, 6]} intensity={2.1} />
      <Backdrop view={p.view} />
      <Suspense fallback={null}>
        <Physics timeStep={STEP} paused={p.paused || !p.visible} interpolate={false}>
          <RoomSim key={p.runKey} level={p.level} roomRef={p.roomRef} onEvents={p.onEvents} />
          {p.level.layout.objects.map((spec) => (
            <ObjectView
              key={`${p.runKey}:${spec.id}`}
              spec={spec}
              roomRef={p.roomRef}
              words={p.mods[spec.id] ?? NO_WORDS}
              highlight={p.highlight === spec.id}
            />
          ))}
        </Physics>
      </Suspense>
      <Goal zone={p.level.layout.goal.zone} />
      <Ray view={p.view} target={p.rayTarget} roomRef={p.roomRef} />
      <Projector level={p.level} roomRef={p.roomRef} probeRef={p.probeRef} onPin={p.onPin} />
      <EffectComposer enableNormalPass multisampling={0}>
        <InkOutline thickness={1.4} />
      </EffectComposer>
    </Canvas>
  );
}

const NO_WORDS: Word[] = [];

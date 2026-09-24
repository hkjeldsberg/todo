"use client";

import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EYE, PLAYER_RADIUS, ROOM, SPAWN_Z, doorAtRay } from "../lib/room";

const SPEED = 4.2;
const TURN = 2.2;
const LOOK = 0.005; // radians per dragged pixel
const SPAWN = new THREE.Vector3(0, EYE, SPAWN_Z);

/** Shared, mutable input written by DOM handlers and read every frame. */
export interface PlayerInput {
  /** Virtual joystick, -1..1 each axis; y > 0 walks forward. */
  move: { x: number; y: number };
  /** Accumulated look drag in CSS pixels, consumed each frame. */
  look: { dx: number; dy: number };
  /** Screen point (NDC) tapped / clicked this frame: walk to the door under it, if any. */
  pick: { x: number; y: number } | null;
  /** Mouse position (NDC) while the pointer is free, for hover highlight. */
  hover: { x: number; y: number } | null;
  /** Door the player is auto-walking through. */
  walkTo: number | null;
}

export function createInput(): PlayerInput {
  return { move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 }, pick: null, hover: null, walkTo: null };
}

export interface LockControls {
  lock(): void;
}

/** Lets the dev playtest hook find doors on screen and read the camera. */
export interface SceneProbe {
  doorScreen(i: number): { x: number; y: number } | null;
  camera(): [number, number, number];
}

interface Props {
  controlsRef: React.Ref<LockControls>;
  probeRef: React.RefObject<SceneProbe | null>;
  spawn: number;
  /** Pointer-lock look (desktop only). Stays connected so it can report lock changes. */
  pointerLock: boolean;
  locked: boolean;
  /** Movement / look / door walking. */
  enabled: boolean;
  shake: number;
  inputRef: React.RefObject<PlayerInput>;
  onDoor: (index: number) => void;
  onAim: (index: number | null) => void;
  onLockChange: (locked: boolean) => void;
}

/** Portrait screens get a wider vertical FOV so all three doors stay in view. */
function fovFor(aspect: number): number {
  if (aspect >= 1) return 70;
  const v = 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(33)) / aspect));
  return Math.min(105, Math.max(70, v));
}

export function Player(props: Props) {
  const { controlsRef, probeRef, spawn, pointerLock, locked, enabled, shake, inputRef, onDoor, onAim, onLockChange } = props;
  const size = useThree((s) => s.size);
  const get = useThree((s) => s.get);
  const keys = useRef<Record<string, boolean>>({});
  const triggered = useRef(false);
  const aim = useRef<number | null>(null);
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const fwd = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const move = useRef(new THREE.Vector3());
  const ray = useRef(new THREE.Raycaster());

  useEffect(() => {
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    const blur = () => (keys.current = {});
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useEffect(() => {
    const cam = get().camera as THREE.PerspectiveCamera;
    cam.fov = fovFor(size.width / size.height);
    cam.updateProjectionMatrix();
  }, [get, size]);

  // Respawn at the hub entrance: new room, or a paradox loop back into the same one.
  useEffect(() => {
    const { camera } = get();
    camera.position.copy(SPAWN);
    camera.rotation.set(0, 0, 0, "YXZ");
    triggered.current = false;
    inputRef.current.walkTo = null;
    inputRef.current.pick = null;
  }, [spawn, get, inputRef]);

  useEffect(() => {
    probeRef.current = {
      doorScreen(i) {
        const x = ROOM.doorXs[i];
        if (x === undefined) return null;
        const { camera, size } = get();
        const v = new THREE.Vector3(x, ROOM.doorH / 2, -ROOM.halfD).project(camera);
        if (v.z > 1) return null;
        return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
      },
      camera: () => get().camera.position.toArray(),
    };
  }, [get, probeRef]);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = inputRef.current;
    const doorAt = (ndc: { x: number; y: number }) => {
      ray.current.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
      return doorAtRay(ray.current.ray.origin, ray.current.ray.direction);
    };
    const k = keys.current;

    if (!enabled) {
      t.look.dx = t.look.dy = 0;
      t.pick = null;
      if (aim.current !== null) onAim((aim.current = null));
      return;
    }

    // A tap / click on a door starts the auto-walk through it.
    if (t.pick) {
      const door = doorAt(t.pick);
      if (door >= 0) t.walkTo = door;
      t.pick = null;
    }

    const manual =
      k.KeyW || k.KeyA || k.KeyS || k.KeyD || k.ArrowUp || k.ArrowDown || Math.hypot(t.move.x, t.move.y) > 0.15;
    if (manual) t.walkTo = null;

    // Look: keys turn, touch drag / auto-walk steer (mouse look is PointerLockControls).
    euler.current.setFromQuaternion(camera.quaternion);
    let yaw = 0;
    if (k.ArrowLeft || k.KeyQ) yaw += TURN * dt;
    if (k.ArrowRight || k.KeyE) yaw -= TURN * dt;
    euler.current.y += yaw - t.look.dx * LOOK;
    euler.current.x = THREE.MathUtils.clamp(euler.current.x - t.look.dy * LOOK, -1.2, 1.2);
    t.look.dx = t.look.dy = 0;

    const p = camera.position;
    const m = move.current.set(0, 0, 0);
    const { halfW, halfD, doorW, doorXs } = ROOM;

    if (t.walkTo !== null) {
      // Line up in front of the door, then walk straight through it.
      const dx = doorXs[t.walkTo];
      const lined = Math.abs(p.x - dx) < 0.08 || p.z < -halfD + 1.1;
      const target = lined ? new THREE.Vector3(dx, EYE, -halfD - 2) : new THREE.Vector3(dx, EYE, Math.min(p.z, -halfD + 1.2));
      m.subVectors(target, p).setY(0);
      const dist = m.length();
      if (dist > 1e-4) m.multiplyScalar(Math.min(SPEED * dt, dist) / dist);
      const wantYaw = Math.atan2(-(target.x - p.x), -(target.z - p.z));
      const dYaw = Math.atan2(Math.sin(wantYaw - euler.current.y), Math.cos(wantYaw - euler.current.y));
      euler.current.y += dYaw * Math.min(1, dt * 6);
      euler.current.x += (0 - euler.current.x) * Math.min(1, dt * 4);
    } else {
      camera.getWorldDirection(fwd.current);
      fwd.current.y = 0;
      fwd.current.normalize();
      right.current.crossVectors(fwd.current, camera.up).normalize();
      if (k.KeyW || k.ArrowUp) m.add(fwd.current);
      if (k.KeyS || k.ArrowDown) m.sub(fwd.current);
      if (k.KeyD) m.add(right.current);
      if (k.KeyA) m.sub(right.current);
      if (m.lengthSq() > 0) m.normalize();
      m.addScaledVector(fwd.current, t.move.y).addScaledVector(right.current, t.move.x);
      if (m.lengthSq() > 1) m.normalize();
      m.multiplyScalar(SPEED * dt);
    }
    camera.quaternion.setFromEuler(euler.current);

    let x = p.x + m.x;
    let z = p.z + m.z;
    x = THREE.MathUtils.clamp(x, -halfW + PLAYER_RADIUS, halfW - PLAYER_RADIUS);
    z = Math.min(z, halfD - PLAYER_RADIUS);

    const wallZ = -halfD + PLAYER_RADIUS;
    if (z < wallZ) {
      const inDoorway = p.z < wallZ;
      const door = inDoorway
        ? doorXs.findIndex((dx) => Math.abs(p.x - dx) < doorW / 2)
        : doorXs.findIndex((dx) => Math.abs(x - dx) < doorW / 2 - PLAYER_RADIUS);
      if (door === -1) {
        z = wallZ;
      } else {
        // Inside a doorway: stay within the frame, cross the threshold to commit.
        const dx = doorXs[door];
        x = THREE.MathUtils.clamp(x, dx - doorW / 2 + PLAYER_RADIUS, dx + doorW / 2 - PLAYER_RADIUS);
        if (z < -halfD - 0.6 && !triggered.current) {
          triggered.current = true;
          t.walkTo = null;
          onDoor(door);
        }
      }
    }
    p.set(x, EYE, z);

    // Highlight: the door being walked to, else the one under the crosshair / mouse.
    const next =
      t.walkTo ?? (locked ? doorAt({ x: 0, y: 0 }) : t.hover ? doorAt(t.hover) : -1);
    const aimed = next === -1 ? null : next;
    if (aimed !== aim.current) onAim((aim.current = aimed));

    // Collapse shake (El Hierro)
    if (shake > 0) {
      p.x += (Math.random() - 0.5) * shake * 0.08;
      p.y += (Math.random() - 0.5) * shake * 0.08;
    }
  });

  if (!pointerLock) return null;
  return (
    <PointerLockControls
      ref={controlsRef as React.Ref<never>}
      selector="#laberinto-canvas"
      onLock={() => onLockChange(true)}
      onUnlock={() => onLockChange(false)}
    />
  );
}

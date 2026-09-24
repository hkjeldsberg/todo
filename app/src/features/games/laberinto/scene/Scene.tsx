"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { MEMO } from "../lib/color";
import type { Island } from "../lib/islands";
import { EYE, SPAWN_Z } from "../lib/room";
import type { PuzzleNode } from "../lib/types";
import { Biome } from "./Biome";
import { InkPass } from "./InkPass";
import { Player, type LockControls, type PlayerInput, type SceneProbe } from "./Player";
import { Room } from "./Room";

const ALARM = new THREE.Color(MEMO.accent);

/** Island sky + fog; pulses toward memo pink when the El Hierro gauntlet is about to collapse. */
function Sky({ island, alarm }: { island: Island; alarm: boolean }) {
  const base = useMemo(() => new THREE.Color(island.palette.sky), [island]);
  const color = useMemo(() => base.clone(), [base]);
  const gomera = island.zone === "la_gomera";
  useFrame(({ clock }) => {
    const pulse = alarm ? (Math.sin(clock.elapsedTime * 7) * 0.5 + 0.5) * 0.35 : 0;
    color.copy(base).lerp(ALARM, pulse);
  });
  return (
    <>
      <color attach="background" args={[color]} />
      <fog attach="fog" args={[color, gomera ? 12 : 40, gomera ? 38 : 110]} />
    </>
  );
}

export interface SceneProps {
  node: PuzzleNode;
  island: Island;
  failed: number[];
  highlight: number | null;
  portrait: boolean;
  /** False while the tab is hidden: stop rendering entirely. */
  visible: boolean;
  collapse: number;
  alarm: boolean;
  spawn: number;
  pointerLock: boolean;
  locked: boolean;
  enabled: boolean;
  inputRef: React.RefObject<PlayerInput>;
  controlsRef: React.Ref<LockControls>;
  probeRef: React.RefObject<SceneProbe | null>;
  onDoor: (i: number) => void;
  onAim: (i: number | null) => void;
  onLockChange: (locked: boolean) => void;
}

export function Scene(p: SceneProps) {
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      frameloop={p.visible ? "always" : "never"}
      gl={{ antialias: false, stencil: true, powerPreference: "high-performance" }}
      camera={{ fov: 70, near: 0.1, far: 200, position: [0, EYE, SPAWN_Z] }}
    >
      <Sky island={p.island} alarm={p.alarm} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[8, 14, 6]} intensity={2.2} />
      <Room node={p.node} island={p.island} failed={p.failed} highlight={p.highlight} portrait={p.portrait} />
      <Biome island={p.island} collapse={p.collapse} />
      <Player
        controlsRef={p.controlsRef}
        probeRef={p.probeRef}
        spawn={p.spawn}
        pointerLock={p.pointerLock}
        locked={p.locked}
        enabled={p.enabled}
        shake={p.collapse > 0.6 ? (p.collapse - 0.6) * 5 : 0}
        inputRef={p.inputRef}
        onDoor={p.onDoor}
        onAim={p.onAim}
        onLockChange={p.onLockChange}
      />
      <InkPass />
    </Canvas>
  );
}

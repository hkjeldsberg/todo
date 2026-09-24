"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Box3, Vector3, type Group, type Mesh } from "three";
import type { Puzzle } from "./types";
import { easeOutBounce, onceProgress, useGameTime } from "./time";
import { Toon } from "./toon";

/** What a room scene needs from the game: which objects hold puzzles and their state. */
export interface RoomBindings {
  puzzleFor: (sceneObject: string) => Puzzle | undefined;
  isSolved: (puzzleId: string) => boolean;
  onSelect: (puzzle: Puzzle) => void;
  interactive: boolean;
}

export const RoomBindingsContext = createContext<RoomBindings | null>(null);

interface SlotState {
  /** True once solved AND the content's anim_trigger is the one this object implements. */
  on: boolean;
  /** Game time the animation started (null = locked). Restored progress starts far in the past. */
  since: RefObject<number | null>;
}

const SlotContext = createContext<SlotState | null>(null);

export function useSlot() {
  const ctx = useContext(SlotContext);
  if (!ctx) throw new Error("useSlot must be used inside <Slot>");
  return ctx;
}

const RESTORED = -1e6;

interface SlotProps {
  /** Mesh id referenced by content (`scene_object`). */
  id: string;
  /** anim_trigger this object implements. Other triggers fall back to a generic loop/once anim. */
  anim: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Height of the "memory here" marker above the slot origin. */
  markerY?: number;
  children: ReactNode;
}

export function Slot({ id, anim, position, rotation, markerY = 1.4, children }: SlotProps) {
  const bindings = useContext(RoomBindingsContext);
  const time = useGameTime();
  const puzzle = bindings?.puzzleFor(id);
  const solved = puzzle ? bindings!.isSolved(puzzle.id) : false;
  const since = useRef<number | null>(solved ? RESTORED : null);
  const [hovered, setHovered] = useState(false);
  const group = useRef<Group>(null);
  const generic = useRef<Group>(null);
  const getThree = useThree((s) => s.get);

  // Clock is paused while the prompt is open, so the animation starts when it closes.
  useEffect(() => {
    if (solved && since.current === null) since.current = time.current.t;
    if (!solved) since.current = null;
  }, [solved, time]);

  const clickable = !!puzzle && !solved && !!bindings?.interactive;

  // Dev only: lets automated play-tests find each object's on-screen centre (CSS px).
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __tenseSlots?: Record<string, () => number[]> };
    const slots = (w.__tenseSlots ??= {});
    // Centre of the largest visible mesh: a spot a player would actually tap.
    slots[id] = () => {
      let best = new Box3();
      let bestSize = -1;
      group.current?.traverseVisible((o) => {
        if (!(o as Mesh).isMesh) return;
        const b = new Box3().setFromObject(o);
        const d = b.getSize(new Vector3());
        const size = d.x * d.y + d.y * d.z + d.x * d.z;
        if (size > bestSize) [best, bestSize] = [b, size];
      });
      const { camera, gl } = getThree();
      const v = best.getCenter(new Vector3()).project(camera);
      const rect = gl.domElement.getBoundingClientRect();
      return [rect.left + ((v.x + 1) / 2) * rect.width, rect.top + ((1 - v.y) / 2) * rect.height];
    };
    return () => {
      delete slots[id];
    };
  }, [id, getThree]);

  useEffect(() => {
    if (!hovered || !clickable) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered, clickable]);

  const trigger = puzzle?.anim_trigger;
  const native = trigger === anim;
  const fallback = solved && trigger && !native ? (trigger.endsWith("_once") ? "once" : "loop") : null;

  useFrame(() => {
    const g = group.current;
    if (g) {
      const target = clickable && hovered ? 1.06 : 1;
      g.scale.setScalar(g.scale.x + (target - g.scale.x) * 0.2);
    }
    const f = generic.current;
    if (!f) return;
    const s = since.current;
    if (fallback === "loop" && s !== null) {
      const lt = time.current.t - s;
      f.position.y = Math.abs(Math.sin(lt * 3)) * 0.08;
      f.rotation.y = Math.sin(lt * 1.5) * 0.08;
    } else if (fallback === "once") {
      const p = onceProgress(time.current.t, s, 0.9);
      f.position.y = Math.sin(p * Math.PI) * 0.5;
      f.rotation.y = easeOutBounce(p) * Math.PI * 0.25;
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!clickable) return;
    // Touch never sends pointerout, so drop hover here or the marker stays "hovered".
    setHovered(false);
    bindings!.onSelect(puzzle!);
  };

  return (
    <group position={position} rotation={rotation}>
      <group
        ref={group}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <group ref={generic}>
          <SlotContext.Provider value={{ on: solved && native, since }}>{children}</SlotContext.Provider>
        </group>
      </group>
      {clickable && (
        <Marker
          y={markerY}
          hovered={hovered}
          onClick={onClick}
          onHover={setHovered}
        />
      )}
    </group>
  );
}

/** Minimum tap target, in CSS px, around a marker (fingers need ~44px). */
const TAP_PX = 48;
/** Minimum on-screen radius of the marker diamond, in CSS px. */
const MARKER_PX = 11;
const MARKER_R = 0.16;

interface MarkerProps {
  y: number;
  hovered: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onHover: (hovered: boolean) => void;
}

/** Floating ink-outlined diamond that marks an unresolved memory, with a finger-sized hit area. */
function Marker({ y, hovered, onClick, onHover }: MarkerProps) {
  const ref = useRef<Group>(null);
  const hit = useRef<Mesh>(null);
  useFrame(({ clock, camera }) => {
    const m = ref.current;
    if (m) {
      const t = clock.elapsedTime;
      m.position.y = y + Math.sin(t * 2.4) * 0.08;
      m.rotation.y = t * 1.2;
      m.scale.setScalar(Math.max(1.3, MARKER_PX / (MARKER_R * camera.zoom)) * (hovered ? 1.35 : 1));
    }
    // Keep the invisible hit sphere at least TAP_PX across on screen at any zoom.
    if (hit.current) hit.current.scale.setScalar(Math.max(0.3, TAP_PX / 2 / camera.zoom));
  });
  return (
    <>
      <group ref={ref} position={[0, y, 0]}>
        <mesh raycast={() => null}>
          <octahedronGeometry args={[MARKER_R, 0]} />
          <Toon color={hovered ? "#3d2140" : "#ff5fa2"} emissive="#ff5fa2" emissiveIntensity={hovered ? 0.15 : 0.3} />
        </mesh>
      </group>
      {/* Invisible meshes still raycast but never reach the colour or normal passes. */}
      <mesh
        ref={hit}
        position={[0, y, 0]}
        visible={false}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={() => onHover(false)}
      >
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
    </>
  );
}

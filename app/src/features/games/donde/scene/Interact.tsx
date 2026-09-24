"use client";

import { useCursor } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plane, Vector2, Vector3, type Group, type Mesh } from "three";
import styles from "../donde.module.css";
import { assembleSentence } from "../model/grammar";
import { useScene } from "./context";
import type { PieceDef, V3, ZoneDef } from "./layouts";
import { tape, zoneDecal } from "./paper";
import { PieceMesh } from "./pieces";
import { damp } from "./prims";
import { Pin } from "./propsTown";
import { SurfaceHtml } from "./SurfaceHtml";

const TAP_PX = 10;

/** Registry of piece groups (world positions for the dev playtest hook). */
export const pieceGroups = new Map<string, Group>();

// ─────────────────────────────────────────────────────────────── zone hit volumes

/**
 * Invisible volumes for the current task's candidate zones on this floor. They take taps
 * (find / pin, or "tap a spot" after selecting a piece) and are the raycast targets for drags.
 */
export function ZoneHits({ floor }: { floor: number }) {
  const { s } = useScene();
  const zones = s.layout.zones.filter((z) => z.floor === floor && s.candidates.includes(z.id) && !s.found.includes(z.id));
  return (
    <group>
      {zones.map((z) => (
        <ZoneHit key={z.id} zone={z} />
      ))}
    </group>
  );
}

function ZoneHit({ zone }: { zone: ZoneDef }) {
  const { s, viewRef, hitsRef, setHoverZone } = useScene();
  const meshes = useRef<(Mesh | null)[]>([]);
  const down = useRef<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState(false);
  const isDrag = s.task?.mechanic === "drag";
  useCursor(hover && (!isDrag || s.selected !== null));

  useEffect(() => {
    const map = hitsRef.current;
    const list = meshes.current.filter((m): m is Mesh => m !== null);
    list.forEach((m) => (m.userData.zone = zone.id));
    map.set(zone.id, list);
    return () => {
      if (map.get(zone.id) === list) map.delete(zone.id);
    };
  }, [zone.id, hitsRef]);

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (isDrag && s.selected === null) return;
    e.stopPropagation();
    viewRef.current.captured = true;
    down.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    const d = down.current;
    down.current = null;
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_PX) return;
    e.stopPropagation();
    if (isDrag) s.dropIntoZone(zone.id);
    else s.chooseZone(zone.id);
  };

  return (
    <group>
      {zone.hit.map((h, i) => (
        <mesh
          key={i}
          position={h.pos}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover(true);
            if (!isDrag) setHoverZone(zone.id);
          }}
          onPointerOut={() => {
            setHover(false);
            if (!isDrag) setHoverZone(null);
          }}
        >
          <boxGeometry args={h.size} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────── drop highlights

/** Memo-pink dashed decals on every candidate slot while a piece is dragged or selected. */
export function DropDecals({ floor }: { floor: number }) {
  const { s, dragging, hoverZone } = useScene();
  const active = s.task?.mechanic === "drag" && (dragging !== null || s.selected !== null);
  const zones = s.layout.zones.filter((z) => z.floor === floor && s.candidates.includes(z.id));
  const taken = new Set(Object.entries(s.placed).map(([, p]) => `${p.zone}:${p.slot}`));
  if (!active) return null;
  return (
    <group>
      {zones.flatMap((z) =>
        (z.slots ?? []).map((slot, i) =>
          taken.has(`${z.id}:${i}`) ? null : <Decal key={`${z.id}:${i}`} pos={slot.pos} hot={hoverZone === z.id} />,
        ),
      )}
    </group>
  );
}

function Decal({ pos, hot }: { pos: V3; hot: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const k = hot ? 1.25 : 1 + Math.sin(clock.elapsedTime * 4) * 0.06;
    m.scale.setScalar(k);
  });
  return (
    <mesh ref={ref} position={[pos[0], pos[1] + 0.03, pos[2]]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
      <planeGeometry args={[1.0, 1.0]} />
      <meshBasicMaterial map={zoneDecal()} transparent depthWrite={false} depthTest={false} opacity={hot ? 1 : 0.8} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────── draggable pieces

/** Pieces of the current and finished drag tasks on this floor. */
export function Pieces({ floor }: { floor: number }) {
  const { s } = useScene();
  const pageTasks = s.page.tasks;
  const visible = new Set(pageTasks.filter((t) => s.done.includes(t.id) || t.id === s.task?.id).map((t) => t.draggable_id));
  return (
    <group>
      {s.layout.pieces
        .filter((p) => p.floor === floor && visible.has(p.group))
        .map((p) => (
          <DragPiece key={p.id} piece={p} />
        ))}
    </group>
  );
}

const ndc = new Vector2();
const hitPoint = new Vector3();
const plane = new Plane(new Vector3(0, 1, 0), 0);
const worldOrigin = new Vector3();

function DragPiece({ piece }: { piece: PieceDef }) {
  const ctx = useScene();
  const { s, viewRef, hitsRef, setDragging, setHoverZone } = ctx;
  const get = useThree((st) => st.get);
  const ref = useRef<Group>(null);
  const tapeRef = useRef<Mesh>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean; zone: string | null; point: Vector3 | null } | null>(null);
  const anim = useRef({ slap: 0, lastKey: "", shake: 0 });
  const [hover, setHover] = useState(false);

  const placement = s.placed[piece.id];
  const zone = placement ? s.layout.zones.find((z) => z.id === placement.zone) : undefined;
  const slot = zone?.slots?.[placement?.slot ?? -1];
  const target: V3 = slot?.pos ?? piece.home;
  const targetRot = slot?.rot ?? piece.rot ?? 0;
  const draggable = s.task?.mechanic === "drag" && s.task.draggable_id === piece.group && placement?.zone !== s.task.target_zone;
  const selected = s.selected === piece.id;
  const placedKey = placement && slot ? `${placement.zone}:${placement.slot}` : "";
  useCursor(hover && draggable, "grab");

  // Latest values for the window listeners.
  const live = useRef({ s, draggable });
  useEffect(() => {
    live.current = { s, draggable };
  });

  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    pieceGroups.set(piece.id, g);
    return () => {
      pieceGroups.delete(piece.id);
    };
  }, [piece.id]);

  useFrame(({ clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    const a = anim.current;
    if (placedKey !== a.lastKey) {
      if (placedKey) a.slap = 1;
      else if (a.lastKey) a.shake = 1;
      a.lastKey = placedKey;
    }
    const d = drag.current;
    if (d?.moved && d.point) {
      g.position.x = damp(g.position.x, d.point.x, 22, dt);
      g.position.z = damp(g.position.z, d.point.z, 22, dt);
      g.position.y = damp(g.position.y, d.point.y + 0.45, 18, dt);
      g.rotation.z = damp(g.rotation.z, 0.12, 10, dt);
    } else {
      g.position.x = damp(g.position.x, target[0], 9, dt);
      g.position.z = damp(g.position.z, target[2], 9, dt);
      const lift = selected ? 0.25 + Math.sin(clock.elapsedTime * 5) * 0.05 : draggable ? 0.04 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.4)) : 0;
      g.position.y = damp(g.position.y, target[1] + lift, 9, dt);
      g.rotation.z = damp(g.rotation.z, 0, 10, dt);
    }
    g.rotation.y = damp(g.rotation.y, targetRot + (a.shake > 0 ? Math.sin(a.shake * 30) * 0.25 * a.shake : 0), 10, dt);
    // Tape slap: squash on landing, then the tape strip snaps on.
    a.slap = Math.max(0, a.slap - dt * 2.2);
    a.shake = Math.max(0, a.shake - dt * 1.6);
    const squash = a.slap > 0.6 ? 1 - (a.slap - 0.6) * 0.6 : 1;
    g.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    const t = tapeRef.current;
    if (t) {
      t.visible = placedKey !== "";
      t.scale.setScalar(damp(t.scale.x, placedKey ? 1 : 0.01, a.slap > 0 ? 18 : 6, dt));
    }
  });

  const toLocal = (clientX: number, clientY: number) => {
    const st = get();
    const rect = st.gl.domElement.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    st.raycaster.setFromCamera(ndc, st.camera);
    const meshes = live.current.s.candidates.flatMap((id) => hitsRef.current.get(id) ?? []);
    const hit = st.raycaster.intersectObjects(meshes, false)[0];
    const parent = ref.current?.parent;
    if (!parent) return null;
    if (hit) return { zone: hit.object.userData.zone as string, point: parent.worldToLocal(hit.point.clone()) };
    parent.getWorldPosition(worldOrigin);
    plane.constant = -worldOrigin.y;
    if (!st.raycaster.ray.intersectPlane(plane, hitPoint)) return null;
    return { zone: null, point: parent.worldToLocal(hitPoint.clone()) };
  };

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (!draggable) return;
    e.stopPropagation();
    viewRef.current.captured = true;
    drag.current = { x: e.clientX, y: e.clientY, moved: false, zone: null, point: null };

    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      if (!d.moved && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < TAP_PX) return;
      if (!d.moved) {
        d.moved = true;
        setDragging(piece.id);
      }
      const r = toLocal(ev.clientX, ev.clientY);
      if (!r) return;
      d.point = r.point;
      if (r.zone !== d.zone) {
        d.zone = r.zone;
        setHoverZone(r.zone);
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const d = drag.current;
      drag.current = null;
      setDragging(null);
      setHoverZone(null);
      if (!d) return;
      const cur = live.current.s;
      if (!d.moved) {
        // Tap: select the piece, then tap a pink spot (or use the buttons).
        cur.setSelected(cur.selected === piece.id ? null : piece.id);
        return;
      }
      const p = d.point;
      const res = cur.dropPiece(piece.id, d.zone, p ? [p.x, p.y, p.z] : undefined);
      if (!res.accepted) anim.current.shake = 1;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return (
    <group ref={ref} position={piece.home}>
      <group
        onPointerDown={onDown}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        <PieceMesh kind={piece.kind} />
        {/* generous invisible grab area for fingers */}
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.8, 0.9, 0.8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <mesh ref={tapeRef} position={[0, 0.9, 0]} rotation={[-Math.PI / 2, 0, 0.4]} visible={false}>
        <planeGeometry args={[0.7, 0.24]} />
        <meshBasicMaterial map={tape()} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────── found markers & labels

export function Markers({ floor }: { floor: number }) {
  const { s } = useScene();
  const found = s.layout.zones.filter((z) => z.floor === floor && s.found.includes(z.id));
  return (
    <group>
      {found.map((z) => (
        <group key={z.id}>
          {z.marker === "pin" && <Pin position={z.mark} />}
          {z.marker === "ring" && <Ring position={z.mark} />}
          {z.foundLabel && (
            <SurfaceHtml position={[z.mark[0], z.mark[1] + 0.9, z.mark[2]]} zIndex={6}>
              <span className={`${styles.dymo} ${styles.dymoAccent}`} lang="es">
                {z.foundLabel}
              </span>
            </SurfaceHtml>
          )}
        </group>
      ))}
    </group>
  );
}

/** Hand-drawn-looking pink circle floating over a found object. */
function Ring({ position }: { position: V3 }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = clock.elapsedTime * 0.8;
  });
  return (
    <mesh ref={ref} position={[position[0], position[1] + 0.2, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.6, 0.05, 6, 28]} />
      <meshBasicMaterial color="#ff5fa2" />
    </mesh>
  );
}

/** Dymo name labels (vocabulary) and solved sentences for this floor. */
export function Labels({ floor, show }: { floor: number; show: boolean }) {
  const { s } = useScene();
  const solved = useMemo(
    () =>
      s.page.tasks
        .filter((t) => t.mechanic === "build" && s.done.includes(t.id) && s.layout.anchors[t.target_zone]?.floor === floor)
        .map((t) => ({ id: t.id, pos: s.layout.anchors[t.target_zone].pos, text: assembleSentence(t.build!.template, s.allFills[t.id] ?? t.build!.answers[0]) })),
    [s.page.tasks, s.done, s.layout.anchors, s.allFills, floor],
  );
  if (!show) return null;
  return (
    <group>
      {s.layout.labels
        .filter((l) => l.floor === floor)
        .map((l) => (
          <SurfaceHtml key={l.text} position={l.pos} zIndex={5}>
            <span className={`${styles.dymo} ${styles.dymoSmall}`} lang="es">
              {l.text}
            </span>
          </SurfaceHtml>
        ))}
      {solved.map((b) => (
        <SurfaceHtml key={b.id} position={b.pos} zIndex={6}>
          <span className={`${styles.dymo} ${styles.dymoAccent}`} lang="es" style={{ whiteSpace: "normal", maxWidth: 200, display: "block", textAlign: "center" }}>
            {b.text}
          </span>
        </SurfaceHtml>
      ))}
    </group>
  );
}

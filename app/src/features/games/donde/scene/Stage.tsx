"use client";

import { ContactShadows } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Vector3, type Group } from "three";
import { useScene, ZOOM_MAX, ZOOM_MIN } from "./context";
import { DropDecals, Labels, Markers, pieceGroups, Pieces, ZoneHits } from "./Interact";
import { layouts, PLINTH, type SceneLayout, type V3 } from "./layouts";
import { cardstock, kraft, polaroid, sketchSheet, tiled } from "./paper";
import { Cyl, damp, paperMat, Sheet } from "./prims";
import { ApartmentDown, ApartmentUp, BotanicoScene, PlazaScene } from "./Scenes";

/** Camera elevation (radians): a touch flatter than true isometric, like the reference photo. */
const ELEVATION = 0.6;

// ─────────────────────────────────────────────────────────────── camera

const up = new Vector3();
const focus = new Vector3();
const dir = new Vector3();

/** Orthographic isometric rig: 90° rotation steps, zoom, pan, per-floor focus. All tweened. */
function CameraRig({ layout, floor }: { layout: SceneLayout; floor: number }) {
  const { viewRef } = useScene();
  const cur = useRef({ az: Math.PI / 4, zoom: 1, y: 0, px: 0, pz: 0, fit: 30 });
  useFrame(({ camera, size }, dt) => {
    const v = viewRef.current;
    const c = cur.current;
    const [W, D] = layout.size;
    v.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom));
    const lim = (Math.max(W, D) / 2) * (1 - 1 / v.zoom);
    v.pan = [Math.max(-lim, Math.min(lim, v.pan[0])), Math.max(-lim, Math.min(lim, v.pan[1]))];

    c.az = damp(c.az, Math.PI / 4 + v.step * (Math.PI / 2) + v.dragAz, 8, dt);
    c.zoom = damp(c.zoom, v.zoom, 10, dt);
    c.y = damp(c.y, layout.floors[floor] ?? 0, 5, dt);
    c.px = damp(c.px, v.pan[0], 12, dt);
    c.pz = damp(c.pz, v.pan[1], 12, dt);

    // Fit the footprint (plus a margin of craft table) into the screen left free by the HUD.
    const ca = Math.abs(Math.cos(c.az));
    const sa = Math.abs(Math.sin(c.az));
    const across = W * ca + D * sa + 0.8;
    const deep = (W * sa + D * ca) * Math.sin(ELEVATION) + layout.height * Math.cos(ELEVATION) + 0.6;
    const usableH = Math.max(160, size.height - v.padTop - v.padBottom);
    const fit = Math.min(size.width / across, usableH / deep);
    c.fit = damp(c.fit, fit, 6, dt);
    const zoom = c.fit * c.zoom;

    focus.set(c.px, c.y + layout.height * 0.3, c.pz);
    dir.set(Math.cos(ELEVATION) * Math.sin(c.az), Math.sin(ELEVATION), Math.cos(ELEVATION) * Math.cos(c.az));
    camera.position.copy(focus).addScaledVector(dir, 40);
    camera.lookAt(focus);
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(up, (v.padTop - v.padBottom) / 2 / zoom);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  });
  return null;
}

// ─────────────────────────────────────────────────────────────── table + light

function Lights({ fx, layout }: { fx: boolean; layout: SceneLayout }) {
  const r = Math.max(...layout.size) * 0.75;
  return (
    <>
      <hemisphereLight args={["#fff8ec", "#a89276", 1.1]} />
      <ambientLight intensity={0.22} color="#ffe6c4" />
      <directionalLight
        position={[7, 15, 9]}
        intensity={1.9}
        color="#ffeccc"
        castShadow={fx}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-r}
        shadow-camera-right={r}
        shadow-camera-top={r}
        shadow-camera-bottom={-r}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {/* fill from the window side so the back walls aren't flat */}
      <directionalLight position={[-8, 10, -2]} intensity={0.35} color="#fff0d8" />
    </>
  );
}

/** Kraft-paper craft table with loose polaroids, sketches, a tape roll and a pencil. */
function CraftTable({ layout }: { layout: SceneLayout }) {
  const tableMat = useMemo(() => paperMat("#ffffff", { map: tiled(kraft("table"), 14, 14), key: "table" }), []);
  const [W, D] = layout.size;
  const items = useMemo(() => {
    const kinds = ["room", "window", "chair", "plant", "room", "window"] as const;
    const rx = W / 2 + 2.2;
    const rz = D / 2 + 2.2;
    return [
      { kind: kinds[0], pos: [-rx, -rz * 0.1] as [number, number], rot: 0.25 },
      { kind: kinds[1], pos: [rx * 0.2, -rz - 0.4] as [number, number], rot: -0.2 },
      { kind: kinds[2], pos: [rx + 0.3, rz * 0.35] as [number, number], rot: 0.4 },
      { kind: kinds[3], pos: [-rx * 0.35, rz + 0.5] as [number, number], rot: -0.35 },
      { kind: kinds[4], pos: [rx * 0.8, -rz * 0.85] as [number, number], rot: 0.1 },
      { kind: kinds[5], pos: [-rx * 0.9, rz * 0.9] as [number, number], rot: 0.5 },
    ];
  }, [W, D]);
  const y = -PLINTH;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow material={tableMat}>
        <planeGeometry args={[140, 140]} />
      </mesh>
      {items.map((it, i) => (
        <Sheet key={i} size={[2.3, 2.7]} map={polaroid(it.kind)} alpha position={[it.pos[0], y + 0.01 + i * 0.002, it.pos[1]]} rotation={[-Math.PI / 2, 0, it.rot]} />
      ))}
      <Sheet size={[2.4, 3.0]} map={sketchSheet()} alpha position={[-W / 2 - 1.6, y + 0.02, -D / 2 - 1.2]} rotation={[-Math.PI / 2, 0, 0.7]} />
      <Sheet size={[2.4, 3.0]} map={sketchSheet()} alpha position={[W / 2 + 2.4, y + 0.02, -D / 2 + 1.0]} rotation={[-Math.PI / 2, 0, -0.5]} />
      <mesh position={[W / 2 + 1.4, y + 0.18, D / 2 + 1.4]} rotation={[Math.PI / 2, 0, 0]} castShadow material={paperMat("#f0e2b8", { map: cardstock("#f0e2b8") })}>
        <torusGeometry args={[0.5, 0.18, 10, 24]} />
      </mesh>
      <group position={[-W / 2 - 0.8, y + 0.08, D / 2 + 1.6]} rotation={[0, 0.6, Math.PI / 2]}>
        <Cyl r={0.08} h={2.2} color="#f2c230" seg={6} />
        <mesh position={[0, 1.22, 0]} castShadow material={paperMat("#e8c9a0")}>
          <coneGeometry args={[0.08, 0.25, 6]} />
        </mesh>
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────── floors

/** A storey: the decor plus the interactive layers. Hidden storeys lift away (dollhouse). */
function Storey({ index, layout, shown, children }: { index: number; layout: SceneLayout; shown: boolean; children: ReactNode }) {
  const { s } = useScene();
  const ref = useRef<Group>(null);
  const base = layout.floors[index];
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.position.y = damp(g.position.y, base + (shown ? 0 : 14), 5, dt);
    g.visible = g.position.y < base + 11;
  });
  return (
    <group ref={ref} position={[0, base, 0]}>
      {children}
      {shown && <ZoneHits floor={index} />}
      <DropDecals floor={index} />
      <Pieces floor={index} />
      <Markers floor={index} />
      <Labels floor={index} show={shown && s.floor === index} />
    </group>
  );
}

function SceneContent({ layout }: { layout: SceneLayout }) {
  const { s } = useScene();
  if (layout.id === "pop_up_apartment") {
    return (
      <>
        <Storey index={0} layout={layout} shown>
          <ApartmentDown />
          {/* warm spill from the window */}
          <pointLight position={[0.8, 2.6, -3.6]} intensity={7} distance={9} decay={2} color="#ffcf8a" />
        </Storey>
        <Storey index={1} layout={layout} shown={s.floor === 1}>
          <ApartmentUp />
        </Storey>
      </>
    );
  }
  return (
    <Storey index={0} layout={layout} shown>
      {layout.id === "polaroid_plaza" ? <PlazaScene /> : <BotanicoScene />}
    </Storey>
  );
}

// ─────────────────────────────────────────────────────────────── page turn

const OUT = 0.42;
const IN = 0.75;
const easeOutBack = (x: number) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;

/**
 * Page turn: the old diorama folds flat, a paper sheet flips over it, the new one pops up.
 * `shown` lags the requested page until the fold is done.
 */
export function Stage({ fx }: { fx: boolean }) {
  const ctx = useScene();
  const { s, reducedMotion } = ctx;
  const [shown, setShown] = useState(s.pageIndex);
  const [settled, setSettled] = useState(false);
  const root = useRef<Group>(null);
  const sheet = useRef<Group>(null);
  const tl = useRef({ t: OUT, to: s.pageIndex, flipping: false });

  useEffect(() => {
    const t = tl.current;
    if (s.pageIndex !== t.to) {
      t.to = s.pageIndex;
      t.t = reducedMotion ? OUT : Math.min(t.t, 0);
      t.flipping = true;
    }
  }, [s.pageIndex, reducedMotion]);

  const layout = layouts[s.book.pages[shown].visual_layer];

  useFrame((_, dt) => {
    const t = tl.current;
    const g = root.current;
    if (!g) return;
    if (t.t < OUT + IN) {
      t.t += reducedMotion ? 10 : dt;
      if (settled) setSettled(false);
      if (t.t >= OUT && shown !== t.to) setShown(t.to);
      const k = t.t < OUT ? 1 - Math.min(1, t.t / OUT) * 0.97 : 0.03 + 0.97 * easeOutBack(Math.min(1, (t.t - OUT) / IN));
      g.scale.set(1, Math.max(0.02, k), 1);
      g.rotation.x = t.t < OUT ? 0 : (1 - Math.min(1, (t.t - OUT) / IN)) * -0.15;
      const sh = sheet.current;
      if (sh) {
        sh.visible = t.flipping;
        sh.rotation.z = -Math.PI * Math.min(1, t.t / (OUT + IN * 0.6));
      }
    } else {
      if (g.scale.y !== 1) g.scale.set(1, 1, 1);
      g.rotation.x = 0;
      if (sheet.current) sheet.current.visible = false;
      if (t.flipping) t.flipping = false;
      if (!settled) setSettled(true);
    }
  });

  const [W, D] = layout.size;
  return (
    <>
      <Lights fx={fx} layout={layout} />
      <CameraRig layout={layout} floor={s.floor} />
      <CraftTable layout={layout} />
      <group ref={sheet} position={[0, 0.2, 0]} visible={false}>
        <mesh position={[W * 0.3, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={paperMat("#f6efe0", { map: cardstock("#f6efe0"), double: true, key: "flip" })}>
          <planeGeometry args={[W * 0.6 + 1, D + 1.5]} />
        </mesh>
      </group>
      <group ref={root}>
        <SceneContent key={shown} layout={layout} />
      </group>
      {settled && <ContactShadows key={shown} position={[0, -PLINTH + 0.004, 0]} scale={Math.max(W, D) + 5} blur={2.6} far={2.5} opacity={0.5} resolution={512} frames={1} color="#3d2a14" />}
      {fx && (
        <EffectComposer multisampling={0}>
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.32} />
          <Vignette offset={0.35} darkness={0.3} />
        </EffectComposer>
      )}
      {process.env.NODE_ENV !== "production" && <DevHook />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────── playtest hook

const tmp = new Vector3();

/** Dev only: screen positions of zones and pieces, so the playtest can drive real pointer drags/taps. */
function DevHook() {
  const { hitsRef } = useScene();
  const get = useThree((st) => st.get);
  useEffect(() => {
    const toScreen = (v: Vector3): [number, number] => {
      const { camera, size } = get();
      const p = v.clone().project(camera);
      return [((p.x + 1) / 2) * size.width, ((1 - p.y) / 2) * size.height];
    };
    const w = window as unknown as { __dondeScene?: object };
    w.__dondeScene = {
      zone: (id: string, i = 0): [number, number] | null => {
        const m = hitsRef.current.get(id)?.[i];
        return m ? toScreen(m.getWorldPosition(tmp)) : null;
      },
      piece: (id: string): [number, number] | null => {
        const g = pieceGroups.get(id);
        return g ? toScreen(g.getWorldPosition(tmp).add(new Vector3(0, 0.3, 0))) : null;
      },
      point: (p: V3): [number, number] => toScreen(new Vector3(...p)),
    };
    return () => {
      delete w.__dondeScene;
    };
  }, [get, hitsRef]);
  return null;
}

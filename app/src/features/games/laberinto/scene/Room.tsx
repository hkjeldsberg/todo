"use client";

import { Mask, useMask } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { MEMO, warm } from "../lib/color";
import type { Island } from "../lib/islands";
import { ROOM } from "../lib/room";
import type { Door, PuzzleNode } from "../lib/types";
import { useSignTexture } from "./signTexture";
import { toonGradient } from "./toon";

const FAILED_FRAME = warm("#7a1d1d");
const FAILED_PORTAL: [string, string] = [warm("#555555"), warm("#222222")];

const T = 0.3; // wall thickness

function Toon({ color, ...rest }: { color: string } & Partial<THREE.MeshToonMaterialParameters>) {
  return <meshToonMaterial color={color} gradientMap={toonGradient()} {...rest} />;
}

function Box({
  position,
  size,
  color,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <Toon color={color} />
    </mesh>
  );
}

/** North wall with three door openings cut out of it. */
function NorthWall({ color }: { color: string }) {
  const { halfW, halfD, northH, doorW, doorH, doorXs } = ROOM;
  const segs: { x0: number; x1: number }[] = [];
  let x = -halfW;
  for (const dx of doorXs) {
    segs.push({ x0: x, x1: dx - doorW / 2 });
    x = dx + doorW / 2;
  }
  segs.push({ x0: x, x1: halfW });
  const z = -halfD - T / 2;
  return (
    <group>
      {segs.map((s, i) => (
        <Box key={i} position={[(s.x0 + s.x1) / 2, northH / 2, z]} size={[s.x1 - s.x0, northH, T]} color={color} />
      ))}
      {doorXs.map((dx, i) => (
        <Box key={`l${i}`} position={[dx, (doorH + northH) / 2, z]} size={[doorW, northH - doorH, T]} color={color} />
      ))}
    </group>
  );
}

function Sign({
  position,
  width,
  height,
  texture,
  transparent,
}: {
  position: [number, number, number];
  width: number;
  height: number;
  texture: THREE.Texture | null;
  transparent?: boolean;
}) {
  const uniforms = useMemo(
    () => ({ map: { value: texture }, cutout: { value: transparent ? 1 : 0 } }),
    [texture, transparent],
  );
  if (!texture) return null;
  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      {/* keyed: three binds a material's uniforms object once, at compile */}
      <shaderMaterial key={texture.uuid} vertexShader={signVert} fragmentShader={signFrag} uniforms={uniforms} />
    </mesh>
  );
}

const signVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

/** Alpha 0 tags "typography" pixels so the ink pass leaves glyphs legible (no edge fill / halftone). */
const signFrag = /* glsl */ `
uniform sampler2D map;
uniform float cutout;
varying vec2 vUv;
void main() {
  vec4 t = texture2D(map, vUv);
  if (cutout > 0.5 && t.a < 0.5) discard;
  gl_FragColor = vec4(t.rgb, 0.0);
  #include <colorspace_fragment>
}`;

const swirlFrag = /* glsl */ `
uniform float time;
uniform vec3 a;
uniform vec3 b;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p);
  float ang = atan(p.y, p.x);
  float s = sin(ang * 5.0 + r * 28.0 - time * 3.0);
  vec3 col = mix(a, b, step(0.0, s));
  col = mix(col, vec3(1.0), smoothstep(0.08, 0.0, r));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
const swirlVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

/**
 * The corridor behind a door only exists inside that door's stencil mask. It twists and runs far
 * further than the space behind the wall allows — the non-euclidean part of the labyrinth.
 */
function PortalCorridor({ id, island, failed }: { id: number; island: Island; failed: boolean }) {
  const stencil = useMask(id);
  const group = useRef<THREE.Group>(null);
  const [c1, c2] = failed ? FAILED_PORTAL : island.palette.portal;
  const swirl = useRef<THREE.ShaderMaterial>(null);
  const swirlUniforms = useMemo(
    () => ({ time: { value: 0 }, a: { value: new THREE.Color(c1) }, b: { value: new THREE.Color(c2) } }),
    [c1, c2],
  );

  useFrame(({ clock }) => {
    if (swirl.current) swirl.current.uniforms.time.value = clock.elapsedTime;
    if (group.current) group.current.rotation.z = Math.sin(clock.elapsedTime * 0.4 + id) * 0.08;
  });

  const rings = 14;
  const L = ROOM.corridorLen;
  return (
    <group ref={group}>
      {Array.from({ length: rings }, (_, i) => {
        const z = -0.8 - (i / rings) * L;
        const twist = i * 0.11;
        const s = 1 - i * 0.025;
        return (
          <group key={i} position={[0, ROOM.doorH / 2, z]} rotation={[0, 0, twist]} scale={[s, s, 1]}>
            {[
              [0, 1.9, 4.2, 0.4],
              [0, -1.9, 4.2, 0.4],
              [-1.9, 0, 0.4, 4.2],
              [1.9, 0, 0.4, 4.2],
            ].map(([x, y, w, h], j) => (
              <mesh key={j} position={[x, y, 0]}>
                <boxGeometry args={[w, h, 0.5]} />
                <meshToonMaterial color={i % 2 ? c1 : c2} gradientMap={toonGradient()} {...stencil} />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* tunnel skin so nothing outside leaks through */}
      <mesh position={[0, ROOM.doorH / 2, -L / 2 - 0.5]}>
        <boxGeometry args={[4.6, 4.6, L + 1]} />
        <meshToonMaterial color={c2} gradientMap={toonGradient()} side={THREE.BackSide} {...stencil} />
      </mesh>
      <mesh position={[0, ROOM.doorH / 2, -L]}>
        <planeGeometry args={[4.6, 4.6]} />
        <shaderMaterial
          key={`${c1}${c2}`}
          ref={swirl}
          vertexShader={swirlVert}
          fragmentShader={swirlFrag}
          uniforms={swirlUniforms}
          {...stencil}
        />
      </mesh>
    </group>
  );
}

function DoorUnit({
  index,
  door,
  x,
  island,
  failed,
  highlighted,
}: {
  index: number;
  door: Door;
  x: number;
  island: Island;
  failed: boolean;
  /** Aimed at, hovered or being auto-walked to: frame lights up in memo pink. */
  highlighted: boolean;
}) {
  const { halfD, doorW, doorH } = ROOM;
  const label = useSignTexture({
    text: door.text,
    style: "door",
    width: 3.6,
    height: 1.3,
    paper: failed ? MEMO.shell : MEMO.page,
    maxFont: 110,
  });
  const rule = useSignTexture({
    text: `✗ ${door.feedback}`,
    style: "caption",
    width: 1.9,
    height: 2.1,
    maxFont: 64,
  });
  const z = -halfD;
  const frame = highlighted ? MEMO.accent : failed ? FAILED_FRAME : island.palette.accent;
  return (
    <group position={[x, 0, 0]}>
      {/* Stencil window: writes id into the stencil buffer where the doorway is */}
      <Mask id={index + 1} position={[0, doorH / 2, z - 0.02]}>
        <planeGeometry args={[doorW, doorH]} />
      </Mask>
      <group position={[0, 0, z]}>
        <PortalCorridor id={index + 1} island={island} failed={failed} />
      </group>
      {/* frame */}
      <Box position={[-doorW / 2 - 0.12, doorH / 2, z + 0.05]} size={[0.24, doorH + 0.24, 0.5]} color={frame} />
      <Box position={[doorW / 2 + 0.12, doorH / 2, z + 0.05]} size={[0.24, doorH + 0.24, 0.5]} color={frame} />
      <Box position={[0, doorH + 0.12, z + 0.05]} size={[doorW + 0.48, 0.24, 0.5]} color={frame} />
      <Sign position={[0, doorH + 0.95, z + 0.02]} width={3.6} height={1.3} texture={label} />
      {/* Paradox rule painted onto the failed door */}
      {failed && <Sign position={[0, doorH / 2 + 0.1, z + 0.35]} width={1.9} height={2.1} texture={rule} />}
    </group>
  );
}

export function Room({
  node,
  island,
  failed,
  highlight,
  portrait,
}: {
  node: PuzzleNode;
  island: Island;
  failed: number[];
  highlight: number | null;
  /** Narrow view: the prompt sign becomes taller and narrower so it stays on screen. */
  portrait: boolean;
}) {
  const { halfW, halfD, northH, sideH, doorXs } = ROOM;
  const p = island.palette;
  const sign = portrait ? { width: 8, height: 3.2, y: 6.2 } : { width: 13, height: 2.5, y: 6.3 };
  const prompt = useSignTexture({
    text: node.ambient_prompt,
    style: island.signStyle,
    width: sign.width,
    height: sign.height,
    ink: island.signStyle === "stone" ? warm("#2a2520") : MEMO.ink,
    paper: island.signStyle === "stone" ? p.wall : MEMO.page,
    accent: p.accent,
    maxFont: 150,
  });

  return (
    <group>
      {/* floor with a checker inlay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[halfW * 2, halfD * 2]} />
        <Toon color={p.floor} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * 2.2, 0.03, 1.5]}>
          <planeGeometry args={[1.2, 5]} />
          <Toon color={p.accent} />
        </mesh>
      ))}

      <NorthWall color={p.wall} />
      <Box position={[0, sideH / 2, halfD + T / 2]} size={[halfW * 2 + T * 2, sideH, T]} color={p.wall} />
      <Box position={[-halfW - T / 2, sideH / 2, 0]} size={[T, sideH, halfD * 2]} color={p.wall} />
      <Box position={[halfW + T / 2, sideH / 2, 0]} size={[T, sideH, halfD * 2]} color={p.wall} />
      {/* ledge where the tall north wall meets the low side walls */}
      <Box position={[-halfW - T / 2, northH / 2, -halfD + 0.5]} size={[T, northH, 1]} color={p.wall} />
      <Box position={[halfW + T / 2, northH / 2, -halfD + 0.5]} size={[T, northH, 1]} color={p.wall} />

      <Sign
        position={[0, sign.y, -halfD + 0.02]}
        width={sign.width}
        height={sign.height}
        texture={prompt}
        transparent={island.signStyle === "graffiti"}
      />

      {node.doors.map((door, i) => (
        <DoorUnit
          key={`${node.node_id}-${i}`}
          index={i}
          door={door}
          x={doorXs[i]}
          island={island}
          failed={failed.includes(i)}
          highlighted={highlight === i}
        />
      ))}
    </group>
  );
}

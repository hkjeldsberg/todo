"use client";

import type { PieceKind } from "./layouts";
import { fabric } from "./paper";
import { Ball, Blob, Block, Cyl, paperMat, Soft } from "./prims";
import { Bike, CafeChair, Fountain, Kiosk } from "./propsTown";

/** The mesh for a draggable piece, standing on its local origin. */
export function PieceMesh({ kind }: { kind: PieceKind }) {
  switch (kind) {
    case "teddy":
      return (
        <group>
          <Blob position={[0, 0.01, 0]} size={[0.7, 0.7]} opacity={0.7} />
          <Ball r={0.2} color="#b9855a" position={[0, 0.2, 0]} scale={[1, 1.1, 0.9]} />
          <Ball r={0.15} color="#b9855a" position={[0, 0.5, 0]} />
          {[-1, 1].map((s) => (
            <Ball key={s} r={0.06} color="#9c6c45" position={[s * 0.11, 0.62, 0]} />
          ))}
          <Ball r={0.06} color="#e6c9a8" position={[0, 0.47, 0.12]} cast={false} />
          {[-1, 1].map((s) => (
            <Ball key={s} r={0.07} color="#b9855a" position={[s * 0.17, 0.08, 0.1]} />
          ))}
        </group>
      );
    case "ball":
      return (
        <group>
          <Blob position={[0, 0.01, 0]} size={[0.5, 0.5]} opacity={0.7} />
          <Ball r={0.22} color="#ffffff" map={fabric("#e25d5d", "rgba(255,255,255,0.5)")} position={[0, 0.22, 0]} />
          <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]} material={paperMat("#f6e7b0")}>
            <torusGeometry args={[0.222, 0.03, 6, 20]} />
          </mesh>
        </group>
      );
    case "yoyo":
      return (
        <group rotation={[0, 0, 0]}>
          <Blob position={[0, 0.01, 0]} size={[0.45, 0.45]} opacity={0.7} />
          <Cyl r={0.18} h={0.08} color="#5aa1d6" position={[0, 0.04, 0]} />
          <Cyl r={0.06} h={0.05} color="#f2e6d0" position={[0, 0.1, 0]} />
          <Cyl r={0.18} h={0.08} color="#5aa1d6" position={[0, 0.16, 0]} />
        </group>
      );
    case "backpack":
      return (
        <group>
          <Blob position={[0, 0.01, 0]} size={[0.9, 0.7]} opacity={0.7} />
          <Soft size={[0.6, 0.7, 0.35]} radius={0.13} color="#7e6bb8" map={fabric("#7e6bb8")} position={[0, 0.35, 0]} />
          <Soft size={[0.44, 0.3, 0.12]} radius={0.06} color="#a996dc" position={[0, 0.25, 0.2]} />
          <Block size={[0.4, 0.05, 0.05]} color="#f6c945" position={[0, 0.42, 0.265]} cast={false} />
          <mesh position={[0, 0.72, 0]} rotation={[0, 0, 0]} material={paperMat("#5a4a8a")}>
            <torusGeometry args={[0.12, 0.03, 6, 12, Math.PI]} />
          </mesh>
        </group>
      );
    case "fountain":
      return <Fountain />;
    case "chair":
      return <CafeChair />;
    case "kiosk":
      return <Kiosk />;
    case "bike":
      return <Bike />;
  }
}

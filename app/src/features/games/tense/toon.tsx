"use client";

import { DataTexture, NearestFilter, RedFormat } from "three";

/** 3-band ramp: hard shadow, mid, lit. Shared by every toon material. */
const gradientMap = (() => {
  const tex = new DataTexture(new Uint8Array([90, 170, 255]), 3, 1, RedFormat);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
})();

interface ToonProps {
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}

/** Flat cel-shaded material. Use as a child of <mesh>. */
export function Toon({ color, emissive = "#000000", emissiveIntensity = 0, transparent, opacity }: ToonProps) {
  return (
    <meshToonMaterial
      color={color}
      gradientMap={gradientMap}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      transparent={transparent}
      opacity={opacity}
    />
  );
}

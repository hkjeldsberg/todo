"use client";

import { CanvasTexture, DoubleSide, MeshBasicMaterial, MeshLambertMaterial, NearestFilter, RepeatWrapping, SRGBColorSpace } from "three";

/**
 * Flat, pixel-art-inspired materials: Lambert with flat shading (one tone per
 * face, like a 16-bit sprite), cached per colour so the whole map shares a
 * handful of materials. `ghost` variants fade a prop the gnome hides inside.
 */

const cache = new Map<string, MeshLambertMaterial>();

export function flat(color: string, opts: { ghost?: boolean; double?: boolean } = {}): MeshLambertMaterial {
  const key = `${color}:${opts.ghost ? 1 : 0}:${opts.double ? 1 : 0}`;
  let m = cache.get(key);
  if (!m) {
    m = new MeshLambertMaterial({
      color,
      flatShading: true,
      transparent: !!opts.ghost,
      opacity: opts.ghost ? 0.28 : 1,
      depthWrite: !opts.ghost,
      side: opts.double ? DoubleSide : undefined,
    });
    cache.set(key, m);
  }
  return m;
}

const basics = new Map<string, MeshBasicMaterial>();

/** Unlit colour (outlines, water glints, the pink pulse). */
export function unlit(color: string, opacity = 1): MeshBasicMaterial {
  const key = `${color}:${opacity}`;
  let m = basics.get(key);
  if (!m) {
    m = new MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
    basics.set(key, m);
  }
  return m;
}

const textures = new Map<string, CanvasTexture>();

/** A crisp two-tone checkerboard (one texel per tile), for grass and paving. */
export function checker(a: string, b: string, tiles: number): CanvasTexture {
  const key = `${a}:${b}:${tiles}`;
  let t = textures.get(key);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = tiles * 4;
    c.height = tiles * 4;
    const g = c.getContext("2d")!;
    for (let y = 0; y < tiles; y++)
      for (let x = 0; x < tiles; x++) {
        g.fillStyle = (x + y) % 2 ? b : a;
        g.fillRect(x * 4, y * 4, 4, 4);
        // A darker pixel speck per tile: reads as grass texture at a distance.
        g.fillStyle = "rgba(0,0,0,0.07)";
        g.fillRect(x * 4 + ((x * 7 + y * 3) % 3), y * 4 + ((x * 5 + y) % 3), 1, 1);
      }
    t = new CanvasTexture(c);
    t.magFilter = NearestFilter;
    t.minFilter = NearestFilter;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.colorSpace = SRGBColorSpace;
    textures.set(key, t);
  }
  return t;
}

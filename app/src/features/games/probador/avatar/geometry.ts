import type { Fit } from "../lib/types";
import type { ItemKind } from "./catalog";

/**
 * Avatar coordinates (viewBox 0 -24 200 324). Shoulders at y 86, waist 156,
 * ankles 270. Arms run from the shoulder joint to the wrist in a straight line.
 */
export const SHOULDER = { l: [72, 90], r: [128, 90] } as const;
export const WRIST = { l: [60, 164], r: [140, 164] } as const;
export const WAIST_Y = 156;
export const ANKLE_Y = 270;

/** Point `t` (0 shoulder → 1 wrist) along an arm. */
export function armPoint(side: "l" | "r", t: number): [number, number] {
  const [x0, y0] = SHOULDER[side];
  const [x1, y1] = WRIST[side];
  return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
}

/** Mixes a #rrggbb colour toward black (amount < 0) or white (amount > 0). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (target - c) * k);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Light colours get dark trims and vice versa. */
export function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170;
}

const scaleAt = (x: number, y: number, sx: number, sy: number, dy = 0) =>
  `translate(${x} ${y + dy}) scale(${sx} ${sy}) translate(${-x} ${-y})`;

/**
 * How a bad fit looks: the piece is scaled around where it hangs from
 * (shoulders for tops and dresses, waist for bottoms, the crown of the head for hats).
 */
export function fitTransform(kind: ItemKind, fit: Fit | undefined, item: string): string | undefined {
  if (!fit) return undefined;
  if (kind === "accessory") return fit === "big" ? scaleAt(100, 30, 1.45, 1.45, 9) : scaleAt(100, 30, 0.7, 0.7);
  if (kind === "bottom") {
    const skirt = item.includes("falda") || item === "escocesa";
    if (fit === "long") return scaleAt(100, WAIST_Y, 1.1, 1.2);
    if (fit === "short") return scaleAt(100, WAIST_Y, 1, skirt ? 0.55 : 0.74);
    if (fit === "big") return scaleAt(100, WAIST_Y, 1.25, 1.06);
    return scaleAt(100, WAIST_Y, 0.9, 0.9);
  }
  // tops and full-body pieces hang from the shoulders
  if (fit === "big") return scaleAt(100, 84, 1.32, 1.3);
  if (fit === "small") return scaleAt(100, 84, 0.93, 0.7);
  if (fit === "long") return scaleAt(100, 84, 1.02, 1.24);
  return scaleAt(100, 84, 1, 0.8);
}

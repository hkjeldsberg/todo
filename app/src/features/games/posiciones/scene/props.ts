import type { Body } from "../model/layouts";
import type { World } from "../model/relations";
import { ellipse, ellipseRing, hash, INK, line, px, rect, T, YPX, type G } from "./pixel";

/**
 * Procedural 16-bit sprites for every prop kind, in the 3/4 top-down view:
 * a thing's top face sits `H` px above its footprint and its front (south)
 * face hangs below that. Coordinates are world base pixels (world (0, 0) is
 * pixel (0, 0); x right, z down the screen). Fills are drawn first, then the
 * sprite gets an automatic ink outline; `post` runs after the outline (thin
 * iron work that must not be outlined).
 */

// ─────────────────────────────────────────────────────────────── palette

export const C = {
  stoneHi: "#F1EEF2",
  stoneLight: "#D9D4DE",
  stone: "#B7B0C0",
  stoneDark: "#8C849A",
  stoneDeep: "#655C74",
  woodHi: "#E8B070",
  woodLight: "#CF8E52",
  wood: "#A8663A",
  woodDark: "#784328",
  iron: "#3D2140",
  ironHi: "#7C6E90",
  leafHi: "#A6E07A",
  leafLight: "#6CC255",
  leaf: "#3C9A45",
  leafDark: "#23703A",
  leafDeep: "#16532F",
  waterHi: "#E6F7FF",
  waterLight: "#9AD8FA",
  water: "#4CA6EA",
  waterDark: "#2F6FC0",
  sand: "#EDD39B",
  sandDark: "#CFAE72",
  dirt: "#8C5A38",
  dirtDark: "#6A402A",
  red: "#E0503A",
  redDark: "#A8302E",
  cream: "#FFF3DA",
  creamDark: "#E6C9A0",
  gold: "#F2C14C",
  goldDark: "#B8862A",
  clay: "#D9733C",
  clayLight: "#F29A5C",
  clayDark: "#A2482A",
  hole: "#2A1830",
};

export interface Canopy {
  deep: string;
  dark: string;
  mid: string;
  light: string;
  hi: string;
}
export const GREEN: Canopy = { deep: C.leafDeep, dark: C.leafDark, mid: C.leaf, light: C.leafLight, hi: C.leafHi };
export const AUTUMN: Canopy = { deep: "#8A3A22", dark: "#B8532A", mid: "#E8902F", light: "#FFC24A", hi: "#FFE58A" };
export const RUST: Canopy = { deep: "#6E1E2A", dark: "#9A2C2E", mid: "#D2452F", light: "#F27A3C", hi: "#FFB070" };
export const GOLDEN: Canopy = { deep: "#8A6A1E", dark: "#B88A22", mid: "#E2BC3E", light: "#FFE070", hi: "#FFF4B0" };
export const GLOOM: Canopy = { deep: "#163A36", dark: "#1F4A44", mid: "#2F6E5E", light: "#4F9278", hi: "#7AB896" };
export const HEDGE: Canopy = { deep: "#154B2B", dark: "#1F6634", mid: "#2F8A3E", light: "#4FAE4A", hi: "#86D06A" };

// ─────────────────────────────────────────────────────────────── geometry

export interface Geo {
  L: number;
  R: number;
  B: number;
  F: number;
  H: number;
  cx: number;
  cz: number;
  W: number;
  D: number;
}

export function geoOf(b: Body): Geo {
  const L = Math.round((b.at[0] - b.size[0] / 2) * T);
  const R = Math.round((b.at[0] + b.size[0] / 2) * T);
  const B = Math.round((b.at[1] - b.size[1] / 2) * T);
  const F = Math.round((b.at[1] + b.size[1] / 2) * T);
  return { L, R, B, F, H: Math.round(b.h * YPX), cx: Math.round(b.at[0] * T), cz: Math.round(b.at[1] * T), W: R - L, D: F - B };
}

export interface PropArt {
  /** Sprite canvas box in world px. */
  box: [number, number, number, number];
  frames?: number;
  fps?: number;
  /** Drawn under everything that stands (ground-level areas). */
  flat?: boolean;
  draw(g: G, f: number): void;
  post?(g: G, f: number): void;
  /** Ground decoration under the prop (shadows), drawn into the static layer. */
  ground?(g: G): void;
  /** Label anchor (world px). */
  label: [number, number];
  /** Opening where the gnome's hat pokes out (jar, well). */
  mouth?: [number, number];
  /** Point he hangs from. */
  hook?: [number, number];
  /** Doorway he peeks out of. */
  door?: [number, number];
}

// ─────────────────────────────────────────────────────────────── helpers

/** Per-pixel painter over a box. */
function tex(g: G, x: number, y: number, w: number, h: number, fn: (x: number, y: number) => string | null) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const c = fn(x + i, y + j);
      if (c) px(g, x + i, y + j, c);
    }
}

/** Leafy scale texture (hedges, bushes). */
function leafy(g: G, x: number, y: number, w: number, h: number, p: Canopy, lit: boolean, seed = 0) {
  rect(g, x, y, w, h, lit ? p.mid : p.dark);
  for (let j = 0; j < h; j += 3) {
    const off = (Math.floor((y + j) / 3) & 1) * 2;
    for (let i = -off; i < w; i += 4) {
      const X = x + i;
      const Y = y + j;
      const r = hash(X, Y, seed);
      const hi = lit ? p.light : p.mid;
      const lo = lit ? p.dark : p.deep;
      const put = (a: number, b: number, c: string) => {
        if (a >= x && a < x + w && b >= y && b < y + h) px(g, a, b, c);
      };
      put(X + 1, Y, hi);
      put(X + 2, Y, hi);
      put(X, Y + 1, hi);
      put(X + 3, Y + 1, lo);
      put(X + 1, Y + 2, lo);
      put(X + 2, Y + 2, lo);
      if (lit && r < 0.25) put(X + 1, Y, p.hi);
    }
  }
}

/** Stone bricks. */
function bricks(g: G, x: number, y: number, w: number, h: number, base: string, light: string, dark: string, bw = 7, bh = 4) {
  rect(g, x, y, w, h, base);
  for (let j = 0; j < h; j++) {
    const row = Math.floor((y + j) / bh);
    const v = (((y + j) % bh) + bh) % bh;
    const off = (row & 1) * Math.floor(bw / 2);
    for (let i = 0; i < w; i++) {
      const u = (((x + i + off) % bw) + bw) % bw;
      if (v === bh - 1 || u === bw - 1) px(g, x + i, y + j, dark);
      else if (v === 0 && u < bw - 2) px(g, x + i, y + j, light);
    }
  }
}

function inRound(x: number, y: number, L: number, Tp: number, W: number, H: number, r: number) {
  const dx = x < L + r ? L + r - x - 0.5 : x >= L + W - r ? x - (L + W - r) + 0.5 : 0;
  const dy = y < Tp + r ? Tp + r - y - 0.5 : y >= Tp + H - r ? y - (Tp + H - r) + 0.5 : 0;
  return dx * dx + dy * dy <= r * r;
}

/** Swirly tree canopy, like 16-bit RPG trees: overlapping puffs, dark rims, curled highlights. */
export function canopy(g: G, cx: number, cy: number, r: number, p: Canopy, f: number, seed: number) {
  const lobes: [number, number, number][] = [
    [0, -0.52, 0.52],
    [-0.5, -0.3, 0.5],
    [0.5, -0.3, 0.5],
    [0, -0.05, 0.62],
    [-0.58, 0.18, 0.46],
    [0.58, 0.18, 0.46],
    [-0.22, 0.42, 0.5],
    [0.28, 0.44, 0.48],
  ];
  const ls = lobes
    .map(([dx, dy, rr], i) => {
      const sway = dy < 0 && f === 1 ? (i & 1 ? 1 : -1) : 0;
      return { x: cx + dx * r + sway, y: cy + dy * r, r: rr * r, i };
    })
    .sort((a, b) => a.y - b.y);
  for (const l of ls) {
    ellipse(g, l.x - l.r, l.y - l.r, l.r * 2, l.r * 2, p.dark);
    ellipse(g, l.x - l.r + 0.5, l.y - l.r, l.r * 2 - 2, l.r * 2 - 2.5, p.mid);
    // Curl: an arc of highlight in the upper left, then a small inner hook.
    const sr = l.r * 0.55;
    const ox = l.x - l.r * 0.12;
    const oy = l.y - l.r * 0.15;
    const hook = hash(l.i, seed, 7) < 0.5;
    for (let a = 2.6; a < 5.2; a += 0.12) px(g, ox + Math.cos(a) * sr, oy + Math.sin(a) * sr, p.light);
    for (let a = 4.2; a < (hook ? 7.4 : 6.6); a += 0.2) px(g, ox + Math.cos(a) * sr * 0.45, oy + Math.sin(a) * sr * 0.45, p.light);
    px(g, ox - sr * 0.7, oy - sr * 0.55, p.hi);
    // Dark crease on the lower right.
    for (let a = 0.2; a < 1.6; a += 0.15) px(g, l.x + Math.cos(a) * (l.r - 2), l.y + Math.sin(a) * (l.r - 2.5), p.deep);
  }
}

function trunk(g: G, cx: number, top: number, bottom: number, w: number, light: string, mid: string, dark: string) {
  rect(g, cx - Math.floor(w / 2), top, w, bottom - top, mid);
  rect(g, cx - Math.floor(w / 2), top, 1, bottom - top, light);
  rect(g, cx + Math.ceil(w / 2) - 2, top, 2, bottom - top, dark);
  // Root flare.
  rect(g, cx - Math.floor(w / 2) - 2, bottom - 2, w + 4, 2, mid);
  px(g, cx - Math.floor(w / 2) - 2, bottom - 3, mid);
  px(g, cx + Math.ceil(w / 2) + 1, bottom - 3, dark);
  rect(g, cx + Math.ceil(w / 2), bottom - 2, 2, 2, dark);
  for (let y = top + 3; y < bottom - 3; y += 5) px(g, cx - 1 + (y % 3), y, dark);
}

/** Soft ground shadow (drawn into the static layer). */
export function shadow(g: G, cx: number, cy: number, w: number, h: number, a = 0.22) {
  g.globalAlpha = a;
  ellipse(g, cx - w / 2, cy - h / 2, w, h, INK);
  g.globalAlpha = 1;
}

// ─────────────────────────────────────────────────────────────── building blocks (also used for walls & decor)

export function hedgeBlock(g: G, L: number, B: number, R: number, F: number, H: number, p: Canopy = HEDGE, seed = 0) {
  const W = R - L;
  leafy(g, L, B - H, W, F - B, p, true, seed);
  leafy(g, L, F - H, W, H, p, false, seed + 1);
  rect(g, L, F - H, W, 1, p.dark);
  rect(g, L, F - 1, W, 1, p.deep);
  // Bumpy silhouette.
  for (let x = L + ((L & 3) === 0 ? 0 : 4 - (L & 3)); x < R; x += 4) {
    g.clearRect(x, B - H, 1, 1);
    g.clearRect(x + 2, F - 1, 1, 1);
  }
  g.clearRect(L, B - H, 1, 2);
  g.clearRect(R - 1, B - H, 1, 2);
}

export function stoneWall(g: G, L: number, B: number, R: number, F: number, H: number) {
  const W = R - L;
  bricks(g, L, B - H, W, F - B, C.stoneLight, C.stoneHi, C.stone, 6, 3);
  bricks(g, L, F - H, W, H, C.stone, C.stoneLight, C.stoneDark, 7, 4);
  rect(g, L, F - H, W, 1, C.stoneDark);
  rect(g, L, F - 1, W, 1, C.stoneDeep);
  tex(g, L, F - 3, W, 3, (x, y) => (hash(x, y, 5) < 0.18 ? "#5E8A4E" : null));
  tex(g, L, B - H, W, F - B, (x, y) => (hash(x, y, 9) < 0.03 ? "#6E9A5A" : null));
}

export interface HouseStyle {
  wall: string;
  wallLight: string;
  wallDark: string;
  roof: string;
  roofLight: string;
  roofDark: string;
  pattern: "stripe" | "diamond" | "scale";
  door?: boolean;
}

export const HOUSES: HouseStyle[] = [
  { wall: "#F4D98A", wallLight: "#FFF0B8", wallDark: "#C8A860", roof: "#D8433A", roofLight: "#F07A52", roofDark: "#9A2830", pattern: "stripe" },
  { wall: "#F2E6D0", wallLight: "#FFFFFF", wallDark: "#C9B89C", roof: "#3F6FD8", roofLight: "#78A2F2", roofDark: "#2A4696", pattern: "diamond" },
  { wall: "#EAA07A", wallLight: "#F8C49E", wallDark: "#B8704E", roof: "#8A6AA8", roofLight: "#B094CC", roofDark: "#5E4478", pattern: "diamond" },
  { wall: "#E8D6A8", wallLight: "#FFF0C8", wallDark: "#B8A070", roof: "#C8583A", roofLight: "#E88A5A", roofDark: "#8A3424", pattern: "scale" },
  { wall: "#B8D8E8", wallLight: "#DFF2FA", wallDark: "#86A8BC", roof: "#5E9A4A", roofLight: "#8AC46A", roofDark: "#3A6A34", pattern: "scale" },
];

/** A village house: front wall with door and windows, tiled roof above. */
export function house(g: G, L: number, B: number, R: number, F: number, wallH: number, s: HouseStyle, seed: number) {
  const W = R - L;
  const top = F - wallH;
  // Wall.
  rect(g, L, top, W, wallH, s.wall);
  rect(g, L, top, 1, wallH, s.wallLight);
  rect(g, R - 2, top, 2, wallH, s.wallDark);
  bricks(g, L, F - 3, W, 3, C.stone, C.stoneLight, C.stoneDark, 5, 3);
  // Door and windows.
  const hasDoor = s.door !== false;
  const doorX = L + Math.round(W * (0.3 + hash(seed, 1) * 0.4)) - 3;
  if (hasDoor && W >= 16 && wallH >= 12) {
    rect(g, doorX - 1, F - 11, 8, 11, C.woodDark);
    rect(g, doorX, F - 10, 6, 10, C.wood);
    rect(g, doorX + 2, F - 10, 1, 10, C.woodDark);
    rect(g, doorX + 4, F - 10, 1, 10, C.woodDark);
    px(g, doorX + 4, F - 5, C.gold);
    rect(g, doorX - 1, F - 12, 8, 1, s.wallDark);
  }
  for (let wx = L + 3; wx + 5 < R - 1; wx += 9) {
    if (hasDoor && wx + 6 > doorX - 2 && wx < doorX + 8) continue;
    if (wallH < 10) break;
    const wy = top + 3;
    rect(g, wx - 1, wy - 1, 7, 6, C.woodDark);
    rect(g, wx, wy, 5, 4, "#8FD0F0");
    px(g, wx, wy, "#E6F7FF");
    px(g, wx + 1, wy, "#E6F7FF");
    rect(g, wx + 2, wy, 1, 4, C.woodDark);
    rect(g, wx - 1, wy + 5, 7, 1, s.wallLight);
    if (hash(wx, seed, 3) < 0.5) {
      px(g, wx, wy + 6, C.red);
      px(g, wx + 2, wy + 6, "#FFD24A");
      px(g, wx + 4, wy + 6, C.red);
    }
  }
  // Roof: back slope (lit) above the ridge, front slope down to the eave.
  const rTop = B - wallH - 5;
  const rH = top - rTop + 1;
  const ridge = rTop + Math.round(rH * 0.3);
  for (let y = rTop; y < top + 1; y++) {
    for (let x = L - 1; x < R + 1; x++) {
      const back = y < ridge;
      let c = back ? s.roofLight : s.roof;
      const u = x - L;
      const v = y - ridge;
      if (s.pattern === "stripe") {
        if ((((u % 3) + 3) % 3) === 0) c = back ? s.roof : s.roofDark;
      } else if (s.pattern === "diamond") {
        if (((((u + v) % 4) + 4) % 4) === 0 || ((((u - v) % 4) + 4) % 4) === 0) c = back ? s.roof : s.roofDark;
      } else {
        const row = Math.floor(v / 3);
        const uu = (((u + (row & 1) * 2) % 4) + 4) % 4;
        if ((((v % 3) + 3) % 3) === 2 && uu !== 1 && uu !== 2) c = back ? s.roof : s.roofDark;
        if ((((v % 3) + 3) % 3) === 0 && uu === 0) c = back ? s.roof : s.roofDark;
      }
      px(g, x, y, c);
    }
  }
  rect(g, L - 1, ridge, W + 2, 1, s.roofDark);
  rect(g, L - 1, ridge - 1, W + 2, 1, s.roofLight);
  rect(g, L - 1, top - 1, W + 2, 2, s.roofDark);
  // Chimney on some.
  if (hash(seed, 2) < 0.45) {
    const x = L + 4 + Math.floor(hash(seed, 4) * Math.max(1, W - 12));
    rect(g, x, rTop - 4, 5, 7, C.stone);
    rect(g, x, rTop - 4, 5, 1, C.stoneLight);
    rect(g, x + 3, rTop - 3, 2, 6, C.stoneDark);
  }
}

// ─────────────────────────────────────────────────────────────── trees and decor

export function pine(g: G, cx: number, ground: number, h: number, p: Canopy) {
  rect(g, cx - 1, ground - 5, 3, 5, C.woodDark);
  const tiers = 3;
  for (let t = 0; t < tiers; t++) {
    const tierTop = ground - h + Math.round((t * h) / (tiers + 0.6));
    const tierH = Math.round(h / 2.4);
    for (let j = 0; j < tierH; j++) {
      const half = Math.round(1 + (j / tierH) * (h / 3.2 + t * 1.2));
      for (let i = -half; i <= half; i++) {
        const edge = j === tierH - 1 && ((i + half) & 1);
        if (edge) continue;
        px(g, cx + i, tierTop + j, i < -half / 3 ? p.light : i > half / 2 ? p.dark : p.mid);
      }
      if (j > 1) px(g, cx - half + 1, tierTop + j, p.hi);
    }
  }
}

export function roundTree(g: G, cx: number, ground: number, r: number, trunkH: number, p: Canopy, f: number, seed: number) {
  trunk(g, cx, ground - trunkH - 4, ground, Math.max(4, Math.round(r / 3.2)), C.woodLight, C.wood, C.woodDark);
  canopy(g, cx, ground - trunkH - r * 0.55, r, p, f, seed);
}

export function bush(g: G, cx: number, ground: number, r: number, p: Canopy, seed: number) {
  const ls: [number, number, number][] = [
    [-r * 0.45, -r * 0.2, r * 0.6],
    [r * 0.45, -r * 0.25, r * 0.6],
    [0, -r * 0.5, r * 0.62],
  ];
  for (const [dx, dy, rr] of ls) {
    ellipse(g, cx + dx - rr, ground - r + dy - rr + r * 0.2, rr * 2, rr * 2, p.dark);
    ellipse(g, cx + dx - rr + 0.5, ground - r + dy - rr + r * 0.2, rr * 2 - 1.5, rr * 2 - 2, p.mid);
    px(g, cx + dx - rr * 0.3, ground - r + dy - rr * 0.35 + r * 0.2, p.light);
    px(g, cx + dx - rr * 0.1, ground - r + dy - rr * 0.45 + r * 0.2, p.light);
  }
  if (hash(seed, 1) < 0.5) {
    px(g, cx - 1, ground - r, C.red);
    px(g, cx + 2, ground - r + 2, C.red);
  }
}

export function rock(g: G, cx: number, ground: number, w: number) {
  const h = Math.round(w * 0.7);
  ellipse(g, cx - w / 2, ground - h, w, h, C.stone);
  ellipse(g, cx - w / 2 + 1, ground - h, w - 3, h - 2, C.stoneLight);
  px(g, cx - w / 4, ground - h + 1, C.stoneHi);
}

function flower(g: G, x: number, y: number, c: string, center: string) {
  px(g, x, y - 1, c);
  px(g, x - 1, y, c);
  px(g, x + 1, y, c);
  px(g, x, y + 1, c);
  px(g, x, y, center);
}

const FLOWER_COLORS = ["#E84A4A", "#FFD24A", "#4A7AE8", "#FFFFFF", "#FF7AB8"];

/** A little flower cluster on grass (decor). */
export function flowerTuft(g: G, x: number, y: number, seed: number) {
  const c = FLOWER_COLORS[Math.floor(hash(seed, 3) * FLOWER_COLORS.length)];
  px(g, x - 2, y + 2, C.leafDark);
  px(g, x + 2, y + 2, C.leafDark);
  px(g, x + 3, y + 1, C.leafDark);
  flower(g, x, y, c, c === "#FFD24A" ? "#FFFFFF" : "#FFE27A");
  if (hash(seed, 4) < 0.6) flower(g, x + 3, y - 2, c, "#FFE27A");
}

// ─────────────────────────────────────────────────────────────── cylinders

function cylinder(g: G, L: number, B: number, W: number, D: number, H: number, side: (y0: number, y1: number) => void, top: string, under: string) {
  const cz = B + D / 2;
  ellipse(g, L, B, W, D, under);
  side(Math.round(cz - H), B + D);
  // Round off the bottom: clear what lies outside the base ellipse, below its middle.
  const rows = Math.round(D);
  for (let j = Math.ceil(rows / 2); j < rows; j++) {
    const dy = (j + 0.5 - rows / 2) / (rows / 2);
    const half = (W / 2) * Math.sqrt(Math.max(0, 1 - dy * dy));
    const x0 = Math.round(L + W / 2 - half);
    const x1 = Math.round(L + W / 2 + half);
    g.clearRect(L - 1, B + j, x0 - L + 1, 1);
    g.clearRect(x1, B + j, L + W - x1 + 1, 1);
  }
  ellipse(g, L, B - H + 1, W, D, under);
  ellipse(g, L, B - H, W, D, top);
}

// ─────────────────────────────────────────────────────────────── the props

type Ctx = { world: World; id: string };

export function propArt(body: Body, ctx: Ctx): PropArt | null {
  const g0 = geoOf(body);
  const { L, R, B, F, H, cx, cz, W, D } = g0;
  const box = (l: number, t: number, r: number, b: number): [number, number, number, number] => [L - l, B - H - t, R + r, F + b];
  const lab = (y: number): [number, number] => [cx + Math.round((body.labelAt?.[0] ?? 0) * T), y + Math.round((body.labelAt?.[1] ?? 0) * T)];

  switch (body.kind) {
    case "hedge":
      return {
        box: box(1, 1, 1, 1),
        draw: (g) => hedgeBlock(g, L, B, R, F, H, HEDGE, 3),
        ground: (g) => shadow(g, cx + 2, F, W + 4, 6),
        label: lab(B - H - 2),
      };

    case "hedgewall": {
      // Gaps where an opening (the reja) crosses it.
      const gaps = [...ctx.world.bodies.values()]
        .filter((b) => b !== body && b.traits?.includes("opening"))
        .map(geoOf)
        .filter((o) => o.L < R && o.R > L && o.B < F && o.F > B);
      return {
        box: box(1, 1, 1, 1),
        draw: (g) => {
          let x = L;
          for (const o of [...gaps].sort((a, b) => a.L - b.L)) {
            if (o.L > x) hedgeBlock(g, x, B, o.L, F, H, HEDGE, 5);
            x = o.R;
          }
          if (x < R) hedgeBlock(g, x, B, R, F, H, HEDGE, 5);
        },
        ground: (g) => {
          g.globalAlpha = 0.2;
          rect(g, L, F, W, 3, INK);
          g.globalAlpha = 1;
        },
        label: lab(B - H - 2),
      };
    }

    case "statue": {
      const ped = 8;
      const top = cz - H;
      return {
        box: box(2, 3, 2, 1),
        draw: (g) => {
          // Pedestal.
          rect(g, L + 1, B + 1 - ped, W - 2, D - 1, C.stoneLight);
          rect(g, L + 1, F - ped, W - 2, ped, C.stone);
          rect(g, L + 1, F - ped, W - 2, 1, C.stoneHi);
          rect(g, L + 1, F - 2, W - 2, 2, C.stoneDark);
          rect(g, L + 1, F - ped, 1, ped, C.stoneHi);
          rect(g, R - 3, F - ped, 2, ped, C.stoneDark);
          rect(g, cx - 3, F - 6, 6, 2, C.stoneDark);
          // A stone owl on top.
          const base = cz - ped + 3;
          ellipse(g, cx - 6, top + 3, 12, base - top - 2, C.stone);
          ellipse(g, cx - 5, top + 3, 9, base - top - 4, C.stoneLight);
          rect(g, cx - 6, top + 1, 2, 3, C.stone);
          rect(g, cx + 4, top + 1, 2, 3, C.stone);
          ellipse(g, cx - 5, top + 4, 5, 5, C.stoneHi);
          ellipse(g, cx, top + 4, 5, 5, C.stoneHi);
          px(g, cx - 3, top + 6, C.stoneDeep);
          px(g, cx + 2, top + 6, C.stoneDeep);
          px(g, cx, top + 8, C.stoneDark);
          px(g, cx - 1, top + 8, C.stoneDark);
          for (let y = top + 11; y < base - 1; y += 2) {
            px(g, cx - 4, y, C.stoneDark);
            px(g, cx + 3, y, C.stoneDark);
          }
          rect(g, cx + 3, top + 9, 2, base - top - 10, C.stoneDark);
        },
        ground: (g) => shadow(g, cx + 2, F - 1, W + 4, 7),
        label: lab(top - 4),
      };
    }

    case "urn": {
      const top = cz - 16;
      return {
        box: box(2, 8, 2, 1),
        draw: (g) => {
          ellipse(g, cx - 7, cz - 12, 14, 12, C.clay);
          ellipse(g, cx - 1, cz - 11, 8, 11, C.clayDark);
          ellipse(g, cx - 6, cz - 12, 10, 11, C.clay);
          rect(g, cx - 4, cz - 10, 1, 5, C.clayLight);
          px(g, cx - 3, cz - 11, C.clayLight);
          for (let x = cx - 6; x < cx + 6; x++) px(g, x, cz - 7 + ((x & 1) ? 0 : 1), C.cream);
          rect(g, cx - 3, cz - 14, 6, 3, C.clayDark);
          ellipse(g, cx - 6, top, 12, 5, C.clay);
          ellipse(g, cx - 6, top - 1, 12, 5, C.clayLight);
          ellipse(g, cx - 4, top, 8, 3, C.hole);
        },
        ground: (g) => shadow(g, cx + 1, cz - 1, 16, 6),
        label: lab(top - 4),
        mouth: [cx, top + 2],
      };
    }

    case "bench": {
      const seat = H;
      const back = 12;
      return {
        box: box(1, back - seat + 2, 1, 1),
        draw: (g) => {
          // Legs.
          for (const x of [L + 2, R - 4]) {
            rect(g, x, B + 2 - seat, 2, seat + 1, C.woodDark);
            rect(g, x, F - seat, 2, seat, C.woodDark);
          }
          // Seat planks.
          rect(g, L, B - seat, W, D, C.woodLight);
          for (let y = B - seat + 3; y < F - seat; y += 4) rect(g, L, y, W, 1, C.wood);
          rect(g, L, B - seat, W, 1, C.woodHi);
          rect(g, L, F - seat, W, 2, C.wood);
          // Backrest on the south side (it faces north).
          rect(g, L + 1, F - back, 2, back - 1, C.woodDark);
          rect(g, R - 3, F - back, 2, back - 1, C.woodDark);
          rect(g, L, F - back, W, 3, C.woodLight);
          rect(g, L, F - back, W, 1, C.woodHi);
          rect(g, L, F - back + 4, W, 2, C.wood);
        },
        ground: (g) => shadow(g, cx + 2, F - 2, W + 2, D),
        label: lab(F - back - 4),
      };
    }

    case "tree": {
      const r = Math.round(W / 2) + 3;
      const trunkH = 26;
      const cy = cz - trunkH - r * 0.55;
      return {
        box: [cx - r - 4, Math.floor(cy - r - 3), cx + r + 4, F + 1],
        frames: 2,
        fps: 1.4,
        draw: (g, f) => roundTree(g, cx, cz, r, trunkH, GREEN, f, 11),
        ground: (g) => {
          shadow(g, cx, cz - 1, r * 2.1, r * 0.9, 0.18);
          shadow(g, cx, cz, 12, 4, 0.2);
        },
        label: lab(Math.round(cy - r * 0.2)),
        hook: [0, Math.round(cy + r * 0.62)],
      };
    }

    case "chest":
      return {
        box: box(1, 4, 1, 1),
        draw: (g) => {
          const h = H + 2;
          rect(g, L, B - h, W, D, C.woodLight);
          rect(g, L, B - h, W, 2, C.woodHi);
          rect(g, L, F - h - 2, W, 2, C.woodDark);
          rect(g, L, F - h, W, h, C.wood);
          rect(g, L, F - 2, W, 2, C.woodDark);
          for (const x of [L + 2, R - 4]) {
            rect(g, x, B - h, 2, D + h, C.gold);
            rect(g, x + 1, B - h, 1, D + h, C.goldDark);
          }
          rect(g, cx - 2, F - h - 1, 4, 5, C.gold);
          px(g, cx - 1, F - h + 1, C.hole);
          px(g, cx - 1, F - h + 2, C.hole);
        },
        ground: (g) => shadow(g, cx + 1, F - 1, W + 4, 6),
        label: lab(B - H - 6),
      };

    case "flowers": {
      const pts: { x: number; y: number; c: string; bob: boolean }[] = [];
      for (let y = B + 3; y < F - 2; y += 4)
        for (let x = L + 3 + ((y >> 2) & 1) * 2; x < R - 2; x += 5) {
          const r = hash(x, y, 21);
          pts.push({ x: x + Math.round(r * 2 - 1), y, c: FLOWER_COLORS[Math.floor(hash(x, y, 22) * FLOWER_COLORS.length)], bob: r > 0.5 });
        }
      return {
        box: box(1, 3, 1, 2),
        flat: true,
        frames: 2,
        fps: 1.6,
        draw: (g, f) => {
          tex(g, L, B, W, D, (x, y) => (inRound(x, y, L, B, W, D, 3) ? (hash(x, y, 20) < 0.3 ? C.dirtDark : C.dirt) : null));
          rect(g, L + 2, F, W - 4, 1, C.dirtDark);
          for (const p of pts) {
            const dy = p.bob && f === 1 ? -1 : 0;
            px(g, p.x - 1, p.y + 1, C.leaf);
            px(g, p.x + 1, p.y + 1, C.leafDark);
            flower(g, p.x, p.y - 1 + dy, p.c, p.c === "#FFD24A" ? "#FFFFFF" : "#FFE27A");
          }
        },
        label: lab(cz),
      };
    }

    case "gate": {
      const post = 17;
      return {
        box: box(3, post - H + 3, 3, 1),
        draw: (g) => {
          for (const z of [B, F - 3]) {
            rect(g, L - 1, z - post, W + 2, 4, C.stoneLight);
            rect(g, L - 1, z + 3 - post, W + 2, post - 2, C.stone);
            rect(g, R, z + 3 - post, 1, post - 2, C.stoneDark);
            rect(g, cx - 1, z - post - 2, 3, 2, C.stoneLight);
          }
        },
        post: (g) => {
          for (let z = B + 4; z < F - 3; z++) {
            const on = (z & 1) === 0;
            rect(g, L + 1, z - H, W - 2, 1, on ? C.iron : C.ironHi);
          }
          rect(g, L + 1, F - 3 - H, W - 2, H, C.iron);
          for (let y = F - 3 - H + 2; y < F - 3; y += 3) px(g, cx, y, C.ironHi);
          for (let z = B + 5; z < F - 4; z += 3) px(g, cx, z - H - 1, C.iron);
        },
        label: lab(B - post - 4),
      };
    }

    case "fountain": {
      const top = cz - H;
      return {
        box: box(1, 18, 1, 1),
        frames: 4,
        fps: 5,
        draw: (g) =>
          cylinder(
            g,
            L,
            B,
            W,
            D,
            H,
            (y0, y1) => {
              bricks(g, L, y0, W, y1 - y0, C.stone, C.stoneLight, C.stoneDark, 6, 7);
              rect(g, L, y0, 3, y1 - y0, C.stoneLight);
              rect(g, R - 4, y0, 4, y1 - y0, C.stoneDark);
            },
            C.stoneLight,
            C.stoneDark,
          ),
        post: (g, f) => {
          // Water.
          ellipse(g, L + 3, B - H + 2, W - 6, D - 5, C.waterDark);
          ellipse(g, L + 4, B - H + 4, W - 8, D - 7, C.water);
          for (let i = 0; i < 7; i++) {
            const a = hash(i, 3, 5) * Math.PI * 2;
            const rr = 5 + hash(i, 4, 5) * (W / 2 - 10);
            const x = cx + Math.cos(a) * rr + ((f + i) % 4 < 2 ? 0 : 1);
            const y = top + Math.sin(a) * rr * 0.9 + 1;
            rect(g, x, y, 3 + (i % 2), 1, (f + i) % 3 ? C.waterLight : C.waterHi);
          }
          ellipseRing(g, cx, top + 1, 5 + f * 2, 4 + f * 1.6, C.waterLight, 2);
          // Centre column and bowl.
          rect(g, cx - 2, top - 9, 5, 10, C.stone);
          rect(g, cx - 2, top - 9, 1, 10, C.stoneLight);
          rect(g, cx + 2, top - 9, 1, 10, C.stoneDark);
          ellipse(g, cx - 6, top - 12, 13, 5, C.stoneDark);
          ellipse(g, cx - 6, top - 13, 13, 5, C.stoneLight);
          ellipse(g, cx - 4, top - 12, 9, 3, C.water);
          // Spout.
          rect(g, cx, top - 17, 1, 4, C.waterLight);
          px(g, cx, top - 18, C.waterHi);
          for (let k = 0; k < 2; k++) {
            const t = ((f + k * 2) % 4) / 4;
            const dx = 3 + Math.round(t * 4);
            const dy = Math.round(-4 + t * t * 14);
            px(g, cx - dx, top - 14 + dy, C.waterLight);
            px(g, cx + dx, top - 14 + dy, C.waterLight);
          }
          px(g, cx - 2, top - 17, C.waterLight);
          px(g, cx + 2, top - 17, C.waterLight);
        },
        ground: (g) => shadow(g, cx + 2, cz + 1, W + 4, D * 0.7),
        label: lab(top - 16),
      };
    }

    case "well": {
      const top = cz - H;
      const roofY = top - 21;
      return {
        box: box(4, 24, 4, 1),
        draw: (g) => {
          cylinder(
            g,
            L,
            B,
            W,
            D,
            H,
            (y0, y1) => {
              bricks(g, L, y0, W, y1 - y0, C.stone, C.stoneLight, C.stoneDark, 5, 3);
              rect(g, R - 3, y0, 3, y1 - y0, C.stoneDark);
            },
            C.stoneLight,
            C.stoneDark,
          );
          ellipse(g, L + 3, B - H + 3, W - 6, D - 6, C.hole);
          rect(g, cx - 2, top + 1, 3, 1, "#3E4F8A");
          // Posts and roof.
          rect(g, L, roofY + 4, 2, top - roofY - 2, C.wood);
          rect(g, R - 2, roofY + 4, 2, top - roofY - 2, C.woodDark);
          rect(g, L, roofY + 8, W, 1, C.woodDark);
          for (let j = 0; j < 7; j++) {
            const w = W - 2 + j * 2;
            for (let i = 0; i < w; i++) px(g, cx - w / 2 + i, roofY + j, j === 6 ? C.redDark : (i + j) % 3 === 0 ? C.redDark : j < 2 ? "#F07A52" : C.red);
          }
          line(g, R - 5, roofY + 9, R - 5, roofY + 12, C.woodHi);
          rect(g, R - 6, roofY + 13, 3, 3, C.stoneDark);
        },
        ground: (g) => shadow(g, cx + 1, cz + 1, W + 4, D * 0.7),
        label: lab(roofY - 3),
        mouth: [cx, top + 1],
      };
    }

    case "stall": {
      const counter = 6;
      const aw = H + 1;
      const front = F - 15;
      return {
        box: box(3, 3, 3, 1),
        draw: (g) => {
          // Back posts, counter, front posts.
          rect(g, L + 1, B - aw, 2, aw, C.woodDark);
          rect(g, R - 3, B - aw, 2, aw, C.woodDark);
          rect(g, L + 1, B + 2 - counter, W - 2, D - 2, C.woodLight);
          rect(g, L + 1, F - counter, W - 2, counter, C.wood);
          for (let x = L + 5; x < R - 2; x += 6) rect(g, x, F - counter + 1, 1, counter - 1, C.woodDark);
          rect(g, L + 1, F - counter, W - 2, 1, C.woodHi);
          // Fruit along the front of the counter.
          const fruits = [C.red, "#FF9A2E", "#FFD24A", "#7ACC4A", C.red, "#B0508A"];
          for (let x = L + 3, i = 0; x < R - 3; x += 3, i++) {
            const c = fruits[i % fruits.length];
            rect(g, x, F - counter - 3, 2, 2, c);
            px(g, x, F - counter - 3, "#FFFFFF");
            if (i % 2) rect(g, x + 1, F - counter - 5, 2, 2, fruits[(i + 2) % fruits.length]);
          }
          rect(g, L + 1, front, 2, F - front, C.woodDark);
          rect(g, R - 3, front, 2, F - front, C.woodDark);
          // Striped awning.
          for (let y = B - aw; y < front; y++)
            for (let x = L - 2; x < R + 2; x++) {
              const stripe = Math.floor((x - L + 2) / 4) & 1;
              px(g, x, y, stripe ? (y < B - aw + 2 ? "#FFFFFF" : C.cream) : y < B - aw + 2 ? "#F07A52" : C.red);
            }
          for (let x = L - 2; x < R + 2; x++) {
            const stripe = Math.floor((x - L + 2) / 4) & 1;
            const u = (x - L + 2) % 4;
            const d = u === 1 || u === 2 ? 3 : 2;
            rect(g, x, front, 1, d, stripe ? C.creamDark : C.redDark);
          }
        },
        ground: (g) => shadow(g, cx + 2, F - 2, W + 4, D),
        label: lab(B - aw - 4),
      };
    }

    case "lamp": {
      const hook: [number, number] = [cx - 13, cz - 33];
      return {
        box: [cx - 17, cz - 49, cx + 6, cz + 2],
        draw: (g) => {
          rect(g, cx - 2, cz - 4, 5, 4, C.iron);
          rect(g, cx - 1, cz - 5, 3, 1, C.iron);
          rect(g, cx - 1, cz - 40, 2, 36, C.iron);
          rect(g, cx - 1, cz - 40, 1, 36, C.ironHi);
          rect(g, hook[0], hook[1], cx - hook[0], 1, C.iron);
          px(g, hook[0], hook[1] + 1, C.iron);
          px(g, cx - 5, hook[1] - 1, C.iron);
          px(g, cx - 3, hook[1] - 2, C.iron);
          // Lantern.
          rect(g, cx - 3, cz - 46, 7, 1, C.iron);
          rect(g, cx - 2, cz - 48, 5, 2, C.iron);
          rect(g, cx - 3, cz - 45, 7, 6, "#FFE27A");
          rect(g, cx - 2, cz - 44, 2, 3, "#FFF8D0");
          rect(g, cx, cz - 45, 1, 6, C.iron);
          rect(g, cx - 3, cz - 40, 7, 1, C.iron);
        },
        ground: (g) => {
          shadow(g, cx + 1, cz, 8, 3);
          g.globalAlpha = 0.12;
          ellipse(g, cx - 10, cz - 5, 22, 10, "#FFE27A");
          g.globalAlpha = 1;
        },
        label: lab(cz - 54),
        hook,
      };
    }

    case "crate":
      return {
        box: box(1, 1, 1, 1),
        draw: (g) => {
          rect(g, L, B - H, W, D, C.woodLight);
          for (let y = B - H + 3; y < F - H; y += 4) rect(g, L, y, W, 1, C.wood);
          rect(g, L, B - H, W, 1, C.woodHi);
          rect(g, L, F - H, W, H, C.wood);
          rect(g, L, F - H, W, 1, C.woodDark);
          rect(g, L + 1, F - H + 1, 2, H - 1, C.woodDark);
          rect(g, R - 3, F - H + 1, 2, H - 1, C.woodDark);
          line(g, L + 3, F - 2, R - 4, F - H + 2, C.woodDark);
          line(g, L + 3, F - 1, R - 4, F - H + 1, C.woodLight);
          rect(g, L, F - 1, W, 1, C.woodDark);
        },
        ground: (g) => shadow(g, cx + 2, F - 1, W + 4, 6),
        label: lab(B - H - 3),
      };

    case "cart": {
      const bed = H;
      const clear = Math.round((body.clear ?? 0.45) * YPX);
      return {
        box: box(11, 4, 1, 2),
        draw: (g) => {
          // Shafts.
          rect(g, L - 10, B + 3 - clear - 2, 11, 1, C.woodDark);
          rect(g, L - 10, F - 3 - clear - 2, 11, 2, C.wood);
          // Bed with a load of hay and pumpkins.
          tex(g, L, B - bed, W, D, (x, y) => (hash(x, y, 30) < 0.25 ? "#C89A3A" : hash(x, y, 31) < 0.2 ? "#FFE58A" : "#E8C45A"));
          ellipse(g, cx - 7, B - bed + 3, 7, 6, "#FF9A2E");
          px(g, cx - 4, B - bed + 3, C.leafDark);
          ellipse(g, cx + 1, B - bed + 5, 6, 5, C.red);
          ellipse(g, cx + 5, B - bed + 2, 5, 4, "#FF9A2E");
          rect(g, L, F - bed, W, bed - clear, C.wood);
          rect(g, L, F - bed, W, 1, C.woodHi);
          for (let x = L + 4; x < R; x += 5) rect(g, x, F - bed + 1, 1, bed - clear - 1, C.woodDark);
          // Wheels.
          for (const wx of [L + 5, R - 6]) {
            ellipse(g, wx - 5, F - 10, 10, 10, C.woodDark);
            ellipse(g, wx - 4, F - 9, 8, 8, C.woodLight);
            ellipse(g, wx - 3, F - 8, 6, 6, C.woodDark);
            rect(g, wx - 3, F - 5, 6, 1, C.wood);
            rect(g, wx, F - 8, 1, 6, C.wood);
            rect(g, wx - 1, F - 6, 2, 2, C.goldDark);
          }
        },
        ground: (g) => shadow(g, cx + 1, F - 2, W + 6, D * 0.8),
        label: lab(B - bed - 4),
      };
    }

    case "street": {
      const curbTop = ctx.id === "calle_mayor";
      return {
        box: box(0, 0, 0, 0),
        flat: true,
        draw: (g) => {
          tex(g, L, B, W, D, (x, y) => cobble(x, y, STREET));
          // Curb along the plaza.
          if (curbTop) {
            rect(g, L, B, Math.min(W, 5 * T - L), 2, C.stoneLight);
            rect(g, L, B + 2, Math.min(W, 5 * T - L), 1, C.stoneDark);
          } else {
            rect(g, L, B, 2, Math.min(D, 5 * T - B), C.stoneLight);
            rect(g, L + 2, B, 1, Math.min(D, 5 * T - B), C.stoneDark);
          }
        },
        // Along the street, away from the plaza's middle.
        label: W > D ? [cx - Math.round(W * 0.3), cz] : [cx, cz - Math.round(D * 0.3)],
      };
    }

    case "gravestone": {
      const tint = body.tint ?? "small";
      const Hh = H;
      const depth = Math.max(3, Math.round(D / 2));
      const shape = (x: number, y: number) => {
        // Rounded top slab, rows F-Hh..F.
        const top = F - Hh;
        if (x < L || x >= R || y < top || y >= F) return false;
        const r = W / 2;
        if (y < top + r) {
          const dx = x + 0.5 - (L + r);
          const dy = y + 0.5 - (top + r);
          if (dx * dx + dy * dy > r * r) return false;
        }
        if (tint === "broken") {
          const jag = [0, 2, 1, 3, 1, 0, 2, 3, 1, 2, 0, 1, 3, 2, 1][((x - L) % 15 + 15) % 15];
          if (y < top + 2 + jag) return false;
        }
        return true;
      };
      return {
        box: [L - 3, F - Hh - depth - 2, R + 6, F + 2],
        draw: (g) => {
          tex(g, L, F - Hh - depth, W, Hh + depth, (x, y) => (shape(x, y + depth) ? C.stoneLight : null));
          tex(g, L, F - Hh, W, Hh, (x, y) => (shape(x, y) ? (x === L || x === L + 1 ? C.stoneLight : x >= R - 2 ? C.stoneDark : C.stone) : null));
          rect(g, L - 1, F - 2, W + 2, 2, C.stoneDark);
          if (tint !== "broken") {
            const top = F - Hh + (tint === "big" ? 3 : 2);
            rect(g, cx - 1, top, 2, tint === "big" ? 6 : 5, C.stoneDeep);
            rect(g, cx - 3, top + 2, 6, 1, C.stoneDeep);
            px(g, cx + 1, top + 1, C.stoneHi);
            if (tint === "big") for (let y = top + 8; y < F - 3; y += 2) rect(g, L + 4, y, W - 8, 1, C.stoneDark);
          } else {
            line(g, cx - 2, F - Hh + 3, cx + 1, F - 3, C.stoneDeep);
            rect(g, R + 1, F - 3, 4, 2, C.stone);
            px(g, R + 1, F - 3, C.stoneLight);
          }
          tex(g, L, F - 4, W, 3, (x, y) => (shape(x, y) && hash(x, y, 41) < 0.35 ? "#6A9A4A" : null));
        },
        ground: (g) => shadow(g, cx + 2, F, W + 4, 5),
        label: lab(F - Hh - depth - 4),
      };
    }

    case "fence":
      return {
        box: box(1, 3, 1, 1),
        draw: () => {},
        post: (g) => {
          rect(g, L, F - H + 2, W, 1, C.iron);
          rect(g, L, F - 3, W, 1, C.iron);
          for (let x = L + 1; x < R - 1; x += 3) {
            rect(g, x, F - H, 1, H, C.iron);
            px(g, x, F - H - 1, C.iron);
            px(g, x, F - H + 1, C.ironHi);
          }
          for (let x = L; x < R; x += 16) {
            rect(g, x, F - H - 1, 2, H + 1, C.iron);
            rect(g, x - 1, F - H - 3, 4, 2, C.iron);
            px(g, x, F - H - 3, C.ironHi);
          }
          rect(g, R - 2, F - H - 1, 2, H + 1, C.iron);
          rect(g, R - 3, F - H - 3, 4, 2, C.iron);
        },
        ground: (g) => {
          g.globalAlpha = 0.18;
          rect(g, L, F, W, 2, INK);
          g.globalAlpha = 1;
        },
        label: lab(F - H - 6),
      };

    case "deadtree": {
      const top = cz - 46;
      return {
        box: [cx - 24, top - 2, cx + 24, cz + 2],
        draw: (g) => {
          const grey = "#9A8C8A";
          const dark = "#6A5A64";
          const light = "#C4B8B2";
          const branch = (x: number, y: number, a: number, len: number, w: number, depth: number, seed: number) => {
            const x2 = x + Math.cos(a) * len;
            const y2 = y + Math.sin(a) * len;
            line(g, x, y, x2, y2, grey, w);
            if (w > 1) line(g, x + 1, y, x2 + 1, y2, dark, 1);
            if (depth <= 0) return;
            const spread = 0.5 + hash(seed, depth) * 0.3;
            branch(x2, y2, a - spread, len * 0.66, Math.max(1, w - 1), depth - 1, seed * 3 + 1);
            branch(x2, y2, a + spread * 0.8, len * 0.6, Math.max(1, w - 1), depth - 1, seed * 3 + 2);
          };
          rect(g, cx - 3, cz - 22, 6, 22, grey);
          rect(g, cx - 3, cz - 22, 1, 22, light);
          rect(g, cx + 1, cz - 22, 2, 22, dark);
          rect(g, cx - 5, cz - 2, 10, 2, grey);
          rect(g, cx + 2, cz - 2, 3, 2, dark);
          px(g, cx - 1, cz - 12, C.hole);
          px(g, cx - 1, cz - 11, C.hole);
          branch(cx, cz - 21, -Math.PI / 2 - 0.55, 12, 3, 2, 5);
          branch(cx, cz - 21, -Math.PI / 2 + 0.5, 13, 3, 2, 9);
          branch(cx - 1, cz - 14, -Math.PI + 0.35, 8, 2, 1, 13);
        },
        ground: (g) => shadow(g, cx + 2, cz, 22, 7),
        label: lab(top + 6),
      };
    }

    case "crypt": {
      const roofT = B - H;
      const doorL = R - 11;
      return {
        box: box(2, 9, 12, 4),
        draw: (g) => {
          // Front wall (stone blocks) with pilasters, plaque and a doorway at the east end.
          bricks(g, L, F - H, W, H, C.stoneLight, C.stoneHi, C.stone, 8, 4);
          rect(g, L, F - H, 3, H, C.stoneHi);
          rect(g, doorL - 4, F - H, 3, H, C.stoneHi);
          rect(g, R - 2, F - H, 2, H, C.stone);
          rect(g, L, F - 2, W, 2, C.stoneDark);
          rect(g, L + 6, F - 15, 12, 8, C.stone);
          rect(g, L + 7, F - 14, 10, 6, C.stoneDark);
          rect(g, L + 11, F - 14, 2, 6, C.stoneLight);
          rect(g, L + 9, F - 12, 6, 1, C.stoneLight);
          rect(g, doorL, F - 14, 8, 14, C.hole);
          rect(g, doorL + 1, F - 15, 6, 1, C.hole);
          rect(g, doorL + 6, F - 13, 2, 13, "#5E5068");
          // Slate roof with a cross.
          for (let y = roofT - 2; y < F - H; y++)
            for (let x = L - 1; x < R + 1; x++) {
              const u = x - L;
              const v = y - roofT;
              const mark = (((u + v) % 4) + 4) % 4 === 0 || (((u - v) % 4) + 4) % 4 === 0;
              px(g, x, y, mark ? "#5A4E6E" : y < roofT + 2 ? "#A89CBC" : "#7E7294");
            }
          rect(g, L - 1, F - H - 2, W + 2, 2, "#4A3E5E");
          rect(g, L - 1, roofT + Math.round(D * 0.45), W + 2, 1, "#A89CBC");
          const kx = cx - 1;
          const ky = roofT + Math.round(D * 0.45);
          rect(g, kx, ky - 9, 3, 10, C.stoneLight);
          rect(g, kx - 2, ky - 7, 7, 2, C.stoneLight);
          rect(g, kx + 2, ky - 9, 1, 10, C.stone);
        },
        post: (g) => {
          // Steps out of the doorway, towards the east (its front).
          rect(g, doorL - 1, F, 10, 2, C.stoneLight);
          rect(g, doorL - 1, F + 2, 10, 1, C.stoneDark);
          rect(g, R, F - 3, 10, 3, C.stoneLight);
          rect(g, R, F, 10, 1, C.stoneDark);
        },
        ground: (g) => {
          shadow(g, cx + 3, F, W + 6, 7);
          for (let x = R + 10, i = 0; x < R + 34; x += 6, i++) {
            ellipse(g, x, F - 4 + (i & 1), 5, 3, C.stoneDark);
            ellipse(g, x, F - 5 + (i & 1), 5, 3, C.stone);
          }
        },
        label: lab(roofT - 8),
        door: [doorL + 3, F],
      };
    }

    case "coffin": {
      const half = (y: number) => {
        const t = (y - B) / D;
        return t < 0.25 ? 4 + (t / 0.25) * 2.5 : 6.5 - ((t - 0.25) / 0.75) * 2.5;
      };
      const inShape = (x: number, y: number, inset = 0) => y >= B + inset && y < F - inset && Math.abs(x + 0.5 - cx) <= half(y) - inset;
      return {
        box: box(1, 1, 8, 2),
        draw: (g) => {
          // Lid leaning against the east side.
          tex(g, R + 1, B - H + 3, 6, D, (x, y) => (Math.abs(x + 0.5 - (R + 4) - (y - B) * 0.02) <= half(y - 3) * 0.45 ? C.wood : null));
          rect(g, R + 3, B + 4, 1, 9, C.woodHi);
          rect(g, R + 2, B + 6, 3, 1, C.woodHi);
          // Box: front face, rim, lining, pillow.
          tex(g, L - 1, B, W + 2, D + 1, (x, y) => (inShape(x, y - 1) || inShape(x, y) ? C.woodDark : null));
          tex(g, L - 1, B - H, W + 2, D + H, (x, y) => {
            if (!inShape(x, y + H)) return null;
            if (inShape(x, y + H, 2)) return y + H < B + 7 ? "#F0E6F0" : hash(x, y, 50) < 0.3 ? "#5A1E38" : "#7A2E48";
            return C.woodLight;
          });
          rect(g, cx - 3, F - H, 7, H, C.wood);
        },
        ground: (g) => shadow(g, cx + 2, F - 2, W + 8, D * 0.6),
        label: lab(B - H - 4),
      };
    }

    case "tower": {
      const top = cz - H;
      return {
        box: box(2, 7, 2, 1),
        draw: (g) => {
          cylinder(
            g,
            L,
            B,
            W,
            D,
            H,
            (y0, y1) => {
              bricks(g, L, y0, W, y1 - y0, C.stone, C.stoneLight, C.stoneDark, 7, 4);
              tex(g, L, y0, 5, y1 - y0, (x, y) => ((x + y) % 5 === 0 ? null : C.stoneLight));
              bricks(g, R - 8, y0, 8, y1 - y0, C.stoneDark, C.stone, C.stoneDeep, 7, 4);
              // Door and windows.
              rect(g, cx - 4, y1 - 10, 8, 10, C.hole);
              rect(g, cx - 3, y1 - 11, 6, 1, C.hole);
              rect(g, cx - 3, y1 - 9, 6, 9, C.wood);
              rect(g, cx, y1 - 9, 1, 9, C.woodDark);
              px(g, cx + 2, y1 - 5, C.gold);
              rect(g, cx - 7, y0 + 12, 3, 5, C.hole);
              px(g, cx - 6, y0 + 11, C.hole);
              rect(g, cx + 5, y0 + 20, 3, 5, C.hole);
              px(g, cx + 6, y0 + 19, C.hole);
            },
            C.stoneLight,
            C.stoneDark,
          );
          // Floor and battlements.
          ellipse(g, L + 3, B - H + 3, W - 6, D - 6, C.stone);
          ellipse(g, L + 4, B - H + 4, W - 8, D - 8, "#C9C2CE");
          const merlons = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2).sort((a, b) => Math.sin(a) - Math.sin(b));
          for (const a of merlons) {
            const x = cx + Math.cos(a) * (W / 2 - 2);
            const y = top + Math.sin(a) * (D / 2 - 2);
            rect(g, x - 2, y - 4, 4, 5, C.stone);
            rect(g, x - 2, y - 4, 4, 2, C.stoneHi);
          }
        },
        ground: (g) => shadow(g, cx + 3, cz + 1, W + 6, D * 0.7),
        label: lab(top - 8),
      };
    }

    case "hill": {
      const r = 7;
      return {
        box: box(1, 1, 1, 1),
        draw: (g) => {
          // Cliff face.
          tex(g, L, F - H - r, W, H + r, (x, y) => {
            if (!inRound(x, y, L, B - H, W, D + H, r)) return null;
            const u = ((x - L) % 5 + 5) % 5;
            if (y >= F - 2) return "#8A5A34";
            if (u === 0) return "#A06A3A";
            if (u === 1 && y < F - 4) return "#E6AE6E";
            return hash(x, y, 60) < 0.08 ? "#A06A3A" : "#C98A4E";
          });
          // Grass top.
          tex(g, L, B - H, W, D, (x, y) => {
            if (!inRound(x, y, L, B - H, W, D, r)) return null;
            const cx7 = Math.floor(x / 7);
            const cy6 = Math.floor(y / 6);
            if (hash(cx7, cy6, 61) < 0.3) {
              const u = x - cx7 * 7 - 1;
              const v = y - cy6 * 6 - 2;
              if ((v === 0 && (u === 1 || u === 3)) || (v === 1 && (u === 0 || u === 2 || u === 4))) return "#3E8E3A";
            }
            return y < B - H + 2 ? "#8ED65E" : "#6CC24A";
          });
          // Grass lip hanging over the cliff.
          for (let x = L + 2; x < R - 2; x += 4) {
            const d = hash(x, 1, 62) < 0.5 ? 2 : 3;
            rect(g, x, F - H - 1, 3, d, "#58AE44");
            px(g, x + 1, F - H - 1 + d, "#3E8E3A");
          }
          rect(g, L + r - 2, F - H - 1, W - 2 * r + 4, 1, "#58AE44");
          for (let i = 0; i < 4; i++) flowerTuft(g, L + 8 + Math.floor(hash(i, 2, 63) * (W - 16)), B - H + 6 + Math.floor(hash(i, 3, 63) * (D - 14)), i + 70);
        },
        ground: (g) => shadow(g, cx + 3, F, W + 4, 8),
        label: lab(B - H + 4),
      };
    }

    case "pond":
      return {
        box: box(1, 1, 1, 1),
        flat: true,
        frames: 4,
        fps: 3,
        draw: (g, f) => {
          ellipse(g, L, B, W, D, C.sand);
          ellipse(g, L, B + 1, W, D - 1, C.sandDark);
          ellipse(g, L + 1, B, W - 2, D - 2, C.sand);
          ellipse(g, L + 3, B + 2, W - 6, D - 5, C.waterDark);
          ellipse(g, L + 4, B + 4, W - 8, D - 7, C.water);
          for (let i = 0; i < 7; i++) {
            const y = B + 7 + i * 3;
            if (y > F - 7) break;
            const x = L + 8 + Math.floor(hash(i, 1, 70) * (W - 22)) + ((f + i) % 4 === 0 ? 1 : (f + i) % 4 === 2 ? -1 : 0);
            rect(g, x, y, 3 + (i % 3), 1, (f + i) % 4 === 1 ? C.waterHi : C.waterLight);
          }
          // Lily pads and a flower.
          for (const [lx, ly] of [
            [L + 9, B + 9],
            [R - 14, F - 12],
          ]) {
            ellipse(g, lx, ly, 6, 4, GREEN.mid);
            px(g, lx + 3, ly + 1, C.water);
            px(g, lx + 1, ly, GREEN.light);
          }
          px(g, L + 11, B + 9, "#FF7AB8");
          px(g, L + 12, B + 9, "#FFFFFF");
          // Shore stones.
          for (let i = 0; i < 9; i++) {
            const a = hash(i, 5, 71) * Math.PI * 2;
            const x = cx + Math.cos(a) * (W / 2 - 1);
            const y = B + D / 2 + Math.sin(a) * (D / 2 - 1);
            rect(g, x - 1, y - 1, 3, 2, C.stone);
            px(g, x - 1, y - 1, C.stoneLight);
          }
        },
        label: lab(cz),
      };

    case "path":
      return {
        box: box(2, 0, 2, 0),
        flat: true,
        draw: (g) =>
          tex(g, L - 2, B, W + 4, D, (x, y) => {
            const el = L + Math.round(hash(0, y >> 1, 80) * 2) - 1;
            const er = R - Math.round(hash(1, y >> 1, 80) * 2) + 1;
            if (x < el || x >= er) return null;
            if (x === el || x === er - 1) return "#C8965A";
            const n = hash(x, y, 81);
            if (n < 0.03) return C.stone;
            return n < 0.14 ? "#CFA06A" : n < 0.22 ? "#F2D6A2" : "#E2B97E";
          }),
        label: lab(cz),
      };

    case "reja": {
      const post = H + 4;
      return {
        box: box(5, 7, 5, 1),
        draw: (g) => {
          for (const x of [L - 4, R]) {
            rect(g, x, F - post - D, 4, D, C.stoneLight);
            rect(g, x, F - post, 4, post, C.stone);
            rect(g, x + 3, F - post, 1, post, C.stoneDark);
            rect(g, x, F - post, 4, 1, C.stoneHi);
            rect(g, x + 1, F - post - D - 2, 2, 2, C.stoneLight);
          }
        },
        post: (g) => {
          rect(g, L, F - H + 3, W, 1, C.iron);
          rect(g, L, F - 3, W, 1, C.iron);
          for (let x = L + 1; x < R - 1; x += 3) {
            const arch = Math.round(3 * Math.sin(((x - L) / W) * Math.PI));
            rect(g, x, F - H - arch, 1, H + arch, C.iron);
            px(g, x, F - H - arch - 1, C.iron);
            px(g, x, F - H - arch + 2, C.ironHi);
          }
          for (let x = L; x < R; x++) px(g, x, F - H + 1 - Math.round(3 * Math.sin(((x - L) / W) * Math.PI)), C.iron);
        },
        label: lab(F - H - 8),
      };
    }

    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────── cobbles

export interface CobbleStyle {
  mortar: string;
  shades: string[];
  hi: string;
  lo: string;
  bw: number;
  bh: number;
}
export const PLAZA: CobbleStyle = { mortar: "#B09470", shades: ["#EADBB8", "#E0CEA8", "#D6C298"], hi: "#F6ECD2", lo: "#C4AC84", bw: 8, bh: 6 };
export const STREET: CobbleStyle = { mortar: "#6E6478", shades: ["#B2AAB0", "#A69EA8", "#9C94A0"], hi: "#CCC6CC", lo: "#8A8290", bw: 6, bh: 5 };

export function cobble(x: number, y: number, s: CobbleStyle): string {
  const row = Math.floor(y / s.bh);
  const off = (row & 1) * Math.floor(s.bw / 2);
  const col = Math.floor((x + off) / s.bw);
  const u = (((x + off) % s.bw) + s.bw) % s.bw;
  const v = ((y % s.bh) + s.bh) % s.bh;
  if (u === 0 || v === 0) return s.mortar;
  if (u === 1 && v === 1) return s.hi;
  if (v === s.bh - 1 || u === s.bw - 1) return s.lo;
  return s.shades[Math.floor(hash(col, row, 90) * s.shades.length)];
}


import type { Body, Layout } from "../model/layouts";
import type { World } from "../model/relations";
import { specialSprite, walkSprite, type GnomeFrame, type GnomeSprite, type GnomeTarget } from "./gnome";
import { ACCENT, ctxOf, ellipse, ellipseRing, halo, hash, INK, makeCanvas, maskOf, noise, outline, rgb, T, YPX, type G } from "./pixel";
import {
  AUTUMN,
  bush,
  cobble,
  flowerTuft,
  geoOf,
  GLOOM,
  GOLDEN,
  GREEN,
  hedgeBlock,
  house,
  HOUSES,
  pine,
  PLAZA,
  propArt,
  rock,
  roundTree,
  RUST,
  stoneWall,
  STREET,
  type Canopy,
  type PropArt,
} from "./props";

/**
 * One room of the map, ready to paint: static pieces (walls, houses, trees
 * outside) pre-rendered once, props as small outlined sprites (with animation
 * frames) that get painter-sorted with the gnome every frame.
 */

export interface Sprite {
  id: string | null;
  /** Painter order: world px of the front edge (flat things first). */
  key: number;
  /** Top-left in world px. */
  x: number;
  y: number;
  frames: HTMLCanvasElement[];
  fps: number;
  phase: number;
  mask: Uint8Array;
  /** Tight box of opaque pixels, sprite-local. */
  tight: [number, number, number, number];
  art: PropArt | null;
  body: Body | null;
  flat: boolean;
  hover?: [HTMLCanvasElement, HTMLCanvasElement];
}

interface Piece {
  x: number;
  y: number;
  img: HTMLCanvasElement;
  key: number;
}

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface RoomArt {
  world: World;
  sprites: Sprite[];
  byId: Map<string, Sprite>;
  pieces: Piece[];
  fit: Bounds;
  bg: string;
  animated: boolean;
}

// ─────────────────────────────────────────────────────────────── ground

interface Grass {
  base: string;
  dark: string;
  deep: string;
  light: string;
}
const GARDEN: Grass = { base: "#6CC24A", dark: "#57AE42", deep: "#3E8E3A", light: "#8ED65E" };
const MEADOW: Grass = { base: "#66BC48", dark: "#52A840", deep: "#3A8638", light: "#88D05C" };
const GRAVE: Grass = { base: "#5B9670", dark: "#4B8262", deep: "#35654E", light: "#74AC84" };
const GRAVE_OUT: Grass = { base: "#4F8666", dark: "#427458", deep: "#2E5844", light: "#669C78" };
const MAZE: Grass = { base: "#62B64C", dark: "#50A244", deep: "#38863A", light: "#84CA5E" };

function grass(x: number, y: number, p: Grass, seed: number): string {
  const n = noise(x / 26, y / 26, seed);
  const d = (x + y) & 1;
  let c = p.base;
  if (n > 0.66 || (n > 0.6 && d)) c = p.dark;
  else if (n < 0.26 || (n < 0.32 && d)) c = p.light;
  const cx = Math.floor(x / 7);
  const cy = Math.floor(y / 6);
  if (hash(cx, cy, seed + 1) < 0.34) {
    const ox = cx * 7 + Math.floor(hash(cx, cy, seed + 2) * 3);
    const oy = cy * 6 + Math.floor(hash(cx, cy, seed + 3) * 3);
    const u = x - ox;
    const v = y - oy;
    if ((v === 0 && (u === 1 || u === 3)) || (v === 1 && (u === 0 || u === 2 || u === 4))) return p.deep;
    if (v === 1 && (u === 1 || u === 3)) return p.light;
  }
  return c;
}

function dirt(x: number, y: number): string {
  const n = hash(x, y, 81);
  return n < 0.12 ? "#CFA06A" : n < 0.2 ? "#F2D6A2" : n < 0.215 ? "#B7B0C0" : "#E2B97E";
}

/** Colour of the bare ground at a world pixel. */
function terrain(layout: Layout, x: number, y: number): string {
  const inRoom = x >= -5 * T && x < 5 * T && y >= -5 * T && y < 5 * T;
  switch (layout.room) {
    case "jardin": {
      if (inRoom) return grass(x, y, GARDEN, 1);
      // A dirt path out of the gate, east.
      const edge = 10 + Math.round(noise(x / 6, 3, 4) * 3);
      if (x > 5 * T && Math.abs(y - 8) < edge) return Math.abs(y - 8) >= edge - 1 ? "#C8965A" : dirt(x, y);
      return grass(x, y, MEADOW, 2);
    }
    case "plaza": {
      if (inRoom) return cobble(x, y, PLAZA);
      if (Math.abs(x) < 12 * T && y > -9 * T && y < 11 * T) return cobble(x, y, STREET);
      return grass(x, y, MEADOW, 3);
    }
    case "cementerio":
      if (inRoom) return grass(x, y, GRAVE, 4);
      return noise(x / 20, y / 20, 9) > 0.7 ? grass(x, y, { ...GRAVE_OUT, base: GRAVE_OUT.dark, dark: GRAVE_OUT.deep }, 8) : grass(x, y, GRAVE_OUT, 5);
    default:
      if (inRoom) return grass(x, y, MAZE, 6);
      return grass(x, y, MEADOW, 7);
  }
}

// ─────────────────────────────────────────────────────────────── building

function render(box: [number, number, number, number], draw: (g: G, f: number) => void, post?: (g: G, f: number) => void, frames = 1) {
  const [x0, y0, x1, y1] = box;
  const out: HTMLCanvasElement[] = [];
  for (let f = 0; f < frames; f++) {
    const c = makeCanvas(x1 - x0 + 2, y1 - y0 + 2);
    const g = ctxOf(c);
    g.translate(1 - x0, 1 - y0);
    draw(g, f);
    outline(c);
    if (post) post(g, f);
    out.push(c);
  }
  return { x: x0 - 1, y: y0 - 1, frames: out };
}

function tightOf(mask: Uint8Array, w: number, h: number): [number, number, number, number] {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (mask[y * w + x]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? [0, 0, 0, 0] : [x0, y0, x1 + 1, y1 + 1];
}

function makeSprite(id: string | null, key: number, art: PropArt, body: Body | null): Sprite {
  const r = render(art.box, art.draw, art.post, art.frames ?? 1);
  const mask = maskOf(r.frames[0]);
  return {
    id,
    key,
    x: r.x,
    y: r.y,
    frames: r.frames,
    fps: art.fps ?? 0,
    phase: hash(key | 0, 1, 3),
    mask,
    tight: tightOf(mask, r.frames[0].width, r.frames[0].height),
    art,
    body,
    flat: !!art.flat,
  };
}

function piece(box: [number, number, number, number], key: number, draw: (g: G) => void): Piece {
  const r = render(box, draw);
  return { x: r.x, y: r.y, img: r.frames[0], key };
}

const WALL_H: Record<Layout["wall"], number> = { hedge: 10, stone: 8, houses: 0 };

interface Side {
  dir: "n" | "s" | "e" | "w";
  L: number;
  B: number;
  R: number;
  F: number;
}

/** Wall strips around the room, split around any gate on the boundary. */
function wallSides(world: World): Side[] {
  const l = world.layout;
  const open = new Set(l.openSides ?? []);
  const a = 5 * T;
  const b = 5.5 * T;
  const gates = [...world.bodies.values()].filter((o) => o.traits?.includes("opening")).map(geoOf);
  const out: Side[] = [];
  const split = (s: Side, along: "x" | "z") => {
    let segs: [number, number][] = along === "x" ? [[s.L, s.R]] : [[s.B, s.F]];
    for (const o of gates) {
      const hits = o.L < s.R && o.R > s.L && o.B < s.F && o.F > s.B;
      if (!hits) continue;
      const [g0, g1] = along === "x" ? [o.L - 2, o.R + 2] : [o.B - 2, o.F + 2];
      segs = segs.flatMap(([p, q]) => (g0 > p && g1 < q ? ([[p, g0], [g1, q]] as [number, number][]) : [[p, q] as [number, number]]));
    }
    for (const [p, q] of segs) out.push(along === "x" ? { ...s, L: p, R: q } : { ...s, B: p, F: q });
  };
  if (!open.has("n")) split({ dir: "n", L: -b, B: -b, R: b, F: -a }, "x");
  if (!open.has("s")) split({ dir: "s", L: -b, B: a, R: b, F: b }, "x");
  if (!open.has("w")) split({ dir: "w", L: -b, B: -a, R: -a, F: a }, "z");
  if (!open.has("e")) split({ dir: "e", L: a, B: -a, R: b, F: a }, "z");
  return out;
}

function wallArt(style: Layout["wall"], s: Side, h: number): PropArt {
  return {
    box: [s.L - 1, s.B - h - 1, s.R + 1, s.F + 1],
    draw: (g) => (style === "stone" ? stoneWall(g, s.L, s.B, s.R, s.F, h) : hedgeBlock(g, s.L, s.B, s.R, s.F, h, undefined, s.L + s.B)),
    label: [0, 0],
  };
}

/** Houses around the market plaza (north row, west column, and across both streets). */
function marketHouses(): { L: number; B: number; R: number; F: number; wallH: number; seed: number }[] {
  const out: { L: number; B: number; R: number; F: number; wallH: number; seed: number }[] = [];
  const add = (L: number, B: number, R: number, F: number, wallH: number) => out.push({ L: L * T, B: B * T, R: R * T, F: F * T, wallH, seed: out.length + 1 });
  for (let x = -14; x < 14; x += 2.75) add(x, -7.6, x + 2.6, -5, 17);
  for (const z of [-4.8, -1.6, 1.6, 4.8]) add(-8.8, z, -5.1, z + 2.3, 15);
  for (let x = -8.8; x < 14; x += 3) add(x, 7.6, x + 2.8, 10, 14);
  for (const z of [-4.6, -1.6, 1.4, 4.4]) add(7.6, z, 10.8, z + 2.3, 15);
  return out;
}

interface DecorOpts {
  canopy: Canopy[];
  pines: number;
  bushes: number;
  rocks: number;
  flowers: number;
  density: number;
}

const DECOR: Record<string, DecorOpts> = {
  jardin: { canopy: [GREEN, GREEN, GREEN, AUTUMN, RUST, GOLDEN], pines: 0.12, bushes: 0.25, rocks: 0.06, flowers: 0.35, density: 0.8 },
  plaza: { canopy: [GREEN, GREEN, AUTUMN], pines: 0.1, bushes: 0.3, rocks: 0.05, flowers: 0.25, density: 0.6 },
  cementerio: { canopy: [GLOOM, GLOOM, GLOOM, RUST], pines: 0.45, bushes: 0.2, rocks: 0.15, flowers: 0.04, density: 0.7 },
  laberinto: { canopy: [GREEN, GREEN, GOLDEN, AUTUMN], pines: 0.35, bushes: 0.25, rocks: 0.08, flowers: 0.2, density: 0.95 },
};

function overlaps(a: Bounds, b: Bounds) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

/** Trees, bushes and rocks around the room, never over it. */
function decor(world: World, keepOut: Bounds[]): Piece[] {
  const o = DECOR[world.layout.room] ?? DECOR.jardin;
  const out: Piece[] = [];
  const taken: Bounds[] = [];
  const step = 1.7;
  for (let gz = -15; gz < 17; gz += step)
    for (let gx = -18; gx < 18; gx += step) {
      const i = Math.round(gx * 10);
      const j = Math.round(gz * 10);
      if (hash(i, j, 101) > o.density) continue;
      const x = Math.round((gx + hash(i, j, 102) * 1.2) * T);
      const z = Math.round((gz + hash(i, j, 103) * 1.2) * T);
      const r = hash(i, j, 104);
      let box: [number, number, number, number];
      let draw: (g: G) => void;
      let foot: Bounds;
      if (r < o.rocks) {
        const w = 6 + Math.floor(hash(i, j, 105) * 5);
        box = [x - w, z - w, x + w, z + 1];
        draw = (g) => rock(g, x, z, w);
        foot = { x0: x - w, y0: z - 4, x1: x + w, y1: z + 2 };
      } else if (r < o.rocks + o.bushes) {
        const rr = 5 + Math.floor(hash(i, j, 106) * 3);
        box = [x - rr - 3, z - rr * 2 - 2, x + rr + 3, z + 1];
        draw = (g) => bush(g, x, z, rr, o.canopy[0], i + j);
        foot = { x0: x - rr, y0: z - 6, x1: x + rr, y1: z + 2 };
      } else if (r < o.rocks + o.bushes + o.pines) {
        const h = 28 + Math.floor(hash(i, j, 107) * 14);
        box = [x - 16, z - h - 2, x + 16, z + 1];
        draw = (g) => pine(g, x, z, h, world.layout.room === "cementerio" ? GLOOM : GREEN);
        foot = { x0: x - 8, y0: z - 10, x1: x + 8, y1: z + 3 };
      } else {
        const rr = 12 + Math.floor(hash(i, j, 108) * 6);
        const trunkH = 10 + Math.floor(hash(i, j, 109) * 6);
        const p = o.canopy[Math.floor(hash(i, j, 110) * o.canopy.length)];
        box = [x - rr - 3, Math.floor(z - trunkH - rr * 1.6 - 3), x + rr + 3, z + 1];
        draw = (g) => roundTree(g, x, z, rr, trunkH, p, 0, i * 31 + j);
        foot = { x0: x - rr + 2, y0: z - 12, x1: x + rr - 2, y1: z + 3 };
      }
      const vis: Bounds = { x0: box[0], y0: box[1], x1: box[2], y1: box[3] };
      if (keepOut.some((k) => overlaps(k, vis))) continue;
      if (taken.some((t) => overlaps(t, foot))) continue;
      taken.push(foot);
      out.push(piece(box, z, draw));
      if (hash(i, j, 111) < o.flowers) {
        const fx = x + 14;
        const fz = z + 6;
        const fb: Bounds = { x0: fx - 4, y0: fz - 4, x1: fx + 6, y1: fz + 4 };
        if (!keepOut.some((k) => overlaps(k, fb))) out.push(piece([fx - 4, fz - 4, fx + 7, fz + 4], fz - 50, (g) => flowerTuft(g, fx, fz, i + j * 7)));
      }
    }
  return out;
}

export function buildRoom(world: World): RoomArt {
  const layout = world.layout;
  const sprites: Sprite[] = [];
  const byId = new Map<string, Sprite>();

  for (const o of world.objects) {
    if (o.id === world.room) continue;
    const b = world.bodies.get(o.id)!;
    if (b.members) continue;
    const art = propArt(b, { world, id: o.id });
    if (!art) continue;
    const geo = geoOf(b);
    const s = makeSprite(o.id, art.flat ? -10000 + geo.B : geo.F, art, b);
    sprites.push(s);
    byId.set(o.id, s);
  }

  const pieces: Piece[] = [];
  const wallH = WALL_H[layout.wall] + (layout.room === "laberinto" ? 3 : 0);
  if (layout.wall !== "houses") {
    for (const s of wallSides(world)) {
      const h = s.dir === "s" ? Math.round(wallH * 0.6) : wallH;
      const art = wallArt(layout.wall, s, h);
      if (s.dir === "s") sprites.push(makeSprite(null, s.F, art, null));
      else {
        const r = render(art.box, art.draw);
        pieces.push({ x: r.x, y: r.y, img: r.frames[0], key: s.F });
      }
    }
  } else {
    for (const h of marketHouses()) {
      const st = HOUSES[Math.floor(hash(h.seed, 7, 3) * HOUSES.length)];
      pieces.push(piece([h.L - 2, h.B - h.wallH - 12, h.R + 2, h.F + 1], h.F, (g) => house(g, h.L, h.B, h.R, h.F, h.wallH, st, h.seed)));
    }
  }

  // Keep the map readable: what the rules talk about stays in view.
  const fit: Bounds = { x0: -5.5 * T, y0: -5.5 * T - wallH - 4, x1: 5.5 * T, y1: 5.5 * T };
  for (const s of sprites) {
    if (!s.body) continue;
    const g = geoOf(s.body);
    fit.x0 = Math.min(fit.x0, g.L);
    fit.x1 = Math.max(fit.x1, g.R);
    fit.y1 = Math.max(fit.y1, g.F);
  }
  for (const sp of Object.values(layout.spots)) {
    fit.x0 = Math.min(fit.x0, sp.at[0] * T - 8);
    fit.x1 = Math.max(fit.x1, sp.at[0] * T + 8);
    fit.y0 = Math.min(fit.y0, sp.at[1] * T - sp.y * YPX - 24);
  }

  const keepOut: Bounds[] = [{ x0: fit.x0 - 6, y0: fit.y0 - 30, x1: fit.x1 + 6, y1: fit.y1 + 6 }];
  if (layout.room === "plaza") keepOut.push({ x0: -15 * T, y0: -9 * T, x1: 13 * T, y1: 11 * T });
  if (layout.room === "jardin") keepOut.push({ x0: 5 * T, y0: -2 * T, x1: 20 * T, y1: 2.6 * T });
  pieces.push(...decor(world, keepOut));
  pieces.sort((a, b) => a.key - b.key);

  return {
    world,
    sprites,
    byId,
    pieces,
    fit,
    bg: layout.room === "cementerio" ? GRAVE_OUT.base : layout.room === "plaza" ? STREET.shades[0] : MEADOW.base,
    animated: sprites.some((s) => s.frames.length > 1),
  };
}

// ─────────────────────────────────────────────────────────────── view

export interface View {
  /** Device pixels per base pixel. */
  s: number;
  dpr: number;
  baseW: number;
  baseH: number;
  /** Base px of world (0, 0). */
  ox: number;
  oy: number;
}

/** Largest integer scale that fits the room (minus the HUD strips), canvas covering the whole box. */
export function fitView(fit: Bounds, cssW: number, cssH: number, dpr: number, hud: { top: number; bottom: number; side: number }): View {
  const devW = Math.round(cssW * dpr);
  const devH = Math.round(cssH * dpr);
  const availW = devW - 2 * hud.side * dpr;
  const availH = devH - (hud.top + hud.bottom) * dpr;
  const raw = Math.min(availW / (fit.x1 - fit.x0), availH / (fit.y1 - fit.y0));
  const s = raw >= 1 ? Math.floor(raw) : Math.max(0.25, raw);
  const baseW = Math.ceil(devW / s);
  const baseH = Math.ceil(devH / s);
  const cx = devW / 2 / s;
  const cy = (hud.top * dpr + availH / 2) / s;
  return { s, dpr, baseW, baseH, ox: Math.round(cx - (fit.x0 + fit.x1) / 2), oy: Math.round(cy - (fit.y0 + fit.y1) / 2) };
}

/** Ground, shadows, walls and decor for a view: redrawn only on resize or room change. */
export function buildStatic(art: RoomArt, v: View): HTMLCanvasElement {
  const c = makeCanvas(v.baseW, v.baseH);
  const g = ctxOf(c);
  const img = g.createImageData(v.baseW, v.baseH);
  const d = img.data;
  const layout = art.world.layout;
  for (let y = 0; y < v.baseH; y++)
    for (let x = 0; x < v.baseW; x++) {
      const [r, gg, b] = rgb(terrain(layout, x - v.ox, y - v.oy));
      const i = (y * v.baseW + x) * 4;
      d[i] = r;
      d[i + 1] = gg;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  g.save();
  g.translate(v.ox, v.oy);
  for (const s of art.sprites) s.art?.ground?.(g);
  g.restore();
  for (const p of art.pieces) {
    const x = p.x + v.ox;
    const y = p.y + v.oy;
    if (x > v.baseW || y > v.baseH || x + p.img.width < 0 || y + p.img.height < 0) continue;
    g.drawImage(p.img, x, y);
  }
  return c;
}

// ─────────────────────────────────────────────────────────────── the gnome on the map

export interface GnomeDraw {
  target: GnomeTarget;
  frame: GnomeFrame;
}

function containing(art: RoomArt, x: number, z: number): Sprite[] {
  return art.sprites.filter((s) => {
    const b = s.body;
    if (!s.id || !b || s.flat) return false;
    return Math.abs(x - b.at[0]) <= b.size[0] / 2 + 0.05 && Math.abs(z - b.at[1]) <= b.size[1] / 2 + 0.05;
  });
}

interface Placed {
  spr: GnomeSprite;
  /** Top-left in world px. */
  x: number;
  y: number;
  key: number;
  /** Ground point for the shadow / marker ring, or null. */
  foot: [number, number] | null;
  ring: [number, number] | null;
}

function place(art: RoomArt, gd: GnomeDraw, t: number, reduced: boolean): Placed {
  const { target, frame } = gd;
  const fx = Math.round(frame.x * T);
  const fy = Math.round(frame.z * T - frame.y * YPX);
  const ground: [number, number] = [fx, Math.round(frame.z * T - frame.floor * YPX)];
  const inside = containing(art, frame.x, frame.z);
  const host = target.host ? art.byId.get(target.host) : undefined;
  const topOf = inside.filter((s) => s.body!.h <= frame.y + 0.35).sort((a, b) => b.key - a.key)[0];
  let key = frame.z * T;
  if (frame.y >= 0.3 && topOf) key = topOf.key + 0.5;
  const feet = (spr: GnomeSprite, bob = 0): Placed => ({
    spr,
    x: fx - Math.floor(spr.img.width / 2),
    y: fy - spr.img.height + 1 + bob,
    key,
    foot: ground,
    ring: ground,
  });
  if (!frame.arrived || frame.moving) return feet(walkSprite(frame.dir, frame.walk));

  const bob = reduced ? 0 : -(Math.floor(t * 1.7) & 1);
  const container = inside.find((s) => s.body?.traits?.includes("container"));
  switch (target.pose) {
    case "crouch":
      return feet(specialSprite("crouch"));
    case "sit":
      return feet(specialSprite(target.face === "w" ? "sit_w" : "sit_e"));
    case "lean":
      return feet(specialSprite("lean"), bob);
    case "circle":
      return feet(walkSprite(frame.dir, frame.walk));
    case "hang": {
      const spr = specialSprite("hang");
      const hook = host?.art?.hook;
      const sway = reduced ? 0 : Math.round(Math.sin(t * 2.2));
      if (!hook) return feet(spr);
      return { spr, x: hook[0] - Math.floor(spr.img.width / 2) + sway, y: hook[1] - 1, key: 1e5, foot: [hook[0], ground[1]], ring: null };
    }
    case "upside": {
      const spr = specialSprite("upside");
      const hook = host?.art?.hook;
      const sway = reduced ? 0 : Math.round(Math.sin(t * 1.8));
      if (!hook) return feet(spr);
      return { spr, x: fx - Math.floor(spr.img.width / 2) + sway, y: hook[1] - 2, key: 1e5, foot: ground, ring: null };
    }
    case "lie_up": {
      const spr = specialSprite("lie_up");
      const g = container?.body ? geoOf(container.body) : null;
      const cy = g ? Math.round((g.B + g.F) / 2 - g.H) : fy;
      return { spr, x: fx - Math.floor(spr.img.width / 2), y: cy - Math.floor(spr.img.height / 2), key: (container?.key ?? key) + 0.5, foot: null, ring: [fx, cy + 4] };
    }
    case "lie_down": {
      const spr = specialSprite("lie_down");
      return { spr, x: fx - Math.floor(spr.img.width / 2), y: fy - spr.img.height + 3, key, foot: [fx, fy], ring: [fx, fy] };
    }
    case "peek": {
      const mouth = container?.art?.mouth;
      const door = container?.art?.door;
      if (mouth) {
        const spr = specialSprite("hat");
        const lift = reduced ? 0 : Math.floor(t * 0.9) % 3 === 0 ? 1 : 0;
        return { spr, x: mouth[0] - Math.floor(spr.img.width / 2), y: mouth[1] - spr.img.height + 2 + lift, key: container!.key + 0.5, foot: null, ring: mouth };
      }
      if (door) {
        const spr = specialSprite("head_e");
        return { spr, x: door[0] - Math.floor(spr.img.width / 2), y: door[1] - spr.img.height, key: container!.key + 0.5, foot: null, ring: null };
      }
      return feet(walkSprite(target.face ?? "s", 0));
    }
    default:
      return feet(walkSprite(target.face ?? "s", 0), bob);
  }
}

function drawGnome(g: G, p: Placed, arrived: boolean, circling: boolean, t: number, reduced: boolean) {
  if (p.foot) {
    g.globalAlpha = 0.28;
    ellipse(g, p.foot[0] - 5, p.foot[1] - 2, 11, 4, INK);
    g.globalAlpha = 1;
  }
  if (arrived && !circling && p.ring) {
    const pulse = reduced ? 0 : Math.floor(t * 2.5) & 1;
    ellipseRing(g, p.ring[0], p.ring[1], 8 + pulse, 3 + pulse * 0.5, ACCENT, 2);
  }
  const light = !reduced && Math.floor(t * 2.5) & 1;
  g.drawImage(light ? p.spr.ringLight : p.spr.ring, p.x - 1, p.y - 1);
  g.drawImage(p.spr.img, p.x, p.y);
}

// ─────────────────────────────────────────────────────────────── painting

export interface PaintState {
  gnome: GnomeDraw | null;
  ghosts: Set<string>;
  hover: Set<string>;
  t: number;
  reduced: boolean;
}

function hoverRings(s: Sprite): [HTMLCanvasElement, HTMLCanvasElement] {
  if (!s.hover) {
    const inner = halo(s.frames[0], ACCENT);
    s.hover = [halo(inner, "#FFFFFF"), inner];
  }
  return s.hover;
}

/** One frame: static layer, then props and the gnome back to front. Returns a signature for skipping identical frames. */
export function paint(g: G, stat: HTMLCanvasElement, art: RoomArt, v: View, st: PaintState) {
  g.clearRect(0, 0, v.baseW, v.baseH);
  g.drawImage(stat, 0, 0);
  const placed = st.gnome ? place(art, st.gnome, st.t, st.reduced) : null;
  const items: { key: number; s?: Sprite }[] = art.sprites.map((s) => ({ key: s.key, s }));
  if (placed) items.push({ key: placed.key });
  items.sort((a, b) => a.key - b.key);
  let gnomeDone = false;
  for (const it of items) {
    const s = it.s;
    if (!s) {
      g.save();
      g.translate(v.ox, v.oy);
      drawGnome(g, placed!, st.gnome!.frame.arrived, st.gnome!.target.pose === "circle", st.t, st.reduced);
      g.restore();
      gnomeDone = true;
      continue;
    }
    const n = s.frames.length;
    const f = n > 1 && !st.reduced ? Math.floor(st.t * s.fps + s.phase * n) % n : 0;
    const x = s.x + v.ox;
    const y = s.y + v.oy;
    const hovered = !!s.id && st.hover.has(s.id);
    if (hovered) g.drawImage(hoverRings(s)[0], x - 2, y - 2);
    g.globalAlpha = gnomeDone && s.id && st.ghosts.has(s.id) ? 0.5 : 1;
    g.drawImage(s.frames[f], x, y);
    g.globalAlpha = 1;
    if (hovered) g.drawImage(hoverRings(s)[1], x - 1, y - 1);
  }
}

/** What changes the picture this frame (skip repaint when equal). */
export function signature(art: RoomArt, st: PaintState): string {
  const amb = st.reduced ? 0 : art.sprites.map((s) => (s.frames.length > 1 ? Math.floor(st.t * s.fps + s.phase * s.frames.length) % s.frames.length : 0)).join("");
  const gf = st.gnome?.frame;
  const gs = gf ? `${Math.round(gf.x * T)},${Math.round(gf.z * T)},${Math.round(gf.y * YPX)},${gf.dir}${gf.walk}${gf.arrived ? 1 : 0}${gf.moving ? 1 : 0}` : "";
  const pulse = st.reduced ? 0 : `${Math.floor(st.t * 2.5) & 1}${Math.floor(st.t * 1.7) & 1}${Math.round(Math.sin(st.t * 2.2))}${Math.round(Math.sin(st.t * 1.8))}${Math.floor(st.t * 0.9) % 3}`;
  return `${amb}|${gs}|${pulse}|${[...st.hover].join(",")}|${[...st.ghosts].join(",")}`;
}

// ─────────────────────────────────────────────────────────────── picking

function opaqueAt(s: Sprite, wx: number, wy: number) {
  const c = s.frames[0];
  const lx = Math.floor(wx - s.x);
  const ly = Math.floor(wy - s.y);
  return lx >= 0 && ly >= 0 && lx < c.width && ly < c.height && s.mask[ly * c.width + lx] === 1;
}

/** Object under a world px point: exact pixel first (front to back), then the nearest within `slop` px. */
export function pickAt(art: RoomArt, wx: number, wy: number, slop: number): string | null {
  const order = art.sprites.filter((s) => s.id).sort((a, b) => b.key - a.key);
  for (const s of order) if (opaqueAt(s, wx, wy)) return s.id;
  let best: string | null = null;
  let bestD = slop;
  for (const s of order) {
    const [x0, y0, x1, y1] = s.tight;
    const dx = Math.max(s.x + x0 - wx, 0, wx - (s.x + x1));
    const dy = Math.max(s.y + y0 - wy, 0, wy - (s.y + y1));
    const d = Math.hypot(dx, dy) + (s.flat ? 2 : 0);
    if (d < bestD) {
      bestD = d;
      best = s.id;
    }
  }
  return best;
}

/** A world px point that picks `id` (for the dev playtest hook), or null. */
export function pointFor(art: RoomArt, id: string): [number, number] | null {
  const s = art.byId.get(id);
  if (!s) return null;
  const w = s.frames[0].width;
  const pts: [number, number][] = [];
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < s.mask.length; i++)
    if (s.mask[i]) {
      const p: [number, number] = [s.x + (i % w) + 0.5, s.y + Math.floor(i / w) + 0.5];
      pts.push(p);
      sx += p[0];
      sy += p[1];
    }
  if (!pts.length) return null;
  const c = [sx / pts.length, sy / pts.length];
  pts.sort((a, b) => Math.hypot(a[0] - c[0], a[1] - c[1]) - Math.hypot(b[0] - c[0], b[1] - c[1]));
  for (const p of pts) if (pickAt(art, p[0], p[1], 0) === id) return p;
  return null;
}

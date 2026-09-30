import type { Dir, Pose } from "../model/layouts";
import { ACCENT, ACCENT_LIGHT, flipX, flipY, fromGrid, halo, outlined, rotateGrid } from "./pixel";

/**
 * The gnome: an original 16-bit sprite (red pointed hat, white beard, blue
 * tunic), about one tile tall. Hand-authored character grids, outlined in ink
 * by code, cached per pose / direction / walk frame.
 */

export interface GnomeTarget {
  key: string;
  at: [number, number];
  y: number;
  pose: Pose;
  face?: Dir;
  /** Object he hangs from (colgado de) or lies in. */
  host?: string;
  /** Centre he circles around (pose "circle"). */
  orbit?: [number, number];
  /** Where the thing he leans on is (pose "lean"). */
  leanTo?: [number, number];
}

const PAL: Record<string, string> = {
  r: "#E0413A",
  h: "#FF8A6E",
  R: "#A12A3A",
  s: "#F6CBA4",
  S: "#DE9F80",
  e: "#3D2140",
  k: "#3D2140",
  n: "#EE8A7C",
  w: "#FFFFFF",
  W: "#CFCBE3",
  b: "#3E6FC7",
  l: "#6C9BEA",
  B: "#2C4A8E",
  t: "#6B3F22",
  y: "#F2C94C",
  o: "#5A3422",
};

const HAT = [
  ".....r....",
  "....rr....",
  "....rrr...",
  "...hrrr...",
  "...hrrrr..",
  "..hrrrrr..",
  "..hrrrrrr.",
  "RRRRRRRRRR",
];

const FRONT_TOP = [
  ...HAT,
  ".ssssssss.",
  ".sesSSses.",
  "wwssnnssww",
  "bwwwwwwwwb",
  "blwwwwwwbb",
  "sbbwwwwbbs",
  "tttywwyttt",
  "bbbbwwbbbb",
];

const BACK_TOP = [
  ...HAT,
  ".WwwwwwwW.",
  ".WwwwwwwW.",
  "bbWwwwwWbb",
  "blbWWWWbbb",
  "blbbbbbbbb",
  "sbbbbbbbbs",
  "tttttttttt",
  "bbbbbbbbbb",
];

const SIDE_TOP = [
  "..r.......",
  "..rr......",
  "...rr.....",
  "...rrr....",
  "..hrrrr...",
  "..hrrrrr..",
  ".hrrrrrrr.",
  "RRRRRRRRR.",
  ".Wssssss..",
  ".Wsssses..",
  ".WWssssnn.",
  ".blwwwwww.",
  ".blbwwwww.",
  ".bbbswwww.",
  ".tttttyt..",
  ".bbbbbbb..",
];

const LEGS_FRONT = [
  ["..BB..BB..", ".ooo..ooo."],
  ["..oo..BB..", "......ooo."],
  ["..BB..BB..", ".ooo..ooo."],
  ["..BB..oo..", ".ooo......"],
];
const LEGS_SIDE = [
  ["..BB..BB..", ".oo...ooo."],
  ["...BBB....", "...oooo..."],
  [".BB...BB..", "oo....ooo."],
  ["...BBB....", "...oooo..."],
];

const CROUCH = [...HAT, ".ssssssss.", ".sesSSses.", "wwssnnssww", "bwwwwwwwwb", "sbbwwwwbbs", "oobbwwbboo"];
const SIT = [...SIDE_TOP.slice(0, 14), ".ttttttt..", ".BBBBBBBoo", "......Boo."];
const LEAN = [
  ...HAT,
  ".ssssssss.",
  ".skkSSkks.",
  "wwssnnssww",
  "bwwwwwwwwb",
  "blwwwwwwbb",
  "sbbwwwwbbs",
  "tttywwyttt",
  "bbbbwwbbbb",
  "...BBBB...",
  "..oo..oo..",
];
const HANG = [
  "s........s",
  "b....r...b",
  "b...rr...b",
  "b...rrr..b",
  "b..hrrr..b",
  "b..hrrrr.b",
  "b.hrrrrr.b",
  "bRRRRRRRRb",
  "b.ssssss.b",
  "b.esSSse.b",
  "bwssnnsswb",
  "bwwwwwwwwb",
  ".bwwwwwwb.",
  ".bbwwwwbb.",
  ".ttttwttt.",
  ".bbbbbbbb.",
  "..BB..BB..",
  "..BB..BB..",
  "..oo..oo..",
];
const LIE_UP = [
  "...rr...",
  "...rrr..",
  "..hrrr..",
  "..hrrrr.",
  "RRRRRRRR",
  ".ssssss.",
  ".seSSes.",
  "wwsnnsww",
  "bwwwwwwb",
  "bswwwwsb",
  "bbbwwbbb",
  "tttttttt",
  "bbbbbbbb",
  ".BB..BB.",
  ".oo..oo.",
];

export type Facing = "s" | "n" | "e" | "w";

export interface GnomeSprite {
  img: HTMLCanvasElement;
  ring: HTMLCanvasElement;
  ringLight: HTMLCanvasElement;
}

const cache = new Map<string, GnomeSprite>();

function make(key: string, build: () => HTMLCanvasElement): GnomeSprite {
  let s = cache.get(key);
  if (!s) {
    const img = build();
    s = { img, ring: halo(img, ACCENT), ringLight: halo(img, ACCENT_LIGHT) };
    cache.set(key, s);
  }
  return s;
}

const og = (rows: string[]) => outlined(fromGrid(rows, PAL));

/** Standing or walking in a direction, frame 0–3. */
export function walkSprite(dir: Facing, frame: number): GnomeSprite {
  const f = frame & 3;
  return make(`walk:${dir}:${f}`, () => {
    if (dir === "e" || dir === "w") {
      const c = og([...SIDE_TOP, ...LEGS_SIDE[f]]);
      return dir === "w" ? flipX(c) : c;
    }
    return og([...(dir === "n" ? BACK_TOP : FRONT_TOP), ...LEGS_FRONT[f]]);
  });
}

export type Special = "crouch" | "sit_e" | "sit_w" | "lean" | "hang" | "upside" | "lie_up" | "lie_down" | "hat" | "head_e";

export function specialSprite(kind: Special): GnomeSprite {
  return make(kind, () => {
    switch (kind) {
      case "crouch":
        return og(CROUCH);
      case "sit_e":
        return og(SIT);
      case "sit_w":
        return flipX(og(SIT));
      case "lean":
        return og(LEAN);
      case "hang":
        return og(HANG);
      case "upside":
        return flipY(og([...FRONT_TOP, ...LEGS_FRONT[0]]));
      case "lie_up":
        return og(LIE_UP);
      case "lie_down":
        return og(rotateGrid([...BACK_TOP, ...LEGS_FRONT[0]]));
      case "hat":
        return og(FRONT_TOP.slice(0, 10));
      case "head_e":
        return og(SIDE_TOP.slice(0, 13));
    }
  });
}

// ─────────────────────────────────────────────────────────────── motion

export interface GnomeFrame {
  x: number;
  z: number;
  /** Feet height (m). */
  y: number;
  /** Height of the ground under him (for the shadow). */
  floor: number;
  moving: boolean;
  dir: Facing;
  walk: number;
  arrived: boolean;
}

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function facingOf(dx: number, dz: number, fallback: Facing): Facing {
  if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) return fallback;
  return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? "e" : "w") : dz > 0 ? "s" : "n";
}

/**
 * Walks the gnome from wherever he is to his next spot (a little hop arc when
 * the height changes), then holds the pose. Circling the fountain keeps him
 * walking. Pure state + time: the map's frame loop drives it.
 */
export class GnomeMotion {
  private key = "";
  private scene = "";
  private from: [number, number, number] = [0, 0, 0];
  private t = 1;
  private dur = 1;
  private orbit = 0;
  private walkClock = 0;
  arrived = true;
  private pos: [number, number, number] = [0, 0, 0];
  private dir: Facing = "s";

  /** Advance by dt seconds. Returns the new frame and whether he just arrived. */
  step(target: GnomeTarget, scene: string, dt: number, reduced: boolean): { frame: GnomeFrame; justArrived: boolean } {
    const [tx, tz] = target.at;
    const ty = target.y;
    if (this.key !== target.key || this.scene !== scene) {
      const fresh = this.key === "" || this.scene !== scene;
      this.key = target.key;
      this.scene = scene;
      this.from = fresh ? [tx, Math.max(7, tz + 2), 0] : [...this.pos];
      const dist = Math.hypot(tx - this.from[0], tz - this.from[1]) + Math.abs(ty - this.from[2]);
      this.dur = reduced ? 0 : Math.max(0.9, Math.min(2.2, dist / 5.5));
      this.t = 0;
      this.arrived = false;
    }
    let justArrived = false;
    let moving = false;
    let x = tx;
    let z = tz;
    let y = ty;
    let floor = ty;
    if (!this.arrived) {
      this.t = this.dur <= 0 ? 1 : Math.min(1, this.t + dt / this.dur);
      const k = ease(this.t);
      const [fx, fz, fy] = this.from;
      x = fx + (tx - fx) * k;
      z = fz + (tz - fz) * k;
      floor = fy + (ty - fy) * k;
      const climb = Math.max(fy, ty) + 0.5;
      y = floor + (ty !== fy ? Math.sin(Math.PI * this.t) * (climb - floor) * 0.9 : 0);
      this.dir = facingOf(tx - fx, tz - fz, this.dir);
      moving = this.t < 1;
      if (this.t >= 1) {
        this.arrived = true;
        justArrived = true;
      }
    }
    if (this.arrived) {
      if (target.pose === "circle" && target.orbit) {
        const [cx, cz] = target.orbit;
        const r = Math.hypot(tx - cx, tz - cz);
        if (!reduced) this.orbit += dt * 1.1;
        const a = Math.atan2(tz - cz, tx - cx) + this.orbit;
        x = cx + Math.cos(a) * r;
        z = cz + Math.sin(a) * r;
        // Tangent of the (clockwise on screen) circle.
        this.dir = facingOf(-Math.sin(a), Math.cos(a), this.dir);
        moving = !reduced;
      } else {
        this.dir = target.face ?? "s";
      }
      y = ty;
      floor = ty;
    }
    if (moving) this.walkClock += dt;
    this.pos = [x, z, y];
    const walk = moving ? Math.floor(this.walkClock * 9) & 3 : 0;
    return { frame: { x, z, y, floor, moving, dir: this.dir, walk, arrived: this.arrived }, justArrived };
  }
}

import * as THREE from "three";
import type { ObjectKind, Word } from "../lib/types";

/** memo "Sticker Tabs" colours the 3D room borrows (app/src/app/globals.css). */
export const MEMO = {
  ink: "#3d2140",
  accent: "#ff5fa2",
  shell: "#ffe9b8",
  page: "#fff3d6",
  tab: "#f2d59c",
  pillDeep: "#e6c583",
} as const;

export const KIND_COLOR: Record<ObjectKind, string> = {
  ground: MEMO.tab,
  ramp: "#e8b96a",
  plank: "#c98b4f",
  wall: "#b9a3d6",
  glass: "#9fdcff",
  ice: "#dff4ff",
  water: "#6ec6ff",
  door: "#9f7cc9",
  plate: "#8a7690",
  fan: "#8fb6c9",
  lift: "#c9a0dc",
  pipe: "#6fbf9f",
  ball: "#4fb0c6",
  box: "#f2a65a",
  bucket: "#8fc27a",
};

// ─── toon ramp + procedural textures (made once, on first use) ─────────────

let gradient: THREE.DataTexture | null = null;
/** Three hard light bands, shared by every toon material. */
export function toonGradient(): THREE.DataTexture {
  if (gradient) return gradient;
  gradient = new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

const cache = new Map<string, THREE.Texture>();

function canvasTexture(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, repeat = 1) {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  draw(g, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Seeded so the textures look the same on every load. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Grit: dark specks for the áspero look and bump map. */
const noise = () =>
  canvasTexture(
    "grit",
    64,
    (g, s) => {
      const r = rng(7);
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 26; i++) {
        const v = Math.floor(70 + r() * 80);
        g.fillStyle = `rgb(${v + 30},${v + 10},${v})`;
        g.beginPath();
        g.arc(r() * s, r() * s, 2.5 + r() * 3.5, 0, Math.PI * 2);
        g.fill();
      }
    },
    2,
  );

/** Iron plates with rivets: pesado. */
const rivets = () =>
  canvasTexture("rivets", 128, (g, s) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "#8a8f9c";
    g.lineWidth = 4;
    g.strokeRect(2, 2, s - 4, s - 4);
    g.fillStyle = "#6c7080";
    for (const [x, y] of [
      [12, 12],
      [s - 12, 12],
      [12, s - 12],
      [s - 12, s - 12],
      [s / 2, 12],
      [s / 2, s - 12],
    ]) {
      g.beginPath();
      g.arc(x, y, 5, 0, Math.PI * 2);
      g.fill();
    }
  });

/** Wet: glossy diagonal glints and drops. Smooth: one wide soft band. */
const sheen = (wet: boolean) =>
  canvasTexture(`sheen${wet}`, 128, (g, s) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, s, s);
    if (!wet) {
      g.fillStyle = "#fff6fb";
      g.fillRect(0, s * 0.18, s, s * 0.22);
      return;
    }
    const r = rng(19);
    g.fillStyle = "#6fb6ff";
    for (let i = 0; i < 7; i++) {
      const x = 8 + r() * (s - 16);
      const y = 8 + r() * (s - 24);
      g.beginPath();
      g.moveTo(x, y - 12);
      g.quadraticCurveTo(x + 9, y + 4, x, y + 9);
      g.quadraticCurveTo(x - 9, y + 4, x, y - 12);
      g.fill();
    }
    g.strokeStyle = "#ffffff";
    g.globalAlpha = 0.9;
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(0, s * 0.35);
    g.lineTo(s * 0.35, 0);
    g.stroke();
  });

/** White glints: glass and ice. */
const glints = () =>
  canvasTexture("glints", 128, (g, s) => {
    g.fillStyle = "#e8f6ff";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "#ffffff";
    g.lineWidth = 9;
    for (const x of [22, 44]) {
      g.beginPath();
      g.moveTo(x, s);
      g.lineTo(x + 40, 0);
      g.stroke();
    }
  });

/** Ink cracks: débil. */
const cracks = () =>
  canvasTexture("cracks", 256, (g, s) => {
    const r = rng(11);
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = MEMO.ink;
    g.lineWidth = 3;
    for (let k = 0; k < 5; k++) {
      let x = s / 2 + (r() - 0.5) * 40;
      let y = s / 2 + (r() - 0.5) * 40;
      g.beginPath();
      g.moveTo(x, y);
      for (let i = 0; i < 6; i++) {
        x += (r() - 0.5) * 90;
        y += (r() - 0.5) * 90;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });

/** Horizontal speed lines: rápido. */
const streaks = () =>
  canvasTexture("streaks", 128, (g, s) => {
    const r = rng(3);
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, s, s);
    g.fillStyle = "#ffc0dc";
    for (let i = 0; i < 9; i++) g.fillRect(r() * s * 0.4, r() * s, s * (0.4 + r() * 0.5), 5);
  });

/** Speckles: duro stone, frío frost. */
const speckle = (key: string, dot: string) =>
  canvasTexture(key, 128, (g, s) => {
    const r = rng(key.length * 31);
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, s, s);
    g.fillStyle = dot;
    for (let i = 0; i < 90; i++) {
      g.beginPath();
      g.arc(r() * s, r() * s, 1 + r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  });

/** Rubber rings: elástico. */
const rings = () =>
  canvasTexture("rings", 128, (g, s) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, s, s);
    g.fillStyle = "#ffd1e6";
    for (let y = 0; y < s; y += 32) g.fillRect(0, y, s, 14);
  });

/** Steel bands: fuerte. */
const bands = () =>
  canvasTexture("bands", 128, (g, s) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, s, s);
    g.fillStyle = "#7d8da3";
    g.fillRect(0, 0, 14, s);
    g.fillRect(s - 14, 0, 14, s);
    g.fillRect(0, s / 2 - 7, s, 14);
  });

/** Grid: rígido. */
const grid = () =>
  canvasTexture("grid", 128, (g, s) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "#b8a8bf";
    g.lineWidth = 4;
    for (let i = 0; i <= s; i += 32) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, s);
      g.moveTo(0, i);
      g.lineTo(s, i);
      g.stroke();
    }
  });

/** Graph paper for the back wall. */
export const paper = () =>
  canvasTexture(
    "paper",
    128,
    (g, s) => {
      g.fillStyle = MEMO.page;
      g.fillRect(0, 0, s, s);
      g.strokeStyle = "#f3dfb4";
      g.lineWidth = 2;
      for (let i = 0; i <= s; i += 32) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, s);
      g.moveTo(0, i);
      g.lineTo(s, i);
      g.stroke();
    }
    },
    1,
  );

// ─── looks ──────────────────────────────────────────────────────────────

export interface Look {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  opacity: number;
  map: THREE.Texture | null;
  bumpMap: THREE.Texture | null;
  /** Halo shell colour (hot glow, frost), or null. */
  halo: string | null;
  /** Pulsing emissive (caliente). */
  pulse: boolean;
  /** Squishy wobble (blando). */
  wobble: boolean;
}

const mix = (a: string, b: string, t: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;

const BASE_OPACITY: Partial<Record<ObjectKind, number>> = { glass: 0.7, ice: 0.85, water: 0.6 };

/**
 * The material an object wears for its active words (`shader_trigger`s).
 * Applied in word order, so the latest word on a channel wins.
 */
export function lookFor(kind: ObjectKind, words: Word[], baseColor?: string): Look {
  const look: Look = {
    color: baseColor ?? KIND_COLOR[kind],
    emissive: "#000000",
    emissiveIntensity: 0,
    opacity: BASE_OPACITY[kind] ?? 1,
    map: null,
    bumpMap: null,
    halo: null,
    pulse: false,
    wobble: false,
  };
  // Glass and ice get glints so they read as glass, not as a gap.
  if (kind === "glass" || kind === "ice") look.map = glints();
  for (const w of words) {
    switch (w.shader_trigger) {
      case "mat_heavy_iron":
        look.color = "#7b8190";
        look.map = rivets();
        break;
      case "mat_light_feather":
        look.color = mix(look.color, "#ffffff", 0.55);
        look.opacity = Math.min(look.opacity, 0.8);
        break;
      case "mat_hot_glow":
        look.emissive = "#ff4a1c";
        look.emissiveIntensity = 0.6;
        look.halo = "#ff7a3d";
        look.pulse = true;
        break;
      case "mat_cold_frost":
        look.color = mix(look.color, "#cfeaff", 0.6);
        look.map = speckle("frost", "#ffffff");
        look.halo = "#bfe6ff";
        look.emissive = "#000000";
        look.pulse = false;
        break;
      case "mat_wet_sheen":
        look.color = mix(look.color, "#2f6fb0", 0.3);
        look.map = sheen(true);
        look.bumpMap = null;
        break;
      case "mat_dry":
        look.map = null;
        look.bumpMap = null;
        break;
      case "mat_rough_bumps":
        look.color = mix(look.color, "#8a6a4a", 0.25);
        look.bumpMap = noise();
        look.map = noise();
        break;
      case "mat_smooth_gloss":
        look.color = mix(look.color, "#ffffff", 0.2);
        look.map = sheen(false);
        look.bumpMap = null;
        break;
      case "mat_bouncy_rubber":
        look.color = "#ff7fb6";
        look.map = rings();
        break;
      case "mat_stiff":
        look.color = mix(look.color, MEMO.ink, 0.2);
        look.map = grid();
        break;
      case "mat_hard_stone":
        look.color = "#9c9aa6";
        look.map = speckle("stone", "#5f5b6b");
        look.wobble = false;
        break;
      case "mat_soft_foam":
        look.color = mix(look.color, "#ffd6ea", 0.5);
        look.map = null;
        look.wobble = true;
        break;
      case "mat_strong_steel":
        look.color = "#9fb4c7";
        look.opacity = Math.max(look.opacity, 0.85);
        look.map = bands();
        break;
      case "mat_weak_cracks":
        look.map = cracks();
        break;
      case "mat_fast_streaks":
        look.map = streaks();
        look.color = mix(look.color, MEMO.accent, 0.15);
        break;
      case "mat_slow_ripple":
        look.color = mix(look.color, "#a99be0", 0.4);
        break;
      default:
        // fx_* words (size, doors, fans, lifts) change geometry, not the material.
        break;
    }
  }
  return look;
}

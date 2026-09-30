/**
 * Pixel-art primitives for the gnome map. Everything is drawn at a low base
 * resolution (16 px per 1 m tile) on small canvases, then blitted and scaled up
 * with nearest-neighbour. No external art: every sprite is procedural.
 */

/** Base pixels per tile (1 m). */
export const T = 16;
/** 3/4 view: one metre of height is drawn as 0.6 tile. */
export const HF = 0.6;
/** Base pixels per metre of height. */
export const YPX = T * HF;

export const INK = "#3D2140";
export const ACCENT = "#FF5FA2";
export const ACCENT_LIGHT = "#FFB3D3";

export type G = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function ctxOf(c: HTMLCanvasElement): G {
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.imageSmoothingEnabled = false;
  return g;
}

export function rect(g: G, x: number, y: number, w: number, h: number, c: string) {
  const x0 = Math.round(x);
  const y0 = Math.round(y);
  const x1 = Math.round(x + w);
  const y1 = Math.round(y + h);
  if (x1 <= x0 || y1 <= y0) return;
  g.fillStyle = c;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
}

export function px(g: G, x: number, y: number, c: string) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/** Filled pixel ellipse inside the box [x, x+w) × [y, y+h). */
export function ellipse(g: G, x: number, y: number, w: number, h: number, c: string) {
  g.fillStyle = c;
  const rows = Math.round(h);
  for (let j = 0; j < rows; j++) {
    const dy = (j + 0.5 - rows / 2) / (rows / 2);
    const half = (w / 2) * Math.sqrt(Math.max(0, 1 - dy * dy));
    const x0 = Math.round(x + w / 2 - half);
    const x1 = Math.round(x + w / 2 + half);
    if (x1 > x0) g.fillRect(x0, Math.round(y) + j, x1 - x0, 1);
  }
}

/** Ellipse outline only (1 px), for rings. `dash` skips every other step. */
export function ellipseRing(g: G, cx: number, cy: number, rx: number, ry: number, c: string, dash = 0) {
  g.fillStyle = c;
  const n = Math.max(16, Math.round((rx + ry) * 3));
  const seen = new Set<number>();
  for (let i = 0; i < n; i++) {
    if (dash && Math.floor(i / dash) % 2) continue;
    const a = (i / n) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * rx);
    const y = Math.round(cy + Math.sin(a) * ry);
    const k = x * 4096 + y;
    if (seen.has(k)) continue;
    seen.add(k);
    g.fillRect(x, y, 1, 1);
  }
}

/** Bresenham line, `w` px thick. */
export function line(g: G, x0: number, y0: number, x1: number, y1: number, c: string, w = 1) {
  g.fillStyle = c;
  let x = Math.round(x0);
  let y = Math.round(y0);
  const xe = Math.round(x1);
  const ye = Math.round(y1);
  const dx = Math.abs(xe - x);
  const dy = -Math.abs(ye - y);
  const sx = x < xe ? 1 : -1;
  const sy = y < ye ? 1 : -1;
  let err = dx + dy;
  const o = Math.floor((w - 1) / 2);
  for (;;) {
    g.fillRect(x - o, y - o, w, w);
    if (x === xe && y === ye) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** Deterministic hash in [0, 1). */
export function hash(x: number, y: number, s = 0): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1). */
export function noise(x: number, y: number, seed = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Checkerboard dither of two colours over a box. */
export function dither(g: G, x: number, y: number, w: number, h: number, a: string, b: string) {
  rect(g, x, y, w, h, a);
  g.fillStyle = b;
  const x0 = Math.round(x);
  const y0 = Math.round(y);
  for (let j = 0; j < Math.round(h); j++) for (let i = (j + x0 + y0) & 1; i < Math.round(w); i += 2) g.fillRect(x0 + i, y0 + j, 1, 1);
}

const rgbCache = new Map<string, [number, number, number]>();
export function rgb(hex: string): [number, number, number] {
  let v = rgbCache.get(hex);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, v);
  }
  return v;
}

/**
 * The chunky dark outline: every transparent pixel touching an opaque one
 * (4-neighbourhood) turns ink. Run after drawing a sprite's fills.
 */
export function outline(c: HTMLCanvasElement, color = INK) {
  const g = ctxOf(c);
  const { width: w, height: h } = c;
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 127;
  const mark: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) mark.push(y * w + x);
    }
  const [r, gg, b] = rgb(color);
  for (const i of mark) {
    d[i * 4] = r;
    d[i * 4 + 1] = gg;
    d[i * 4 + 2] = b;
    d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

/** A 1 px ring around a sprite's silhouette, on a canvas 1 px larger on every side. */
export function halo(c: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const w = c.width;
  const h = c.height;
  const src = ctxOf(c).getImageData(0, 0, w, h).data;
  const out = makeCanvas(w + 2, h + 2);
  const g = ctxOf(out);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 127;
  g.fillStyle = color;
  for (let y = -1; y <= h; y++)
    for (let x = -1; x <= w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) g.fillRect(x + 1, y + 1, 1, 1);
    }
  return out;
}

/** Opaque-pixel mask of a canvas (for exact hit tests). */
export function maskOf(c: HTMLCanvasElement): Uint8Array {
  const d = ctxOf(c).getImageData(0, 0, c.width, c.height).data;
  const m = new Uint8Array(c.width * c.height);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 40 ? 1 : 0;
  return m;
}

/** A sprite from a character grid ('.' = empty) and a palette. */
export function fromGrid(rows: string[], pal: Record<string, string>): HTMLCanvasElement {
  const w = Math.max(...rows.map((r) => r.length));
  const c = makeCanvas(w, rows.length);
  const g = ctxOf(c);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (col) px(g, x, y, col);
    }
  });
  return c;
}

/** Copy of a canvas with 1 px transparent padding, outlined. */
export function outlined(c: HTMLCanvasElement, color = INK): HTMLCanvasElement {
  const out = makeCanvas(c.width + 2, c.height + 2);
  ctxOf(out).drawImage(c, 1, 1);
  outline(out, color);
  return out;
}

export function flipX(c: HTMLCanvasElement): HTMLCanvasElement {
  const out = makeCanvas(c.width, c.height);
  const g = ctxOf(out);
  g.translate(c.width, 0);
  g.scale(-1, 1);
  g.drawImage(c, 0, 0);
  return out;
}

export function flipY(c: HTMLCanvasElement): HTMLCanvasElement {
  const out = makeCanvas(c.width, c.height);
  const g = ctxOf(out);
  g.translate(0, c.height);
  g.scale(1, -1);
  g.drawImage(c, 0, 0);
  return out;
}

/** Rotate a grid a quarter turn counter-clockwise (the top ends up on the left). */
export function rotateGrid(rows: string[]): string[] {
  const w = Math.max(...rows.map((r) => r.length));
  const out: string[] = [];
  for (let y = 0; y < w; y++) {
    let s = "";
    for (let x = 0; x < rows.length; x++) s += rows[x][w - 1 - y] ?? ".";
    out.push(s);
  }
  return out;
}

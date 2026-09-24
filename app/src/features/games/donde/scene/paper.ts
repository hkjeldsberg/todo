import { CanvasTexture, ClampToEdgeWrapping, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/**
 * Every surface in the diorama is painted here at runtime on <canvas>: cardstock, kraft,
 * tile-grid floor paper, fabric, corrugated cardboard edges, polaroid sketches, facades.
 * No image assets. Textures are cached by key and shared across scenes.
 */

const cache = new Map<string, Texture>();

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number) => void;

/** Small deterministic PRNG so textures look the same on every load. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0;
    return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
  };
}

function hash(key: string): number {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function paint(key: string, w: number, h: number, draw: Draw, opts: { repeat?: boolean } = {}): Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, w, h, rng(hash(key)));
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = tex.wrapT = opts.repeat === false ? ClampToEdgeWrapping : RepeatWrapping;
  cache.set(key, tex);
  return tex;
}

/** A texture with its own repeat, sharing the painted canvas. */
export function tiled(base: Texture, rx: number, ry: number): Texture {
  const key = `${base.uuid}:${rx.toFixed(2)}:${ry.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const t = base.clone();
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  cache.set(key, t);
  return t;
}

// ───────────────────────────────────────────────────────────── paper helpers

/** Per-pixel grain + a few fibres: the thing that makes flat colour read as paper. */
function grain(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number, amount = 14, fibres = 0.5) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n * 0.9;
  }
  ctx.putImageData(img, 0, 0);
  const count = Math.floor((w * h) / 900 * fibres);
  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const len = 3 + rnd() * 10;
    const a = rnd() * Math.PI * 2;
    ctx.strokeStyle = rnd() > 0.5 ? "rgba(255,255,255,0.18)" : "rgba(60,40,20,0.10)";
    ctx.lineWidth = 0.6 + rnd() * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a + 0.6) * len * 0.5, y + Math.sin(a + 0.6) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
}

/** Soft blotches: uneven dye, the "handmade" look. */
function mottle(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number, strength = 0.05) {
  for (let i = 0; i < 18; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = (0.1 + rnd() * 0.3) * Math.max(w, h);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rnd() > 0.5;
    g.addColorStop(0, dark ? `rgba(80,50,20,${strength})` : `rgba(255,250,235,${strength})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

/** Plain cardstock in any colour. */
export function cardstock(color: string): Texture {
  return paint(`card:${color}`, 256, 256, (ctx, w, h, rnd) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    mottle(ctx, w, h, rnd, 0.05);
    grain(ctx, w, h, rnd, 12, 0.6);
  });
}

/** Brown kraft paper with visible fibres and specks. */
export function kraft(tone: "light" | "table" = "light"): Texture {
  const base = tone === "table" ? "#d4b690" : "#d3b48b";
  return paint(`kraft:${tone}`, 512, 512, (ctx, w, h, rnd) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    mottle(ctx, w, h, rnd, 0.08);
    grain(ctx, w, h, rnd, 18, 2.2);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = rnd() > 0.5 ? "rgba(90,55,25,0.35)" : "rgba(250,230,200,0.3)";
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
    }
  });
}

/** Woven fabric-look paper (sofa, curtains, bedding). */
export function fabric(color: string, weave = "rgba(255,255,255,0.10)"): Texture {
  return paint(`fabric:${color}`, 256, 256, (ctx, w, h, rnd) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 3) {
      ctx.strokeStyle = y % 6 === 0 ? weave : "rgba(0,0,0,0.06)";
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }
    for (let x = 0; x < w; x += 3) {
      ctx.strokeStyle = x % 6 === 0 ? "rgba(0,0,0,0.05)" : weave;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    mottle(ctx, w, h, rnd, 0.05);
    grain(ctx, w, h, rnd, 10, 0.3);
  });
}

/** Cream tile-grid floor paper; edges darkened a touch as baked ambient occlusion. */
export function tileFloor(): Texture {
  return paint("tilefloor", 1024, 1024, (ctx, w, h, rnd) => {
    ctx.fillStyle = "#f4eee2";
    ctx.fillRect(0, 0, w, h);
    const n = 20;
    const s = w / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = 244 - Math.floor(rnd() * 8);
        ctx.fillStyle = `rgb(${v},${v - 5},${v - 16})`;
        ctx.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
      }
    }
    ctx.strokeStyle = "rgba(150,140,125,0.55)";
    ctx.lineWidth = 1.6;
    for (let i = 0; i <= n; i++) {
      const jitter = () => (rnd() - 0.5) * 1.2;
      ctx.beginPath();
      ctx.moveTo(i * s + jitter(), 0);
      ctx.lineTo(i * s + jitter(), h);
      ctx.moveTo(0, i * s + jitter());
      ctx.lineTo(w, i * s + jitter());
      ctx.stroke();
    }
    grain(ctx, w, h, rnd, 10, 0.4);
    // Baked AO where the floor meets the (possible) walls.
    for (const [x0, y0, x1, y1] of [
      [0, 0, 0, 60],
      [0, 0, 60, 0],
      [0, h, 0, h - 60],
      [w, 0, w - 60, 0],
    ]) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, "rgba(90,60,30,0.22)");
      g.addColorStop(1, "rgba(90,60,30,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  });
}

/** Rug: cream field with a peach checker border, cut with slightly irregular edges. */
export function checkerRug(a = "#f3b99a", b = "#fbe3d3"): Texture {
  return paint(`rug:${a}`, 512, 512, (ctx, w, h, rnd) => {
    raggedClip(ctx, w, h, rnd, 5);
    ctx.fillStyle = "#f7efe3";
    ctx.fillRect(0, 0, w, h);
    const border = 64;
    const c = 16;
    for (let y = 0; y < h; y += c) {
      for (let x = 0; x < w; x += c) {
        const inBorder = x < border || y < border || x >= w - border || y >= h - border;
        const inInner = x >= border * 1.6 && y >= border * 1.6 && x < w - border * 1.6 && y < h - border * 1.6;
        if (!inBorder && inInner) continue;
        if (!inBorder) continue;
        ctx.fillStyle = ((x + y) / c) % 2 === 0 ? a : b;
        ctx.fillRect(x, y, c, c);
      }
    }
    grain(ctx, w, h, rnd, 12, 0.5);
  });
}

/** Clip the canvas to a rectangle with gently irregular, hand-cut edges. */
function raggedClip(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number, amp: number) {
  ctx.beginPath();
  const step = 24;
  ctx.moveTo(rnd() * amp, rnd() * amp);
  for (let x = step; x <= w; x += step) ctx.lineTo(Math.min(w, x) - rnd() * amp, rnd() * amp);
  for (let y = step; y <= h; y += step) ctx.lineTo(w - rnd() * amp, Math.min(h, y) - rnd() * amp);
  for (let x = w - step; x >= 0; x -= step) ctx.lineTo(Math.max(0, x) + rnd() * amp, h - rnd() * amp);
  for (let y = h - step; y >= 0; y -= step) ctx.lineTo(rnd() * amp, Math.max(0, y) + rnd() * amp);
  ctx.closePath();
  ctx.clip();
}

/** Wall paper: cream upper wall, kraft wainscot, a thin rail and a baseboard. */
export function wallPaper(upper = "#efe6d4", lower = "#d7b98c"): Texture {
  return paint(`wall:${upper}:${lower}`, 512, 512, (ctx, w, h, rnd) => {
    ctx.fillStyle = upper;
    ctx.fillRect(0, 0, w, h);
    mottle(ctx, w, h * 0.6, rnd, 0.06);
    const rail = h * 0.6;
    ctx.fillStyle = lower;
    ctx.fillRect(0, rail, w, h - rail);
    // Panel seams on the wainscot, like pasted card strips.
    ctx.strokeStyle = "rgba(120,85,45,0.35)";
    ctx.lineWidth = 2;
    for (let x = 0; x < w; x += w / 5) {
      ctx.beginPath();
      ctx.moveTo(x + (rnd() - 0.5) * 3, rail + 10);
      ctx.lineTo(x + (rnd() - 0.5) * 3, h - 22);
      ctx.stroke();
    }
    ctx.fillStyle = "#b99467";
    ctx.fillRect(0, rail - 5, w, 10);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(0, rail - 5, w, 2);
    ctx.fillStyle = "#a88158";
    ctx.fillRect(0, h - 20, w, 20);
    grain(ctx, w, h, rnd, 12, 0.7);
    // Soft AO along the floor line.
    const g = ctx.createLinearGradient(0, h, 0, h - 90);
    g.addColorStop(0, "rgba(70,45,20,0.28)");
    g.addColorStop(1, "rgba(70,45,20,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, h - 90, w, 90);
  });
}

/**
 * Corrugated-cardboard cut edge: two liners with the wavy flute between them.
 * Painted horizontally (u runs along the edge); repeat along the edge length.
 */
export function corrugated(): Texture {
  return paint("corrugated", 128, 64, (ctx, w, h, rnd) => {
    ctx.fillStyle = "#b8895a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#caa071";
    ctx.fillRect(0, 0, w, 10);
    ctx.fillRect(0, h - 10, w, 10);
    ctx.fillStyle = "#7d5733";
    ctx.fillRect(0, 10, w, h - 20);
    ctx.strokeStyle = "#d4aa78";
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const y = h / 2 + Math.sin((x / w) * Math.PI * 2 * 4) * (h / 2 - 13);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    grain(ctx, w, h, rnd, 16, 0.2);
  });
}

/** Cobblestone paper for the plaza. */
export function cobbles(): Texture {
  return paint("cobbles", 512, 512, (ctx, w, h, rnd) => {
    ctx.fillStyle = "#cdbfa8";
    ctx.fillRect(0, 0, w, h);
    const s = 32;
    for (let y = 0; y < h; y += s) {
      const off = (y / s) % 2 ? s / 2 : 0;
      for (let x = -s; x < w + s; x += s) {
        const v = 220 - Math.floor(rnd() * 26);
        ctx.fillStyle = `rgb(${v},${v - 10},${v - 26})`;
        ctx.beginPath();
        ctx.roundRect(x + off + 2, y + 2, s - 4, s - 4, 7);
        ctx.fill();
      }
    }
    grain(ctx, w, h, rnd, 14, 0.6);
  });
}

/** Terracotta tile paper for the café terrace. */
export function terraceTiles(): Texture {
  return paint("terrace", 256, 256, (ctx, w, h, rnd) => {
    ctx.fillStyle = "#e7c3a1";
    ctx.fillRect(0, 0, w, h);
    const s = 32;
    for (let y = 0; y < h; y += s) {
      for (let x = 0; x < w; x += s) {
        ctx.fillStyle = (x + y) / s % 2 === 0 ? "#e9b58f" : "#f4d9bd";
        ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
      }
    }
    grain(ctx, w, h, rnd, 12, 0.4);
  });
}

/** Map ground: pale green-grey paper. */
export function mapGround(): Texture {
  return paint("mapground", 512, 512, (ctx, w, h, rnd) => {
    ctx.fillStyle = "#e3e2c8";
    ctx.fillRect(0, 0, w, h);
    mottle(ctx, w, h, rnd, 0.07);
    grain(ctx, w, h, rnd, 14, 0.8);
  });
}

/** Street paper strip, with a dashed centre line along u. */
export function street(dashed = true, color = "#8f8a86"): Texture {
  return paint(`street:${dashed}:${color}`, 256, 64, (ctx, w, h, rnd) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(0, 2, w, 3);
    ctx.fillRect(0, h - 5, w, 3);
    if (dashed) {
      ctx.fillStyle = "#f7efdc";
      for (let x = 8; x < w; x += 48) ctx.fillRect(x, h / 2 - 2, 26, 4);
    }
    grain(ctx, w, h, rnd, 16, 0.4);
  });
}

/** Green felt-paper for the park. */
export function grass(): Texture {
  return paint("grass", 256, 256, (ctx, w, h, rnd) => {
    ctx.fillStyle = "#9cc27f";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      ctx.strokeStyle = rnd() > 0.5 ? "rgba(60,110,40,0.35)" : "rgba(210,235,170,0.35)";
      const x = rnd() * w;
      const y = rnd() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * 4, y - 3 - rnd() * 4);
      ctx.stroke();
    }
    grain(ctx, w, h, rnd, 10, 0.3);
  });
}

/** Window glass: warm light with a mullion cross and pencil frame. */
export function windowPane(): Texture {
  return paint("window", 256, 256, (ctx, w, h, rnd) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#fff6d8");
    g.addColorStop(1, "#f4d99c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Pencil-sketched hills outside, like the reference drawing.
    ctx.strokeStyle = "rgba(120,110,95,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.8);
    ctx.quadraticCurveTo(w * 0.25, h * 0.62, w * 0.5, h * 0.78);
    ctx.quadraticCurveTo(w * 0.75, h * 0.66, w, h * 0.76);
    ctx.stroke();
    grain(ctx, w, h, rnd, 8, 0.2);
  });
}

/** Sepia pencil sketch on a white polaroid frame (the loose photos on the craft table). */
export function polaroid(kind: "room" | "window" | "plant" | "chair", caption = ""): Texture {
  return paint(`polaroid:${kind}:${caption}`, 256, 300, (ctx, w, h, rnd) => {
    raggedClip(ctx, w, h, rnd, 2);
    ctx.fillStyle = "#fbf8f1";
    ctx.fillRect(0, 0, w, h);
    const px = 16;
    const pw = w - 32;
    const ph = pw;
    const photo = ctx.createLinearGradient(0, px, 0, px + ph);
    photo.addColorStop(0, "#efe2c6");
    photo.addColorStop(1, "#d9c29a");
    ctx.fillStyle = photo;
    ctx.fillRect(px, px, pw, ph);
    ctx.save();
    ctx.translate(px, px);
    ctx.strokeStyle = "rgba(70,50,30,0.75)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    const line = (pts: number[][]) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const jx = x * pw + (rnd() - 0.5) * 2;
        const jy = y * ph + (rnd() - 0.5) * 2;
        if (i === 0) ctx.moveTo(jx, jy);
        else ctx.lineTo(jx, jy);
      });
      ctx.stroke();
    };
    if (kind === "room") {
      line([[0, 0.55], [0.5, 0.75], [1, 0.55]]);
      line([[0.5, 0.75], [0.5, 1]]);
      line([[0.15, 0.62], [0.15, 0.45], [0.42, 0.55], [0.42, 0.72]]);
      line([[0.6, 0.2], [0.85, 0.12], [0.85, 0.42], [0.6, 0.5], [0.6, 0.2]]);
      line([[0.725, 0.16], [0.725, 0.46]]);
    } else if (kind === "window") {
      line([[0.25, 0.15], [0.75, 0.15], [0.75, 0.75], [0.25, 0.75], [0.25, 0.15]]);
      line([[0.5, 0.15], [0.5, 0.75]]);
      line([[0.25, 0.45], [0.75, 0.45]]);
      line([[0.15, 0.1], [0.2, 0.9]]);
      line([[0.85, 0.1], [0.8, 0.9]]);
      ctx.fillStyle = "rgba(255,240,200,0.5)";
      ctx.fillRect(0.26 * pw, 0.16 * ph, 0.48 * pw, 0.58 * ph);
    } else if (kind === "plant") {
      line([[0.4, 0.95], [0.6, 0.95], [0.64, 0.7], [0.36, 0.7], [0.4, 0.95]]);
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.4;
        line([[0.5, 0.7], [0.5 + Math.cos(a) * 0.35, 0.7 + Math.sin(a) * 0.5]]);
      }
    } else {
      line([[0.3, 0.9], [0.3, 0.5], [0.7, 0.5], [0.7, 0.9]]);
      line([[0.3, 0.5], [0.3, 0.15], [0.7, 0.15], [0.7, 0.5]]);
      line([[0.25, 0.55], [0.75, 0.55]]);
    }
    ctx.restore();
    grain(ctx, w, h, rnd, 10, 0.3);
    if (caption) {
      ctx.fillStyle = "#5a4a3a";
      ctx.font = "italic 22px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(caption, w / 2, h - 14);
    }
  });
}

/** Loose pencil sketch sheet (flutters on the table). */
export function sketchSheet(): Texture {
  return paint("sketch", 256, 320, (ctx, w, h, rnd) => {
    raggedClip(ctx, w, h, rnd, 3);
    ctx.fillStyle = "#fdfbf5";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(90,90,110,0.25)";
    for (let y = 30; y < h; y += 18) {
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(w - 10, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(60,50,40,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 220);
    ctx.lineTo(128, 260);
    ctx.lineTo(216, 220);
    ctx.lineTo(128, 180);
    ctx.closePath();
    ctx.moveTo(40, 220);
    ctx.lineTo(40, 110);
    ctx.lineTo(128, 70);
    ctx.lineTo(128, 180);
    ctx.moveTo(128, 70);
    ctx.lineTo(216, 110);
    ctx.lineTo(216, 220);
    ctx.stroke();
    grain(ctx, w, h, rnd, 8, 0.3);
  });
}

/** Building facade: coloured card with windows, a door and an optional sign. */
export function facade(color: string, sign = "", floors = 2): Texture {
  return paint(`facade:${color}:${sign}:${floors}`, 256, 256, (ctx, w, h, rnd) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    mottle(ctx, w, h, rnd, 0.06);
    const rows = floors;
    const top = sign ? 60 : 24;
    const rowH = (h - top - 70) / Math.max(1, rows - 1 || 1);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 3; c++) {
        const x = 30 + c * 76;
        const y = top + r * Math.min(rowH, 64);
        if (r === rows - 1 && c === 1) continue;
        ctx.fillStyle = "#fff3cf";
        ctx.fillRect(x, y, 44, 40);
        ctx.strokeStyle = "rgba(60,40,30,0.6)";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, 44, 40);
        ctx.beginPath();
        ctx.moveTo(x + 22, y);
        ctx.lineTo(x + 22, y + 40);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#6b4a36";
    ctx.fillRect(w / 2 - 22, h - 70, 44, 70);
    if (sign) {
      ctx.fillStyle = "#fbf6ea";
      ctx.fillRect(20, 12, w - 40, 38);
      ctx.fillStyle = "#3d2140";
      ctx.font = "bold 26px 'Baloo 2', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sign, w / 2, 32);
    }
    grain(ctx, w, h, rnd, 12, 0.5);
  });
}

/** Soft round shadow (baked contact AO under furniture). */
export function blob(): Texture {
  return paint(
    "blob",
    128,
    128,
    (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(40,25,10,0.55)");
      g.addColorStop(0.55, "rgba(40,25,10,0.25)");
      g.addColorStop(1, "rgba(40,25,10,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    { repeat: false },
  );
}

/** Masking tape strip with torn ends (the tape slap on placed pieces). */
export function tape(): Texture {
  return paint(
    "tape",
    128,
    48,
    (ctx, w, h, rnd) => {
      ctx.beginPath();
      ctx.moveTo(0, 2);
      for (let y = 0; y <= h; y += 6) ctx.lineTo(rnd() * 5, y);
      ctx.lineTo(w, h);
      for (let y = h; y >= 0; y -= 6) ctx.lineTo(w - rnd() * 5, y);
      ctx.closePath();
      ctx.fillStyle = "rgba(240,226,184,0.92)";
      ctx.fill();
      ctx.globalCompositeOperation = "source-atop";
      for (let x = 0; x < w; x += 5) {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(x, 0, 2, h);
      }
      grain(ctx, w, h, rnd, 10, 0.1);
    },
    { repeat: false },
  );
}

/** Pink ring decal for drop zones (memo accent #FF5FA2). */
export function zoneDecal(): Texture {
  return paint(
    "zone",
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = "rgba(255,95,162,0.28)";
      ctx.beginPath();
      ctx.roundRect(8, 8, w - 16, h - 16, 26);
      ctx.fill();
      ctx.strokeStyle = "#ff5fa2";
      ctx.lineWidth = 7;
      ctx.setLineDash([16, 10]);
      ctx.stroke();
    },
    { repeat: false },
  );
}

/** Soft puff for mug steam and fountain spray. */
export function puff(): Texture {
  return paint(
    "puff",
    64,
    64,
    (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(255,255,255,0.8)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    { repeat: false },
  );
}

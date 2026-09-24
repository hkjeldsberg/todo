"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { SIGN_FONTS } from "../fonts";
import { MEMO } from "../lib/color";
import type { SignStyle } from "../lib/islands";

export interface SignOptions {
  text: string;
  style: SignStyle | "caption" | "door";
  width: number;
  height: number;
  ink?: string;
  paper?: string;
  accent?: string;
  maxFont?: number;
}

const FONTS: Record<SignOptions["style"], string> = {
  graffiti: SIGN_FONTS.marker,
  neon: SIGN_FONTS.comic,
  stone: SIGN_FONTS.carved,
  poster: SIGN_FONTS.comic,
  caption: SIGN_FONTS.comic,
  door: SIGN_FONTS.comic,
};

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function draw(o: SignOptions, family: string): HTMLCanvasElement {
  const scale = 256; // px per world unit
  const W = Math.round(o.width * scale);
  const H = Math.round(o.height * scale);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const ink = o.ink ?? MEMO.ink;
  const paper = o.paper ?? MEMO.page;
  const accent = o.accent ?? "#d62828";
  const pad = W * 0.06;

  // Background per style
  if (o.style === "neon") {
    ctx.fillStyle = "#0d0d12";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, W - 28, H - 28);
  } else if (o.style === "stone") {
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
      ctx.fillRect(Math.random() * W, Math.random() * H, 3 + Math.random() * 14, 2 + Math.random() * 6);
    }
    ctx.strokeStyle = ink;
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, W - 12, H - 12);
  } else if (o.style === "graffiti") {
    ctx.clearRect(0, 0, W, H); // painted straight onto the wall
    ctx.fillStyle = "rgba(0,0,0,0)";
  } else if (o.style === "caption") {
    ctx.fillStyle = "#fff6c8";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, W - 14, H - 14);
  } else {
    // poster / door
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, W - 12, H - 12);
    // halftone corner
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let y = 0; y < H * 0.5; y += 18)
      for (let x = 0; x < W * 0.35; x += 18) {
        const r = 6 * (1 - (x / (W * 0.35) + y / (H * 0.5)) / 2);
        if (r > 0.5) {
          ctx.beginPath();
          ctx.arc(x + 12, y + 12, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
  }

  // Fit text: largest font whose wrapped lines fit
  const maxW = W - pad * 2;
  let size = o.maxFont ?? H * 0.4;
  let lines: string[] = [];
  for (; size > 12; size *= 0.92) {
    ctx.font = `${size}px ${family}`;
    lines = wrap(ctx, o.text, maxW);
    if (lines.length * size * 1.1 <= H - pad * 2 && lines.every((l) => ctx.measureText(l).width <= maxW)) break;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lh = size * 1.1;
  const y0 = H / 2 - ((lines.length - 1) * lh) / 2;

  lines.forEach((l, i) => {
    const y = y0 + i * lh;
    if (o.style === "neon") {
      ctx.shadowColor = accent;
      ctx.shadowBlur = size * 0.5;
      ctx.fillStyle = "#fff";
      ctx.fillText(l, W / 2, y);
      ctx.shadowBlur = size * 0.2;
      ctx.fillText(l, W / 2, y);
      ctx.shadowBlur = 0;
    } else if (o.style === "graffiti") {
      ctx.lineJoin = "round";
      ctx.lineWidth = size * 0.22;
      ctx.strokeStyle = ink;
      ctx.strokeText(l, W / 2, y);
      ctx.fillStyle = accent;
      ctx.fillText(l, W / 2, y);
      // drips
      ctx.fillStyle = accent;
      const tw = ctx.measureText(l).width;
      for (let d = 0; d < 5; d++) {
        const x = W / 2 - tw / 2 + Math.random() * tw;
        ctx.fillRect(x, y + size * 0.3, 5, size * (0.2 + Math.random() * 0.5));
      }
    } else if (o.style === "stone") {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillText(l, W / 2 + 3, y + 3);
      ctx.fillStyle = ink;
      ctx.fillText(l, W / 2, y);
    } else {
      ctx.fillStyle = ink;
      ctx.fillText(l, W / 2, y);
    }
  });
  return c;
}

let fontsReady: Promise<void> | null = null;
function waitFonts(): Promise<void> {
  fontsReady ??= Promise.all([...new Set(Object.values(FONTS))].map((f) => document.fonts.load(`64px ${f}`))).then(
    () => undefined,
    () => undefined,
  );
  return fontsReady;
}

/** Canvas-rendered diegetic typography (graffiti, neon, carved stone, posters). */
export function useSignTexture(o: SignOptions): THREE.CanvasTexture | null {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  const key = JSON.stringify(o);
  useEffect(() => {
    let alive = true;
    let t: THREE.CanvasTexture | null = null;
    waitFonts().then(() => {
      if (!alive) return;
      t = new THREE.CanvasTexture(draw(o, FONTS[o.style]));
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      setTex(t);
    });
    return () => {
      alive = false;
      t?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return tex;
}

/** memo "Sticker Tabs" colours the 3D scene borrows. */
export const MEMO = {
  ink: "#3d2140",
  accent: "#ff5fa2",
  shell: "#ffe9b8",
  page: "#fff3d6",
} as const;

const SATURATION = 0.82;
const WARM_MIX = 0.1;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/**
 * Pulls a biome colour toward the memo palette: a little less saturated, and a
 * tenth of the way toward the warm shell yellow. Pure, so palettes stay data.
 */
export function warm(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const grey = 0.299 * r + 0.587 * g + 0.114 * b;
  const desat: [number, number, number] = [
    grey + (r - grey) * SATURATION,
    grey + (g - grey) * SATURATION,
    grey + (b - grey) * SATURATION,
  ];
  const [sr, sg, sb] = hexToRgb(MEMO.shell);
  return rgbToHex([
    desat[0] + (sr - desat[0]) * WARM_MIX,
    desat[1] + (sg - desat[1]) * WARM_MIX,
    desat[2] + (sb - desat[2]) * WARM_MIX,
  ]);
}

/** Ink or white, whichever reads better on `hex` (for island number badges). */
export function textOn(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 170 ? MEMO.ink : "#ffffff";
}

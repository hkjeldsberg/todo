import type { Inventory } from "./inventory";

/** PRD §3.1. Suggestions are free: they only change the base points. */
export const POINTS = {
  typed: 15,
  chip: 5,
  newInAlbum: 15,
  b1: 5,
} as const;

export type InputMode = "typed" | "chip";

export interface ScoreLine {
  label: string;
  points: number;
}

export interface Score {
  total: number;
  lines: ScoreLine[];
  /** Expression ids unlocked by this answer. */
  unlocked: string[];
}

/**
 * Points for one true answer. `expressions` are the ids said (regional ids
 * count on their own: acá is a separate album sticker from aquí).
 */
export function scoreAnswer(inv: Inventory, mode: InputMode, expressions: string[], album: ReadonlySet<string>): Score {
  const lines: ScoreLine[] = [{ label: mode === "typed" ? "Dicho de memoria" : "Con sugerencias", points: mode === "typed" ? POINTS.typed : POINTS.chip }];
  const unlocked: string[] = [];
  for (const id of new Set(expressions)) {
    const e = inv.get(id);
    if (!album.has(id)) {
      unlocked.push(id);
      lines.push({ label: `Nueva en el álbum: ${e.es}`, points: POINTS.newInAlbum });
    }
    if (e.level === "B1") lines.push({ label: `B1: ${e.es}`, points: POINTS.b1 });
  }
  return { total: lines.reduce((n, l) => n + l.points, 0), lines, unlocked };
}

export interface RoomResult {
  spot: string;
  mode: InputMode;
  expressions: string[];
}

/**
 * Stars for a finished dungeon: one for clearing it, one for a different
 * expression in every room, one for answering every room from memory.
 */
export function starsFor(rooms: RoomResult[]): number {
  if (rooms.length === 0) return 0;
  let stars = 1;
  const firsts = rooms.map((r) => r.expressions[0]);
  if (new Set(firsts).size === rooms.length) stars++;
  if (rooms.every((r) => r.mode === "typed")) stars++;
  return stars;
}

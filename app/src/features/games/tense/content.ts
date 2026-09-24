import { z } from "zod";
import bundled from "@/content/tense.json";
import type { Room, TenseContent } from "./types";

/**
 * Pure content shaping, shared by the server loader (Supabase rows or the
 * bundled JSON) and the tests. No server-only imports here.
 */

const optionSchema = z.object({
  form: z.string().min(1),
  type: z.enum(["imperfect", "preterite"]),
  correct: z.boolean(),
});

export const puzzleSchema = z.object({
  id: z.string().min(1),
  order_index: z.number().int(),
  scene_object: z.string().min(1),
  sentence_pre: z.string(),
  sentence_post: z.string(),
  verb_base: z.string().min(1),
  options: z.array(optionSchema).min(2),
  rule_feedback: z.string().min(1),
  translation: z.string().nullable(),
  anim_trigger: z.string().regex(/^anim_\w+_(loop|once)$/),
});

export const roomRowSchema = z.object({
  id: z.string().min(1),
  order_index: z.number().int(),
  title: z.string().min(1),
  subtitle: z.string(),
  focus: z.string(),
});

const roomSchema = roomRowSchema.extend({ puzzles: z.array(puzzleSchema) });

export const contentSchema = z.object({ rooms: z.array(roomSchema).min(1) });

const byOrder = (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index;

/** Validates and sorts rooms and their puzzles. Throws on malformed content. */
export function shapeContent(raw: unknown): TenseContent {
  const { rooms } = contentSchema.parse(raw);
  return {
    rooms: rooms
      .map((r): Room => ({ ...r, puzzles: r.puzzles.slice().sort(byOrder) }))
      .sort(byOrder),
  };
}

/** Joins flat tense_rooms / tense_puzzles rows (puzzles carry room_id) into content. */
export function contentFromRows(roomRows: unknown[], puzzleRows: unknown[]): TenseContent {
  const puzzles = z.array(puzzleSchema.extend({ room_id: z.string() })).parse(puzzleRows);
  const rooms = z.array(roomRowSchema).parse(roomRows);
  return shapeContent({
    rooms: rooms.map((r) => ({
      ...r,
      // shapeContent re-parses each puzzle, which strips room_id.
      puzzles: puzzles.filter((p) => p.room_id === r.id),
    })),
  });
}

/** content/tense.json, validated. The single source of truth for learning content. */
export function bundledContent(): TenseContent {
  return shapeContent(bundled);
}

export function findPuzzle(content: TenseContent, puzzleId: string) {
  for (const room of content.rooms) {
    const puzzle = room.puzzles.find((p) => p.id === puzzleId);
    if (puzzle) return { room, puzzle };
  }
  return null;
}

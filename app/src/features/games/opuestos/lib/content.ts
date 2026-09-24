import { z } from "zod";
import bundled from "@/content/opuestos.json";
import { CATEGORIES, ENGINE_TARGETS, OBJECT_KINDS, type Level, type OpuestosContent, type Word } from "./types";

/**
 * Pure content shaping for the server loader (Supabase rows or the bundled
 * JSON) and the tests. No server-only imports here.
 */

const vec2 = z.tuple([z.number(), z.number()]);
const rect = z.tuple([z.number(), z.number(), z.number(), z.number()]);

export const wordSchema = z.object({
  id: z.string().regex(/^[a-z]+$/),
  word: z.string().min(1),
  antonym_id: z.string().min(1),
  engine_target: z.enum(ENGINE_TARGETS),
  value_modifier: z.number(),
  shader_trigger: z.string().regex(/^(mat|fx)_[a-z_]+$/),
  translation: z.string().min(1),
  category: z.enum(CATEGORIES),
  sort: z.number().int(),
});

const objectSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_]+$/),
    kind: z.enum(OBJECT_KINDS),
    noun: z.string().min(1).optional(),
    gender: z.enum(["m", "f"]).optional(),
    noun_en: z.string().min(1).optional(),
    pos: vec2,
    size: vec2.optional(),
    angle: z.number().optional(),
    anchor: z.enum(["left", "right", "bottom", "center"]).optional(),
    held: z.boolean().optional(),
    density: z.number().positive().optional(),
    strength: z.number().positive().optional(),
    zone: rect.optional(),
    dir: vec2.optional(),
    force: z.number().optional(),
    on: z.boolean().optional(),
    open: z.boolean().optional(),
    frozen: z.boolean().optional(),
    travel: vec2.optional(),
    start: z.enum(["up", "down"]).optional(),
    links: z.string().optional(),
    threshold: z.number().positive().optional(),
    opening: z.number().positive().optional(),
    push: vec2.optional(),
    color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
    target: z.boolean().optional(),
  })
  .superRefine((o, ctx) => {
    const need = (field: keyof typeof o, why: string) => {
      if (o[field] === undefined) ctx.addIssue({ code: "custom", message: `${o.id} (${o.kind}) needs ${field}: ${why}` });
    };
    if (o.kind !== "water" && o.kind !== "fan") need("size", "every solid has a size");
    if (o.kind === "water" || o.kind === "fan") need("zone", "the pool / air column");
    if (o.kind === "fan") need("dir", "which way it blows");
    if (o.kind === "lift") need("travel", "its down and up heights");
    if (o.kind === "pipe") need("opening", "the inner height");
    if (o.kind === "plate") need("links", "the door it opens");
    if (o.kind === "ball" && o.size && o.size[0] !== o.size[1]) {
      ctx.addIssue({ code: "custom", message: `${o.id}: a ball's size is its diameter twice` });
    }
  });

const layoutSchema = z.object({
  objects: z.array(objectSchema).min(1),
  goal: z.object({ object: z.string(), zone: rect }),
  solutions: z
    .array(
      z.object({
        steps: z.array(z.object({ object: z.string(), word: z.string(), after: z.number().optional() })).min(1),
        note: z.string().min(1),
      }),
    )
    .min(1),
  view: rect.optional(),
});

export const levelSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  sort: z.number().int(),
  title_es: z.string().min(1),
  title_en: z.string().min(1),
  clue_es: z.string().min(1),
  clue_en: z.string().min(1),
  words: z.array(z.string()).min(2),
  layout: layoutSchema,
});

export const contentSchema = z.object({
  words: z.array(wordSchema).min(2),
  levels: z.array(levelSchema).min(1),
});

/** Validates, sorts, and checks cross-references. Throws on malformed content. */
export function shapeContent(raw: unknown): OpuestosContent {
  const parsed = contentSchema.parse(raw) as OpuestosContent;
  const words = parsed.words.slice().sort((a, b) => a.sort - b.sort);
  const levels = parsed.levels.slice().sort((a, b) => a.sort - b.sort);
  const ids = new Set(words.map((w) => w.id));
  for (const w of words) {
    if (!ids.has(w.antonym_id)) throw new Error(`word ${w.id}: antonym ${w.antonym_id} is missing`);
  }
  for (const l of levels) {
    for (const w of l.words) if (!ids.has(w)) throw new Error(`level ${l.id}: unknown word ${w}`);
    const objects = new Set(l.layout.objects.map((o) => o.id));
    if (!objects.has(l.layout.goal.object)) throw new Error(`level ${l.id}: goal object ${l.layout.goal.object} missing`);
  }
  return { words, levels };
}

/** Flat todo.opuestos_words + todo.opuestos_levels rows → content. */
export function contentFromRows(wordRows: unknown[], levelRows: unknown[]): OpuestosContent {
  return shapeContent({ words: wordRows, levels: levelRows });
}

/** content/opuestos.json, validated. The single source of truth for this game. */
export function bundledContent(): OpuestosContent {
  return shapeContent(bundled);
}

export function wordMap(content: OpuestosContent): Map<string, Word> {
  return new Map(content.words.map((w) => [w.id, w]));
}

export function findLevel(content: OpuestosContent, id: string): Level | undefined {
  return content.levels.find((l) => l.id === id);
}

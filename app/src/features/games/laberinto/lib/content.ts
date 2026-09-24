import { z } from "zod";
import { ISLAND_ZONES, type LaberintoContent, type LaberintoProgress } from "./types";

const doorSchema = z.object({
  text: z.string().min(1),
  correct: z.boolean(),
  tense: z.enum(["imperfect", "preterite", "trap"]),
  feedback: z.string(),
});

const nodeSchema = z.object({
  node_id: z.string().min(1),
  island_zone: z.enum(ISLAND_ZONES),
  seq: z.number().int(),
  ambient_prompt: z.string().min(1),
  doors: z.array(doorSchema).length(3),
  feedback_imperfect: z.string().nullable(),
  next_node_id: z.string().nullable(),
});

/** Validates rows from `todo.laberinto_nodes` (or the bundled JSON). */
export const contentSchema = z.array(nodeSchema).min(1);

export function parseContent(rows: unknown): LaberintoContent {
  return contentSchema.parse(rows);
}

/** Tolerant read of saved progress: anything malformed becomes a fresh start. */
export function parseProgress(raw: unknown): Partial<LaberintoProgress> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  return {
    nodeId: typeof r.nodeId === "string" ? r.nodeId : undefined,
    solved: Array.isArray(r.solved) ? r.solved.filter((s): s is string => typeof s === "string") : [],
    mistakes: typeof r.mistakes === "number" && Number.isFinite(r.mistakes) ? r.mistakes : 0,
  };
}

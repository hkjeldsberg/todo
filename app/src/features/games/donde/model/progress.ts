import { z } from "zod";

/** Saved game state (todo.game_progress.state for slug "donde"). */
export const progressSchema = z.object({
  v: z.literal(1).default(1),
  page: z.number().int().min(0).default(0),
  done: z.array(z.string()).default([]),
  /** pieceId → the zone and slot it is taped into. */
  placed: z.record(z.string(), z.object({ zone: z.string(), slot: z.number().int().min(0) })).default({}),
  /** Zones the learner found (lifted covers, tapped objects, pins). */
  found: z.array(z.string()).default([]),
  /** Build task id → Dymo tokens in each slot. */
  fills: z.record(z.string(), z.array(z.string().nullable())).default({}),
});
export type Progress = z.infer<typeof progressSchema>;

export const EMPTY_PROGRESS: Progress = { v: 1, page: 0, done: [], placed: {}, found: [], fills: {} };

/** Anything from the DB → a usable state. Unknown shapes start fresh instead of crashing. */
export function parseProgress(raw: unknown): Progress {
  const parsed = progressSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : EMPTY_PROGRESS;
}

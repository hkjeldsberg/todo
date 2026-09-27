import { z } from "zod";

/** What the game remembers between visits: stories opened, and the last one. */
export const ProgressSchema = z.object({
  read: z.array(z.string()).default([]),
  last: z.string().nullable().default(null),
});
export type CuentosProgress = z.infer<typeof ProgressSchema>;

export function parseProgress(raw: unknown): CuentosProgress {
  const parsed = ProgressSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : { read: [], last: null };
}

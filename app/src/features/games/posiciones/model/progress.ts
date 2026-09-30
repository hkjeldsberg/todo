import { z } from "zod";

/** Saved server-side through GameProps.saveProgress (no localStorage). */

const albumEntry = z.object({
  /** The sentence the player said when it first counted. */
  sentence: z.string(),
  scene: z.string(),
  at: z.string(),
});

const progressSchema = z.object({
  v: z.literal(2).catch(2),
  album: z.record(z.string(), albumEntry).catch({}),
  stars: z.record(z.string(), z.number().int().min(0).max(3)).catch({}),
  best: z.record(z.string(), z.number().int().min(0)).catch({}),
  plays: z.number().int().min(0).catch(0),
  prefs: z
    .object({
      voiceLang: z.enum(["es-ES", "es-419"]).catch("es-419"),
      labels: z.boolean().catch(true),
    })
    .catch({ voiceLang: "es-419", labels: true }),
});

export type Progress = z.infer<typeof progressSchema>;
export type AlbumEntry = z.infer<typeof albumEntry>;

export const emptyProgress = (): Progress => ({
  v: 2,
  album: {},
  stars: {},
  best: {},
  plays: 0,
  prefs: { voiceLang: "es-419", labels: true },
});

/** Accepts whatever the host stored (or null) and returns usable progress. */
export function parseProgress(raw: unknown): Progress {
  if (raw === null || typeof raw !== "object") return emptyProgress();
  const parsed = progressSchema.safeParse(raw);
  if (!parsed.success) return emptyProgress();
  // v1 saves stored "es-ES" only because it was the default then; LatAm is the default now.
  if ((raw as { v?: unknown }).v !== 2) return { ...parsed.data, prefs: { ...parsed.data.prefs, voiceLang: "es-419" } };
  return parsed.data;
}

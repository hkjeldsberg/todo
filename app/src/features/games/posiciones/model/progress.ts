import { z } from "zod";

/** Saved server-side through GameProps.saveProgress (no localStorage). */

const albumEntry = z.object({
  /** The sentence the player said when it first counted. */
  sentence: z.string(),
  scene: z.string(),
  at: z.string(),
});

const progressSchema = z.object({
  v: z.literal(1).catch(1),
  album: z.record(z.string(), albumEntry).catch({}),
  stars: z.record(z.string(), z.number().int().min(0).max(3)).catch({}),
  best: z.record(z.string(), z.number().int().min(0)).catch({}),
  plays: z.number().int().min(0).catch(0),
  prefs: z
    .object({
      suggestions: z.boolean().catch(false),
      voiceLang: z.enum(["es-ES", "es-419"]).catch("es-ES"),
      labels: z.boolean().catch(true),
    })
    .catch({ suggestions: false, voiceLang: "es-ES", labels: true }),
});

export type Progress = z.infer<typeof progressSchema>;
export type AlbumEntry = z.infer<typeof albumEntry>;

export const emptyProgress = (): Progress => ({
  v: 1,
  album: {},
  stars: {},
  best: {},
  plays: 0,
  prefs: { suggestions: false, voiceLang: "es-ES", labels: true },
});

/** Accepts whatever the host stored (or null) and returns usable progress. */
export function parseProgress(raw: unknown): Progress {
  if (raw === null || typeof raw !== "object") return emptyProgress();
  const parsed = progressSchema.safeParse(raw);
  return parsed.success ? parsed.data : emptyProgress();
}

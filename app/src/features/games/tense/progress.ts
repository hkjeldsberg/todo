import { z } from "zod";

/** Player progress, saved server-side through GameProps.saveProgress. */
export interface Progress {
  solved: string[]; // puzzle ids
  completedRooms: string[]; // room ids
  mistakes: Record<string, number>; // puzzle id → wrong answers
  lastRoom: string | null;
}

export const emptyProgress = (): Progress => ({ solved: [], completedRooms: [], mistakes: {}, lastRoom: null });

const progressSchema = z.object({
  solved: z.array(z.string()).catch([]),
  completedRooms: z.array(z.string()).catch([]),
  mistakes: z.record(z.string(), z.number()).catch({}),
  lastRoom: z.string().nullable().catch(null),
});

/** Accepts whatever the host stored (or null) and returns a usable Progress. */
export function parseProgress(raw: unknown): Progress {
  const parsed = progressSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : emptyProgress();
}

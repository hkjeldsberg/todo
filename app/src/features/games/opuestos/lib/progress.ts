import { z } from "zod";
import type { OpuestosProgress } from "./types";

export const emptyProgress = (): OpuestosProgress => ({ solved: [], discovered: [], found: {}, lastLevel: null });

const ids = z.array(z.string()).catch([]);
const progressSchema = z.object({
  solved: ids,
  discovered: ids,
  found: z.record(z.string(), z.array(z.number().int().nonnegative())).catch({}),
  lastLevel: z.string().nullable().catch(null),
});

/** Accepts whatever the host stored (or null) and returns usable progress. */
export function parseProgress(raw: unknown): OpuestosProgress {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyProgress();
  const parsed = progressSchema.safeParse(raw);
  if (!parsed.success) return emptyProgress();
  const unique = (xs: string[]) => [...new Set(xs)];
  return { ...parsed.data, solved: unique(parsed.data.solved), discovered: unique(parsed.data.discovered) };
}

/** Pure progress updates, so Game.tsx and the tests share them. */
export function withSolved(p: OpuestosProgress, levelId: string, words: string[], solution: number | null): OpuestosProgress {
  const found = p.found[levelId] ?? [];
  return {
    ...p,
    solved: p.solved.includes(levelId) ? p.solved : [...p.solved, levelId],
    discovered: [...new Set([...p.discovered, ...words])],
    found:
      solution === null || found.includes(solution)
        ? p.found
        : { ...p.found, [levelId]: [...found, solution].sort((a, b) => a - b) },
    lastLevel: levelId,
  };
}

export function withDiscovered(p: OpuestosProgress, word: string): OpuestosProgress {
  return p.discovered.includes(word) ? p : { ...p, discovered: [...p.discovered, word] };
}

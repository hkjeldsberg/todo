import { z } from "zod";
import type { WasContent, WasProgress } from "./types";

export const emptyProgress = (): WasProgress => ({ solved: [], completed: [], lastPage: null });

const ids = z.array(z.string()).catch([]);
const progressSchema = z.object({
  solved: ids,
  completed: ids,
  lastPage: z.string().nullable().catch(null),
});

/** Accepts whatever the host stored (or null) and returns usable progress. */
export function parseProgress(raw: unknown): WasProgress {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyProgress();
  const parsed = progressSchema.safeParse(raw);
  if (!parsed.success) return emptyProgress();
  const unique = (xs: string[]) => [...new Set(xs)];
  return { ...parsed.data, solved: unique(parsed.data.solved), completed: unique(parsed.data.completed) };
}

/** Marks a panel solved, and its page completed once every panel on it is. */
export function withSolved(p: WasProgress, content: WasContent, panelId: string): WasProgress {
  const page = content.pages.find((pg) => pg.panels.some((panel) => panel.id === panelId));
  if (!page) return p;
  const solved = p.solved.includes(panelId) ? p.solved : [...p.solved, panelId];
  const done = page.panels.every((panel) => solved.includes(panel.id));
  return {
    solved,
    completed: done && !p.completed.includes(page.id) ? [...p.completed, page.id] : p.completed,
    lastPage: page.id,
  };
}

/** "Play again": forget a page's solved panels (it stays completed). */
export function withPageReset(p: WasProgress, content: WasContent, pageId: string): WasProgress {
  const page = content.pages.find((pg) => pg.id === pageId);
  if (!page) return p;
  const panelIds = new Set(page.panels.map((panel) => panel.id));
  return { ...p, solved: p.solved.filter((id) => !panelIds.has(id)), lastPage: pageId };
}

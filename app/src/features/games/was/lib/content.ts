import { z } from "zod";
import bundled from "@/content/was.json";
import { PANEL_TYPES, VERBS, type ComicPage, type Panel, type WasContent } from "./types";

/**
 * Pure content shaping for the server loader (Supabase rows or the bundled
 * JSON) and the tests. No server-only imports here.
 */

export const panelSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  page_id: z.string().regex(/^[a-z0-9_]+$/),
  panel_order: z.number().int().min(1),
  panel_type: z.enum(PANEL_TYPES),
  sentence_pre: z.string(),
  sentence_post: z.string(),
  correct_verb: z.enum(VERBS),
  rule_feedback: z.string().min(1),
  asset_sketch: z.string().min(1),
  asset_color: z.string().min(1),
});

const contentSchema = z.object({ panels: z.array(panelSchema).min(1) });

/** `el_robo_01` → `El Robo` */
export function pageTitle(pageId: string): string {
  return pageId
    .replace(/_\d+$/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Validates flat panel rows and groups them into pages (ordered by page id, then panel_order). */
export function shapeContent(raw: unknown): WasContent {
  const { panels } = contentSchema.parse(raw) as { panels: Panel[] };
  const ids = new Set<string>();
  const byPage = new Map<string, Panel[]>();
  for (const p of panels) {
    if (ids.has(p.id)) throw new Error(`panel ${p.id} appears twice`);
    ids.add(p.id);
    byPage.set(p.page_id, [...(byPage.get(p.page_id) ?? []), p]);
  }
  const pages: ComicPage[] = [...byPage.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, rows]) => {
      const sorted = rows.slice().sort((a, b) => a.panel_order - b.panel_order);
      const orders = new Set(sorted.map((p) => p.panel_order));
      if (orders.size !== sorted.length) throw new Error(`page ${id}: duplicate panel_order`);
      return { id, title: pageTitle(id), panels: sorted };
    });
  return { pages };
}

/** Flat todo.was_panels rows → content. */
export function contentFromRows(rows: unknown[]): WasContent {
  return shapeContent({ panels: rows });
}

/** content/was.json, validated. The single source of truth for this game. */
export function bundledContent(): WasContent {
  return shapeContent(bundled);
}

export function findPanel(content: WasContent, id: string): Panel | undefined {
  for (const page of content.pages) {
    const panel = page.panels.find((p) => p.id === id);
    if (panel) return panel;
  }
  return undefined;
}

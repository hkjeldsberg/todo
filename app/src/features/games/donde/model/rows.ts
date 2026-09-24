import { scrapbookSchema, type Scrapbook } from "./schema";

/** One `todo.donde_pages` row with its `todo.donde_tasks` embedded (PostgREST resource embedding). */
export interface PageRow {
  page_id: string;
  sort: number;
  title_es: string;
  title_en: string;
  visual_layer: string;
  donde_tasks: Record<string, unknown>[];
}

/** DB rows → validated scrapbook. Extra DB columns (sort, page_id on tasks) are dropped by zod. */
export function rowsToScrapbook(rows: PageRow[]): Scrapbook {
  const pages = [...rows]
    .sort((a, b) => a.sort - b.sort)
    .map(({ donde_tasks, ...page }) => ({
      ...page,
      tasks: [...donde_tasks].sort((a, b) => Number(a.sort ?? 0) - Number(b.sort ?? 0)),
    }));
  return scrapbookSchema.parse({ pages });
}

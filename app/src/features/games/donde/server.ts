import "server-only";
import bundled from "@/content/donde.json";
import type { GameServerModule } from "@/features/games/types";
import { db, isConfigured } from "@/lib/db";
import { taskToReviewCard } from "./model/review";
import { rowsToScrapbook, type PageRow } from "./model/rows";
import { scrapbookSchema, type Scrapbook } from "./model/schema";

async function fromDatabase(): Promise<Scrapbook> {
  const { data, error } = await db()
    .from("donde_pages")
    .select("page_id, sort, title_es, title_en, visual_layer, donde_tasks(*)")
    .order("sort")
    .order("sort", { referencedTable: "donde_tasks" });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("todo.donde_pages is empty");
  return rowsToScrapbook(data as PageRow[]);
}

const server: GameServerModule<Scrapbook> = {
  /** Curriculum from todo.donde_pages/donde_tasks; the bundled JSON if the DB is missing or invalid. */
  async loadContent() {
    if (isConfigured()) {
      try {
        return { content: await fromDatabase(), source: "supabase" };
      } catch (cause) {
        console.error("[donde] database content unavailable, using bundled:", cause);
      }
    }
    return { content: scrapbookSchema.parse(bundled), source: "bundled" };
  },

  toReviewCard(itemRef, content) {
    return taskToReviewCard(itemRef, content);
  },
};

export default server;

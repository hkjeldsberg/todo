import "server-only";
import bundled from "@/content/laberinto.json";
import type { GameServerModule } from "@/features/games/types";
import { db, isConfigured } from "@/lib/db";
import { parseContent } from "./lib/content";
import { toReviewCard } from "./lib/review";
import type { LaberintoContent } from "./lib/types";

const COLUMNS = "node_id, island_zone, seq, ambient_prompt, doors, feedback_imperfect, next_node_id";

function fallback(): { content: LaberintoContent; source: "bundled" } {
  return { content: parseContent(bundled), source: "bundled" };
}

/** Curriculum from `todo.laberinto_nodes`; the bundled JSON when the DB is unset, empty or failing. */
const server: GameServerModule<LaberintoContent> = {
  async loadContent() {
    if (!isConfigured()) return fallback();
    try {
      const { data, error } = await db().from("laberinto_nodes").select(COLUMNS).order("seq");
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error("table is empty");
      return { content: parseContent(data), source: "supabase" };
    } catch (cause) {
      console.error("[laberinto] content from Supabase unavailable, using bundled:", cause);
      return fallback();
    }
  },
  toReviewCard,
};

export default server;

import "server-only";
import type { GameServerModule } from "@/features/games/types";
import { db, isConfigured } from "@/lib/db";
import { bundledContent, contentFromRows } from "./lib/content";
import { toReviewCard } from "./lib/review";
import type { WasContent } from "./lib/types";

/** Fail fast to the bundled content rather than hanging the page. */
const TIMEOUT_MS = 5000;

const COLUMNS =
  "id, page_id, panel_order, panel_type, sentence_pre, sentence_post, correct_verb, rule_feedback, asset_sketch, asset_color";

async function fromSupabase(): Promise<WasContent> {
  const { data, error } = await db()
    .from("was_panels")
    .select(COLUMNS)
    .order("page_id")
    .order("panel_order")
    .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("todo.was_panels is empty");
  return contentFromRows(data);
}

/** Panels from Supabase; the bundled JSON when the DB is unset, empty or failing. */
const server: GameServerModule<WasContent> = {
  async loadContent() {
    if (isConfigured()) {
      try {
        return { content: await fromSupabase(), source: "supabase" };
      } catch (cause) {
        console.warn("[was] content from Supabase unavailable, using bundled:", cause);
      }
    }
    return { content: bundledContent(), source: "bundled" };
  },
  toReviewCard,
};

export default server;

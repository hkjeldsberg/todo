import "server-only";
import type { GameServerModule } from "@/features/games/types";
import { db, isConfigured } from "@/lib/db";
import { bundledContent, contentFromRows } from "./model/content";
import { checkGeometry } from "./model/relations";
import { toReviewCard } from "./model/review";
import type { Content } from "./model/types";

/** Fail fast to the bundled content rather than hanging the page. */
const TIMEOUT_MS = 5000;

async function fromSupabase(): Promise<Content> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const [expressions, scenes] = await Promise.all([
    db().from("posiciones_expressions").select("id, es, en, level, category, needs_reference, ref_count, region, notes, sort").order("sort").abortSignal(signal),
    db().from("posiciones_scenes").select("id, sort, title_es, title_en, visual_layer, objects, facts, targets").order("sort").abortSignal(signal),
  ]);
  if (expressions.error) throw expressions.error;
  if (scenes.error) throw scenes.error;
  const content = contentFromRows(expressions.data ?? [], scenes.data ?? []);
  // Rows must still match the scene geometry in code.
  checkGeometry(content);
  return content;
}

const server: GameServerModule<Content> = {
  /** Expressions and scenes from todo.posiciones_*; the bundled JSON if the DB is missing, empty or invalid. */
  async loadContent() {
    if (isConfigured()) {
      try {
        return { content: await fromSupabase(), source: "supabase" };
      } catch (cause) {
        console.warn("[posiciones] content from Supabase unavailable, using bundled:", cause);
      }
    }
    return { content: bundledContent(), source: "bundled" };
  },
  toReviewCard,
};

export default server;

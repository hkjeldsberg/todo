import "server-only";
import type { GameServerModule } from "@/features/games/types";
import { db, isConfigured } from "@/lib/db";
import { bundledContent, contentFromRows } from "./lib/content";
import { toReviewCard } from "./lib/review";
import type { OpuestosContent } from "./lib/types";

/** Fail fast to the bundled content rather than hanging the page. */
const TIMEOUT_MS = 5000;

const WORD_COLUMNS = "id, word, antonym_id, engine_target, value_modifier, shader_trigger, translation, category, sort";
const LEVEL_COLUMNS = "id, sort, title_es, title_en, clue_es, clue_en, words, layout";

async function fromSupabase(): Promise<OpuestosContent> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const [words, levels] = await Promise.all([
    db().from("opuestos_words").select(WORD_COLUMNS).order("sort").abortSignal(signal),
    db().from("opuestos_levels").select(LEVEL_COLUMNS).order("sort").abortSignal(signal),
  ]);
  if (words.error) throw new Error(words.error.message);
  if (levels.error) throw new Error(levels.error.message);
  if (!words.data?.length || !levels.data?.length) throw new Error("todo.opuestos_words / opuestos_levels are empty");
  return contentFromRows(words.data, levels.data);
}

/** Words + levels from Supabase; the bundled JSON when the DB is unset, empty or failing. */
const server: GameServerModule<OpuestosContent> = {
  async loadContent() {
    if (isConfigured()) {
      try {
        return { content: await fromSupabase(), source: "supabase" };
      } catch (cause) {
        console.warn("[opuestos] content from Supabase unavailable, using bundled:", cause);
      }
    }
    return { content: bundledContent(), source: "bundled" };
  },
  toReviewCard,
};

export default server;

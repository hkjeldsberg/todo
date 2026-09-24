import "server-only";
import type { GameServerModule } from "@/features/games/types";
import { db, isConfigured } from "@/lib/db";
import { bundledContent, contentFromRows } from "./content";
import { toReviewCard } from "./review";
import type { TenseContent } from "./types";

/** Fail fast to the bundled content rather than hanging the page. */
const TIMEOUT_MS = 5000;

const PUZZLE_COLUMNS =
  "id, room_id, order_index, scene_object, sentence_pre, sentence_post, verb_base, options, rule_feedback, translation, anim_trigger";

async function fromSupabase(): Promise<TenseContent> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const [rooms, puzzles] = await Promise.all([
    db().from("tense_rooms").select("id, order_index, title, subtitle, focus").abortSignal(signal),
    db().from("tense_puzzles").select(PUZZLE_COLUMNS).abortSignal(signal),
  ]);
  if (rooms.error) throw rooms.error;
  if (puzzles.error) throw puzzles.error;
  if (!rooms.data?.length) throw new Error("todo.tense_rooms is empty");
  return contentFromRows(rooms.data, puzzles.data ?? []);
}

const server: GameServerModule<TenseContent> = {
  async loadContent() {
    if (isConfigured()) {
      try {
        return { content: await fromSupabase(), source: "supabase" };
      } catch (cause) {
        console.warn("[tense] content from Supabase unavailable, using bundled:", cause);
      }
    }
    return { content: bundledContent(), source: "bundled" };
  },
  toReviewCard,
};

export default server;

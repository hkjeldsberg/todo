import "server-only";
import type { GameServerModule } from "@/features/games/types";
import { db, isConfigured } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { bundledContent, contentFromRows } from "./lib/content";
import { leitnerFromRows } from "./lib/leitner";
import { toReviewCard } from "./lib/review";
import type { PasadoContent, PasadoProgress } from "./lib/types";

/** Fail fast to the bundled content rather than hanging the page. */
const TIMEOUT_MS = 5000;

const COLUMNS = "id, infinitive, person, sentence_template, correct_tense, trigger_word, english_translation";

async function fromSupabase(): Promise<PasadoContent> {
  const { data, error } = await db()
    .from("past_drills")
    .select(COLUMNS)
    .order("id")
    .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("todo.past_drills is empty");
  return contentFromRows(data);
}

/**
 * Drills from Supabase; the bundled JSON when the DB is unset, empty or failing.
 * Verb forms always come from the bundled conjugation data (todo.verbs mirrors it).
 * Progress is the per-verb Leitner table, not todo.game_progress.
 */
const server: GameServerModule<PasadoContent> = {
  async loadContent() {
    if (isConfigured()) {
      try {
        return { content: await fromSupabase(), source: "supabase" };
      } catch (cause) {
        console.warn("[pasado] drills from Supabase unavailable, using bundled:", cause);
      }
    }
    return { content: bundledContent(), source: "bundled" };
  },
  async loadProgress(): Promise<PasadoProgress> {
    if (!isConfigured()) return { leitner: {}, persisted: false };
    try {
      const { data, error } = await db()
        .from("past_progress")
        .select("infinitive, current_box, next_review_date, times_correct, times_incorrect")
        .eq("user_id", currentUserId())
        .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
      if (error) throw new Error(error.message);
      return { leitner: leitnerFromRows(data ?? []), persisted: true };
    } catch (cause) {
      console.warn("[pasado] todo.past_progress unavailable, progress won't be saved:", cause);
      return { leitner: {}, persisted: false };
    }
  },
  toReviewCard,
};

export default server;

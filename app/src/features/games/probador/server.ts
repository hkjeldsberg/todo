import "server-only";
import type { GameServerModule } from "@/features/games/types";
import { db, isConfigured } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { bundledContent, contentFromRows } from "./lib/content";
import { toReviewCard } from "./lib/review";
import { statsFromRows } from "./lib/srs";
import type { ProbadorContent, ProbadorProgress } from "./lib/types";

/** Fail fast to the bundled content rather than hanging the page. */
const TIMEOUT_MS = 5000;

async function fromSupabase(): Promise<ProbadorContent> {
  const [outfits, prompts] = await Promise.all([
    db()
      .from("probador_outfits")
      .select("id, avatar, layers, description, intended_flaw")
      .abortSignal(AbortSignal.timeout(TIMEOUT_MS)),
    db()
      .from("probador_prompts")
      .select("id, outfit_id, target_verb, question_text, question_fill, answer_parts, distractor_options, english_translation")
      .abortSignal(AbortSignal.timeout(TIMEOUT_MS)),
  ]);
  if (outfits.error) throw new Error(outfits.error.message);
  if (prompts.error) throw new Error(prompts.error.message);
  if (!prompts.data?.length) throw new Error("todo.probador_prompts is empty");
  return contentFromRows(outfits.data ?? [], prompts.data);
}

/**
 * Outfits + prompts from Supabase; the bundled JSON when the DB is unset, empty
 * or failing. Progress is todo.probador_stats, not todo.game_progress.
 */
const server: GameServerModule<ProbadorContent> = {
  async loadContent() {
    if (isConfigured()) {
      try {
        return { content: await fromSupabase(), source: "supabase" };
      } catch (cause) {
        console.warn("[probador] content from Supabase unavailable, using bundled:", cause);
      }
    }
    return { content: bundledContent(), source: "bundled" };
  },
  async loadProgress(): Promise<ProbadorProgress> {
    if (!isConfigured()) return { stats: {}, persisted: false };
    try {
      const { data, error } = await db()
        .from("probador_stats")
        .select("prompt_id, times_encountered, times_correct, streak, current_interval_minutes, last_played_at, due_at")
        .eq("user_id", currentUserId())
        .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
      if (error) throw new Error(error.message);
      return { stats: statsFromRows(data ?? []), persisted: true };
    } catch (cause) {
      console.warn("[probador] todo.probador_stats unavailable, progress won't be saved:", cause);
      return { stats: {}, persisted: false };
    }
  },
  toReviewCard,
};

export default server;

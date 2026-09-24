import "server-only";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { loadDay } from "@/features/diary/queries";
import { SENTENCES_PER_DAY } from "@/features/diary/diary";
import { gameBySlug } from "@/features/games/registry";
import { TOPICS } from "@/features/grammar/grammar";
import { reviewStats } from "@/features/srs/session";
import type { ReviewStats } from "@/features/srs/types";

export type Today = {
  review: ReviewStats | null;
  diary: { day: string; written: number; total: number } | null;
  lastGame: { slug: string; title: string; subtitle: string } | null;
  topic: { slug: string; title: string; blurb: string } | null;
};

/** Settles to null instead of failing the whole page when one card can't load. */
async function soft<T>(label: string, load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (cause) {
    console.error(`[hoy] ${label} unavailable:`, cause instanceof Error ? cause.message : cause);
    return null;
  }
}

export async function loadToday(day: string): Promise<Today> {
  const user = currentUserId();
  const [review, diary, lastGame, done] = await Promise.all([
    soft("review", reviewStats),
    soft("diary", async () => {
      const content = await loadDay(day);
      const written = content.sentences.filter((s) => s.spanish.trim()).length;
      return { day, written, total: SENTENCES_PER_DAY };
    }),
    soft("last game", async () => {
      const { data, error } = await db()
        .from("game_progress")
        .select("game_slug")
        .eq("user_id", user)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const game = data && gameBySlug(data.game_slug as string);
      return game ? { slug: game.slug, title: game.title, subtitle: game.subtitle } : null;
    }),
    soft("grammar", async () => {
      const { data, error } = await db().from("grammar_progress").select("slug").eq("user_id", user);
      if (error) throw error;
      return new Set((data ?? []).map((row) => row.slug as string));
    }),
  ]);

  // Same pick all day, a different one tomorrow.
  const open = TOPICS.filter((topic) => !done?.has(topic.slug));
  const dayNumber = Math.floor(new Date(`${day}T00:00:00Z`).getTime() / 86_400_000);
  const pick = open.length ? open[dayNumber % open.length] : null;

  return {
    review,
    diary,
    lastGame: lastGame ?? null,
    topic: pick ? { slug: pick.slug, title: pick.title, blurb: pick.blurb } : null,
  };
}

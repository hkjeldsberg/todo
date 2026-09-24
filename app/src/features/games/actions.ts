"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { currentUserId } from "@/lib/user";
import type { Attempt } from "./types";

export async function saveGameProgress(slug: string, state: unknown): Promise<void> {
  await requireSession();
  const { error } = await db()
    .from("game_progress")
    .upsert(
      {
        user_id: currentUserId(),
        game_slug: slug,
        state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,game_slug" },
    );
  if (error) throw new Error(error.message);
}

/**
 * Log an answer. A wrong one (re)enters the review queue at box 1, due now —
 * same strict reset as a missed Leitner card.
 */
export async function recordGameAttempt(slug: string, attempt: Attempt): Promise<void> {
  await requireSession();
  const user_id = currentUserId();

  const { error } = await db().from("game_attempts").insert({
    user_id,
    game_slug: slug,
    item_ref: attempt.itemRef,
    correct: attempt.correct,
    answer: attempt.answer ?? null,
  });
  if (error) throw new Error(error.message);

  if (attempt.correct) return;

  const { error: srsError } = await db()
    .from("srs_items")
    .upsert(
      {
        user_id,
        kind: "game_item",
        ref: `game:${slug}:${attempt.itemRef}`,
        source: `game:${slug}`,
        box: 1,
        next_review_at: new Date().toISOString(),
        suspended: false,
      },
      { onConflict: "user_id,kind,ref" },
    );
  if (srsError) throw new Error(srsError.message);
}

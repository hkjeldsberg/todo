"use server";

import { z } from "zod";
import { verbByInfinitive } from "@/features/srs/verbs";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { currentUserId } from "@/lib/user";

const EntrySchema = z.object({
  box: z.number().int().min(1).max(5),
  next: z.iso.datetime(),
  right: z.number().int().min(0),
  wrong: z.number().int().min(0),
});

/** Writes one verb's Leitner row (computed client-side by lib/leitner.applyAnswer). */
export async function savePastProgress(infinitive: string, entry: unknown): Promise<void> {
  await requireSession();
  if (!verbByInfinitive(infinitive)) throw new Error(`unknown verb ${infinitive}`);
  const { box, next, right, wrong } = EntrySchema.parse(entry);
  const { error } = await db()
    .from("past_progress")
    .upsert(
      {
        user_id: currentUserId(),
        infinitive,
        current_box: box,
        next_review_date: next,
        times_correct: right,
        times_incorrect: wrong,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,infinitive" },
    );
  if (error) throw new Error(error.message);
}

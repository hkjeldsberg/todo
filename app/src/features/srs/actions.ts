"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { currentUserId } from "@/lib/user";
import { nextBox, nextReviewAt } from "./leitner";
import type { AnswerInput } from "./types";

/** Grade one card: move it through the Leitner boxes and log the review. */
export async function answerCard(input: AnswerInput): Promise<{ box: number }> {
  await requireSession();
  const user_id = currentUserId();

  const { data: existing, error: readError } = await db()
    .from("srs_items")
    .select("id, box, reps, lapses")
    .eq("user_id", user_id)
    .eq("kind", input.kind)
    .eq("ref", input.ref)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  const box = nextBox(existing?.box ?? 0, input.correct);
  const now = new Date();

  const { data: saved, error } = await db()
    .from("srs_items")
    .upsert(
      {
        user_id,
        kind: input.kind,
        ref: input.ref,
        source: input.source,
        box,
        next_review_at: nextReviewAt(box, now).toISOString(),
        last_reviewed_at: now.toISOString(),
        reps: (existing?.reps ?? 0) + 1,
        lapses: (existing?.lapses ?? 0) + (input.correct ? 0 : 1),
      },
      { onConflict: "user_id,kind,ref" },
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: logError } = await db().from("srs_reviews").insert({
    user_id,
    item_id: saved.id,
    correct: input.correct,
    mode: input.mode,
    answer: input.answer ?? null,
  });
  if (logError) console.error("[srs] review log failed:", logError.message);

  return { box };
}

/** Put phrases into Repaso (due now). Already-queued phrases keep their box. */
export async function addPhrasesToReview(phraseIds: string[]): Promise<void> {
  await requireSession();
  if (phraseIds.length === 0) return;
  const { error } = await db()
    .from("srs_items")
    .upsert(
      phraseIds.map((id) => ({
        user_id: currentUserId(),
        kind: "phrase",
        ref: `phrase:${id}`,
        source: "phrases",
      })),
      { onConflict: "user_id,kind,ref", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
  revalidatePath("/repaso");
}

export async function removePhraseFromReview(phraseId: string): Promise<void> {
  await requireSession();
  const { error } = await db()
    .from("srs_items")
    .delete()
    .eq("user_id", currentUserId())
    .eq("kind", "phrase")
    .eq("ref", `phrase:${phraseId}`);
  if (error) throw new Error(error.message);
  revalidatePath("/repaso");
}

/** Phrase ids currently in Repaso (for the ↻ marks on the board). */
export async function reviewedPhraseIds(): Promise<string[]> {
  await requireSession();
  const { data, error } = await db()
    .from("srs_items")
    .select("ref")
    .eq("user_id", currentUserId())
    .eq("kind", "phrase");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => String(row.ref).slice("phrase:".length));
}

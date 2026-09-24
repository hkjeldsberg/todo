"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { reviewSentence } from "@/features/phrases/ai";
import { describeError } from "@/lib/errors";
import type { DiaryNote, DiarySentence, Result } from "@/features/diary/diary";
import { isValidDay } from "@/features/diary/diary";
import { currentUserId } from "@/lib/user";

/*
 * Every action returns a Result rather than throwing. A thrown error reaches the
 * browser as an opaque digest in production, which is how "it sometimes fails"
 * became unanswerable; a returned failure keeps its message, its hint, and
 * whether retrying is worth the tap.
 */
function failed<T>(cause: unknown): Result<T> {
  return { ok: false, error: describeError(cause) };
}

export async function addNote(
  day: string,
  body: string,
): Promise<Result<DiaryNote>> {
  await requireSession();
  if (!isValidDay(day)) return failed(new Error(`Bad date: ${day}`));

  const text = body.trim();
  if (!text) {
    return {
      ok: false,
      error: { message: "The note is empty.", retryable: false },
    };
  }

  const { count } = await db()
    .from("diary_notes")
    .select("id", { count: "exact", head: true })
    .eq("day", day);

  const { data, error } = await db()
    .from("diary_notes")
    .insert({ day, body: text, sort_order: count ?? 0 })
    .select("*")
    .single();
  if (error) return failed(error);

  revalidatePath("/diario");
  return { ok: true, data: data as DiaryNote };
}

export async function editNote(
  id: string,
  body: string,
): Promise<Result<null>> {
  await requireSession();
  const text = body.trim();
  if (!text) {
    return {
      ok: false,
      error: { message: "The note is empty.", retryable: false },
    };
  }

  const { error } = await db()
    .from("diary_notes")
    .update({ body: text })
    .eq("id", id);
  if (error) return failed(error);

  return { ok: true, data: null };
}

export async function removeNote(id: string): Promise<Result<null>> {
  await requireSession();

  const { error } = await db().from("diary_notes").delete().eq("id", id);
  if (error) return failed(error);

  revalidatePath("/diario");
  return { ok: true, data: null };
}

export async function setTags(
  day: string,
  tags: string[],
): Promise<Result<null>> {
  await requireSession();
  if (!isValidDay(day)) return failed(new Error(`Bad date: ${day}`));

  const cleaned = [
    ...new Set(tags.map((tag) => tag.trim()).filter(Boolean)),
  ].slice(0, 40);

  const { error } = await db()
    .from("diary_days")
    .upsert(
      {
        user_id: currentUserId(),
        day,
        tags: cleaned,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,day" },
    );
  if (error) return failed(error);

  revalidatePath("/diario");
  return { ok: true, data: null };
}

/**
 * Step one: store the writing. Deliberately separate from the review so the
 * sentence is safe on the server before the slow part starts — a failed or slow
 * review can never cost you the sentence.
 */
export async function saveSentence(input: {
  day: string;
  position: number;
  spanish: string;
  english: string;
}): Promise<Result<DiarySentence>> {
  await requireSession();
  if (!isValidDay(input.day))
    return failed(new Error(`Bad date: ${input.day}`));
  if (input.position < 0 || input.position > 4) {
    return {
      ok: false,
      error: { message: `Bad slot: ${input.position}`, retryable: false },
    };
  }

  const spanish = input.spanish.trim();
  if (!spanish) {
    return {
      ok: false,
      error: { message: "Write the Spanish sentence first.", retryable: false },
    };
  }

  const { data, error } = await db()
    .from("diary_sentences")
    .upsert(
      {
        user_id: currentUserId(),
        day: input.day,
        position: input.position,
        spanish,
        english: input.english.trim(),
        // A new version of the sentence invalidates the old verdict.
        feedback: null,
        feedback_at: null,
      },
      { onConflict: "user_id,day,position" },
    )
    .select("*")
    .single();
  if (error) return failed(error);

  revalidatePath("/diario");
  return { ok: true, data: data as DiarySentence };
}

/**
 * Step two: ask Claude to mark a sentence that is already saved. Called right
 * after saveSentence, and again by hand from "Revisar otra vez".
 */
export async function reviewSaved(id: string): Promise<Result<DiarySentence>> {
  await requireSession();

  const { data: existing, error: readError } = await db()
    .from("diary_sentences")
    .select("*")
    .eq("id", id)
    .single();
  if (readError) return failed(readError);

  const row = existing as DiarySentence;

  let feedback: string;
  try {
    feedback = await reviewSentence({
      spanish: row.spanish,
      english: row.english,
    });
  } catch (cause) {
    return failed(cause);
  }

  const { data, error } = await db()
    .from("diary_sentences")
    .update({ feedback, feedback_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return failed(error);

  revalidatePath("/diario");
  return { ok: true, data: data as DiarySentence };
}

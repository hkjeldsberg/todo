"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { currentUserId } from "@/lib/user";
import { bundledStories, storyFromRow, summaryFromRow, type StoryRow } from "./lib/content";
import { generateStory, MODEL, StoryGenerationError } from "./lib/generate";
import { parseTokenKey, TARGETS, type Story, type StorySummary, type Target } from "./lib/schema";
import { clozeFor, distractorsFor, sentenceText } from "./lib/text";

/*
 * Every action returns a Result instead of throwing: a thrown error reaches the
 * browser as an opaque digest in production, and the reader needs the message.
 */
export type Result<T> = { ok: true; data: T } | { ok: false; error: string; retryable: boolean };

const fail = (error: string, retryable = true): { ok: false; error: string; retryable: boolean } => ({
  ok: false,
  error,
  retryable,
});

const ROW = "id, title, topic, level, target_tenses, created_at, content_json";

/** Claude writes and annotates a story (1–3 min), then it is stored. */
export async function createStory(input: {
  topic: string;
  targets: string[];
  level?: "A1" | "A2" | "B1";
}): Promise<Result<StorySummary>> {
  await requireSession();
  const topic = input.topic.trim().slice(0, 200);
  if (topic.length < 3) return fail("Write a topic first (a few words is enough).", false);
  const targets = input.targets.filter((t): t is Target => (TARGETS as readonly string[]).includes(t));
  const level = input.level ?? "A2";

  let content;
  try {
    content = await generateStory({ topic, targets, level });
  } catch (cause) {
    if (cause instanceof StoryGenerationError) return fail(cause.message, cause.retryable);
    console.error("[cuentos] generation failed:", cause);
    return fail(cause instanceof Error ? cause.message : "Story generation failed.");
  }

  const { data, error } = await db()
    .from("stories")
    .insert({
      user_id: currentUserId(),
      topic,
      level,
      target_tenses: targets,
      title: content.title,
      content_json: content,
      model: MODEL,
    })
    .select("id, title, topic, level, target_tenses, created_at")
    .single();
  if (error) return fail(`The story was written but could not be saved: ${error.message}`);
  return { ok: true, data: summaryFromRow(data as StoryRow) };
}

/** One story plus the token keys already saved to Repaso. */
export async function openStory(id: string): Promise<Result<{ story: Story; saved: string[] }>> {
  await requireSession();
  const sample = bundledStories().find((s) => s.id === id);
  if (sample) return { ok: true, data: { story: sample, saved: [] } };

  const [{ data, error }, cards] = await Promise.all([
    db().from("stories").select(ROW).eq("id", id).eq("user_id", currentUserId()).maybeSingle(),
    db().from("story_cards").select("token_key").eq("story_id", id),
  ]);
  if (error) return fail(error.message);
  if (!data) return fail("That story no longer exists.", false);
  const story = storyFromRow(data as StoryRow);
  if (!story) return fail("This story's data is damaged and can't be shown.", false);
  return { ok: true, data: { story, saved: (cards.data ?? []).map((c) => c.token_key as string) } };
}

/**
 * "Save to Repaso" (the PRD's Save to Spanyard): the token's sentence becomes a
 * cloze card, queued in Repaso as kind 'story', due now.
 */
export async function saveWord(storyId: string, key: string): Promise<Result<null>> {
  await requireSession();
  const where = parseTokenKey(key);
  if (!where) return fail("Unknown word.", false);

  const { data: row, error } = await db()
    .from("stories")
    .select(ROW)
    .eq("id", storyId)
    .eq("user_id", currentUserId())
    .maybeSingle();
  if (error) return fail(error.message);
  const story = row && storyFromRow(row as StoryRow);
  if (!story) return fail("That story can't be found.", false);

  const [n, s, t] = where;
  const sentence = story.content.nodes[n]?.sentences[s];
  const token = sentence?.tokens[t];
  if (!sentence || !token?.tense) return fail("Only verb forms can be saved.", false);

  const { cloze, answer } = clozeFor(sentence, t);
  const { data: card, error: cardError } = await db()
    .from("story_cards")
    .upsert(
      {
        user_id: currentUserId(),
        story_id: storyId,
        token_key: key,
        answer,
        cloze,
        sentence_es: sentenceText(sentence),
        sentence_en: sentence.translation,
        lemma: token.lemma ?? null,
        tense: token.tense,
        translation: token.group_translation || token.translation,
        distractors: distractorsFor(story.content, answer, token.lemma),
      },
      { onConflict: "story_id,token_key" },
    )
    .select("id")
    .single();
  if (cardError) return fail(cardError.message);

  const { error: srsError } = await db()
    .from("srs_items")
    .upsert(
      {
        user_id: currentUserId(),
        kind: "story",
        ref: `story:${card.id}`,
        source: "cuentos",
      },
      { onConflict: "user_id,kind,ref", ignoreDuplicates: true },
    );
  if (srsError) return fail(srsError.message);
  return { ok: true, data: null };
}

/** Takes a saved word back out of Repaso (the DB trigger drops its review item). */
export async function unsaveWord(storyId: string, key: string): Promise<Result<null>> {
  await requireSession();
  const { error } = await db()
    .from("story_cards")
    .delete()
    .eq("story_id", storyId)
    .eq("token_key", key)
    .eq("user_id", currentUserId());
  return error ? fail(error.message) : { ok: true, data: null };
}

/** Deletes a story and every card saved from it. */
export async function deleteStory(id: string): Promise<Result<null>> {
  await requireSession();
  const { error } = await db().from("stories").delete().eq("id", id).eq("user_id", currentUserId());
  return error ? fail(error.message) : { ok: true, data: null };
}

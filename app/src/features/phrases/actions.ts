"use server";

import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { suggestPhrase } from "@/features/phrases/ai";
import type { Category, Phrase, Scenario } from "@/features/phrases/types";

/*
 * These actions return the affected row instead of revalidating the page: the
 * client holds the authoritative copy of the notebook and applies every change
 * optimistically, so a server-driven re-render would only cause a visible jump.
 */

export async function createScenario(name: string): Promise<Scenario> {
  await requireSession();

  const { count } = await db()
    .from("scenarios")
    .select("id", { count: "exact", head: true });

  const { data, error } = await db()
    .from("scenarios")
    .insert({ name: name.trim(), sort_order: count ?? 0 })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Scenario;
}

export async function renameScenario(id: string, name: string) {
  await requireSession();
  const { error } = await db()
    .from("scenarios")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteScenario(id: string) {
  await requireSession();
  const { error } = await db().from("scenarios").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createCategory(
  scenarioId: string,
  name: string,
): Promise<Category> {
  await requireSession();

  const { count } = await db()
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("scenario_id", scenarioId);

  const { data, error } = await db()
    .from("categories")
    .insert({
      scenario_id: scenarioId,
      name: name.trim(),
      sort_order: count ?? 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Category;
}

export async function renameCategory(id: string, name: string) {
  await requireSession();
  const { error } = await db()
    .from("categories")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCategory(id: string) {
  await requireSession();
  const { error } = await db().from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Persist the new vertical order of categories within a scenario. */
export async function reorderCategories(ids: string[]) {
  await requireSession();
  await Promise.all(
    ids.map((id, index) =>
      db().from("categories").update({ sort_order: index }).eq("id", id),
    ),
  );
}

/** Next free slot at the bottom of a category (or of the uncategorized bucket). */
async function nextPhraseOrder(scenarioId: string, categoryId: string | null) {
  const query = db()
    .from("phrases")
    .select("id", { count: "exact", head: true })
    .eq("scenario_id", scenarioId);

  const { count } = await (categoryId
    ? query.eq("category_id", categoryId)
    : query.is("category_id", null));

  return count ?? 0;
}

export async function createPhrase(input: {
  scenarioId: string;
  categoryId: string | null;
  spanish: string;
  translation: string;
}): Promise<Phrase> {
  await requireSession();

  const { data, error } = await db()
    .from("phrases")
    .insert({
      scenario_id: input.scenarioId,
      category_id: input.categoryId,
      spanish_text: input.spanish.trim(),
      translation_text: input.translation.trim(),
      sort_order: await nextPhraseOrder(input.scenarioId, input.categoryId),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Phrase;
}

/**
 * Persist a drag: every phrase in the touched buckets gets its container and
 * position written, so a move between two cards is one atomic-looking update.
 */
export async function reorderPhrases(
  moves: { id: string; categoryId: string | null; sortOrder: number }[],
) {
  await requireSession();
  await Promise.all(
    moves.map((move) =>
      db()
        .from("phrases")
        .update({ category_id: move.categoryId, sort_order: move.sortOrder })
        .eq("id", move.id),
    ),
  );
}

export async function updatePhrase(input: {
  id: string;
  spanish: string;
  translation: string;
  scenarioId: string;
  categoryId: string | null;
}) {
  await requireSession();
  const { error } = await db()
    .from("phrases")
    .update({
      spanish_text: input.spanish.trim(),
      translation_text: input.translation.trim(),
      scenario_id: input.scenarioId,
      category_id: input.categoryId,
      // The edit dialog can move a phrase; land it at the end of its new bucket.
      sort_order: await nextPhraseOrder(input.scenarioId, input.categoryId),
    })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
}

export async function deletePhrase(id: string) {
  await requireSession();
  const { error } = await db().from("phrases").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Generate one contextual, non-duplicate phrase and save it immediately. */
export async function suggestPhraseAction(scenarioId: string): Promise<Phrase> {
  await requireSession();

  const [{ data: scenario }, { data: categories }, { data: phrases }] =
    await Promise.all([
      db().from("scenarios").select("*").eq("id", scenarioId).single(),
      db().from("categories").select("*").eq("scenario_id", scenarioId),
      db().from("phrases").select("*").eq("scenario_id", scenarioId),
    ]);

  if (!scenario) throw new Error("Scenario not found");

  const suggestion = await suggestPhrase({
    scenario: scenario as Scenario,
    categories: (categories ?? []) as Category[],
    phrases: (phrases ?? []) as Phrase[],
  });

  // The suggest action is reachable without picking a category, so the phrase
  // always lands in the uncategorized bucket and the user files it from there.
  const { data, error } = await db()
    .from("phrases")
    .insert({
      scenario_id: scenarioId,
      category_id: null,
      spanish_text: suggestion.spanish,
      translation_text: suggestion.translation,
      sort_order: await nextPhraseOrder(scenarioId, null),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Phrase;
}

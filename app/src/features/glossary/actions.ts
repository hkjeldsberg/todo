"use server";

import { requireSession } from "@/lib/session";
import { checkWithClaude, examplesWithClaude } from "./ai-core";
import { draftFromCheck, draftOf, parseDraft } from "./draft";
import { DuplicateWordError, store } from "./store";
import { spanishKey } from "./text";
import type { CheckResult, GlossaryWord } from "./types";

/*
 * Like the Frases actions, these return the affected word: the client holds the
 * list and patches it, so there's no page revalidation.
 */

export type CheckOutcome =
  | { kind: "checked"; result: CheckResult }
  | { kind: "duplicate"; word: GlossaryWord }
  | { kind: "unavailable" };

/** Step 1 of adding: Claude checks the word and my guess. Nothing is saved yet. */
export async function checkNewWord(spanish: string, guess: string, themes: string[]): Promise<CheckOutcome> {
  await requireSession();
  const s = spanish.trim().slice(0, 80);
  const g = guess.trim().slice(0, 120);
  if (!s || !g) throw new Error("Spanish and translation are both needed");
  const known = await store().findByKey(spanishKey(s));
  if (known) return { kind: "duplicate", word: known };
  const result = await checkWithClaude({ spanish: s, guess: g, themes });
  if (!result) return { kind: "unavailable" };
  const corrected = await store().findByKey(spanishKey(result.spanish));
  if (corrected) return { kind: "duplicate", word: corrected };
  return { kind: "checked", result };
}

export type SaveOutcome = { kind: "saved"; word: GlossaryWord } | { kind: "duplicate"; word: GlossaryWord };

async function save(run: () => Promise<GlossaryWord>): Promise<SaveOutcome> {
  try {
    return { kind: "saved", word: await run() };
  } catch (cause) {
    if (cause instanceof DuplicateWordError) return { kind: "duplicate", word: cause.existing };
    throw cause;
  }
}

/** Step 2: save the checked (or, if Claude was unavailable, unchecked) word. */
export async function createWord(raw: unknown): Promise<SaveOutcome> {
  await requireSession();
  const draft = parseDraft(raw);
  return save(() => store().insert(draft));
}

export async function updateWord(id: string, raw: unknown): Promise<SaveOutcome> {
  await requireSession();
  const draft = parseDraft(raw);
  return save(() => store().update(id, draft));
}

export async function deleteWord(id: string): Promise<void> {
  await requireSession();
  await store().remove(id);
}

/** Two new example sentences. Null when Claude is unavailable. */
export async function regenerateExamples(id: string): Promise<GlossaryWord | null> {
  await requireSession();
  const word = await store().get(id);
  if (!word) throw new Error("word not found");
  const examples = await examplesWithClaude(word.spanish, word.english, word.examples);
  if (!examples) return null;
  return store().update(id, { ...draftOf(word), examples });
}

/**
 * Checks a word saved while Claude was unavailable (or imported). What was
 * stored as English counts as my guess. Null if Claude is still unavailable.
 */
export async function recheckWord(id: string): Promise<GlossaryWord | null> {
  await requireSession();
  const word = await store().get(id);
  if (!word || word.status === "checked") return word;
  const guess = word.myGuess ?? word.english;
  const { themes } = await store().list();
  const result = await checkWithClaude({ spanish: word.spanish, guess, themes });
  if (!result) return null;
  const draft = draftFromCheck(result, guess, word.themes.length ? word.themes : result.themeSuggestion ? [result.themeSuggestion] : []);
  // A Norwegian translation I wrote myself (e.g. imported) wins over Claude's.
  if (word.norwegian) draft.norwegian = word.norwegian;
  // Keep my spelling if the corrected one is already another word.
  const clash = await store().findByKey(spanishKey(result.spanish));
  if (clash && clash.id !== id) draft.spanish = word.spanish;
  return store().update(id, draft);
}

/** Archive hides a word from the list (reversible); restore brings it back. */
export async function setWordArchived(id: string, archived: boolean): Promise<GlossaryWord> {
  await requireSession();
  return store().setArchived(id, archived);
}

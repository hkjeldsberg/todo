import type { Sentence } from "./types";

/** The exact form the {{word}} gap stands for (may differ from the lemma). */
export function clozeAnswerOf(sentence: Sentence): string {
  const [before, after] = sentence.cloze.split("{{word}}");
  if (after === undefined) return "";
  return sentence.spanish
    .slice(before.length, sentence.spanish.length - after.length)
    .trim()
    .replace(/[.,!?;:]$/, "")
    .trim();
}

/** Words of a sentence for the scrambler, punctuation dropped. */
export function tokenize(sentence: string): string[] {
  return sentence.replace(/[.,!?;:¡¿"«»]/g, "").split(/\s+/).filter(Boolean);
}

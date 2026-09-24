import type { ChoiceCard } from "@/features/srs/card";
import type { OpuestosContent, Word } from "./types";

const DISTRACTORS = 3;

/**
 * A missed (or practised) word as a Repaso card: "¿Cuál es el contrario de
 * «pesado»?" with the antonym correct and three words from other pairs,
 * same category first. `itemRef` is the word id; unknown ids give null.
 */
export function toReviewCard(itemRef: string, content: OpuestosContent): ChoiceCard | null {
  const byId = new Map(content.words.map((w) => [w.id, w]));
  const word = byId.get(itemRef);
  const antonym = word && byId.get(word.antonym_id);
  if (!word || !antonym) return null;

  const pairKey = (w: Word) => [w.id, w.antonym_id].sort().join("|");
  const own = pairKey(word);
  const candidates = content.words
    .filter((w) => pairKey(w) !== own)
    .sort(
      (a, b) =>
        Number(b.category === word.category) - Number(a.category === word.category) ||
        Math.abs(a.sort - word.sort) - Math.abs(b.sort - word.sort) ||
        a.sort - b.sort,
    );
  // One word per pair, so the options never contain an opposite pair of their own.
  const usedPairs = new Set<string>();
  const distractors: Word[] = [];
  for (const w of candidates) {
    if (distractors.length === DISTRACTORS) break;
    if (usedPairs.has(pairKey(w))) continue;
    usedPairs.add(pairKey(w));
    distractors.push(w);
  }

  return {
    type: "choice",
    prompt: `¿Cuál es el contrario de «${word.word}»?`,
    hint: word.translation,
    options: [
      { text: antonym.word, correct: true },
      ...distractors.map((w) => ({ text: w.word, correct: false })),
    ],
    explanation: `${word.word} means ${word.translation}; its opposite ${antonym.word} means ${antonym.translation}.`,
  };
}

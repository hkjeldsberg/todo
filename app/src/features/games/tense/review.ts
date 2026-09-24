import type { ChoiceCard } from "@/features/srs/card";
import { findPuzzle } from "./content";
import type { TenseContent } from "./types";

/** A missed memory fragment as a Repaso card. `itemRef` is the puzzle id. */
export function toReviewCard(itemRef: string, content: TenseContent): ChoiceCard | null {
  const found = findPuzzle(content, itemRef);
  if (!found) return null;
  const { puzzle } = found;
  return {
    type: "choice",
    prompt: `${puzzle.sentence_pre}___${puzzle.sentence_post}`,
    hint: puzzle.translation ?? undefined,
    options: puzzle.options.map((o) => ({ text: o.form, correct: o.correct })),
    explanation: puzzle.rule_feedback,
  };
}

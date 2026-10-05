import type { ChoiceCard } from "@/features/srs/card";
import { answerSentence, findPrompt, questionWith } from "./content";
import { RULE } from "./judge";
import type { ProbadorContent } from "./types";

/**
 * A missed prompt as a Repaso card: the question with its gap, and four full
 * answers — right, wrong pronoun, wrong verb, both wrong. The outfit's
 * description stands in for the picture. Unknown ids give null.
 */
export function toReviewCard(itemRef: string, content: ProbadorContent): ChoiceCard | null {
  const prompt = findPrompt(content, itemRef);
  if (!prompt) return null;
  const { pronoun, verb, complement } = prompt.answer_parts;
  const [badPronoun] = prompt.distractor_options.pronoun;
  const [badVerb] = prompt.distractor_options.verb;
  const right = answerSentence(prompt);
  const candidates = [
    right,
    `${badPronoun} ${verb} ${complement}.`,
    `${pronoun} ${badVerb} ${complement}.`,
    `${badPronoun} ${badVerb} ${complement}.`,
  ];
  return {
    type: "choice",
    prompt: questionWith(prompt),
    hint: content.outfits[prompt.outfit_id]?.description,
    options: [...new Set(candidates)].map((text) => ({ text, correct: text === right })),
    explanation: RULE[prompt.target_verb],
  };
}

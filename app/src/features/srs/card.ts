/**
 * A review card any source can produce. Games turn a missed item into a
 * `choice` card (see GameModule.toReviewCard), so the Repaso runner can quiz it
 * without loading any 3D code.
 */
export type ChoiceCard = {
  type: "choice";
  /** Spanish prompt. `___` marks the gap when the options fill a blank. */
  prompt: string;
  /** Optional English context under the prompt. */
  hint?: string;
  options: { text: string; correct: boolean }[];
  /** One short English sentence explaining the rule, shown after answering. */
  explanation?: string;
};

export type ReviewCard = ChoiceCard;

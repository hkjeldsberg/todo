import type { ChoiceCard } from "@/features/srs/card";
import { findPanel } from "./content";
import { plainText } from "./game";
import { VERBS, type WasContent } from "./types";

const PANEL_HINT = {
  establishing: "Scene-setting panel",
  action: "Action panel",
} as const;

/**
 * A missed panel as a Repaso card: the panel's sentence with `___` for the
 * blank and the four verbs as options. `itemRef` is the panel id; unknown ids give null.
 */
export function toReviewCard(itemRef: string, content: WasContent): ChoiceCard | null {
  const panel = findPanel(content, itemRef);
  if (!panel) return null;
  const blank = panel.sentence_pre.trim() === "" ? "___" : " ___";
  return {
    type: "choice",
    prompt: `${panel.sentence_pre.trimEnd()}${blank}${panel.sentence_post}`.trim(),
    hint: PANEL_HINT[panel.panel_type],
    options: VERBS.map((verb) => ({ text: verb, correct: verb === panel.correct_verb })),
    explanation: plainText(panel.rule_feedback),
  };
}

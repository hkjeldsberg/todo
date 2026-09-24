import type { ChoiceCard } from "@/features/srs/card";
import type { LaberintoContent } from "./types";

/** A missed room becomes a three-option review card: the prompt and its doors. */
export function toReviewCard(itemRef: string, content: LaberintoContent): ChoiceCard | null {
  const node = content.find((n) => n.node_id === itemRef);
  if (!node) return null;
  const correct = node.doors.find((d) => d.correct);
  return {
    type: "choice",
    prompt: node.ambient_prompt,
    hint: "Which door completes the sentence?",
    options: node.doors.map((d) => ({ text: d.text, correct: d.correct })),
    explanation: correct?.feedback ?? node.feedback_imperfect ?? undefined,
  };
}

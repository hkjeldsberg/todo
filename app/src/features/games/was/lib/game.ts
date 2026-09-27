import type { Panel } from "./types";

export function isCorrect(panel: Panel, verb: string): boolean {
  return panel.correct_verb === verb.toLowerCase();
}

/** Capitalise the verb when it opens the sentence ("Era una noche…"). */
export function displayVerb(panel: Panel, verb: string): string {
  return panel.sentence_pre.trim() === "" ? verb.charAt(0).toUpperCase() + verb.slice(1) : verb;
}

/** `*word*` markers removed, for plain-text surfaces (review cards). */
export function plainText(text: string): string {
  return text.replace(/\*([^*]+)\*/g, "$1");
}

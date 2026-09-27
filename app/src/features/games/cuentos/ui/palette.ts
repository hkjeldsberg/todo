import type { Highlight } from "../lib/text";

/**
 * Tense colours from the PRD (pretérito blue, imperfecto orange, subjuntivo
 * green, reflexivos purple), softened to sit on memo's warm page: a pale wash
 * behind the word and a stronger underline.
 */
export const HIGHLIGHT_STYLE: Record<Highlight, { label: string; wash: string; line: string }> = {
  preterite: { label: "Pretérito", wash: "#dbe8ff", line: "#4f7fe0" },
  imperfect: { label: "Imperfecto", wash: "#ffe3c4", line: "#e98a2a" },
  subjunctive: { label: "Subjuntivo", wash: "#d3f1dc", line: "#2e9e57" },
  reflexive: { label: "Reflexivos", wash: "#ecdcff", line: "#8a5ae6" },
};

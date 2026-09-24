import type { SessionCard } from "../types";

export type ViewProps<V extends SessionCard["view"]> = {
  card: Extract<SessionCard, { view: V }>;
  /** Called once, when the answer is checked. */
  onResult(correct: boolean, answer: string): void;
  /** Called when the learner moves on. */
  onNext(): void;
};

/** Lowercase, trimmed, trailing punctuation dropped: what counts as "the same". */
export function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/[.,!?;:¡¿]/g, "").replace(/\s+/g, " ");
}

/** Same letters ignoring accents — accepted, but the accent gets pointed out. */
export function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

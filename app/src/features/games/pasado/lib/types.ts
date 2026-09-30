import type { Pronoun } from "@/features/srs/verbs";

export const PAST_TENSES = ["preterite", "imperfect"] as const;
export type PastTense = (typeof PAST_TENSES)[number];

/** One row of todo.past_drills / content/pasado.json. */
export type Drill = {
  id: string;
  infinitive: string;
  person: Pronoun;
  /** Spanish sentence with `{verb}` where the conjugated form goes. */
  sentence_template: string;
  correct_tense: PastTense;
  /** The word(s) in the sentence that force the tense, e.g. "Ayer", "siempre". */
  trigger_word: string;
  english_translation: string;
};

/** Pretérito + Imperfecto forms of one verb, from todo.verbs / content/verbs.json. */
export type PastVerb = {
  infinitive: string;
  english: string;
  isIrregular: boolean;
  forms: Record<PastTense, Record<Pronoun, string>>;
};

export type PasadoContent = {
  drills: Drill[];
  /** Every verb the drills or the irregular matrix use, keyed by infinitive. */
  verbs: Record<string, PastVerb>;
};

/** One todo.past_progress row, in client shape. A verb without one is box 1, due now. */
export type VerbProgress = {
  box: number;
  /** ISO timestamp */
  next: string;
  right: number;
  wrong: number;
};

export type Leitner = Record<string, VerbProgress>;

/** What the page hands the game as initialProgress. `persisted` = the table is reachable. */
export type PasadoProgress = { leitner: Leitner; persisted: boolean };

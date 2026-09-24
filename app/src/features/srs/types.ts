import type { ChoiceCard } from "./card";

export type ReviewKind = "word" | "phrase" | "conjugation" | "game_item";

/** Which slice of the queue a session draws from. */
export type SessionFilter = "all" | "words" | "phrases" | "conjugar" | "games";
/** How word cards are shown. */
export type WordMode = "mixed" | "cloze" | "scramble";

export const FILTER_KINDS: Record<SessionFilter, ReviewKind[]> = {
  all: ["word", "phrase", "conjugation", "game_item"],
  words: ["word"],
  phrases: ["phrase"],
  conjugar: ["conjugation"],
  games: ["game_item"],
};

export type Sentence = { spanish: string; english: string; cloze: string };

type CardBase = {
  /** Unique within the session. */
  key: string;
  kind: ReviewKind;
  ref: string;
  source: string;
  box: number;
  isNew: boolean;
  /** Small tag above the card, e.g. "Palabra". */
  label: string;
};

export type SessionCard = CardBase &
  (
    | {
        view: "cloze";
        word: string;
        meaning: string;
        pos: string | null;
        sentence: Sentence;
        /** Tap-to-answer options behind the Hint toggle (includes the answer). */
        options: string[];
      }
    | {
        view: "scramble";
        word: string;
        meaning: string;
        pos: string | null;
        sentence: Sentence;
        /** Tray order: indexes into tokenize(sentence.spanish), shuffled on the server. */
        order: number[];
      }
    | {
        view: "choice";
        card: ChoiceCard;
        /** Shown after answering, e.g. the verb's full tense table. */
        table?: { title: string; rows: [string, string][] };
      }
    | {
        view: "recall";
        front: string;
        back: string;
        frontLang: "es" | "en";
      }
  );

export type AnswerInput = {
  kind: ReviewKind;
  ref: string;
  source: string;
  correct: boolean;
  mode: SessionCard["view"];
  answer?: string;
};

export type ReviewStats = {
  dueByKind: Record<ReviewKind, number>;
  due: number;
  newWords: number;
  /** words per Leitner box, index 0 = unseen */
  wordBoxes: number[];
  fluency: number;
};

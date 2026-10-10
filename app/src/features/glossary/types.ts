export const POS = ["noun", "verb", "adjective", "adverb", "preposition", "expression", "other"] as const;
export type Pos = (typeof POS)[number];
export const GENDERS = ["m", "f", "mf"] as const;
export type Gender = (typeof GENDERS)[number];
export const VERDICTS = ["correct", "close", "different"] as const;
export type Verdict = (typeof VERDICTS)[number];

export type Example = { es: string; en: string };

/** One word as the client sees it (todo.glossary_words + its themes + Repaso flag). */
export type GlossaryWord = {
  id: string;
  spanish: string;
  english: string;
  norwegian: string | null;
  pos: Pos | null;
  gender: Gender | null;
  myGuess: string | null;
  verdict: Verdict | null;
  note: string | null;
  examples: Example[];
  status: "unchecked" | "checked";
  source: "manual" | "import";
  themes: string[];
  inReview: boolean;
  /** ISO timestamp when archived (hidden from the list), or null. */
  archivedAt: string | null;
  createdAt: string;
};

/** Everything the user can set on a word (create and edit). */
export type WordDraft = {
  spanish: string;
  english: string;
  norwegian: string | null;
  pos: Pos | null;
  gender: Gender | null;
  myGuess: string | null;
  verdict: Verdict | null;
  note: string | null;
  examples: Example[];
  status: "unchecked" | "checked";
  themes: string[];
  /** The word's date (YYYY-MM-DD): when I noted it down. Defaults to the day it's added. */
  date?: string;
};

/** What Claude returns for a new (or unchecked) word. */
export type CheckResult = {
  spanish: string;
  spellingFixed: boolean;
  english: string;
  norwegian: string;
  pos: Pos;
  gender: Gender | null;
  verdict: Verdict;
  note: string;
  examples: Example[];
  themeSuggestion: string | null;
};

export type SortKey = "spanish" | "english" | "newest" | "oldest";
export type GroupKey = "none" | "pos" | "theme" | "date";

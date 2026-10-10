import { z } from "zod";
import { GENDERS, POS, VERDICTS, type CheckResult, type GlossaryWord, type WordDraft } from "./types";

/** Draft validation + conversions shared by the actions, the enrich script and the tests. */

const text = (max: number) => z.string().trim().min(1).max(max);
const optional = (max: number) => z.string().trim().max(max).nullable();

export const draftSchema = z.object({
  spanish: text(80),
  english: text(120),
  norwegian: optional(120),
  pos: z.enum(POS).nullable(),
  gender: z.enum(GENDERS).nullable(),
  myGuess: optional(120),
  verdict: z.enum(VERDICTS).nullable(),
  note: optional(300),
  examples: z.array(z.object({ es: text(200), en: text(200) })).max(4),
  status: z.enum(["unchecked", "checked"]),
  themes: z.array(text(40)).max(12),
  date: z.iso.date().optional(),
});

export function parseDraft(raw: unknown): WordDraft {
  const draft = draftSchema.parse(raw) as WordDraft;
  return { ...draft, gender: draft.pos === "noun" ? draft.gender : null, norwegian: draft.norwegian || null };
}

/** A checked word from Claude's result plus what the learner typed. */
export function draftFromCheck(result: CheckResult, guess: string, themes: string[]): WordDraft {
  return {
    spanish: result.spanish,
    english: result.english,
    norwegian: result.norwegian,
    pos: result.pos,
    gender: result.gender,
    myGuess: guess,
    verdict: result.verdict,
    note: result.note || null,
    examples: result.examples,
    status: "checked",
    themes,
  };
}

/** Saved without Claude: only what was typed, to be checked later. */
export function uncheckedDraft(spanish: string, guess: string, themes: string[]): WordDraft {
  return {
    spanish,
    english: guess,
    norwegian: null,
    pos: null,
    gender: null,
    myGuess: guess,
    verdict: null,
    note: null,
    examples: [],
    status: "unchecked",
    themes,
  };
}

export function draftOf(word: GlossaryWord): WordDraft {
  const { spanish, english, norwegian, pos, gender, myGuess, verdict, note, examples, status, themes } = word;
  return { spanish, english, norwegian, pos, gender, myGuess, verdict, note, examples, status, themes };
}

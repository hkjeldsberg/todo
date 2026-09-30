import type { Pronoun } from "@/features/srs/verbs";
import type { Drill, PasadoContent, PastTense } from "./types";

export const TENSE_LABEL: Record<PastTense, string> = { preterite: "Pretérito", imperfect: "Imperfecto" };

const REGULAR_ENDINGS: Record<PastTense, Record<"ar" | "er", string[]>> = {
  preterite: { ar: ["é", "aste", "ó", "amos", "aron"], er: ["í", "iste", "ió", "imos", "ieron"] },
  imperfect: { ar: ["aba", "abas", "aba", "ábamos", "aban"], er: ["ía", "ías", "ía", "íamos", "ían"] },
};

const PERSON_INDEX: Record<Pronoun, number> = { yo: 0, tú: 1, "él/ella": 2, nosotros: 3, ellos: 4 };

/** What the form would be if the verb were regular: comer → comimos. */
export function regularForm(infinitive: string, tense: PastTense, person: Pronoun): string {
  const group = infinitive.endsWith("ar") ? "ar" : "er";
  return infinitive.slice(0, -2) + REGULAR_ENDINGS[tense][group][PERSON_INDEX[person]];
}

// Longest first, so "ieron" wins over "o".
const SPLIT_ENDINGS: Record<PastTense, string[]> = {
  preterite: ["ieron", "eron", "iste", "imos", "io", "e", "o", "i"],
  imperfect: ["íamos", "amos", "ían", "ías", "ía", "an", "as", "a"],
};

/**
 * Splits an irregular form into [root, ending] so the root can glow: hice → ["hic", "e"],
 * éramos → ["ér", "amos"]. Regular forms (the ones regularForm predicts) give null.
 */
export function irregularSplit(
  infinitive: string,
  tense: PastTense,
  person: Pronoun,
  form: string,
): [string, string] | null {
  if (form === regularForm(infinitive, tense, person)) return null;
  const ending = SPLIT_ENDINGS[tense].find((e) => form.length > e.length && form.endsWith(e));
  return ending ? [form.slice(0, -ending.length), ending] : [form, ""];
}

export function formOf(content: PasadoContent, drill: Drill, tense: PastTense = drill.correct_tense): string {
  return content.verbs[drill.infinitive].forms[tense][drill.person];
}

/** Lower-case, trimmed, single spaces. Accents are kept: hablo ≠ habló. */
export function normalizeAnswer(text: string): string {
  return text.trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
}

const stripAccents = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "");

export type LockVerdict = {
  correct: boolean;
  tenseRight: boolean;
  formRight: boolean;
  /** Right letters, wrong or missing accent. Still wrong, but worth saying. */
  accentOnly: boolean;
  expected: string;
};

/** A Tense Lock answer: the locked tense and the typed form both have to be right. */
export function judgeLock(content: PasadoContent, drill: Drill, tense: PastTense, typed: string): LockVerdict {
  const expected = formOf(content, drill);
  const answer = normalizeAnswer(typed);
  const formRight = answer === expected;
  const tenseRight = tense === drill.correct_tense;
  return {
    correct: formRight && tenseRight,
    tenseRight,
    formRight,
    accentOnly: !formRight && stripAccents(answer) === stripAccents(expected),
    expected,
  };
}

/** The template with the right form in place: "Ayer nosotros comimos paella." */
export function solvedSentence(content: PasadoContent, drill: Drill): string {
  return drill.sentence_template.replace("{verb}", formOf(content, drill));
}

/** Why the trigger picks the tense. First matching rule wins, then the tense default. */
const RULES: { test: RegExp; tense: PastTense; text: string }[] = [
  { test: /mientras/i, tense: "imperfect", text: "mientras sets an ongoing background action → imperfecto." },
  { test: /de repente/i, tense: "preterite", text: "de repente marks a sudden, one-off event → pretérito." },
  { test: /siempre|cada|todos|todas|los (lunes|domingos|viernes)|normalmente|antes|por aquel entonces/i, tense: "imperfect", text: "a repeated habit or what things used to be like → imperfecto." },
  { test: /de (niñ|pequeñ|joven|adolescente)|cuando .*era/i, tense: "imperfect", text: "a period of life described as background → imperfecto." },
  { test: /\d|años|horas/i, tense: "preterite", text: "a closed, counted stretch of time → pretérito." },
  { test: /ayer|anoche|pasad|esta mañana/i, tense: "preterite", text: "a finished action at a specific point in the past → pretérito." },
];

const DEFAULT_RULE: Record<PastTense, string> = {
  preterite: "a completed action with a clear start and end → pretérito.",
  imperfect: "a habit, a description or something in progress → imperfecto.",
};

export function ruleFor(drill: Drill): string {
  const rule = RULES.find((r) => r.tense === drill.correct_tense && r.test.test(drill.trigger_word));
  return `“${drill.trigger_word}”: ${rule?.text ?? DEFAULT_RULE[drill.correct_tense]}`;
}

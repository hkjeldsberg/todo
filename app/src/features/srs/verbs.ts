import data from "@/content/verbs.json";

/**
 * Conjugation data (from Spanyard, plus Imperfecto). Authored content, so it
 * ships with the build like the grammar topics; `todo.verbs` mirrors it.
 */
export const PRONOUNS = ["yo", "tú", "él/ella", "nosotros", "ellos"] as const;
export const TENSES = ["Presente", "Pretérito", "Imperfecto", "Perfecto", "Futuro"] as const;

export type Pronoun = (typeof PRONOUNS)[number];
export type Tense = (typeof TENSES)[number];

export type VerbEntry = {
  infinitive: string;
  english: string;
  isIrregular: boolean;
  forms: Record<Tense, Record<Pronoun, string>>;
};

export const VERBS = data as VerbEntry[];

export const TENSE_GROUPS = {
  all: TENSES,
  pasado: ["Pretérito", "Imperfecto", "Perfecto"],
  futuro: ["Futuro"],
  presente: ["Presente"],
} as const satisfies Record<string, readonly Tense[]>;

export type TenseGroup = keyof typeof TENSE_GROUPS;

export function verbByInfinitive(infinitive: string): VerbEntry | undefined {
  return VERBS.find((verb) => verb.infinitive === infinitive);
}

/** `conj:<infinitive>:<tense>:<pronoun>` — the SRS ref of one form. */
export function conjRef(infinitive: string, tense: Tense, pronoun: Pronoun): string {
  return `conj:${infinitive}:${tense}:${pronoun}`;
}

export function parseConjRef(
  ref: string,
): { verb: VerbEntry; tense: Tense; pronoun: Pronoun } | null {
  const [prefix, infinitive, tense, pronoun] = ref.split(":");
  const verb = verbByInfinitive(infinitive);
  if (
    prefix !== "conj" ||
    !verb ||
    !TENSES.includes(tense as Tense) ||
    !PRONOUNS.includes(pronoun as Pronoun)
  ) {
    return null;
  }
  return { verb, tense: tense as Tense, pronoun: pronoun as Pronoun };
}

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Three wrong options: at least one from the same tense (other pronoun) and one
 * from the same pronoun (other tense) — the two confusions that matter — then
 * anything else from the verb's table. Never includes the correct form.
 */
export function pickDistractors(
  verb: VerbEntry,
  tense: Tense,
  pronoun: Pronoun,
  random = Math.random,
): string[] {
  const correct = verb.forms[tense][pronoun];
  const sameTense = PRONOUNS.filter((p) => p !== pronoun)
    .map((p) => verb.forms[tense][p])
    .filter((form) => form !== correct);
  const samePronoun = TENSES.filter((t) => t !== tense)
    .map((t) => verb.forms[t][pronoun])
    .filter((form) => form !== correct);
  const pool = [
    ...new Set(TENSES.flatMap((t) => PRONOUNS.map((p) => verb.forms[t][p]))),
  ].filter((form) => form !== correct);

  const picked: string[] = [];
  const first = shuffle(sameTense, random)[0];
  if (first) picked.push(first);
  const second = shuffle(samePronoun.filter((f) => !picked.includes(f)), random)[0];
  if (second) picked.push(second);
  for (const form of shuffle(pool.filter((f) => !picked.includes(f)), random)) {
    if (picked.length >= 3) break;
    picked.push(form);
  }
  return picked;
}

/**
 * Fresh conjugation combos for a drill, irregulars weighted double, never the
 * same verb/tense/pronoun twice, restricted to `tenses`.
 */
export function pickCombos(
  count: number,
  tenses: readonly Tense[] = TENSES,
  exclude: ReadonlySet<string> = new Set(),
  random = Math.random,
): { verb: VerbEntry; tense: Tense; pronoun: Pronoun }[] {
  const pool = VERBS.flatMap((verb) => (verb.isIrregular ? [verb, verb] : [verb]));
  const used = new Set(exclude);
  const out: { verb: VerbEntry; tense: Tense; pronoun: Pronoun }[] = [];

  for (let attempt = 0; out.length < count && attempt < count * 20; attempt++) {
    const verb = pool[Math.floor(random() * pool.length)];
    const tense = tenses[Math.floor(random() * tenses.length)];
    const pronoun = PRONOUNS[Math.floor(random() * PRONOUNS.length)];
    const ref = conjRef(verb.infinitive, tense, pronoun);
    if (used.has(ref)) continue;
    used.add(ref);
    out.push({ verb, tense, pronoun });
  }
  return out;
}

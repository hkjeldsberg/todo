/**
 * Deterministic grammar checks for location sentences.
 * "block" issues make the UI physically reject a drop; "wrong" issues explain a wrong final answer.
 */

export type GrammarRule = "hay-definite" | "de-el" | "a-el" | "estar-agreement" | "estar-indefinite";

export interface GrammarIssue {
  rule: GrammarRule;
  severity: "block" | "wrong";
  note: string;
}

const DEFINITE = new Set(["el", "la", "los", "las"]);
const SINGULAR_DET = new Set(["el", "la", "un", "una"]);
const PLURAL_DET = new Set(["los", "las", "unos", "unas", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "muchos", "muchas", "varios", "varias"]);
const INDEFINITE_DET = new Set(["un", "una", "unos", "unas", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "muchos", "muchas", "varios", "varias"]);
const ESTAR_SINGULAR = new Set(["está"]);
const ESTAR_PLURAL = new Set(["están"]);

export const NOTES: Record<GrammarRule, string> = {
  "hay-definite": "Hay is never used with definite articles (el, la, los, las). Use está.",
  "de-el": "De + el always contracts: del.",
  "a-el": "A + el always contracts: al.",
  "estar-agreement": "Está / están agrees with the thing being located.",
  "estar-indefinite": "For something new or counted (un, una, dos…), Spanish uses hay: Hay un…",
};

/** Words with original casing, punctuation stripped. */
function words(sentence: string): string[] {
  return sentence
    .replace(/[¿?¡!.,;:]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function lintSentence(sentence: string): GrammarIssue[] {
  const raw = words(sentence);
  const w = raw.map((x) => x.toLowerCase());
  const issues: GrammarIssue[] = [];
  const add = (rule: GrammarRule, severity: GrammarIssue["severity"], note = NOTES[rule]) => {
    if (!issues.some((i) => i.rule === rule)) issues.push({ rule, severity, note });
  };

  for (let i = 0; i < w.length; i++) {
    const next = w[i + 1];
    const nextRaw = raw[i + 1];

    if (w[i] === "hay" && next && DEFINITE.has(next)) add("hay-definite", "block");

    // "de El Salvador": a capitalised El mid-sentence is part of a proper name, not the article.
    const nextIsArticleEl = nextRaw === "el";
    if (w[i] === "de" && nextIsArticleEl) add("de-el", "block");
    if (w[i] === "a" && nextIsArticleEl) add("a-el", "block");

    const isSingularVerb = ESTAR_SINGULAR.has(w[i]);
    const isPluralVerb = ESTAR_PLURAL.has(w[i]);
    if (!isSingularVerb && !isPluralVerb) continue;

    // Subject noun phrase right before ("el gato está") or right after ("está el gato").
    const dets = [w[i - 2], w[i + 1]].filter((d): d is string => d !== undefined);
    for (const det of dets) {
      if (INDEFINITE_DET.has(det)) add("estar-indefinite", "wrong");
      if (isSingularVerb && PLURAL_DET.has(det)) {
        add("estar-agreement", "wrong", "The subject is plural, so use están, not está.");
      }
      if (isPluralVerb && SINGULAR_DET.has(det)) {
        add("estar-agreement", "wrong", "The subject is singular, so use está, not están.");
      }
    }
  }
  return issues;
}

/** de/a + el → del/al. Other articles never contract. */
export function contract(preposition: "de" | "a", article: string): string {
  if (article === "el") return preposition === "de" ? "del" : "al";
  return `${preposition} ${article}`;
}

export function capitalizeFirst(s: string): string {
  return s.charAt(0).toLocaleUpperCase("es") + s.slice(1);
}

export const SLOT_BLANK = "___";

/** Fill "{0} {1} debajo del sofá." with tokens; empty slots render as a blank. */
export function assembleSentence(template: string, fills: readonly (string | null)[]): string {
  const filled = template.replace(/\{(\d+)\}/g, (_, n: string) => fills[Number(n)] ?? SLOT_BLANK);
  return /^[a-záéíóúñ]/.test(filled) ? capitalizeFirst(filled) : filled;
}

/** Case-, whitespace- and punctuation-insensitive comparison. Accents still matter. */
export function normalize(s: string): string {
  return s
    .toLocaleLowerCase("es")
    .replace(/[¿?¡!.,;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

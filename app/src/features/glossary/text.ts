import type { GlossaryWord, GroupKey, Pos, SortKey } from "./types";

/** Pure list logic: keys, search, sort, group, highlight. Shared by the page, the actions and the scripts. */

const ARTICLES = /^(el|la|los|las|un|una|unos|unas)\s+/;

/** Lower-case, no accents (ñ kept), single spaces. */
export function fold(text: string): string {
  return text
    .toLocaleLowerCase("es")
    .replace(/ñ/g, "\u0001")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\u0001/g, "ñ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 'La Mesa' → 'mesa', 'el árbol' → 'arbol'. The dedupe and sort key. */
export function spanishKey(spanish: string): string {
  return fold(spanish).replace(ARTICLES, "");
}

/** English sort key: drops a leading the / a / an / to. */
export function englishKey(english: string): string {
  return fold(english).replace(/^(the|a|an|to)\s+/, "");
}

/** Search both languages (and Norwegian), ignoring accents and articles. */
export function matches(word: GlossaryWord, query: string): boolean {
  const q = fold(query);
  if (!q) return true;
  return [word.spanish, spanishKey(word.spanish), word.english, word.norwegian ?? ""].some((field) => fold(field).includes(q));
}

export function sortWords(words: GlossaryWord[], by: SortKey): GlossaryWord[] {
  const out = [...words];
  if (by === "newest") return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const key = by === "spanish" ? (w: GlossaryWord) => spanishKey(w.spanish) : (w: GlossaryWord) => englishKey(w.english);
  return out.sort((a, b) => key(a).localeCompare(key(b), "es"));
}

export const POS_LABEL: Record<Pos, string> = {
  noun: "Nouns",
  verb: "Verbs",
  adjective: "Adjectives",
  adverb: "Adverbs",
  preposition: "Prepositions",
  expression: "Expressions",
  other: "Other",
};

export const POS_SHORT: Record<Pos, string> = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  preposition: "preposition",
  expression: "expression",
  other: "other",
};

const POS_ORDER: (Pos | null)[] = ["noun", "verb", "adjective", "adverb", "preposition", "expression", "other", null];
export const NO_THEME = "No theme";
export const NO_TYPE = "Not checked yet";

export type Group = { key: string; label: string; words: GlossaryWord[] };

/** Already-sorted words → groups. By theme, a word shows under each of its themes. */
export function groupWords(words: GlossaryWord[], by: GroupKey): Group[] {
  if (by === "none") return [{ key: "all", label: "", words }];
  if (by === "pos") {
    return POS_ORDER.map((pos) => ({
      key: pos ?? "none",
      label: pos ? POS_LABEL[pos] : NO_TYPE,
      words: words.filter((w) => w.pos === pos),
    })).filter((g) => g.words.length > 0);
  }
  const themes = [...new Set(words.flatMap((w) => w.themes))].sort((a, b) => fold(a).localeCompare(fold(b), "es"));
  const groups = themes.map((t) => ({ key: `t:${t}`, label: t, words: words.filter((w) => w.themes.includes(t)) }));
  const loose = words.filter((w) => w.themes.length === 0);
  return loose.length ? [...groups, { key: "t:", label: NO_THEME, words: loose }] : groups;
}

/**
 * Where the word sits in an example sentence, for highlighting: the whole
 * phrase if it's there, else the first word starting like the headword's first
 * word (cocinar → cocina, echar de menos → echo). Null if nothing fits.
 */
export function highlightRange(sentence: string, spanish: string): [number, number] | null {
  const key = spanishKey(spanish);
  const folded = fold(sentence);
  // fold() keeps length for single-codepoint accents, so indexes line up with the original.
  if (folded.length === sentence.length) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = new RegExp(`(^|[^\\p{L}])(${escaped})`, "u").exec(folded);
    if (m) {
      const at = m.index + m[1].length;
      return [at, at + key.length];
    }
  }
  const first = key.split(" ")[0];
  const stem = first.length > 4 ? first.slice(0, Math.max(3, first.length - 2)) : first;
  const re = /[\p{L}]+/gu;
  for (let m = re.exec(sentence); m; m = re.exec(sentence)) {
    if (fold(m[0]).startsWith(stem)) return [m.index, m.index + m[0].length];
  }
  return null;
}

export function genderLabel(gender: GlossaryWord["gender"]): string | null {
  if (gender === "m") return "masculine";
  if (gender === "f") return "feminine";
  if (gender === "mf") return "masculine / feminine";
  return null;
}

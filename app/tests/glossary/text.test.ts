import { describe, expect, it } from "vitest";
import seed from "@/content/glossary-seed.json";
import { parseDraft, uncheckedDraft } from "@/features/glossary/draft";
import { englishKey, fold, groupWords, highlightRange, matches, NO_THEME, sortWords, spanishKey } from "@/features/glossary/text";
import type { GlossaryWord } from "@/features/glossary/types";
import { parseCsv, validateRows } from "../../scripts/glossary-csv.mjs";

const words: GlossaryWord[] = seed.words.map((w, i) => ({
  id: `w${i}`,
  spanish: w.spanish,
  english: w.english,
  norwegian: w.norwegian,
  pos: w.pos as GlossaryWord["pos"],
  gender: (w.gender as GlossaryWord["gender"]) ?? null,
  myGuess: w.my_guess,
  verdict: w.guess_verdict as GlossaryWord["verdict"],
  note: w.guess_note,
  examples: w.examples,
  status: "checked",
  source: "import",
  themes: w.themes,
  inReview: false,
  createdAt: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(),
}));
const bySpanish = (s: string) => words.find((w) => w.spanish === s)!;

describe("glossary keys and search", () => {
  it("folds accents but keeps ñ, and drops articles from the key", () => {
    expect(fold("  Árbol  Ñandú ")).toBe("arbol ñandu");
    expect(spanishKey("La Nutricionista")).toBe("nutricionista");
    expect(spanishKey("el árbol")).toBe("arbol");
    expect(spanishKey("echar de menos")).toBe("echar de menos");
    expect(englishKey("to cook")).toBe("cook");
  });

  it("finds words in any language, ignoring accents (cafe → el café)", () => {
    expect(matches(bySpanish("el café"), "cafe")).toBe(true);
    expect(matches(bySpanish("el café"), "kaffe")).toBe(true);
    expect(matches(bySpanish("la mesa"), "TABLE")).toBe(true);
    expect(matches(bySpanish("la mesa"), "cafe")).toBe(false);
  });
});

describe("glossary sort and group", () => {
  it("sorts Spanish ignoring articles and accents: el árbol under A", () => {
    const sorted = sortWords(words, "spanish").map((w) => w.spanish);
    expect(sorted[0]).toBe("el agua");
    expect(sorted[1]).toBe("el árbol");
    expect(sorted.at(-1)).toBe("la nutricionista");
    expect(sortWords(words, "english")[0].english).toBe("cheap");
    expect(sortWords(words, "newest")[0].spanish).toBe("echar de menos");
  });

  it("groups by type in a fixed order and by theme with a word under each theme", () => {
    expect(groupWords(words, "pos").map((g) => g.key)).toEqual(["noun", "verb", "adjective", "adverb", "preposition", "expression"]);
    const byTheme = groupWords(words, "theme");
    const coffee = byTheme.filter((g) => g.words.some((w) => w.spanish === "el café")).map((g) => g.label);
    expect(coffee).toEqual(["en la casa", "en la tienda"]);
    const loose = groupWords([{ ...words[0], themes: [] }], "theme");
    expect(loose.map((g) => g.label)).toEqual([NO_THEME]);
    expect(groupWords(words, "none")[0].words).toHaveLength(10);
  });
});

describe("glossary example highlighting", () => {
  const mark = (sentence: string, spanish: string) => {
    const r = highlightRange(sentence, spanish);
    return r && sentence.slice(r[0], r[1]);
  };
  it("marks the word, its inflections and multi-word expressions", () => {
    expect(mark("Hay un árbol enorme delante de mi casa.", "el árbol")).toBe("árbol");
    expect(mark("Mi padre cocina muy bien.", "cocinar")).toBe("cocina");
    expect(mark("El gato duerme encima del sofá.", "encima de")).toBe("encima de");
    expect(mark("Echo de menos a mi familia.", "echar de menos")).toBe("Echo");
    expect(mark("Busco un hotel barato.", "la mesa")).toBeNull();
    // whole words only: no match in the middle of another word
    expect(mark("Las comesas.", "la mesa")).toBeNull();
  });
  it("finds the headword in every seed example", () => {
    for (const w of words) for (const e of w.examples) expect(highlightRange(e.es, w.spanish), `${w.spanish}: ${e.es}`).not.toBeNull();
  });
});

describe("glossary drafts and CSV", () => {
  it("validates drafts and drops gender on non-nouns", () => {
    const d = parseDraft({ ...uncheckedDraft(" la silla ", "chair", ["en la casa"]), pos: "verb", gender: "f" });
    expect(d).toMatchObject({ spanish: "la silla", english: "chair", gender: null, status: "unchecked", myGuess: "chair" });
    expect(() => parseDraft({ ...uncheckedDraft("", "chair", []) })).toThrow();
    expect(() => parseDraft({ ...uncheckedDraft("x", "y", []), pos: "pronoun" })).toThrow();
  });

  it("parses quoted CSV, skips the header, rejects empty cells and warns on English", () => {
    const { ok, bad, warnings } = validateRows(parseCsv('spanish,english,theme\r\n"el pan, fresco",bread,en la tienda;En La Casa\r\n,x\r\nthe table,la mesa\n'));
    expect(ok.map((r) => r.spanish)).toEqual(["el pan, fresco", "the table"]);
    expect(ok[0].themes).toEqual(["en la tienda", "en la casa"]);
    expect(bad).toEqual([{ line: 3, message: "empty Spanish or English cell" }]);
    expect(warnings).toHaveLength(1);
  });
});

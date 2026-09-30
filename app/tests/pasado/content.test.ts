import { describe, expect, it } from "vitest";
import raw from "@/content/pasado.json";
import { bundledContent, contentFromRows, findDrill } from "@/features/games/pasado/lib/content";
import { formOf, irregularSplit, judgeLock, regularForm, ruleFor, solvedSentence } from "@/features/games/pasado/lib/forms";
import { MATRIX, MATRIX_VERBS } from "@/features/games/pasado/lib/matrix";

const content = bundledContent();

describe("pasado content", () => {
  it("loads every drill with a verb, a trigger inside the sentence and both tenses per verb", () => {
    expect(content.drills.length).toBe(raw.drills.length);
    const byVerb = Map.groupBy(content.drills, (d) => d.infinitive);
    for (const [verb, drills] of byVerb) {
      expect(content.verbs[verb], verb).toBeDefined();
      expect(new Set(drills.map((d) => d.correct_tense)), verb).toEqual(new Set(["preterite", "imperfect"]));
    }
  });

  it("covers every verb of the irregular matrix with drills", () => {
    const drilled = new Set(content.drills.map((d) => d.infinitive));
    for (const verb of MATRIX_VERBS) expect(drilled.has(verb), verb).toBe(true);
  });

  it("has the PRD's matrix forms", () => {
    const f = (v: string, t: "preterite" | "imperfect") => Object.values(content.verbs[v].forms[t]);
    expect(f("ser", "preterite")).toEqual(f("ir", "preterite"));
    expect(f("dar", "preterite")).toEqual(["di", "diste", "dio", "dimos", "dieron"]);
    expect(f("ver", "preterite")).toEqual(["vi", "viste", "vio", "vimos", "vieron"]);
    expect(f("decir", "preterite")).toEqual(["dije", "dijiste", "dijo", "dijimos", "dijeron"]);
    expect(f("ver", "imperfect")).toEqual(["veía", "veías", "veía", "veíamos", "veían"]);
    expect(MATRIX.preterite).toHaveLength(12);
    expect(MATRIX.imperfect.map((r) => r.infinitives[0])).toEqual(["ser", "ir", "ver"]);
  });

  it("rejects bad rows", () => {
    const row = raw.drills[0];
    expect(() => contentFromRows([])).toThrow();
    expect(() => contentFromRows([{ ...row, correct_tense: "future" }])).toThrow();
    expect(() => contentFromRows([{ ...row, person: "vosotros" }])).toThrow();
    expect(() => contentFromRows([{ ...row, sentence_template: "Sin verbo." }])).toThrow();
    expect(() => contentFromRows([{ ...row, infinitive: "nadar" }])).toThrow(/no conjugation/);
    expect(() => contentFromRows([{ ...row, trigger_word: "mañana" }])).toThrow(/trigger/);
    expect(() => contentFromRows([row, row])).toThrow(/twice/);
  });
});

describe("pasado forms", () => {
  const drill = findDrill(content, "comer_1")!; // Ayer nosotros {verb} paella en la playa.

  it("fills the template", () => {
    expect(solvedSentence(content, drill)).toBe("Ayer nosotros comimos paella en la playa.");
    expect(formOf(content, drill, "imperfect")).toBe("comíamos");
  });

  it("needs both the tense and the form", () => {
    expect(judgeLock(content, drill, "preterite", "  Comimos ").correct).toBe(true);
    const wrongTense = judgeLock(content, drill, "imperfect", "comimos");
    expect(wrongTense).toMatchObject({ correct: false, tenseRight: false, formRight: true });
    const wrongForm = judgeLock(content, drill, "preterite", "comíamos");
    expect(wrongForm).toMatchObject({ correct: false, tenseRight: true, formRight: false, accentOnly: false });
  });

  it("counts a missing accent as wrong but says so", () => {
    const d = findDrill(content, "hablar_1")!; // Ayer yo hablé …
    expect(judgeLock(content, d, "preterite", "hable")).toMatchObject({ correct: false, accentOnly: true });
  });

  it("predicts regular forms and splits irregular roots", () => {
    expect(regularForm("hablar", "imperfect", "nosotros")).toBe("hablábamos");
    expect(regularForm("vivir", "preterite", "él/ella")).toBe("vivió");
    expect(irregularSplit("comer", "preterite", "nosotros", "comimos")).toBeNull();
    expect(irregularSplit("hacer", "preterite", "yo", "hice")).toEqual(["hic", "e"]);
    expect(irregularSplit("decir", "preterite", "ellos", "dijeron")).toEqual(["dij", "eron"]);
    expect(irregularSplit("ser", "imperfect", "nosotros", "éramos")).toEqual(["ér", "amos"]);
    expect(irregularSplit("ver", "imperfect", "yo", "veía")).toEqual(["ve", "ía"]);
    expect(irregularSplit("ir", "imperfect", "yo", "iba")).toEqual(["ib", "a"]);
    expect(irregularSplit("querer", "imperfect", "yo", "quería")).toBeNull();
    // ver keeps regular-looking viste/vimos/vieron; only vi and vio lose the accent.
    expect(irregularSplit("ver", "preterite", "tú", "viste")).toBeNull();
    expect(irregularSplit("ver", "preterite", "él/ella", "vio")).toEqual(["v", "io"]);
    // Every matrix row has at least one glowing form.
    for (const [tense, rows] of Object.entries(MATRIX) as [keyof typeof MATRIX, (typeof MATRIX)["preterite"]][]) {
      for (const row of rows) {
        const verb = content.verbs[row.infinitives[0]];
        const glowing = Object.entries(verb.forms[tense]).filter(([person, form]) =>
          irregularSplit(verb.infinitive, tense, person as "yo", form),
        );
        expect(glowing.length, `${verb.infinitive} ${tense}`).toBeGreaterThan(0);
      }
    }
  });

  it("explains the trigger with the right tense", () => {
    expect(ruleFor(drill)).toMatch(/Ayer.*pretérito/);
    expect(ruleFor(findDrill(content, "estar_2")!)).toMatch(/Mientras.*imperfecto/);
    for (const d of content.drills) {
      expect(ruleFor(d), d.id).toMatch(d.correct_tense === "preterite" ? /pretérito\.$/ : /imperfecto\.$/);
    }
  });
});

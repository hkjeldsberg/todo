import { describe, expect, it } from "vitest";
import {
  PRONOUNS,
  TENSES,
  VERBS,
  conjRef,
  parseConjRef,
  pickCombos,
  pickDistractors,
} from "@/features/srs/verbs";

describe("verbs", () => {
  it("has every tense and pronoun filled for every verb", () => {
    for (const verb of VERBS) {
      for (const tense of TENSES) {
        for (const pronoun of PRONOUNS) {
          expect(verb.forms[tense][pronoun], `${verb.infinitive} ${tense} ${pronoun}`).toMatch(/\S/);
        }
      }
    }
  });

  it("has the three irregular imperfects right", () => {
    const imp = (inf: string) => VERBS.find((v) => v.infinitive === inf)!.forms.Imperfecto;
    expect(Object.values(imp("ser"))).toEqual(["era", "eras", "era", "éramos", "eran"]);
    expect(Object.values(imp("ir"))).toEqual(["iba", "ibas", "iba", "íbamos", "iban"]);
    expect(imp("hablar").nosotros).toBe("hablábamos");
    expect(imp("tener").nosotros).toBe("teníamos");
  });

  it("picks 3 distinct distractors that never include the answer", () => {
    for (const verb of VERBS) {
      for (const tense of TENSES) {
        const d = pickDistractors(verb, tense, "yo");
        expect(d).toHaveLength(3);
        expect(new Set(d).size).toBe(3);
        expect(d).not.toContain(verb.forms[tense].yo);
      }
    }
  });

  it("round-trips conjugation refs", () => {
    const ref = conjRef("tener", "Imperfecto", "nosotros");
    expect(parseConjRef(ref)?.verb.infinitive).toBe("tener");
    expect(parseConjRef("conj:nope:Presente:yo")).toBeNull();
  });

  it("picks unique combos within the requested tenses", () => {
    const combos = pickCombos(30, ["Pretérito", "Imperfecto"]);
    expect(combos).toHaveLength(30);
    const refs = combos.map((c) => conjRef(c.verb.infinitive, c.tense, c.pronoun));
    expect(new Set(refs).size).toBe(30);
    expect(combos.every((c) => c.tense === "Pretérito" || c.tense === "Imperfecto")).toBe(true);
  });
});

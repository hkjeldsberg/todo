import { describe, expect, it } from "vitest";
import { assembleSentence, contract, lintSentence, normalize } from "@/features/games/donde/model/grammar";

const rules = (s: string) => lintSentence(s).map((i) => i.rule);

describe("hay vs estar", () => {
  it("blocks hay + definite article", () => {
    for (const s of ["Hay el gato debajo del sofá.", "hay la mochila", "Hay los juguetes aquí", "Hay las sillas alrededor de la mesa."]) {
      const issue = lintSentence(s).find((i) => i.rule === "hay-definite");
      expect(issue?.severity).toBe("block");
    }
  });

  it("accepts hay + indefinite or number", () => {
    expect(rules("Hay un gato debajo del sofá.")).toEqual([]);
    expect(rules("Hay cuatro sillas alrededor de la mesa.")).toEqual([]);
  });

  it("accepts está + definite subject", () => {
    expect(rules("El gato está debajo del sofá.")).toEqual([]);
    expect(rules("La farmacia está enfrente del parque.")).toEqual([]);
  });

  it("flags estar + indefinite subject as wrong (not blocked)", () => {
    const issue = lintSentence("Un gato está debajo del sofá.")[0];
    expect(issue).toMatchObject({ rule: "estar-indefinite", severity: "wrong" });
    expect(rules("Está un gato debajo del sofá.")).toContain("estar-indefinite");
  });
});

describe("agreement", () => {
  it("está for singular, están for plural", () => {
    expect(rules("Las sillas están alrededor de la mesa.")).toEqual([]);
    expect(rules("Las sillas está alrededor de la mesa.")).toContain("estar-agreement");
    expect(rules("El gato están debajo del sofá.")).toContain("estar-agreement");
  });
});

describe("contractions", () => {
  it("blocks de el / a el", () => {
    expect(lintSentence("La farmacia está enfrente de el parque.")[0]).toMatchObject({ rule: "de-el", severity: "block" });
    expect(rules("Voy a el parque.")).toContain("a-el");
  });

  it("accepts del / al and non-masculine articles", () => {
    expect(rules("La farmacia está enfrente del parque.")).toEqual([]);
    expect(rules("Está cerca de la autopista.")).toEqual([]);
    expect(rules("Está al final de la calle.")).toEqual([]);
  });

  it("does not contract with the pronoun él or proper names", () => {
    expect(rules("El gato está detrás de él.")).toEqual([]);
    expect(rules("Vivo lejos de El Salvador.")).toEqual([]);
  });

  it("contract()", () => {
    expect(contract("de", "el")).toBe("del");
    expect(contract("a", "el")).toBe("al");
    expect(contract("de", "la")).toBe("de la");
    expect(contract("a", "los")).toBe("a los");
  });
});

describe("helpers", () => {
  it("assembles and capitalises", () => {
    expect(assembleSentence("{0} {1} debajo del sofá.", ["el gato", "está"])).toBe("El gato está debajo del sofá.");
    expect(assembleSentence("{0} {1} debajo del sofá.", ["hay", null])).toBe("Hay ___ debajo del sofá.");
  });

  it("normalizes case, spacing and punctuation but keeps accents", () => {
    expect(normalize("  ¿El gato   ESTÁ aquí? ")).toBe("el gato está aquí");
    expect(normalize("esta")).not.toBe(normalize("está"));
  });
});

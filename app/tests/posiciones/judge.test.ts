import { describe, expect, it } from "vitest";
import { bundledContent } from "@/features/games/posiciones/model/content";
import { judgeChoice, judgeParsedIds, judgeText } from "@/features/games/posiciones/model/judge";
import { joinRef, phraseText, sentence } from "@/features/games/posiciones/model/phrase";
import { buildWorld, ROTATIONS, trueFacts } from "@/features/games/posiciones/model/relations";
import { POINTS, scoreAnswer, starsFor } from "@/features/games/posiciones/model/score";
import { trayFor } from "@/features/games/posiciones/model/suggest";
import { missesFor, summarize } from "@/features/games/posiciones/model/summary";

const content = bundledContent();
const jardin = buildWorld(content, "jardin");
const inv = jardin.inv;

describe("judgeText", () => {
  it("✓ a true answer, with the corrected sentence and gentle accent notes", () => {
    const v = judgeText(jardin, "j_seto", 0, "el gnomo esta detras del seto");
    expect(v).toMatchObject({ kind: "true", sentence: "El gnomo está detrás del seto." });
    expect(v.kind === "true" && v.notes[0]).toMatch(/Accents: .*detrás/);
  });

  it("✗ a false answer says what is true, with the same reference when it can", () => {
    const v = judgeText(jardin, "j_jarron", 0, "El gnomo está encima del jarrón.");
    expect(v.kind).toBe("false");
    expect(v.kind === "false" && v.message).toBe("No está encima del jarrón — está dentro del jarrón.");
  });

  it("⛔ grammar blocks before truth", () => {
    expect(judgeText(jardin, "j_seto", 0, "Hay el gnomo detrás del seto.")).toMatchObject({ kind: "grammar", rule: "hay-definite" });
    expect(judgeText(jardin, "j_seto", 0, "Está detrás de el seto.")).toMatchObject({ kind: "grammar", rule: "de-el" });
    // Even when the position would be false.
    expect(judgeText(jardin, "j_seto", 0, "Está dentro de el jarrón.")).toMatchObject({ kind: "grammar", rule: "de-el" });
  });

  it("left/right answers change verdict when the camera turns", () => {
    expect(judgeText(jardin, "j_seto", 0, "Está a la izquierda del árbol.").kind).toBe("true");
    expect(judgeText(jardin, "j_seto", 2, "Está a la izquierda del árbol.").kind).toBe("false");
    expect(judgeText(jardin, "j_seto", 2, "Está a la derecha del árbol.").kind).toBe("true");
  });

  it("vague answers are neither right nor wrong", () => {
    expect(judgeText(jardin, "j_seto", 0, "Está allí.")).toMatchObject({ kind: "vague", unlock: true });
    expect(judgeText(jardin, "j_seto", 0, "Está cerca.")).toMatchObject({ kind: "vague", unlock: false });
    expect(judgeText(jardin, "j_seto", 0, "Está en el jardín.")).toMatchObject({ kind: "vague", unlock: false });
    // But a bare word that is false for everything is false.
    expect(judgeText(jardin, "j_seto", 0, "Está debajo.").kind).toBe("false");
    // And "en el jardín" is false when he's outside it.
    expect(judgeText(jardin, "j_fuera", 0, "Está en el jardín.").kind).toBe("false");
  });

  it("room-relative bare words are judged against the room", () => {
    expect(judgeText(jardin, "j_seto", 0, "Está al fondo.").kind).toBe("true");
    expect(judgeText(jardin, "j_seto", 2, "Está al fondo.").kind).toBe("false");
  });

  it("regional forms are accepted and labelled", () => {
    const v = judgeText(jardin, "j_seto", 0, "Está atrás del seto.");
    expect(v.kind).toBe("true");
    expect(v.kind === "true" && v.notes.join(" ")).toMatch(/Latin American/);
    expect(v.kind === "true" && v.said[0].expression).toBe("atras_de");
  });

  it("a deictic next to a real position still counts the real one", () => {
    const v = judgeText(jardin, "j_seto", 0, "Está allí, detrás del seto.");
    expect(v.kind).toBe("true");
    expect(v.kind === "true" && v.said.map((s) => s.expression)).toEqual(["alli", "detras_de"]);
  });

  it("ambiguous nouns are true if any match", () => {
    const cem = buildWorld(content, "cementerio");
    expect(judgeText(cem, "c_apoyado", 0, "Está delante de la lápida.").kind).toBe("true");
  });

  it("unparsed answers ask to try again", () => {
    expect(judgeText(jardin, "j_seto", 0, "no sé")).toMatchObject({ kind: "unparsed" });
  });

  it("every true fact, said as a sentence, is judged true (parser ↔ engine round trip)", () => {
    for (const s of content.scenes) {
      const w = buildWorld(content, s.id);
      for (const spot of s.targets)
        for (const rot of ROTATIONS)
          for (const t of trueFacts(w, spot, rot)) {
            const text = sentence(w.inv, w.scene, [t]);
            const v = judgeText(w, spot, rot, text);
            expect(v.kind, `${s.id}/${spot} r${rot}: ${text} → ${JSON.stringify(v)}`).toBe("true");
          }
    }
  });

  it("verdicts take well under 200 ms", () => {
    const t0 = performance.now();
    judgeText(jardin, "j_jarron", 0, "Yo creo que el gnomo está justo encima del jarrón.");
    expect(performance.now() - t0).toBeLessThan(200);
  });
});

describe("judgeChoice / Claude ids", () => {
  it("judges a chip + tapped reference with the same engine", () => {
    expect(judgeChoice(jardin, "j_banco", 0, "debajo_de", ["banco"])).toMatchObject({ kind: "true", sentence: "El gnomo está debajo del banco." });
    expect(judgeChoice(jardin, "j_banco", 0, "encima_de", ["banco"]).kind).toBe("false");
  });

  it("Claude's parse only supplies ids; truth comes from geometry", () => {
    expect(judgeParsedIds(jardin, "j_banco", 0, "debajo_de", ["banco"], []).kind).toBe("true");
    expect(judgeParsedIds(jardin, "j_banco", 0, "encima_de", ["banco"], []).kind).toBe("false");
    expect(judgeParsedIds(jardin, "j_banco", 0, "debajo_de", ["banco"], ["Use del."]).kind).toBe("grammar");
  });
});

describe("phrases and contractions", () => {
  it("contract de/a + el generically, never la/los/las", () => {
    expect(joinRef("detrás de", "el seto")).toBe("detrás del seto");
    expect(joinRef("junto a", "el pozo")).toBe("junto al pozo");
    expect(joinRef("al otro lado de", "el puente")).toBe("al otro lado del puente");
    expect(joinRef("detrás de", "la estatua")).toBe("detrás de la estatua");
    expect(joinRef("cerca de", "los árboles")).toBe("cerca de los árboles");
    expect(joinRef("frente a", "las flores")).toBe("frente a las flores");
    expect(joinRef("en", "el jarrón")).toBe("en el jarrón");
    expect(joinRef("apoyado en", "el muro")).toBe("apoyado en el muro");
  });

  it("builds two-reference and distance phrases", () => {
    expect(phraseText(inv, jardin.scene, { expression: "entre", refs: ["seto", "jarron"] })).toBe("entre el seto y el jarrón");
    expect(phraseText(inv, jardin.scene, { expression: "a_distancia_de", refs: ["arbol"], metres: 1 })).toBe("a un metro del árbol");
    const m = buildWorld(content, "mercado");
    expect(phraseText(m.inv, m.scene, { expression: "en_la_esquina_con", refs: ["calle_mayor", "calle_pozo"] })).toBe("en la esquina de la calle Mayor con la calle del Pozo");
  });
});

describe("score (PRD §3.1)", () => {
  it("15 typed, 5 with suggestions, +15 new in album, +5 B1", () => {
    expect(scoreAnswer(inv, "typed", ["detras_de"], new Set(["detras_de"])).total).toBe(POINTS.typed);
    expect(scoreAnswer(inv, "chip", ["detras_de"], new Set(["detras_de"])).total).toBe(POINTS.chip);
    const s = scoreAnswer(inv, "typed", ["detras_de"], new Set());
    expect(s.total).toBe(30);
    expect(s.unlocked).toEqual(["detras_de"]);
    expect(scoreAnswer(inv, "typed", ["a_traves_de"], new Set()).total).toBe(15 + 15 + 5);
    expect(scoreAnswer(inv, "chip", ["a_traves_de"], new Set(["a_traves_de"])).total).toBe(5 + 5);
  });

  it("stars: cleared, all different, all from memory", () => {
    expect(starsFor([])).toBe(0);
    expect(starsFor([{ spot: "a", mode: "chip", expressions: ["en"] }, { spot: "b", mode: "chip", expressions: ["en"] }])).toBe(1);
    expect(starsFor([{ spot: "a", mode: "chip", expressions: ["en"] }, { spot: "b", mode: "typed", expressions: ["tras"] }])).toBe(2);
    expect(starsFor([{ spot: "a", mode: "typed", expressions: ["en"] }, { spot: "b", mode: "typed", expressions: ["tras"] }])).toBe(3);
  });
});

describe("suggestion tray", () => {
  it("3–4 chips: one true, the rest false for every reference", () => {
    for (const s of content.scenes) {
      const w = buildWorld(content, s.id);
      for (const spot of s.targets)
        for (const rot of ROTATIONS) {
          let seed = 7;
          const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
          const tray = trayFor(w, spot, rot, new Set(), rng);
          expect(tray, `${spot} r${rot}`).not.toBeNull();
          expect(tray!.chips.length).toBeGreaterThanOrEqual(3);
          expect(tray!.chips.length).toBeLessThanOrEqual(4);
          expect(tray!.chips).toContain(tray!.target.expression);
          expect(judgeChoice(w, spot, rot, tray!.target.expression, tray!.target.refs).kind).toBe("true");
          for (const c of tray!.chips.filter((c) => c !== tray!.target.expression)) {
            for (const o of w.objects) expect(judgeChoice(w, spot, rot, c, [o.id]).kind, `${spot} r${rot} ${c} ${o.id}`).not.toBe("true");
          }
        }
    }
  });
});

describe("dungeon summary", () => {
  const rooms = [
    { spot: "j_seto", rotation: 0 as const, said: [{ expression: "detras_de", refs: ["seto"], form: "detrás de" }], sentence: "El gnomo está detrás del seto." },
    { spot: "j_banco", rotation: 0 as const, said: [{ expression: "debajo_de", refs: ["banco"], form: "debajo de" }], sentence: "El gnomo está debajo del banco." },
  ];

  it("lists what was said, then every other true position", () => {
    const [first] = summarize(jardin, rooms);
    expect(first.said).toBe("El gnomo está detrás del seto.");
    expect(first.others.map((o) => o.expression)).not.toContain("detras_de");
    expect(first.others.map((o) => o.expression)).toEqual(expect.arrayContaining(["cerca_de", "al_lado_de", "tras"]));
    expect(first.others.find((o) => o.expression === "cerca_de")?.phrases).toContain("cerca del seto");
  });

  it("picks at most 3 misses for Repaso, one per room, never ones already used", () => {
    const misses = missesFor(jardin, rooms, new Set());
    expect(misses.length).toBeLessThanOrEqual(3);
    expect(misses.length).toBeGreaterThan(0);
    for (const m of misses) {
      expect(m.itemRef).toMatch(/^jardin:j_(seto|banco):[a-z_]+$/);
      expect(["detras_de", "debajo_de"]).not.toContain(m.expression);
    }
  });
});

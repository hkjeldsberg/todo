import { describe, expect, it } from "vitest";
import { bundledContent, findDrill } from "@/features/games/pasado/lib/content";
import { buildScramble, judgeScramble } from "@/features/games/pasado/lib/scramble";
import { toReviewCard } from "@/features/games/pasado/lib/review";

const content = bundledContent();

describe("pasado scrambler", () => {
  it("builds a bank of every word plus the other tense's form", () => {
    const drill = findDrill(content, "hacer_3")!; // ¿Qué {verb} tú anoche?
    const s = buildScramble(content, drill, () => 0.3);
    expect(s.answer).toEqual(["qué", "hiciste", "tú", "anoche"]);
    expect(s.verbAt).toBe(1);
    expect(s.bank.map((t) => t.text).sort()).toEqual(["anoche", "hacías", "hiciste", "qué", "tú"].sort());
    expect(s.bank.filter((t) => t.decoy).map((t) => t.text)).toEqual(["hacías"]);
    expect(s.bank.map((t) => t.id)).not.toEqual([0, 1, 2, 3, 4]);
  });

  it("finds the verb in every drill", () => {
    for (const d of content.drills) expect(buildScramble(content, d).verbAt, d.id).toBeGreaterThanOrEqual(0);
  });

  it("judges on the verb form; order is reported separately", () => {
    const s = buildScramble(content, findDrill(content, "comer_1")!);
    const byText = (words: string[]) => words.map((w) => s.bank.find((t) => t.text === w)!);
    expect(judgeScramble(s, byText(["ayer", "nosotros", "comimos", "paella", "en", "la", "playa"]))).toEqual({
      correct: true,
      exactOrder: true,
    });
    expect(judgeScramble(s, byText(["nosotros", "comimos", "paella", "en", "la", "playa", "ayer"]))).toEqual({
      correct: true,
      exactOrder: false,
    });
    expect(judgeScramble(s, byText(["ayer", "nosotros", "comíamos", "paella", "en", "la", "playa"])).correct).toBe(false);
  });
});

describe("pasado review card", () => {
  it("asks for the form in the sentence with both tenses as options", () => {
    const card = toReviewCard("comer_1", content)!;
    expect(card.prompt).toBe("Ayer nosotros ___ (comer) paella en la playa.");
    expect(card.options).toHaveLength(4);
    expect(card.options.filter((o) => o.correct).map((o) => o.text)).toEqual(["comimos"]);
    expect(card.options.map((o) => o.text)).toContain("comíamos");
    expect(card.hint).toMatch(/Yesterday/);
    expect(card.explanation).toMatch(/pretérito/);
  });

  it("gives unique options for every drill, even ser/ir with shared forms", () => {
    for (const d of content.drills) {
      const card = toReviewCard(d.id, content)!;
      expect(new Set(card.options.map((o) => o.text)).size, d.id).toBe(card.options.length);
      expect(card.options.filter((o) => o.correct), d.id).toHaveLength(1);
    }
    expect(toReviewCard("nope_1", content)).toBeNull();
  });
});

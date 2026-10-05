import { describe, expect, it } from "vitest";
import raw from "@/content/probador.json";
import { ITEMS } from "@/features/games/probador/avatar/catalog";
import { answerSentence, bundledContent, contentFromRows, findPrompt, questionWith } from "@/features/games/probador/lib/content";
import { judge, trackOfVerb } from "@/features/games/probador/lib/judge";
import { toReviewCard } from "@/features/games/probador/lib/review";

const content = bundledContent();

describe("probador content", () => {
  it("has the PRD's MVP scope: 30 prompts, 10 per track, 30 distinct items by kind", () => {
    expect(content.prompts).toHaveLength(30);
    const byTrack = Map.groupBy(content.prompts, (p) => p.target_verb);
    expect([...byTrack.values()].map((v) => v.length)).toEqual([10, 10, 10]);
    const kinds = Map.groupBy(Object.keys(ITEMS), (k) => ITEMS[k as keyof typeof ITEMS]);
    expect(Object.fromEntries([...kinds].map(([k, v]) => [k, v.length]))).toEqual({ top: 10, bottom: 10, accessory: 5, full: 5 });
    const used = new Set(Object.values(content.outfits).flatMap((o) => o.layers.map((l) => l.item)));
    expect(used.size).toBe(30);
  });

  it("matches answers to their track", () => {
    for (const p of content.prompts) {
      expect(trackOfVerb(p.answer_parts.verb), p.id).toBe(p.target_verb);
      if (p.target_verb === "parecerse") expect(p.answer_parts.pronoun, p.id).toBe("Se");
      // the question's gap takes the same verb as the answer
      expect(p.question_fill, p.id).toBe(p.target_verb === "parecerse" ? "se parece" : p.answer_parts.verb);
      // te in the question → me in the answer, os → nos
      if (/\bte\b/.test(p.question_text)) expect(p.answer_parts.pronoun, p.id).toBe("Me");
      if (/\bos\b/.test(p.question_text)) expect(p.answer_parts.pronoun, p.id).toBe("Nos");
    }
  });

  it("fills questions and answers", () => {
    const p = findPrompt(content, "q_01")!;
    expect(questionWith(p)).toBe("¿Cómo le ___ la chaqueta?");
    expect(questionWith(p, p.question_fill)).toBe("¿Cómo le queda la chaqueta?");
    expect(answerSentence(p)).toBe("Le queda grande.");
  });

  it("rejects bad rows", () => {
    const [o] = raw.outfits;
    const [p] = raw.prompts;
    expect(() => contentFromRows([o], [])).toThrow();
    expect(() => contentFromRows([{ ...o, layers: [{ item: "capa", color: "#ffffff" }] }], [p])).toThrow(/unknown item/);
    expect(() => contentFromRows([o], [{ ...p, outfit_id: "o_zz" }])).toThrow(/no outfit/);
    expect(() => contentFromRows([o], [{ ...p, target_verb: "ser" }])).toThrow();
    expect(() => contentFromRows([o], [{ ...p, distractor_options: { ...p.distractor_options, verb: ["queda"] } }])).toThrow(/equals the answer/);
    expect(() => contentFromRows([o], [p, p])).toThrow(/twice/);
    expect(() => contentFromRows([o, o], [p])).toThrow(/twice/);
  });
});

describe("probador judge", () => {
  const q = findPrompt(content, "q_02")!; // ¿Cómo le {verb} los pantalones? → Le quedan cortos
  const p = findPrompt(content, "p_01")!; // ¿Qué te {verb} este estilo? → Me parece elegante
  const s = findPrompt(content, "s_01")!; // Se parece a un pirata

  it("needs all three slots", () => {
    expect(judge(q, { pronoun: "Le", verb: "quedan", complement: "cortos" })).toEqual({ correct: true, wrong: [], notes: [] });
    expect(judge(q, { pronoun: "Le", verb: "quedan", complement: "largos" }).wrong).toEqual(["complement"]);
  });

  it("explains agreement, track and pronoun mistakes", () => {
    expect(judge(q, { pronoun: "Le", verb: "queda", complement: "cortos" }).notes[0]).toMatch(/plural/);
    expect(judge(q, { pronoun: "Le", verb: "parecen", complement: "cortos" }).notes[0]).toMatch(/how clothes fit/);
    expect(judge(p, { pronoun: "Te", verb: "parece", complement: "elegante" }).notes[0]).toMatch(/answer with me/);
    expect(judge(s, { pronoun: "Le", verb: "parece a", complement: "un pirata" }).notes[0]).toMatch(/reflexive/);
    expect(judge(s, { pronoun: "Se", verb: "parece", complement: "un pirata" }).notes[0]).toMatch(/look like/);
  });
});

describe("probador review card", () => {
  it("offers the right sentence against pronoun/verb swaps", () => {
    const card = toReviewCard("q_01", content)!;
    expect(card.prompt).toBe("¿Cómo le ___ la chaqueta?");
    expect(card.hint).toMatch(/too big/);
    expect(card.options.filter((o) => o.correct).map((o) => o.text)).toEqual(["Le queda grande."]);
    for (const prompt of content.prompts) {
      const c = toReviewCard(prompt.id, content)!;
      expect(c.options, prompt.id).toHaveLength(4);
      expect(new Set(c.options.map((o) => o.text)).size, prompt.id).toBe(4);
    }
    expect(toReviewCard("nope", content)).toBeNull();
  });
});

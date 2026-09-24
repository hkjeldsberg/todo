import { describe, expect, it } from "vitest";
import { bundledContent } from "@/features/games/opuestos/lib/content";
import { emptyProgress, parseProgress, withDiscovered, withSolved } from "@/features/games/opuestos/lib/progress";
import { toReviewCard } from "@/features/games/opuestos/lib/review";

const content = bundledContent();
const byId = new Map(content.words.map((w) => [w.id, w]));

describe("toReviewCard", () => {
  it("asks for the opposite of «pesado»", () => {
    const card = toReviewCard("pesado", content)!;
    expect(card.type).toBe("choice");
    expect(card.prompt).toBe("¿Cuál es el contrario de «pesado»?");
    expect(card.hint).toBe("heavy");
    expect(card.options.filter((o) => o.correct)).toEqual([{ text: "ligero", correct: true }]);
    expect(card.explanation).toMatch(/pesado.*heavy.*ligero.*light/);
    // Same category first: lleno / vacío are the other weight words.
    expect(card.options.some((o) => o.text === "lleno" || o.text === "vacío")).toBe(true);
  });

  it.each(content.words.map((w) => [w.id] as const))("%s: one right answer, three distinct distractors from other pairs", (id) => {
    const word = byId.get(id)!;
    const card = toReviewCard(id, content)!;
    expect(card).not.toBeNull();
    expect(card.options).toHaveLength(4);
    expect(new Set(card.options.map((o) => o.text)).size).toBe(4);
    expect(card.options.filter((o) => o.correct).map((o) => o.text)).toEqual([byId.get(word.antonym_id)!.word]);
    const texts = card.options.map((o) => o.text);
    expect(texts).not.toContain(word.word);
    // No distractor pair: never both halves of another opposite pair.
    const distractors = content.words.filter((w) => texts.includes(w.word) && w.id !== word.antonym_id);
    for (const d of distractors) expect(texts).not.toContain(byId.get(d.antonym_id)!.word);
  });

  it("returns null for unknown refs", () => {
    expect(toReviewCard("nope", content)).toBeNull();
    expect(toReviewCard("", content)).toBeNull();
  });
});

describe("progress", () => {
  it("starts empty on first play or garbage", () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress("x")).toEqual(emptyProgress());
    expect(parseProgress([1, 2])).toEqual(emptyProgress());
  });

  it("keeps good fields and drops bad ones", () => {
    const p = parseProgress({ solved: ["puente", "puente"], discovered: 3, found: { puente: [0, "x"] }, lastLevel: "tubo" });
    expect(p.solved).toEqual(["puente"]);
    expect(p.discovered).toEqual([]);
    expect(p.found).toEqual({});
    expect(p.lastLevel).toBe("tubo");
  });

  it("records solved levels, discovered words and found solutions", () => {
    let p = withDiscovered(emptyProgress(), "ligero");
    expect(withDiscovered(p, "ligero")).toBe(p);
    p = withSolved(p, "tubo", ["pequeno"], 0);
    p = withSolved(p, "tubo", ["grande"], 1);
    p = withSolved(p, "tubo", ["pequeno"], 0);
    p = withSolved(p, "tubo", ["rapido"], null);
    expect(p.solved).toEqual(["tubo"]);
    expect(p.discovered).toEqual(["ligero", "pequeno", "grande", "rapido"]);
    expect(p.found).toEqual({ tubo: [0, 1] });
    expect(p.lastLevel).toBe("tubo");
    expect(parseProgress(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
});

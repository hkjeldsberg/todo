import { describe, expect, it } from "vitest";
import { bundledStories } from "@/features/games/cuentos/lib/content";
import { parseProgress } from "@/features/games/cuentos/lib/progress";
import { parseTokenKey, StorySchema, tokenKey, type Sentence, type StoryContent } from "@/features/games/cuentos/lib/schema";
import {
  clozeFor,
  defaultHighlights,
  distractorsFor,
  highlightOf,
  repairStory,
  savableTokens,
  sentenceText,
  splitPunct,
} from "@/features/games/cuentos/lib/text";
import { clozeAnswerOf } from "@/features/srs/text";

const sentence = (words: string[], extra: Record<number, object> = {}): Sentence => ({
  translation: "",
  tokens: words.map((text, i) => ({ text, translation: "", ...extra[i] })),
});

describe("punctuation", () => {
  it("splits leading and trailing marks off the word", () => {
    expect(splitPunct("¿Qué")).toEqual(["¿", "Qué", ""]);
    expect(splitPunct("comer.")).toEqual(["", "comer", "."]);
    expect(splitPunct("«Hola»,")).toEqual(["«", "Hola", "»,"]);
    expect(splitPunct("—Espero")).toEqual(["—", "Espero", ""]);
  });
});

describe("cloze cards", () => {
  const s = sentence(["Sugiero", "que", "prueben", "la", "carne."], { 2: { tense: "subjunctive", lemma: "probar" } });

  it("replaces only the word and keeps punctuation outside the gap", () => {
    expect(clozeFor(s, 2)).toEqual({ cloze: "Sugiero que {{word}} la carne.", answer: "prueben" });
    expect(clozeFor(s, 4)).toEqual({ cloze: "Sugiero que prueben la {{word}}.", answer: "carne" });
  });

  it("round-trips through Repaso's cloze view: the gap resolves to the saved answer", () => {
    for (const index of [0, 2, 4]) {
      const { cloze, answer } = clozeFor(s, index);
      expect(clozeAnswerOf({ spanish: sentenceText(s), english: "", cloze })).toBe(answer);
    }
    const q = sentence(["¿Qué", "pediste?"], { 1: { tense: "preterite", lemma: "pedir" } });
    const { cloze, answer } = clozeFor(q, 1);
    expect(clozeAnswerOf({ spanish: sentenceText(q), english: "", cloze })).toBe(answer);
  });
});

describe("repairStory", () => {
  it("drops empty parts, lone reflexives and dangling subjunctive links", () => {
    const story: StoryContent = {
      title: " ",
      nodes: [
        { type: "narrative", speaker: "X", sentences: [sentence(["Se", "fue."], { 0: { reflexive_id: "r1" } })] },
        { type: "dialogue", sentences: [sentence(["Ojalá", "venga", " "], { 1: { tense: "subjunctive", triggered_by: "s9" } })] },
        { type: "narrative", sentences: [{ translation: "", tokens: [] }] },
      ],
    };
    const fixed = repairStory(story);
    expect(fixed.title).toBe("Cuento");
    expect(fixed.nodes).toHaveLength(2);
    expect(fixed.nodes[0].speaker).toBeUndefined();
    expect(fixed.nodes[0].sentences[0].tokens[0].reflexive_id).toBeUndefined();
    expect(fixed.nodes[1].speaker).toBe("—");
    expect(fixed.nodes[1].sentences[0].tokens).toHaveLength(2);
    expect(fixed.nodes[1].sentences[0].tokens[1].triggered_by).toBeUndefined();
    expect(fixed.nodes[1].sentences[0].tokens[1].lemma).toBe("venga");
  });

  it("throws when nothing readable is left", () => {
    expect(() => repairStory({ title: "x", nodes: [] })).toThrow();
  });
});

describe("the bundled sample story", () => {
  const [sample] = bundledStories();

  it("parses and survives repair unchanged", () => {
    expect(sample).toBeDefined();
    expect(StorySchema.safeParse(sample.content).success).toBe(true);
    expect(repairStory(sample.content)).toEqual(sample.content);
  });

  it("annotates every verb with a lemma, and links every reflexive pair and subjunctive", () => {
    const tokens = sample.content.nodes.flatMap((n) => n.sentences.flatMap((s) => s.tokens));
    for (const t of tokens.filter((t) => t.tense)) expect(t.lemma, t.text).toBeTruthy();
    const triggers = new Set(tokens.flatMap((t) => (t.trigger_id ? [t.trigger_id] : [])));
    for (const t of tokens.filter((t) => t.triggered_by)) expect(triggers.has(t.triggered_by!)).toBe(true);
    const groups = new Map<string, number>();
    for (const t of tokens) if (t.reflexive_id) groups.set(t.reflexive_id, (groups.get(t.reflexive_id) ?? 0) + 1);
    for (const [, count] of groups) expect(count).toBeGreaterThanOrEqual(2);
    expect(tokens.some((t) => t.tense === "subjunctive")).toBe(true);
  });

  it("offers three wrong options per saved verb, never the answer itself", () => {
    for (const { key, token } of savableTokens(sample.content)) {
      const [n, s, t] = parseTokenKey(key)!;
      const { answer } = clozeFor(sample.content.nodes[n].sentences[s], t);
      const options = distractorsFor(sample.content, answer, token.lemma);
      expect(options).toHaveLength(3);
      expect(options.map((o) => o.toLowerCase())).not.toContain(answer.toLowerCase());
    }
  });
});

describe("keys, highlights, progress", () => {
  it("round-trips token keys", () => {
    expect(parseTokenKey(tokenKey(3, 1, 7))).toEqual([3, 1, 7]);
    expect(parseTokenKey("1:x:2")).toBeNull();
  });

  it("maps tenses to toolbar colours, reflexive first", () => {
    expect(highlightOf({ text: "fui", translation: "", tense: "preterite" })).toBe("preterite");
    expect(highlightOf({ text: "vaya", translation: "", tense: "subjunctive" })).toBe("subjunctive");
    expect(highlightOf({ text: "levanto", translation: "", tense: "present", reflexive_id: "r1" })).toBe("reflexive");
    expect(highlightOf({ text: "casa", translation: "" })).toBeNull();
    expect(defaultHighlights(["preterite", "future"])).toEqual(["preterite"]);
    expect(defaultHighlights(["future"])).toHaveLength(4);
  });

  it("parses progress defensively", () => {
    expect(parseProgress(null)).toEqual({ read: [], last: null });
    expect(parseProgress({ read: ["a"], last: "a" })).toEqual({ read: ["a"], last: "a" });
    expect(parseProgress({ read: 3 })).toEqual({ read: [], last: null });
  });
});

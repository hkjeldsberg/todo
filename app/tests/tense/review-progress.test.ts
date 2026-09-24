import { describe, expect, it } from "vitest";
import { bundledContent } from "@/features/games/tense/content";
import { emptyProgress, parseProgress } from "@/features/games/tense/progress";
import { toReviewCard } from "@/features/games/tense/review";

const content = bundledContent();
const puzzle = content.rooms[0].puzzles[0];

describe("toReviewCard", () => {
  it("turns a puzzle id into a cloze choice card", () => {
    const card = toReviewCard(puzzle.id, content);
    expect(card).toEqual({
      type: "choice",
      prompt: `${puzzle.sentence_pre}___${puzzle.sentence_post}`,
      hint: puzzle.translation,
      options: puzzle.options.map((o) => ({ text: o.form, correct: o.correct })),
      explanation: puzzle.rule_feedback,
    });
    expect(card!.options.filter((o) => o.correct)).toHaveLength(1);
  });

  it("returns null for unknown refs", () => {
    expect(toReviewCard("nope", content)).toBeNull();
    expect(toReviewCard("", content)).toBeNull();
  });

  it("covers every puzzle", () => {
    for (const r of content.rooms) for (const p of r.puzzles) expect(toReviewCard(p.id, content)).not.toBeNull();
  });
});

describe("parseProgress", () => {
  it("starts empty on first play or garbage", () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress("x")).toEqual(emptyProgress());
    expect(parseProgress({ solved: 3 })).toEqual(emptyProgress());
  });

  it("keeps a saved progress and fills missing fields", () => {
    const saved = { solved: ["a"], completedRooms: ["cocina"], mistakes: { a: 2 }, lastRoom: "salon" };
    expect(parseProgress(saved)).toEqual(saved);
    expect(parseProgress({ solved: ["a"] })).toEqual({ ...emptyProgress(), solved: ["a"] });
  });
});

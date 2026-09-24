import { describe, expect, it } from "vitest";
import {
  fluencyScore,
  interleave,
  nextBox,
  nextReviewAt,
} from "@/features/srs/leitner";

describe("leitner", () => {
  it("moves up one box on a right answer, capped at 5", () => {
    expect(nextBox(0, true)).toBe(1);
    expect(nextBox(3, true)).toBe(4);
    expect(nextBox(5, true)).toBe(5);
  });

  it("resets to box 1 on a wrong answer", () => {
    expect(nextBox(4, false)).toBe(1);
    expect(nextBox(0, false)).toBe(1);
  });

  it("schedules by box interval in days", () => {
    const now = new Date("2026-09-24T10:00:00Z");
    const days = (box: number) =>
      Math.round((nextReviewAt(box, now).getTime() - now.getTime()) / 86_400_000);
    expect([1, 2, 3, 4, 5].map(days)).toEqual([1, 3, 7, 14, 30]);
  });

  it("scores fluency as weighted mastery over 1000 words", () => {
    expect(fluencyScore([0, 0, 0, 0, 0, 1000])).toBe(100);
    expect(fluencyScore([900, 100, 0, 0, 0, 0])).toBe(2);
  });

  it("interleaves reinforcement after every 4th card", () => {
    expect(interleave<number | string>([1, 2, 3, 4, 5, 6, 7, 8], ["a", "b", "c"])).toEqual([
      1, 2, 3, 4, "a", 5, 6, 7, 8, "b", "c",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { bundledContent } from "@/features/games/pasado/lib/content";
import {
  applyAnswer,
  buildSession,
  drilledVerbs,
  leitnerFromRows,
  MAX_PER_SESSION,
  NEW_PER_SESSION,
  overview,
  RETRY_GAP,
  withRetry,
} from "@/features/games/pasado/lib/leitner";
import type { Leitner } from "@/features/games/pasado/lib/types";

const content = bundledContent();
const now = new Date("2026-09-30T12:00:00Z");
const seeded = () => {
  let s = 7;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
};
const at = (days: number) => new Date(now.getTime() + days * 86400000).toISOString();

describe("pasado leitner", () => {
  it("starts with irregulars and introduces NEW_PER_SESSION new verbs as clozes", () => {
    const verbs = drilledVerbs(content);
    expect(verbs.slice(0, 5)).toEqual(["ser", "ir", "dar", "ver", "hacer"]);
    expect(verbs.slice(0, 16).every((v) => content.verbs[v].isIrregular)).toBe(true);
    expect(verbs.at(-1)).toBe("vivir");
    const queue = buildSession(content, {}, { now, random: seeded() });
    expect(queue).toHaveLength(NEW_PER_SESSION);
    expect(queue.every((c) => c.isNew && c.mode === "lock" && c.box === 1)).toBe(true);
    expect(queue.every((c) => c.drill.infinitive === c.key.split(":")[0])).toBe(true);
  });

  it("puts due verbs first, lowest box first, and scrambles from box 4", () => {
    const leitner: Leitner = {
      hacer: { box: 4, next: at(-1), right: 3, wrong: 0 },
      ser: { box: 2, next: at(-2), right: 1, wrong: 0 },
      ir: { box: 3, next: at(5), right: 2, wrong: 0 }, // not due
    };
    const queue = buildSession(content, leitner, { now, random: seeded() });
    expect(queue.slice(0, 2).map((c) => [c.drill.infinitive, c.mode])).toEqual([
      ["ser", "lock"],
      ["hacer", "scramble"],
    ]);
    expect(queue.some((c) => c.drill.infinitive === "ir")).toBe(false);
    expect(queue).toHaveLength(2 + NEW_PER_SESSION);
  });

  it("caps a session and offers practice when nothing is due", () => {
    const all: Leitner = Object.fromEntries(drilledVerbs(content).map((v) => [v, { box: 1, next: at(-1), right: 0, wrong: 1 }]));
    expect(buildSession(content, all, { now })).toHaveLength(MAX_PER_SESSION);
    const later: Leitner = Object.fromEntries(drilledVerbs(content).map((v) => [v, { box: 3, next: at(2), right: 2, wrong: 0 }]));
    expect(buildSession(content, later, { now })).toHaveLength(0);
    expect(overview(content, later, now).shelf[3]).toHaveLength(drilledVerbs(content).length);
    expect(buildSession(content, later, { now, practice: true }).length).toBeGreaterThan(0);
  });

  it("promotes one box on a hit and resets to box 1 on a miss", () => {
    const hit = applyAnswer({ box: 2, next: at(0), right: 1, wrong: 0 }, true, { now });
    expect(hit).toEqual({ box: 3, next: at(7), right: 2, wrong: 0 });
    expect(applyAnswer({ box: 5, next: at(0), right: 9, wrong: 0 }, true, { now }).box).toBe(5);
    const miss = applyAnswer({ box: 4, next: at(0), right: 3, wrong: 0 }, false, { now });
    expect(miss).toEqual({ box: 1, next: at(1), right: 3, wrong: 1 });
    expect(applyAnswer(undefined, true, { now })).toEqual({ box: 2, next: at(3), right: 1, wrong: 0 });
  });

  it("never promotes practice or retry answers", () => {
    const entry = { box: 2, next: at(3), right: 1, wrong: 0 };
    expect(applyAnswer(entry, true, { now, promote: false })).toEqual({ ...entry, right: 2 });
    expect(applyAnswer(entry, false, { now, promote: false }).box).toBe(1);
  });

  it("re-asks a missed verb once, RETRY_GAP cards later, with another sentence", () => {
    const queue = buildSession(content, {}, { now, random: seeded() });
    const next = withRetry(queue, 0, content, seeded());
    const retry = next[1 + RETRY_GAP];
    expect(retry.retry).toBe(true);
    expect(retry.drill.infinitive).toBe(queue[0].drill.infinitive);
    expect(retry.drill.id).not.toBe(queue[0].drill.id);
    expect(withRetry(next, 1 + RETRY_GAP, content)).toBe(next);
    // Near the end it goes last.
    expect(withRetry(queue, queue.length - 1, content).at(-1)?.retry).toBe(true);
  });

  it("reads DB rows and skips bad ones", () => {
    const rows = [
      { infinitive: "ser", current_box: 3, next_review_date: "2026-10-01T00:00:00+00:00", times_correct: 2, times_incorrect: 1 },
      { infinitive: "ir", current_box: 9, next_review_date: "2026-10-01" },
    ];
    expect(leitnerFromRows(rows)).toEqual({ ser: { box: 3, next: "2026-10-01T00:00:00.000Z", right: 2, wrong: 1 } });
  });
});

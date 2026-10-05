import { describe, expect, it } from "vitest";
import { bundledContent } from "@/features/games/probador/lib/content";
import {
  applyAnswer,
  buildSprint,
  DAY_MINUTES,
  MAX_RETRIES,
  MISS_MINUTES,
  overview,
  requeue,
  RETRY_GAP,
  SESSION_CAP,
  statsFromRows,
  WEEK_MINUTES,
} from "@/features/games/probador/lib/srs";
import type { Stats } from "@/features/games/probador/lib/types";

const content = bundledContent();
const now = new Date("2026-10-05T10:00:00Z");
const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();
const seeded = () => {
  let s = 11;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

describe("probador sprint", () => {
  it("deals at most 30 prompts, tracks interleaved, every option list holding the answer", () => {
    const queue = buildSprint(content, {}, { now, random: seeded() });
    expect(queue).toHaveLength(SESSION_CAP);
    expect(queue.slice(0, 6).map((c) => c.prompt.target_verb)).toEqual(["quedar", "parecer", "parecerse", "quedar", "parecer", "parecerse"]);
    for (const c of queue) {
      for (const slot of ["pronoun", "verb", "complement"] as const) {
        expect(c.options[slot]).toContain(c.prompt.answer_parts[slot]);
        expect(c.options[slot]).toHaveLength(c.prompt.distractor_options[slot].length + 1);
      }
    }
  });

  it("puts due prompts first and skips ones not yet due", () => {
    const stats: Stats = {
      s_03: { seen: 1, right: 0, streak: 0, interval: MISS_MINUTES, last: at(-20), due: at(-10) },
      q_01: { seen: 1, right: 1, streak: 1, interval: DAY_MINUTES, last: at(-60), due: at(DAY_MINUTES) },
    };
    const queue = buildSprint(content, stats, { now, random: seeded() });
    expect(queue.some((c) => c.prompt.id === "q_01")).toBe(false);
    expect(queue.some((c) => c.prompt.id === "s_03")).toBe(true);
    expect(queue).toHaveLength(29);
    expect(overview(content, stats, now).tracks.quedar).toEqual({ fresh: 9, learning: 1, mastered: 0 });
  });

  it("is empty when nothing is due, and practice then picks the shakiest", () => {
    const stats: Stats = Object.fromEntries(
      content.prompts.map((p, i) => [p.id, { seen: 3, right: 3, streak: i === 4 ? 1 : 3, interval: WEEK_MINUTES, last: at(-5), due: at(WEEK_MINUTES) }]),
    );
    expect(buildSprint(content, stats, { now })).toHaveLength(0);
    const practice = buildSprint(content, stats, { now, practice: true });
    expect(practice.length).toBe(30);
    expect(practice.some((c) => c.prompt.id === content.prompts[4].id)).toBe(true);
  });

  it("re-asks a miss RETRY_GAP cards later, at most MAX_RETRIES times", () => {
    let queue = buildSprint(content, {}, { now, random: seeded() });
    queue = requeue(queue, 0);
    expect(queue[1 + RETRY_GAP].prompt.id).toBe(queue[0].prompt.id);
    expect(queue[1 + RETRY_GAP].attempt).toBe(1);
    let last = queue;
    let index = 1 + RETRY_GAP;
    for (let n = 1; n < MAX_RETRIES; n++) {
      last = requeue(last, index);
      index = Math.min(index + 1 + RETRY_GAP, last.length - 1);
    }
    expect(last.at(-1)?.attempt ?? 0).toBeLessThanOrEqual(MAX_RETRIES);
    const capped = last.findIndex((c) => c.attempt === MAX_RETRIES);
    expect(requeue(last, capped)).toBe(last);
    expect(last).toHaveLength(SESSION_CAP + MAX_RETRIES);
  });
});

describe("probador micro-intervals", () => {
  it("miss → 10 minutes, streak 0", () => {
    expect(applyAnswer({ seen: 2, right: 2, streak: 2, interval: DAY_MINUTES, last: at(-1), due: at(0) }, false, { now })).toEqual({
      seen: 3,
      right: 2,
      streak: 0,
      interval: MISS_MINUTES,
      last: now.toISOString(),
      due: at(MISS_MINUTES),
    });
  });

  it("first-try right → tomorrow; the third day in a row → weekly", () => {
    const one = applyAnswer(undefined, true, { now });
    expect(one).toMatchObject({ streak: 1, interval: DAY_MINUTES, due: at(DAY_MINUTES) });
    const three = applyAnswer({ ...one, streak: 2 }, true, { now });
    expect(three).toMatchObject({ streak: 3, interval: WEEK_MINUTES, due: at(WEEK_MINUTES) });
  });

  it("right after a miss → tomorrow with streak 0; practice rights reschedule nothing", () => {
    const missed = applyAnswer(undefined, false, { now });
    expect(applyAnswer(missed, true, { now, firstTry: false })).toMatchObject({ streak: 0, interval: DAY_MINUTES, due: at(DAY_MINUTES) });
    const steady = { seen: 4, right: 4, streak: 3, interval: WEEK_MINUTES, last: at(-10), due: at(9000) };
    expect(applyAnswer(steady, true, { now, practice: true })).toEqual({ ...steady, seen: 5, right: 5, last: now.toISOString() });
  });

  it("reads DB rows, skipping broken ones", () => {
    expect(
      statsFromRows([
        { prompt_id: "q_01", times_encountered: 2, times_correct: 1, streak: 1, current_interval_minutes: 1440, last_played_at: "2026-10-04T10:00:00Z", due_at: "2026-10-05T10:00:00Z" },
        { prompt_id: "q_02", due_at: "nope", last_played_at: "nope" },
      ]),
    ).toEqual({ q_01: { seen: 2, right: 1, streak: 1, interval: 1440, last: "2026-10-04T10:00:00.000Z", due: "2026-10-05T10:00:00.000Z" } });
  });
});

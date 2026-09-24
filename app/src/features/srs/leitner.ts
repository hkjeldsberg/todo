/**
 * Leitner spaced repetition, ported from Spanyard. Five boxes; a right answer
 * moves a card up one box, a wrong one sends it back to box 1 (strict reset).
 */

/** Days until the next review, indexed by box (0 = never seen). */
export const LEITNER_INTERVALS = [0, 1, 3, 7, 14, 30] as const;
/** Mastery shown for each box, in percent. */
export const LEITNER_PROGRESS = [0, 20, 40, 60, 80, 100] as const;

export const NEW_WORDS_PER_SESSION = 10;
export const MAX_REVIEW_PER_SESSION = 20;
/** Recently missed box-1/2 words mixed back in. */
export const REINFORCEMENT_PER_SESSION = 4;
export const TOTAL_WORDS = 1000;

export function nextBox(current: number, correct: boolean): number {
  if (!correct) return 1;
  return Math.min(Math.max(current, 0) + 1, 5);
}

export function nextReviewAt(box: number, now: Date = new Date()): Date {
  const next = new Date(now);
  next.setDate(next.getDate() + LEITNER_INTERVALS[Math.min(Math.max(box, 0), 5)]);
  return next;
}

export function progressPercent(box: number): number {
  return LEITNER_PROGRESS[box] ?? 0;
}

/**
 * Weighted mastery over the whole 1000-word list, 0–100.
 * `boxCounts[b]` = words in box b (index 0 = unseen, ignored).
 */
export function fluencyScore(boxCounts: number[], total = TOTAL_WORDS): number {
  const weighted = boxCounts.reduce(
    (sum, count, box) => sum + count * (LEITNER_PROGRESS[box] ?? 0),
    0,
  );
  return Math.round(weighted / total);
}

/** Reinforcement cards slot in after every 4th card, the rest trail at the end. */
export function interleave<T>(base: T[], extra: T[], every = 4): T[] {
  const out: T[] = [];
  let next = 0;
  base.forEach((item, index) => {
    out.push(item);
    if ((index + 1) % every === 0 && next < extra.length) out.push(extra[next++]);
  });
  while (next < extra.length) out.push(extra[next++]);
  return out;
}

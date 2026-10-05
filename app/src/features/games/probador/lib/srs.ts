import { SLOTS, TRACKS, type Prompt, type ProbadorContent, type Slot, type Stat, type Stats } from "./types";

/** A sprint is at most this many prompts (PRD §2), not counting re-asks. */
export const SESSION_CAP = 30;
/** A missed prompt comes back this many cards later: ~2–3 minutes at sprint pace. */
export const RETRY_GAP = 8;
/** Re-asks per prompt per sprint, so a stubborn one can't trap the session. */
export const MAX_RETRIES = 2;
export const MISS_MINUTES = 10;
export const DAY_MINUTES = 24 * 60;
export const WEEK_MINUTES = 7 * DAY_MINUTES;
/** First-try daily rights in a row before an item moves to weekly maintenance. */
export const MASTERED_STREAK = 3;

export type Card = {
  key: string;
  prompt: Prompt;
  /** 0 = first time this sprint; n = nth re-ask after a miss. */
  attempt: number;
  /** Shuffled once per card: right answer + distractors. */
  options: Record<Slot, string[]>;
};

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function dealOptions(prompt: Prompt, random: () => number = Math.random): Record<Slot, string[]> {
  const out = {} as Record<Slot, string[]>;
  for (const slot of SLOTS) out[slot] = shuffle([prompt.answer_parts[slot], ...prompt.distractor_options[slot]], random);
  return out;
}

const isDue = (stat: Stat, now: Date) => new Date(stat.due).getTime() <= now.getTime();
export const isMastered = (stat: Stat | undefined) => (stat?.streak ?? 0) >= MASTERED_STREAK;

/** Round-robin over the three tracks so quedar / parecer / parecerse a keep alternating. */
function interleave(prompts: Prompt[]): Prompt[] {
  const lanes = TRACKS.map((t) => prompts.filter((p) => p.target_verb === t));
  const out: Prompt[] = [];
  for (let i = 0; out.length < prompts.length; i++) for (const lane of lanes) if (lane[i]) out.push(lane[i]);
  return out;
}

export type Overview = {
  due: Prompt[];
  fresh: Prompt[];
  /** per track: never seen / learning / mastered */
  tracks: Record<(typeof TRACKS)[number], { fresh: number; learning: number; mastered: number }>;
};

export function overview(content: ProbadorContent, stats: Stats, now = new Date()): Overview {
  const due: Prompt[] = [];
  const fresh: Prompt[] = [];
  const tracks = Object.fromEntries(TRACKS.map((t) => [t, { fresh: 0, learning: 0, mastered: 0 }])) as Overview["tracks"];
  for (const p of content.prompts) {
    const stat = stats[p.id];
    const lane = tracks[p.target_verb];
    if (!stat) {
      fresh.push(p);
      lane.fresh++;
      continue;
    }
    if (isMastered(stat)) lane.mastered++;
    else lane.learning++;
    if (isDue(stat, now)) due.push(p);
  }
  due.sort((a, b) => stats[a.id].due.localeCompare(stats[b.id].due));
  return { due, fresh, tracks };
}

/**
 * Today's sprint: due prompts first (most overdue first), then new ones, at most
 * SESSION_CAP, tracks interleaved. `practice` = nothing to do, so run the least
 * secure prompts; first-try rights there don't reschedule anything.
 */
export function buildSprint(
  content: ProbadorContent,
  stats: Stats,
  { now = new Date(), random = Math.random, practice = false } = {},
): Card[] {
  let picked: Prompt[];
  if (practice) {
    picked = content.prompts
      .filter((p) => stats[p.id])
      .sort((a, b) => stats[a.id].streak - stats[b.id].streak || stats[a.id].due.localeCompare(stats[b.id].due))
      .slice(0, SESSION_CAP);
  } else {
    const { due, fresh } = overview(content, stats, now);
    picked = [...due, ...interleave(fresh)].slice(0, SESSION_CAP);
  }
  return interleave(picked).map((prompt) => ({ key: prompt.id, prompt, attempt: 0, options: dealOptions(prompt, random) }));
}

/** Puts a missed card back RETRY_GAP places later (or last), up to MAX_RETRIES times. */
export function requeue(queue: Card[], index: number, random: () => number = Math.random): Card[] {
  const missed = queue[index];
  if (missed.attempt >= MAX_RETRIES) return queue;
  const again: Card = {
    ...missed,
    key: `${missed.prompt.id}:${missed.attempt + 1}`,
    attempt: missed.attempt + 1,
    options: dealOptions(missed.prompt, random),
  };
  const next = [...queue];
  next.splice(Math.min(index + 1 + RETRY_GAP, next.length), 0, again);
  return next;
}

const plus = (now: Date, minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();

/**
 * Micro-interval step (PRD §2). Miss → streak 0, due in MISS_MINUTES (and re-asked
 * in this sprint). First-try right → streak + 1, due tomorrow, or in a week from
 * MASTERED_STREAK on. Right after a miss → tomorrow, streak stays 0. Practice
 * rights only count.
 */
export function applyAnswer(
  stat: Stat | undefined,
  correct: boolean,
  { now = new Date(), firstTry = true, practice = false } = {},
): Stat {
  const base: Stat = stat ?? { seen: 0, right: 0, streak: 0, interval: MISS_MINUTES, last: now.toISOString(), due: now.toISOString() };
  const counted = { ...base, seen: base.seen + 1, right: base.right + (correct ? 1 : 0), last: now.toISOString() };
  if (!correct) return { ...counted, streak: 0, interval: MISS_MINUTES, due: plus(now, MISS_MINUTES) };
  if (practice && firstTry && stat) return counted;
  if (!firstTry) return { ...counted, streak: 0, interval: DAY_MINUTES, due: plus(now, DAY_MINUTES) };
  const streak = base.streak + 1;
  const interval = streak >= MASTERED_STREAK ? WEEK_MINUTES : DAY_MINUTES;
  return { ...counted, streak, interval, due: plus(now, interval) };
}

/** todo.probador_stats rows → client map. Bad rows are skipped. */
export function statsFromRows(rows: unknown[]): Stats {
  const out: Stats = {};
  for (const row of rows as Record<string, unknown>[]) {
    if (typeof row.prompt_id !== "string") continue;
    const due = new Date(String(row.due_at));
    const last = new Date(String(row.last_played_at));
    if (Number.isNaN(due.getTime()) || Number.isNaN(last.getTime())) continue;
    out[row.prompt_id] = {
      seen: Number(row.times_encountered) || 0,
      right: Number(row.times_correct) || 0,
      streak: Number(row.streak) || 0,
      interval: Number(row.current_interval_minutes) || MISS_MINUTES,
      last: last.toISOString(),
      due: due.toISOString(),
    };
  }
  return out;
}

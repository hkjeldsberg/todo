import { nextBox, nextReviewAt } from "@/features/srs/leitner";
import { MATRIX_VERBS } from "./matrix";
import type { Drill, Leitner, PasadoContent, VerbProgress } from "./types";

/** Verbs never seen before that one session may introduce. */
export const NEW_PER_SESSION = 5;
export const MAX_PER_SESSION = 15;
/** Box at which the cloze is swapped for the Syntax Scrambler. */
export const SCRAMBLE_FROM_BOX = 4;
/** A missed verb comes back this many cards later, once, with another sentence. */
export const RETRY_GAP = 3;

export type Mode = "lock" | "scramble";

export type SessionCard = {
  key: string;
  drill: Drill;
  mode: Mode;
  /** Box when the card was dealt (1 for unseen verbs). */
  box: number;
  isNew: boolean;
  /** A same-session re-ask after a miss: never moves the box again. */
  retry: boolean;
};

export const boxOf = (leitner: Leitner, infinitive: string) => leitner[infinitive]?.box ?? 1;
export const modeFor = (box: number): Mode => (box >= SCRAMBLE_FROM_BOX ? "scramble" : "lock");

/** Verbs with at least one drill: the PRD's matrix verbs in matrix order, other irregulars, then regulars. */
export function drilledVerbs(content: PasadoContent): string[] {
  const rank = (v: string) => {
    const at = MATRIX_VERBS.indexOf(v);
    return at >= 0 ? at : content.verbs[v].isIrregular ? MATRIX_VERBS.length : MATRIX_VERBS.length + 1;
  };
  return [...new Set(content.drills.map((d) => d.infinitive))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export function isDue(entry: VerbProgress | undefined, now: Date): boolean {
  return !entry || new Date(entry.next).getTime() <= now.getTime();
}

export type Overview = {
  /** Seen verbs whose review date has come. */
  due: string[];
  /** Verbs never answered. */
  fresh: string[];
  /** Seen verbs per box, index 1–5. */
  shelf: string[][];
};

export function overview(content: PasadoContent, leitner: Leitner, now = new Date()): Overview {
  const shelf: string[][] = [[], [], [], [], [], []];
  const due: string[] = [];
  const fresh: string[] = [];
  for (const infinitive of drilledVerbs(content)) {
    const entry = leitner[infinitive];
    if (!entry) {
      fresh.push(infinitive);
      continue;
    }
    shelf[entry.box].push(infinitive);
    if (isDue(entry, now)) due.push(infinitive);
  }
  // Lowest box first, then the longest overdue.
  due.sort((a, b) => leitner[a].box - leitner[b].box || leitner[a].next.localeCompare(leitner[b].next));
  return { due, fresh, shelf };
}

/** A drill for the verb, avoiding `avoid` when the verb has another. */
export function pickDrill(content: PasadoContent, infinitive: string, random: () => number, avoid?: string): Drill {
  const all = content.drills.filter((d) => d.infinitive === infinitive);
  const pool = all.length > 1 ? all.filter((d) => d.id !== avoid) : all;
  return pool[Math.floor(random() * pool.length)];
}

function card(content: PasadoContent, leitner: Leitner, infinitive: string, random: () => number, n: number): SessionCard {
  const box = boxOf(leitner, infinitive);
  return {
    key: `${infinitive}:${n}`,
    drill: pickDrill(content, infinitive, random),
    mode: modeFor(box),
    box,
    isNew: !leitner[infinitive],
    retry: false,
  };
}

/**
 * Today's queue: due verbs (lowest box first), topped up with up to
 * NEW_PER_SESSION unseen ones. `practice` = nothing is due, so drill the
 * weakest verbs instead; those answers can demote but never promote.
 */
export function buildSession(
  content: PasadoContent,
  leitner: Leitner,
  { now = new Date(), random = Math.random, practice = false } = {},
): SessionCard[] {
  const { due, fresh } = overview(content, leitner, now);
  let verbs: string[];
  if (practice) {
    verbs = Object.keys(leitner)
      .filter((v) => content.verbs[v] && content.drills.some((d) => d.infinitive === v))
      .sort((a, b) => leitner[a].box - leitner[b].box || leitner[a].next.localeCompare(leitner[b].next))
      .slice(0, 10);
  } else {
    verbs = due.slice(0, MAX_PER_SESSION);
    verbs.push(...fresh.slice(0, Math.min(NEW_PER_SESSION, MAX_PER_SESSION - verbs.length)));
  }
  return verbs.map((v, n) => card(content, leitner, v, random, n));
}

/** Inserts a re-ask of a missed card RETRY_GAP places later (or at the end). */
export function withRetry(
  queue: SessionCard[],
  index: number,
  content: PasadoContent,
  random: () => number = Math.random,
): SessionCard[] {
  const missed = queue[index];
  if (missed.retry) return queue;
  const retry: SessionCard = {
    ...missed,
    key: `${missed.key}:retry`,
    drill: pickDrill(content, missed.drill.infinitive, random, missed.drill.id),
    // Straight back to basics: a missed verb is re-asked as a cloze.
    mode: "lock",
    box: 1,
    retry: true,
  };
  const next = [...queue];
  next.splice(Math.min(index + 1 + RETRY_GAP, next.length), 0, retry);
  return next;
}

/**
 * Leitner step for one answer. Right → up a box (unless `promote` is off),
 * wrong → box 1, due tomorrow (the daily drill). Returns the new entry.
 */
export function applyAnswer(
  entry: VerbProgress | undefined,
  correct: boolean,
  { now = new Date(), promote = true } = {},
): VerbProgress {
  const current = entry?.box ?? 1;
  const box = correct ? (promote ? nextBox(current, true) : current) : 1;
  const keepDate = correct && !promote && entry;
  return {
    box,
    next: keepDate ? entry.next : nextReviewAt(box, now).toISOString(),
    right: (entry?.right ?? 0) + (correct ? 1 : 0),
    wrong: (entry?.wrong ?? 0) + (correct ? 0 : 1),
  };
}

/** todo.past_progress rows → client map. Bad rows are skipped. */
export function leitnerFromRows(rows: unknown[]): Leitner {
  const out: Leitner = {};
  for (const row of rows as Record<string, unknown>[]) {
    const box = Number(row.current_box);
    if (typeof row.infinitive !== "string" || !(box >= 1 && box <= 5)) continue;
    out[row.infinitive] = {
      box,
      next: new Date(String(row.next_review_date)).toISOString(),
      right: Number(row.times_correct) || 0,
      wrong: Number(row.times_incorrect) || 0,
    };
  }
  return out;
}

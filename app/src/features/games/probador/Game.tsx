"use client";

import { MotionConfig } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import type { GameProps } from "@/features/games/types";
import { saveProbadorStat } from "./actions";
import { applyAnswer, buildSprint, isMastered, MAX_RETRIES, overview, requeue, RETRY_GAP, type Card } from "./lib/srs";
import type { ProbadorContent, ProbadorProgress, Prompt, Stats } from "./lib/types";
import { Home } from "./ui/Home";
import { Play } from "./ui/Play";
import { Summary } from "./ui/Summary";

function parseProgress(raw: unknown): ProbadorProgress {
  const value = raw as Partial<ProbadorProgress> | null;
  if (value && typeof value.stats === "object" && value.stats) return { stats: value.stats, persisted: Boolean(value.persisted) };
  return { stats: {}, persisted: false };
}

type Sprint = {
  queue: Card[];
  index: number;
  practice: boolean;
  /** Distinct prompts in the sprint, and how many were right first time. */
  prompts: number;
  firstTry: number;
  missed: Prompt[];
  mastered: number;
};

/**
 * El Probador. Per-prompt stats live in todo.probador_stats (loaded by
 * ./server.ts) and are saved on every answer; every answer also goes to the
 * host so misses land in Repaso.
 */
export default function Game({ content: raw, source, initialProgress, recordAttempt, exit }: GameProps) {
  const content = raw as ProbadorContent;
  const initial = useMemo(() => parseProgress(initialProgress), [initialProgress]);
  const [stats, setStats] = useState<Stats>(initial.stats);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [done, setDone] = useState(false);

  // Not memoised: due dates depend on the clock.
  const view = overview(content, stats);
  const card = sprint && !done ? sprint.queue[sprint.index] : null;

  const start = (practice: boolean) => {
    const queue = buildSprint(content, stats, { practice });
    if (!queue.length) return;
    setSprint({ queue, index: 0, practice, prompts: queue.length, firstTry: 0, missed: [], mastered: 0 });
    setDone(false);
  };

  const onAnswer = useCallback(
    (correct: boolean, answer: string) => {
      if (!sprint || !card) return;
      const id = card.prompt.id;
      const firstTry = card.attempt === 0;
      const stat = applyAnswer(stats[id], correct, { firstTry, practice: sprint.practice });
      setStats((current) => ({ ...current, [id]: stat }));
      if (initial.persisted) saveProbadorStat(id, stat).catch((cause) => console.error("[probador] save failed:", cause));
      recordAttempt({ itemRef: id, correct, answer });
      setSprint({
        ...sprint,
        queue: correct ? sprint.queue : requeue(sprint.queue, sprint.index),
        firstTry: sprint.firstTry + (correct && firstTry ? 1 : 0),
        missed: !correct && firstTry ? [...sprint.missed, card.prompt] : sprint.missed,
        mastered: sprint.mastered + (correct && !isMastered(stats[id]) && isMastered(stat) ? 1 : 0),
      });
    },
    [sprint, card, stats, initial.persisted, recordAttempt],
  );

  // Play calls the latest onNext through a ref, so it needn't be stable.
  const onNext = () => {
    if (!sprint) return;
    if (sprint.index + 1 >= sprint.queue.length) setDone(true);
    else setSprint({ ...sprint, index: sprint.index + 1 });
  };

  const home = () => {
    setSprint(null);
    setDone(false);
  };

  const missNote =
    card && card.attempt < MAX_RETRIES ? `It comes back in about ${RETRY_GAP} outfits.` : "Back in 10 minutes, next sprint.";

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex min-h-dvh flex-col bg-page text-ink">
        <nav className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:px-6">
          <button
            type="button"
            onClick={sprint ? home : exit}
            className="min-h-11 shrink-0 text-[14px] font-bold tracking-wider text-muted uppercase hover:text-ink"
          >
            ← {sprint ? "Fitting room" : "Juegos"}
          </button>
          {sprint && !done && (
            <div className="flex flex-1 items-center gap-2" aria-label="Sprint progress">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-pill-flat">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300"
                  style={{ width: `${(sprint.index / sprint.queue.length) * 100}%` }}
                />
              </div>
              <span className="text-[13px] font-bold text-muted tabular-nums" data-testid="probador-progress">
                {sprint.index + 1}/{sprint.queue.length}
              </span>
            </div>
          )}
        </nav>

        {!sprint && <Home content={content} overview={view} persisted={initial.persisted} source={source} onStart={start} />}

        {card && (
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
            <Play card={card} content={content} missNote={missNote} onAnswer={onAnswer} onNext={onNext} />
          </div>
        )}

        {sprint && done && (
          <Summary
            firstTry={sprint.firstTry}
            prompts={sprint.prompts}
            missed={sprint.missed}
            mastered={sprint.mastered}
            moreDue={view.due.length + view.fresh.length > 0}
            onAgain={() => start(false)}
            onHome={home}
          />
        )}
      </main>
    </MotionConfig>
  );
}

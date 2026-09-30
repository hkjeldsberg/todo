"use client";

import { MotionConfig } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import type { GameProps } from "@/features/games/types";
import { savePastProgress } from "./actions";
import { applyAnswer, boxOf, buildSession, overview, withRetry, type SessionCard } from "./lib/leitner";
import type { Leitner, PasadoContent, PasadoProgress, PastTense } from "./lib/types";
import { Drawer, type DrawerFocus } from "./ui/Drawer";
import { Home } from "./ui/Home";
import { boxNote } from "./ui/parts";
import { Scrambler } from "./ui/Scrambler";
import { Summary, type Move } from "./ui/Summary";
import { TenseLock } from "./ui/TenseLock";

function parseProgress(raw: unknown): PasadoProgress {
  const value = raw as Partial<PasadoProgress> | null;
  if (value && typeof value.leitner === "object" && value.leitner) {
    return { leitner: value.leitner, persisted: Boolean(value.persisted) };
  }
  return { leitner: {}, persisted: false };
}

type Session = {
  queue: SessionCard[];
  index: number;
  practice: boolean;
  /** Verdict note for the current card, once answered. */
  note: string | null;
  right: number;
  answered: number;
  moves: Move[];
};

/**
 * El Candado del Tiempo. Per-verb Leitner boxes live in todo.past_progress
 * (loaded by ./server.ts); every answer is saved straight away, and every
 * answer is also reported to the host so misses land in Repaso.
 */
export default function Game({ content: raw, source, initialProgress, recordAttempt, exit }: GameProps) {
  const content = raw as PasadoContent;
  const initial = useMemo(() => parseProgress(initialProgress), [initialProgress]);
  const [leitner, setLeitner] = useState<Leitner>(initial.leitner);
  const [session, setSession] = useState<Session | null>(null);
  const [done, setDone] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; focus: DrawerFocus }>({
    open: false,
    focus: { tense: "preterite", infinitive: null },
  });

  // Not memoised: due dates depend on the clock, and a tab can stay open overnight.
  const view = overview(content, leitner);
  const card = session && !done ? session.queue[session.index] : null;

  const start = (practice: boolean) => {
    const queue = buildSession(content, leitner, { practice });
    if (!queue.length) return;
    setSession({ queue, index: 0, practice, note: null, right: 0, answered: 0, moves: [] });
    setDone(false);
    window.scrollTo({ top: 0 });
  };

  const onAnswer = useCallback(
    (correct: boolean, answer: string) => {
      if (!session || !card) return;
      const infinitive = card.drill.infinitive;
      const counted = !card.retry && !session.practice;
      const before = boxOf(leitner, infinitive);
      const entry = applyAnswer(leitner[infinitive], correct, { promote: counted });
      setLeitner((current) => ({ ...current, [infinitive]: entry }));
      if (initial.persisted) {
        savePastProgress(infinitive, entry).catch((cause) => console.error("[pasado] save failed:", cause));
      }
      recordAttempt({ itemRef: card.drill.id, correct, answer });

      const known = session.moves.find((m) => m.infinitive === infinitive);
      const moves = known
        ? session.moves.map((m) => (m === known ? { ...m, after: entry.box } : m))
        : [...session.moves, { infinitive, before, after: entry.box }];
      setSession({
        ...session,
        queue: correct ? session.queue : withRetry(session.queue, session.index, content),
        note: boxNote(before, entry.box, correct, counted),
        right: session.right + (correct ? 1 : 0),
        answered: session.answered + 1,
        moves,
      });
    },
    [session, card, leitner, initial.persisted, recordAttempt, content],
  );

  const onNext = () => {
    if (!session) return;
    if (session.index + 1 >= session.queue.length) {
      setDone(true);
    } else {
      setSession({ ...session, index: session.index + 1, note: null });
    }
    window.scrollTo({ top: 0 });
  };

  const showTable = useCallback((tense: PastTense, infinitive: string | null) => {
    setDrawer({ open: true, focus: { tense, infinitive } });
  }, []);
  const closeDrawer = useCallback(() => setDrawer((d) => ({ ...d, open: false })), []);

  const home = () => {
    setSession(null);
    setDone(false);
  };

  const progress = session ? Math.min(session.index + (session.note ? 1 : 0), session.queue.length) : 0;

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-dvh bg-page text-ink">
        <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
          <nav className="flex items-center gap-3">
            <button
              type="button"
              onClick={session ? home : exit}
              className="min-h-11 shrink-0 text-[14px] font-bold tracking-wider text-muted uppercase hover:text-ink"
            >
              ← {session ? "Boxes" : "Juegos"}
            </button>
            {session && !done ? (
              <div className="flex flex-1 items-center gap-2" aria-label="Session progress">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-pill-flat">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-300"
                    style={{ width: `${(progress / session.queue.length) * 100}%` }}
                  />
                </div>
                <span className="text-[13px] font-bold text-muted tabular-nums" data-testid="pasado-progress">
                  {Math.min(session.index + 1, session.queue.length)}/{session.queue.length}
                </span>
              </div>
            ) : (
              <span className="flex-1" />
            )}
            <button
              type="button"
              onClick={() => showTable(card?.drill.correct_tense ?? "preterite", card?.drill.infinitive ?? null)}
              aria-label="Irregular verbs table"
              className="press flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-extrabold text-on-ink shadow-[0_4px_0_var(--ink-shadow)]"
              style={{ ["--press" as string]: "4px" }}
            >
              <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="currentColor">
                <rect x="2" y="3" width="7" height="6" rx="1.5" />
                <rect x="11" y="3" width="7" height="6" rx="1.5" opacity=".6" />
                <rect x="2" y="11" width="7" height="6" rx="1.5" opacity=".6" />
                <rect x="11" y="11" width="7" height="6" rx="1.5" />
              </svg>
              Irregulars
            </button>
          </nav>

          {!session && (
            <Home content={content} overview={view} persisted={initial.persisted} source={source} onStart={start} />
          )}

          {card &&
            (card.mode === "scramble" ? (
              <Scrambler
                key={card.key}
                card={card}
                content={content}
                note={session!.note}
                onAnswer={onAnswer}
                onNext={onNext}
                onShowTable={showTable}
              />
            ) : (
              <TenseLock
                key={card.key}
                card={card}
                content={content}
                note={session!.note}
                onAnswer={onAnswer}
                onNext={onNext}
                onShowTable={showTable}
              />
            ))}

          {session && done && (
            <Summary
              content={content}
              right={session.right}
              total={session.answered}
              moves={session.moves}
              moreDue={view.due.length + view.fresh.length > 0}
              onAgain={() => start(false)}
              onHome={home}
            />
          )}
        </div>
        <Drawer open={drawer.open} focus={drawer.focus} content={content} onClose={closeDrawer} />
      </main>
    </MotionConfig>
  );
}

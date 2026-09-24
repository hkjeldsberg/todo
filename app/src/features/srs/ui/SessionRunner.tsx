"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { answerCard } from "../actions";
import type { SessionCard } from "../types";
import ChoiceView from "./ChoiceView";
import ClozeView from "./ClozeView";
import RecallView from "./RecallView";
import ScrambleView from "./ScrambleView";
import { Pill } from "./parts";

/**
 * Plays a list of cards, grading each one as it's checked. Grading is written
 * in the background; a failed write is shown but never blocks the session.
 */
export default function SessionRunner({
  cards,
  title,
  exitHref = "/repaso",
}: {
  cards: SessionCard[];
  title: string;
  exitHref?: string;
}) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);

  const card = cards[index];
  const done = index >= cards.length;

  const onResult = useCallback(
    (correct: boolean, answer: string) => {
      if (!card) return;
      setScore((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }));
      answerCard({
        kind: card.kind,
        ref: card.ref,
        source: card.source,
        correct,
        mode: card.view,
        answer,
      }).catch((cause) => setSaveError(cause instanceof Error ? cause.message : String(cause)));
    },
    [card],
  );

  const onNext = useCallback(() => setIndex((i) => i + 1), []);

  // A real reload: the server builds a fresh batch from the updated queue.
  function again() {
    setReloading(true);
    window.location.reload();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col bg-page px-[18px] pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(18px+env(safe-area-inset-bottom))]">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href={exitHref}
          aria-label="Leave session"
          className="press flex size-11 items-center justify-center rounded-full bg-card text-[18px] font-bold shadow-[0_4px_0_var(--card-shadow)]"
          style={{ ["--press" as string]: "4px" }}
        >
          ✕
        </Link>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-pill-flat" aria-hidden>
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${cards.length ? (Math.min(index, cards.length) / cards.length) * 100 : 100}%` }}
          />
        </div>
        <span className="min-w-12 text-right text-[13px] font-bold text-muted">
          {Math.min(index + 1, cards.length)}/{cards.length}
        </span>
      </header>

      {saveError && (
        <p role="alert" className="mb-3 text-[13px] font-bold text-accent">
          ! Not saved: {saveError}
        </p>
      )}

      {cards.length === 0 ? (
        <Finished title="Todo al día." lines={["Nothing due right now."]} exitHref={exitHref} />
      ) : done ? (
        <Finished
          title={`${Math.round((score.right / Math.max(score.total, 1)) * 100)}%`}
          lines={[`${score.right} of ${score.total} right · ${title}`]}
          exitHref={exitHref}
          onAgain={again}
          busy={reloading}
        />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={card.key + index}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.16 }}
            className="flex flex-1 flex-col"
          >
            {card.view === "cloze" && <ClozeView card={card} onResult={onResult} onNext={onNext} />}
            {card.view === "scramble" && <ScrambleView card={card} onResult={onResult} onNext={onNext} />}
            {card.view === "choice" && <ChoiceView card={card} onResult={onResult} onNext={onNext} />}
            {card.view === "recall" && <RecallView card={card} onResult={onResult} onNext={onNext} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

function Finished({
  title,
  lines,
  exitHref,
  onAgain,
  busy,
}: {
  title: string;
  lines: string[];
  exitHref: string;
  onAgain?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-3 text-center">
      <p className="text-[56px] leading-none font-bold">{title}</p>
      {lines.map((line) => (
        <p key={line} className="text-[15px] text-muted">
          {line}
        </p>
      ))}
      <div className="mt-6 flex flex-col gap-3">
        {onAgain && (
          <Pill onClick={onAgain} disabled={busy} autoFocus>
            {busy ? "Loading…" : "Next batch →"}
          </Pill>
        )}
        <Link
          href={exitHref}
          className="press min-h-12 rounded-full bg-card px-5 py-3 text-[17px] font-bold shadow-[0_6px_0_var(--card-shadow)]"
        >
          Back to Repaso
        </Link>
      </div>
    </div>
  );
}

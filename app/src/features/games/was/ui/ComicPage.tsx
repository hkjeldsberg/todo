"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { isCorrect } from "../lib/game";
import type { ComicPage as Page, Panel, Verb } from "../lib/types";
import styles from "../was.module.css";
import { ComicPanel, type Feedback, type Snap, type SolvedState } from "./ComicPanel";
import { VerbBank, type Point } from "./VerbBank";

const FEEDBACK_MS = 6000;
const HIT_SLOP = 16;

/** Open panel whose (slightly inflated) box contains the point. */
function dropTargetAt({ x, y }: Point): string | null {
  const zones = document.querySelectorAll<HTMLElement>('[data-drop][data-open="true"]');
  for (const zone of zones) {
    const r = zone.getBoundingClientRect();
    if (x >= r.left - HIT_SLOP && x <= r.right + HIT_SLOP && y >= r.top - HIT_SLOP && y <= r.bottom + HIT_SLOP) {
      return zone.dataset.drop ?? null;
    }
  }
  return null;
}

function centerOf(el: Element | null): Point | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

type Props = {
  page: Page;
  /** Panels solved on this or an earlier visit. */
  solvedIds: ReadonlySet<string>;
  onAnswer: (panel: Panel, verb: Verb, correct: boolean) => void;
  onBack: () => void;
  onReplay: () => void;
  onNext: (() => void) | null;
};

/** One playable 5-panel page: sticky verb bank, drop / tap-to-place, snap + colour reveal. */
export function ComicPage({ page, solvedIds, onAnswer, onBack, onReplay, onNext }: Props) {
  const { panels } = page;
  // Panels solved during this visit, with the offset their verb snaps in from.
  const [snaps, setSnaps] = useState<Record<string, Snap>>({});
  const [selected, setSelected] = useState<Verb | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [rejection, setRejection] = useState<{ verb: Verb; key: number } | null>(null);
  const completeRef = useRef<HTMLDivElement>(null);

  const solvedState = (id: string): SolvedState => snaps[id] ?? (solvedIds.has(id) ? null : undefined);
  const solvedCount = panels.filter((p) => solvedIds.has(p.id) || snaps[p.id]).length;
  const complete = solvedCount === panels.length;
  const justCompleted = complete && Object.keys(snaps).length > 0;

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [feedback]);

  useEffect(() => {
    if (!justCompleted) return;
    const t = setTimeout(() => completeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 700);
    return () => clearTimeout(t);
  }, [justCompleted]);

  const attempt = useCallback(
    (verb: Verb, panelId: string, from: Point) => {
      const panel = panels.find((p) => p.id === panelId);
      if (!panel || snaps[panelId] || solvedIds.has(panelId)) return;

      const correct = isCorrect(panel, verb);
      onAnswer(panel, verb, correct);
      // Right or wrong, the verb goes back to the bank.
      setSelected(null);
      if (correct) {
        const c = centerOf(document.querySelector(`[data-slot="${panelId}"]`)) ?? from;
        setSnaps((s) => ({ ...s, [panelId]: { x: from.x - c.x, y: from.y - c.y } }));
        setFeedback((f) => (f?.panelId === panelId ? null : f));
      } else {
        const key = Date.now();
        setFeedback({ panelId, verb, key });
        setRejection({ verb, key });
      }
    },
    [panels, snaps, solvedIds, onAnswer],
  );

  const handleDrop = useCallback(
    (verb: Verb, point: Point) => {
      setHovered(null);
      const target = dropTargetAt(point);
      if (target) attempt(verb, target, point);
    },
    [attempt],
  );

  const handleSlotClick = (panelId: string) => {
    if (!selected) return;
    const from =
      centerOf(document.querySelector('[role="toolbar"] [aria-pressed="true"]')) ??
      centerOf(document.querySelector(`[data-slot="${panelId}"]`)) ??
      { x: 0, y: 0 };
    attempt(selected, panelId, from);
  };

  return (
    <>
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 sm:px-6">
        <header className="mb-6">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-bold tracking-wider text-(--c-ink)/60 uppercase hover:text-(--c-ink)"
          >
            ← Cómics
          </button>
          <h1 className={`${styles.display} text-5xl sm:text-6xl`}>{page.title}</h1>
          <Legend />
        </header>

        <div className="flex flex-col gap-6 md:grid md:grid-cols-6 md:gap-5">
          {panels.map((panel, i) => (
            <ComicPanel
              key={panel.id}
              panel={panel}
              index={i}
              solved={solvedState(panel.id)}
              hovered={hovered === panel.id}
              armed={selected !== null && solvedState(panel.id) === undefined}
              feedback={feedback?.panelId === panel.id ? feedback : null}
              onSlotClick={() => handleSlotClick(panel.id)}
              onDismissFeedback={() => setFeedback(null)}
            />
          ))}
        </div>

        <AnimatePresence>
          {complete && (
            <motion.div
              ref={completeRef}
              className="mt-8 rounded-2xl border-4 border-(--c-ink) bg-(--c-pop) p-6 text-center shadow-[6px_6px_0_var(--c-ink)]"
              initial={{ opacity: 0, scale: 0.8, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: justCompleted ? 0.5 : 0 }}
            >
              <p className={`${styles.display} text-5xl`}>¡Caso cerrado!</p>
              <p className="mt-2">
                Imperfect (<b>era</b>, <b>estaba</b>) painted the scene. Preterite (<b>fue</b>, <b>estuve</b>) moved the
                story.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <ComicButton onClick={onReplay}>Otra vez</ComicButton>
                {onNext ? (
                  <ComicButton onClick={onNext} dark>
                    Siguiente →
                  </ComicButton>
                ) : (
                  <ComicButton onClick={onBack} dark>
                    Más cómics
                  </ComicButton>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <VerbBank
        solvedCount={solvedCount}
        total={panels.length}
        selected={selected}
        rejection={rejection}
        onSelect={setSelected}
        onDragMove={(p) => setHovered(dropTargetAt(p))}
        onDrop={handleDrop}
      />
    </>
  );
}

export function Legend() {
  return (
    <ul className="mt-3 flex flex-col gap-1.5 text-sm sm:flex-row sm:gap-6">
      <li className="flex items-center gap-2">
        <span className="inline-block h-4 w-6 rounded-md bg-(--c-ink)/20" aria-hidden />
        Soft panels set the scene: <b>era</b> / <b>estaba</b>
      </li>
      <li className="flex items-center gap-2">
        <span className={`${styles.jagged} inline-block h-4 w-6 bg-(--c-ink)`} aria-hidden />
        Jagged panels drive the action: <b>fue</b> / <b>estuve</b>
      </li>
    </ul>
  );
}

export function ComicButton({
  onClick,
  dark,
  children,
}: {
  onClick: () => void;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.display} rounded-xl border-[3px] border-(--c-ink) px-5 py-2 text-xl tracking-wider shadow-[3px_3px_0_var(--c-ink)] active:translate-y-0.5 ${
        dark ? "bg-(--c-ink) text-(--c-paper)" : "bg-white"
      }`}
    >
      {children}
    </button>
  );
}

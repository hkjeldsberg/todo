"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Fragment, type ReactNode } from "react";
import { displayVerb } from "../lib/game";
import type { Panel, Verb } from "../lib/types";
import styles from "../was.module.css";

/** Offset the verb snaps in from (drop point relative to the slot). */
export type Snap = { x: number; y: number };

/**
 * `undefined` = still blank, `null` = solved on an earlier visit (shown in colour,
 * no animation), a Snap = solved just now.
 */
export type SolvedState = Snap | null | undefined;

export type Feedback = { panelId: string; verb: Verb; key: number };

/** Asymmetric page layout on desktop (6-column grid), by position on the page. */
const DESKTOP_LAYOUT = [
  "md:col-span-6 md:h-[26rem]",
  "md:col-span-3 md:h-[22rem]",
  "md:col-span-3 md:h-[22rem]",
  "md:col-span-2 md:h-[20rem]",
  "md:col-span-4 md:h-[20rem]",
];

type Props = {
  panel: Panel;
  index: number;
  solved: SolvedState;
  hovered: boolean;
  armed: boolean;
  feedback: Feedback | null;
  onSlotClick: () => void;
  onDismissFeedback: () => void;
};

export function ComicPanel({ panel, index, solved, hovered, armed, feedback, onSlotClick, onDismissFeedback }: Props) {
  const isSolved = solved !== undefined;
  const animate = solved != null;
  const action = panel.panel_type === "action";

  const art = (
    <>
      <Image src={panel.asset_sketch} alt="" fill unoptimized className="object-cover" />
      {isSolved && (
        <>
          <motion.div
            className="absolute inset-0"
            initial={animate ? { clipPath: "circle(0% at 50% 70%)" } : false}
            animate={{ clipPath: "circle(150% at 50% 70%)" }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Image src={panel.asset_color} alt="" fill unoptimized className="object-cover" />
          </motion.div>
          {animate && (
            <motion.div
              className="pointer-events-none absolute inset-0 bg-white"
              initial={{ opacity: 0.85 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
            />
          )}
        </>
      )}
    </>
  );

  return (
    <motion.section
      data-drop={panel.id}
      data-open={!isSolved}
      aria-label={`Panel ${panel.panel_order} (${panel.panel_type})`}
      className={`relative aspect-[4/3] md:aspect-auto ${DESKTOP_LAYOUT[index] ?? "md:col-span-3 md:h-[22rem]"}`}
      animate={{ scale: hovered ? 1.02 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {action ? (
        // Ink layer + inset art layer share the zig-zag clip, producing a jagged outline.
        <div className="absolute inset-0 drop-shadow-[6px_6px_0_rgba(11,11,18,0.9)]">
          <div className={`${styles.jagged} absolute inset-0 bg-(--c-ink)`} />
          <div className={`${styles.jagged} absolute inset-[6px] overflow-hidden bg-white`}>{art}</div>
        </div>
      ) : (
        // Establishing panels: borderless, soft edges.
        <div className="absolute inset-0 overflow-hidden rounded-[2rem] shadow-[0_18px_40px_-18px_rgba(11,11,18,0.55)]">
          {art}
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] shadow-[inset_0_0_40px_rgba(244,239,227,0.55)]" />
        </div>
      )}

      <div
        className={`absolute inset-x-3 bottom-3 flex sm:inset-x-5 sm:bottom-5 ${action ? "justify-end" : "justify-start"}`}
      >
        <Caption action={action}>
          {panel.sentence_pre}
          <Slot panel={panel} solved={solved} hovered={hovered} armed={armed} onClick={onSlotClick} />
          {panel.sentence_post}
        </Caption>
      </div>

      <AnimatePresence>
        {hovered && !isSolved && (
          <motion.div
            className={`pointer-events-none absolute inset-0 ring-4 ring-(--c-pop) ring-offset-2 ring-offset-(--c-ink) ${
              action ? "" : "rounded-[2rem]"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {feedback && <FeedbackTip key={feedback.key} panel={panel} verb={feedback.verb} onDismiss={onDismissFeedback} />}
      </AnimatePresence>
    </motion.section>
  );
}

function Caption({ action, children }: { action: boolean; children: ReactNode }) {
  if (action) {
    return (
      <p className="relative max-w-[92%] rounded-[1.5rem] border-[3px] border-(--c-ink) bg-white px-4 py-2 text-base leading-snug font-bold shadow-[3px_3px_0_var(--c-ink)] sm:text-lg">
        {children}
        <svg aria-hidden viewBox="0 0 30 24" className="absolute -top-[21px] right-8 h-6 w-8">
          <path d="M2 24 L20 2 L28 24" fill="white" stroke="#0b0b12" strokeWidth="3" />
          <path d="M3 24.5 H27" stroke="white" strokeWidth="4" />
        </svg>
      </p>
    );
  }
  return (
    <p className="max-w-[92%] -rotate-[0.6deg] border-[3px] border-(--c-ink) bg-(--c-caption) px-4 py-2 text-base leading-snug shadow-[4px_4px_0_var(--c-ink)] sm:text-lg">
      {children}
    </p>
  );
}

function Slot({
  panel,
  solved,
  hovered,
  armed,
  onClick,
}: {
  panel: Panel;
  solved: SolvedState;
  hovered: boolean;
  armed: boolean;
  onClick: () => void;
}) {
  if (solved !== undefined) {
    return (
      <motion.span
        data-slot={panel.id}
        className={`${styles.display} relative mx-1 inline-block text-[1.25em] leading-none text-(--c-alarm)`}
        initial={solved ? { x: solved.x, y: solved.y, scale: 1.4, rotate: -6 } : false}
        animate={{ x: 0, y: 0, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 520, damping: 24 }}
      >
        {displayVerb(panel, panel.correct_verb)}
        {solved && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-[-10px] rounded-full border-4 border-(--c-pop)"
            initial={{ scale: 0.4, opacity: 1 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          />
        )}
      </motion.span>
    );
  }

  return (
    <button
      type="button"
      data-slot={panel.id}
      onClick={onClick}
      aria-label={`Blank in panel ${panel.panel_order}`}
      className={`mx-1 inline-block min-w-[6.5ch] rounded-md border-2 border-dashed px-2 align-baseline leading-tight transition ${
        hovered ? "scale-110 border-solid border-(--c-ink) bg-(--c-pop)" : "border-(--c-ink)/60 bg-white/70"
      } ${armed ? "animate-pulse cursor-pointer" : "cursor-default"}`}
    >
      &nbsp;
    </button>
  );
}

const TYPE_HINT = {
  establishing: "Soft panel = the scene: background, states, traits.",
  action: "Jagged panel = the action: a moment that is over and done.",
} as const;

function FeedbackTip({ panel, verb, onDismiss }: { panel: Panel; verb: Verb; onDismiss: () => void }) {
  return (
    <motion.div
      role="status"
      className="absolute inset-x-3 top-3 z-20 rounded-xl border-[3px] border-(--c-ink) bg-white p-3 pr-9 text-sm leading-snug shadow-[4px_4px_0_var(--c-ink)] sm:inset-x-auto sm:top-5 sm:right-5 sm:max-w-xs"
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <p className="font-bold">
        <span className="text-(--c-alarm)">{verb}</span> doesn&apos;t fit here.
      </p>
      <p className="mt-1">
        <Emphasis text={panel.rule_feedback} />
      </p>
      <p className="mt-1 text-xs text-(--c-ink)/60">{TYPE_HINT[panel.panel_type]}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss hint"
        className="absolute top-1.5 right-2 text-lg leading-none font-bold text-(--c-ink)/60 hover:text-(--c-ink)"
      >
        ×
      </button>
    </motion.div>
  );
}

/** Renders `*word*` as emphasis. */
function Emphasis({ text }: { text: string }) {
  return text.split(/\*([^*]+)\*/g).map((part, i) =>
    i % 2 ? (
      <em key={i} className="font-bold">
        {part}
      </em>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

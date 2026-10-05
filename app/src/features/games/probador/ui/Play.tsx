"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "../avatar/Avatar";
import { questionWith } from "../lib/content";
import {
  judge,
  RULE,
  TRACK_LABEL,
  trackOfVerb,
  type Verdict,
} from "../lib/judge";
import type { Card } from "../lib/srs";
import {
  SLOTS,
  type Parts,
  type ProbadorContent,
  type Slot,
  type Track,
} from "../lib/types";
import styles from "../probador.module.css";
import { Curtains } from "./Curtains";

/** PRD §6: after this long on one step, the right option pulses. */
export const HESITATION_MS = 5000;
/** A right answer shows its sentence this long before the next outfit drops in. */
const ADVANCE_MS = 1100;

export const TRACK_BG: Record<Track, string> = {
  quedar: styles.quedar,
  parecer: styles.parecer,
  parecerse: styles.parecerse,
};
export const TRACK_TEXT: Record<Track, string> = {
  quedar: styles.textQuedar,
  parecer: styles.textParecer,
  parecerse: styles.textParecerse,
};

const SLOT_HINT: Record<Slot, string> = {
  pronoun: "Who?",
  verb: "Which verb?",
  complement: "How?",
};

type Props = {
  card: Card;
  content: ProbadorContent;
  /** Sentence-level note under a miss, e.g. "Back in 8 cards". */
  missNote: string;
  onAnswer: (correct: boolean, answer: string) => void;
  onNext: () => void;
};

/**
 * One prompt: the avatar on top (60%), the builder below (40%). Pronoun →
 * verb → complement; the last tap judges. Right → next outfit after a beat.
 * Wrong → the stage freezes and the mismatched slots are marked.
 */
export function Play({ card, content, missNote, onAnswer, onNext }: Props) {
  const { prompt, options } = card;
  const outfit = content.outfits[prompt.outfit_id];
  const [built, setBuilt] = useState<Partial<Parts>>({});
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  /** The step (card key + slot) whose hesitation timer ran out. */
  const [hintFor, setHintFor] = useState<string | null>(null);
  // Play stays mounted across cards so the outgoing avatar can animate out;
  // a new card resets the builder (React's "adjust state on prop change").
  const [shownKey, setShownKey] = useState(card.key);
  if (card.key !== shownKey) {
    setShownKey(card.key);
    setBuilt({});
    setVerdict(null);
  }
  const next = useRef(onNext);
  useEffect(() => {
    next.current = onNext;
  });
  const step = SLOTS.findIndex((slot) => !built[slot]);
  const slot: Slot | null = step >= 0 ? SLOTS[step] : null;
  const stepKey = `${card.key}:${slot}`;
  const hint = hintFor === stepKey;
  const continueButton = useRef<HTMLButtonElement>(null);

  // Hesitation pulse: restart the clock on every step.
  useEffect(() => {
    if (verdict || !slot) return;
    const timer = setTimeout(() => setHintFor(stepKey), HESITATION_MS);
    return () => clearTimeout(timer);
  }, [stepKey, slot, verdict]);

  useEffect(() => {
    if (!verdict) return;
    if (verdict.correct) {
      const timer = setTimeout(() => next.current(), ADVANCE_MS);
      return () => clearTimeout(timer);
    }
    continueButton.current?.focus();
  }, [verdict]);

  function pick(value: string) {
    if (!slot || verdict) return;
    const next = { ...built, [slot]: value };
    setBuilt(next);
    if (slot === "complement") {
      const parts = next as Parts;
      const v = judge(prompt, parts);
      setVerdict(v);
      onAnswer(v.correct, `${parts.pronoun} ${parts.verb} ${parts.complement}`);
    }
  }

  /** Tap a filled slot to redo from there (until judged). */
  function undo(from: Slot) {
    if (verdict) return;
    const keep: Partial<Parts> = {};
    for (const s of SLOTS.slice(0, SLOTS.indexOf(from))) keep[s] = built[s];
    setBuilt(keep);
  }

  const frozen = verdict && !verdict.correct;
  const track = prompt.target_verb;
  const [qPre, qPost] = prompt.question_text.split("{verb}");

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      data-prompt={prompt.id}
      data-track={track}
    >
      {/* stage: 60% */}
      <div
        className={`relative flex h-[56dvh] min-h-[300px] shrink-0 items-end justify-center overflow-hidden rounded-b-[32px] ${styles.room}`}
      >
        <Curtains />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={card.key}
            className={`relative z-10 h-[94%] ${frozen ? styles.frozen : ""}`}
            initial={{ y: "-110%", opacity: 0 }}
            animate={
              frozen
                ? { y: 0, opacity: 1, x: [0, -10, 10, -6, 6, 0] }
                : { y: 0, opacity: 1 }
            }
            exit={{ x: "120%", opacity: 0, rotate: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 24, x: { type: "tween", duration: 0.45 } }}
          >
            <Avatar
              look={outfit.avatar}
              layers={outfit.layers}
              className="h-full w-auto"
            />
          </motion.div>
        </AnimatePresence>
        {card.attempt > 0 && (
          <span className="absolute top-4 left-4 z-20 rounded-full bg-ink px-3 py-1 text-[12px] font-extrabold text-on-ink">
            again
          </span>
        )}
      </div>

      {/* interaction zone: 40% */}
      <div className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p
          lang="es"
          className="text-[21px] leading-snug font-extrabold"
          data-testid="probador-question"
        >
          {verdict ? (
            <>
              {qPre}
              <span className={TRACK_TEXT[track]}>{prompt.question_fill}</span>
              {qPost}
            </>
          ) : (
            questionWith(prompt)
          )}
        </p>

        {/* the answer being built */}
        <div
          className="flex flex-wrap items-center gap-2"
          data-testid="probador-answer"
          aria-live="polite"
        >
          {SLOTS.map((s) => {
            const value = built[s];
            const wrong = verdict?.wrong.includes(s);
            const verbTrack = s === "verb" && value ? trackOfVerb(value) : null;
            if (!value)
              return (
                <span
                  key={s}
                  className={`min-h-11 min-w-16 rounded-full border-[3px] border-dashed px-3 py-1.5 text-[14px] font-bold ${
                    s === slot
                      ? "border-accent text-accent"
                      : "border-dash text-faint"
                  }`}
                >
                  {SLOT_HINT[s]}
                </span>
              );
            return (
              <motion.button
                key={s}
                type="button"
                layout
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => undo(s)}
                disabled={!!verdict}
                className={`min-h-11 rounded-full px-4 py-1.5 text-[18px] font-extrabold ${
                  wrong
                    ? "bg-ai text-ink line-through decoration-accent decoration-[3px]"
                    : verbTrack
                      ? TRACK_BG[verbTrack]
                      : "bg-ink text-on-ink"
                }`}
              >
                {value}
              </motion.button>
            );
          })}
          {verdict && <span className="text-[20px] font-extrabold">.</span>}
        </div>

        {/* Each step's options slide in (PRD §6). No exit animation: AnimatePresence
            "wait" got stuck after the block unmounted on a miss and came back. */}
        {!verdict && slot && (
          <motion.div
            key={stepKey}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.16 }}
            className="flex flex-wrap gap-2.5"
            data-testid="probador-options"
          >
            {options[slot].map((value) => {
              const verbTrack = slot === "verb" ? trackOfVerb(value) : null;
              const pulse = hint && value === prompt.answer_parts[slot];
              return (
                <motion.button
                  key={value}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  // A glowing ring, not a scale: the target stays put under the thumb.
                  animate={{
                    boxShadow: pulse
                      ? [
                          "0 0 0 0px rgba(255,95,162,0.7)",
                          "0 0 0 9px rgba(255,95,162,0)",
                        ]
                      : "0 4px 0 0px rgba(36,19,42,0.18)",
                  }}
                  transition={
                    pulse
                      ? { repeat: Infinity, duration: 1.1, ease: "easeOut" }
                      : { duration: 0.1 }
                  }
                  onClick={() => pick(value)}
                  data-hint={pulse || undefined}
                  className={`min-h-14 rounded-full px-5 text-[19px] font-extrabold ${pulse ? "ring-[3px] ring-accent " : ""}${
                    verbTrack
                      ? TRACK_BG[verbTrack]
                      : slot === "pronoun"
                        ? "bg-pill text-ink"
                        : "bg-card text-ink"
                  }`}
                >
                  {value}
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {!verdict && (
          <div
            className="mt-auto h-1.5 overflow-hidden rounded-full bg-pill-flat"
            aria-hidden
          >
            <motion.div
              key={`${card.key}-${slot}`}
              className="h-full rounded-full bg-accent"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: HESITATION_MS / 1000, ease: "linear" }}
            />
          </div>
        )}

        {verdict?.correct && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
            className="text-[17px] font-extrabold"
          >
            <span className="glyph">✓</span> ¡Eso es!{" "}
            <span className={TRACK_TEXT[track]}>{TRACK_LABEL[track]}</span>
          </motion.p>
        )}

        {frozen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-2.5"
          >
            <div
              role="status"
              className="rounded-[20px] bg-ai p-3.5 text-[15px] leading-snug shadow-[0_5px_0_var(--accent-shadow)]"
            >
              <p className="text-[17px] font-extrabold">
                <span className="glyph">✗</span>{" "}
                <span lang="es">
                  {prompt.answer_parts.pronoun}{" "}
                  <span className={`rounded-full px-2 ${TRACK_BG[track]}`}>
                    {prompt.answer_parts.verb}
                  </span>{" "}
                  {prompt.answer_parts.complement}.
                </span>
              </p>
              {verdict.notes.map((note) => (
                <p key={note} className="mt-1">
                  {note}
                </p>
              ))}
              {!verdict.wrong.includes("verb") && (
                <p className="mt-1 text-muted">{RULE[track]}</p>
              )}
              <p className="mt-1 text-muted italic">
                {prompt.english_translation}
              </p>
              <p className="mt-1 font-bold">{missNote}</p>
            </div>
            <button
              ref={continueButton}
              type="button"
              onClick={onNext}
              className="press min-h-14 rounded-full bg-ink text-[18px] font-extrabold text-on-ink shadow-[0_6px_0_var(--ink-shadow)]"
            >
              Got it →
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

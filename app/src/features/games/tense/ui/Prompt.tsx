"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import type { AnswerOption, Puzzle } from "../types";
import { Sheet, TENSE_LABEL, inkPill } from "./sticker";

interface PromptProps {
  puzzle: Puzzle;
  options: AnswerOption[];
  solved: boolean;
  wrong: string[];
  onChoose: (o: AnswerOption) => void;
  onClose: () => void;
}

/** Cloze prompt for one memory fragment. Bottom sheet on phones, centred card on desktop. */
export function Prompt({ puzzle, options, solved, wrong, onChoose, onClose }: PromptProps) {
  const correct = options.find((o) => o.correct);
  const answered = solved || wrong.length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (solved && e.key === "Enter")) return onClose();
      const i = Number(e.key) - 1;
      if (!solved && options[i] && !wrong.includes(options[i].form)) onChoose(options[i]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, solved, wrong, onChoose, onClose]);

  return (
    <Sheet label="Memory fragment" onDismiss={onClose} anchor="bottom">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] font-bold text-muted">Memory fragment</span>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-pill px-2.5 py-0.5 text-[12px] font-bold">
            verb <em lang="es" className="not-italic">{puzzle.verb_base}</em>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-[18px] font-bold text-muted"
          >
            ✕
          </button>
        </span>
      </div>

      <p lang="es" className="text-[21px] leading-snug font-bold sm:text-[24px]">
        {puzzle.sentence_pre}
        <span
          className={`mx-1 inline-block min-w-20 border-b-4 px-2 text-center ${
            solved ? "border-accent text-accent" : "border-ink"
          }`}
        >
          {solved && correct ? correct.form : "?"}
        </span>
        {puzzle.sentence_post}
      </p>

      {solved && puzzle.translation && <p className="mt-1 text-[14px] text-muted">{puzzle.translation}</p>}

      <div className="mt-5 grid grid-cols-2 gap-3">
        {options.map((o, i) => {
          const isWrong = wrong.includes(o.form);
          const isRight = solved && o.correct;
          const tone = isRight
            ? "bg-accent text-white shadow-[0_6px_0_var(--accent-shadow)]"
            : isWrong
              ? "translate-y-[6px] bg-pill-flat text-faint line-through"
              : "bg-pill text-ink shadow-[0_6px_0_var(--pill-deep)]";
          return (
            <motion.button
              key={o.form}
              type="button"
              lang="es"
              disabled={solved || isWrong}
              onClick={() => onChoose(o)}
              animate={isWrong ? { x: [0, -5, 5, -3, 0] } : { x: 0 }}
              transition={{ duration: 0.3 }}
              className={`press relative min-h-16 rounded-[18px] px-3 py-3 [--press:6px] disabled:cursor-default ${tone}`}
            >
              <span className="absolute top-1.5 left-3 hidden text-[12px] font-bold opacity-50 sm:block">{i + 1}</span>
              <span data-form className="block text-[20px] leading-tight font-bold">
                {o.form}
              </span>
              {answered && (
                <span className="mt-0.5 block text-[12px] font-bold opacity-80">{TENSE_LABEL[o.type].es}</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {!solved && wrong.length > 0 && (
        <div role="alert" className="mt-5 rounded-[18px] bg-ai px-4 py-3 text-[15px] leading-relaxed">
          <strong className="mr-1 font-bold">Not quite, the memory stays locked.</strong>
          {puzzle.rule_feedback}
        </div>
      )}

      {solved && correct && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px]">
            <strong className="font-bold text-accent">Right: {TENSE_LABEL[correct.type].es}</strong>
            <span className="text-muted">
              {" "}
              · {correct.type === "imperfect" ? "the scene comes alive in a loop" : "a one-time event changes the room"}
            </span>
          </p>
          <button type="button" autoFocus onClick={onClose} className={`${inkPill} w-full sm:w-auto`}>
            Watch it happen →
          </button>
        </div>
      )}
    </Sheet>
  );
}

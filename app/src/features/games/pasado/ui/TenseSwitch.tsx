"use client";

import { motion } from "framer-motion";
import { TENSE_LABEL } from "../lib/forms";
import { PAST_TENSES, type PastTense } from "../lib/types";
import styles from "../pasado.module.css";
import { Padlock } from "./Padlock";

const HINT: Record<PastTense, string> = {
  preterite: "done · one moment",
  imperfect: "habit · background",
};

/**
 * The Tense Lock: a thumb-sized segment control. The chosen half takes that
 * tense's look (sharp ink block vs soft gradient) and its padlock snaps shut.
 */
export function TenseSwitch({
  value,
  onChange,
  disabled,
  result,
}: {
  value: PastTense | null;
  onChange: (tense: PastTense) => void;
  disabled?: boolean;
  /** After checking: which tense was right, to mark the halves. */
  result?: PastTense;
}) {
  return (
    <div role="radiogroup" aria-label="Tense" className="grid grid-cols-2 gap-2 rounded-[20px] bg-pill-flat p-1.5">
      {PAST_TENSES.map((tense) => {
        const on = value === tense;
        const right = result === tense;
        return (
          <button
            key={tense}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(tense)}
            className={`relative flex min-h-16 flex-col items-center justify-center px-2 py-2 text-center transition-colors ${
              on ? (tense === "preterite" ? "text-on-ink" : "text-ink") : "text-ink/70 hover:text-ink"
            }`}
          >
            {on && (
              <motion.span
                layoutId="tense-lock"
                aria-hidden
                className={`absolute inset-0 ${tense === "preterite" ? styles.preterite : styles.imperfect}`}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative flex items-center gap-1.5 text-[19px] font-extrabold">
              <Padlock locked={on} />
              {TENSE_LABEL[tense]}
              {result && right && <span className="glyph text-[15px]">✓</span>}
            </span>
            <span className="relative text-[12px] font-bold opacity-70">{HINT[tense]}</span>
          </button>
        );
      })}
    </div>
  );
}

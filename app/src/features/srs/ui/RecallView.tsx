"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CardTag, Pill } from "./parts";
import type { ViewProps } from "./types";

/** Saved phrases: think of the other side, reveal, then say how it went. */
export default function RecallView({ card, onResult, onNext }: ViewProps<"recall">) {
  const [shown, setShown] = useState(false);

  function grade(correct: boolean) {
    onResult(correct, correct ? "knew it" : "missed");
    onNext();
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <CardTag label={card.label} box={card.box} isNew={card.isNew} />
      </div>

      <p className="text-[12px] font-bold text-faint">
        {card.frontLang === "es" ? "What does it mean?" : "How do you say it in Spanish?"}
      </p>
      <p className="-mt-3 text-[26px] leading-snug font-bold">{card.front}</p>

      {shown && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[22px] bg-card p-4 text-[20px] leading-snug font-bold shadow-[0_6px_0_var(--card-shadow)]"
        >
          {card.back}
        </motion.div>
      )}

      <div className="mt-auto flex gap-3 pt-2">
        {!shown ? (
          <Pill onClick={() => setShown(true)} className="w-full" autoFocus>
            Show answer
          </Pill>
        ) : (
          <>
            <Pill tone="accent" onClick={() => grade(false)} className="flex-1">
              Missed it
            </Pill>
            <Pill onClick={() => grade(true)} className="flex-1" autoFocus>
              Knew it
            </Pill>
          </>
        )}
      </div>
    </div>
  );
}

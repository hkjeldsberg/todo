"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { clozeAnswerOf } from "../text";
import { CardTag, ContinueButton, Pill, Verdict } from "./parts";
import { normalize, stripAccents, type ViewProps } from "./types";

type State = "blank" | "correct" | "accent" | "wrong";

/** Type the missing word; "Hint?" opens tap-to-answer options. */
export default function ClozeView({ card, onResult, onNext }: ViewProps<"cloze">) {
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<State>("blank");
  const [hints, setHints] = useState(false);

  const answer = clozeAnswerOf(card.sentence) || card.word;
  const [before, after = ""] = card.sentence.cloze.split("{{word}}");
  const checked = state !== "blank";

  function check(value: string) {
    if (checked || !value.trim()) return;
    const exact = normalize(value) === normalize(answer);
    const accentOnly =
      !exact && stripAccents(normalize(value)) === stripAccents(normalize(answer));
    const next: State = exact ? "correct" : accentOnly ? "accent" : "wrong";
    setTyped(value.trim());
    setState(next);
    onResult(next !== "wrong", value.trim());
  }

  const gapTone =
    state === "blank"
      ? "bg-pill-deep text-ink"
      : state === "wrong"
        ? "bg-accent text-white"
        : "bg-ink text-on-ink";

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <CardTag label={card.label} box={card.box} isNew={card.isNew} />
      </div>

      <p className="text-[26px] leading-snug font-bold">
        {before}
        <span
          className={`mx-0.5 inline-block min-w-20 rounded-full px-3 text-center align-baseline ${gapTone}`}
        >
          {checked ? (state === "wrong" ? typed : answer) : " "}
        </span>
        {after}
      </p>
      <p className="-mt-3 text-[15px] text-muted">{card.sentence.english}</p>

      <AnimatePresence>
        {hints && !checked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 gap-2.5 overflow-hidden p-0.5 pb-2"
          >
            {card.options.map((option) => (
              <button
                key={option}
                onClick={() => check(option)}
                className="press min-h-12 rounded-full bg-card px-3 text-[17px] font-bold shadow-[0_4px_0_var(--card-shadow)]"
                style={{ ["--press" as string]: "4px" }}
              >
                {option}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {checked && (
        <Verdict
          correct={state !== "wrong"}
          title={answer}
          lines={[
            ...(state === "accent" ? [`Watch the accent: ${answer}`] : []),
            ...(normalize(answer) !== normalize(card.word) ? [`from ${card.word}`] : []),
            `${card.pos ? `${card.pos} · ` : ""}${card.meaning}`,
            ...(state === "wrong" ? [card.sentence.spanish] : []),
          ]}
        />
      )}

      <div className="mt-auto flex flex-col gap-3 pt-2">
        {!checked ? (
          <>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && check(typed)}
              placeholder="type the missing word…"
              aria-label="Missing word"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-full bg-pill px-5 py-3.5 text-[17px] outline-none focus:ring-2 focus:ring-pill-deep"
            />
            <div className="flex gap-3">
              <Pill tone="light" onClick={() => setHints((open) => !open)} className="flex-1">
                {hints ? "Hide" : "Hint?"}
              </Pill>
              <Pill onClick={() => check(typed)} disabled={!typed.trim()} className="flex-[2]">
                Check
              </Pill>
            </div>
          </>
        ) : (
          <ContinueButton onContinue={onNext} />
        )}
      </div>
    </div>
  );
}

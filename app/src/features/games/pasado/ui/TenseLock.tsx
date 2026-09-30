"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { formOf, judgeLock, ruleFor, TENSE_LABEL, type LockVerdict } from "../lib/forms";
import type { SessionCard } from "../lib/leitner";
import type { PasadoContent, PastTense } from "../lib/types";
import styles from "../pasado.module.css";
import { CardTag, GhostButton, PrimaryButton, Verdict, WithTrigger } from "./parts";
import { TenseSwitch } from "./TenseSwitch";
import { VerbForm } from "./VerbForm";

const ACCENTS = ["á", "é", "í", "ó", "ú", "ñ"];

type Props = {
  card: SessionCard;
  content: PasadoContent;
  /** Shown under the verdict, e.g. "Box 2 → 3". Filled in by the parent after answering. */
  note: string | null;
  onAnswer: (correct: boolean, answer: string) => void;
  onNext: () => void;
  onShowTable: (tense: PastTense, infinitive: string) => void;
};

/**
 * The primary loop (PRD §3): lock a tense, then type the form. Both must be
 * right. The blank takes the locked tense's look while you type.
 */
export function TenseLock({ card, content, note, onAnswer, onNext, onShowTable }: Props) {
  const { drill } = card;
  const verb = content.verbs[drill.infinitive];
  const [tense, setTense] = useState<PastTense | null>(null);
  const [typed, setTyped] = useState("");
  const [verdict, setVerdict] = useState<LockVerdict | null>(null);
  const [showEnglish, setShowEnglish] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const [pre, post] = drill.sentence_template.split("{verb}");
  const checked = verdict !== null;

  useEffect(() => {
    if (checked) next.current?.focus();
  }, [checked]);

  function lock(t: PastTense) {
    setTense(t);
    // After the tap, straight to typing.
    requestAnimationFrame(() => input.current?.focus());
  }

  function insert(char: string) {
    const el = input.current;
    const start = el?.selectionStart ?? typed.length;
    const end = el?.selectionEnd ?? typed.length;
    setTyped(typed.slice(0, start) + char + typed.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + 1, start + 1);
    });
  }

  function check() {
    if (!tense || !typed.trim() || checked) return;
    const v = judgeLock(content, drill, tense, typed);
    setVerdict(v);
    onAnswer(v.correct, `${tense}:${typed.trim()}`);
  }

  const blankTense = checked ? drill.correct_tense : tense;
  const blankClass = blankTense === "preterite" ? styles.preterite : blankTense === "imperfect" ? styles.imperfect : "";

  return (
    <div className="flex flex-1 flex-col gap-5" data-drill={drill.id} data-mode={card.mode}>
      <CardTag
        box={card.box}
        infinitive={verb.infinitive}
        english={verb.english}
        isNew={card.isNew}
        retry={card.retry}
      />

      <div className="rounded-[26px] bg-card px-5 py-6 shadow-[0_6px_0_var(--card-shadow)]">
        <p lang="es" className="text-[25px] leading-[1.7] font-bold sm:text-[30px]" data-testid="pasado-sentence">
          <WithTrigger text={pre} trigger={drill.trigger_word} tense={checked ? drill.correct_tense : null} />
          <motion.span
            layout
            className={`mr-2 ml-0.5 inline-flex min-w-[5.5ch] flex-col items-center px-3 align-middle leading-tight ${
              blankClass || "rounded-lg border-[3px] border-dashed border-dash"
            }`}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <span className="min-h-[1.3em] py-1">
              {checked ? (
                <VerbForm
                  infinitive={drill.infinitive}
                  tense={drill.correct_tense}
                  person={drill.person}
                  form={verdict.expected}
                />
              ) : (
                typed || " "
              )}
            </span>
          </motion.span>
          <span className="text-[17px] font-bold text-muted"> ({drill.infinitive})</span>
          <WithTrigger text={post} trigger={drill.trigger_word} tense={checked ? drill.correct_tense : null} />
        </p>
        {showEnglish || checked ? (
          <p className="mt-3 text-[15px] text-muted italic">{drill.english_translation}</p>
        ) : (
          <button
            type="button"
            onClick={() => setShowEnglish(true)}
            className="mt-3 text-[13px] font-bold text-faint underline underline-offset-4"
          >
            English
          </button>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {!checked && (
          <p className="text-[13px] font-bold text-muted">{tense ? "2 · Type the form" : "1 · Lock the tense"}</p>
        )}
        <TenseSwitch value={tense} onChange={lock} disabled={checked} result={checked ? drill.correct_tense : undefined} />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            check();
          }}
          className="flex flex-col gap-3"
        >
          <input
            ref={input}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            disabled={!tense || checked}
            lang="es"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="done"
            aria-label={`Form of ${drill.infinitive}`}
            placeholder={tense ? `${drill.infinitive}, ${drill.person} …` : "Lock a tense first"}
            className="min-h-14 w-full rounded-[18px] border-[3px] border-transparent bg-card px-4 text-[20px] font-bold shadow-[0_5px_0_var(--card-shadow)] outline-none focus:border-accent disabled:opacity-60"
          />
          {!checked && (
            <div className="flex gap-1.5">
              {ACCENTS.map((char) => (
                <button
                  key={char}
                  type="button"
                  disabled={!tense}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => insert(char)}
                  className="press min-h-11 flex-1 rounded-xl bg-pill text-[18px] font-bold shadow-[0_3px_0_var(--card-shadow)] disabled:opacity-40"
                  style={{ ["--press" as string]: "3px" }}
                >
                  {char}
                </button>
              ))}
            </div>
          )}
          {!checked && (
            <PrimaryButton type="submit" disabled={!tense || !typed.trim()}>
              Check
            </PrimaryButton>
          )}
        </form>

        <AnimatePresence>
          {verdict && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
              <Verdict correct={verdict.correct} title={verdict.correct ? "¡Correcto!" : "Not quite"}>
                <p>
                  Tense: <b>{TENSE_LABEL[drill.correct_tense]}</b>
                  {!verdict.tenseRight && tense && <> — you locked {TENSE_LABEL[tense]}</>}
                </p>
                <p>
                  Form:{" "}
                  <b>
                    <VerbForm
                      infinitive={drill.infinitive}
                      tense={drill.correct_tense}
                      person={drill.person}
                      form={verdict.expected}
                    />
                  </b>{" "}
                  ({drill.person})
                  {!verdict.formRight && (
                    <>
                      {" "}
                      — you wrote <s>{typed.trim()}</s>
                      {verdict.accentOnly && <> (check the accent)</>}
                    </>
                  )}
                </p>
                {!verdict.tenseRight && (
                  <p className="text-muted">
                    {TENSE_LABEL[tense ?? "preterite"]} would be {formOf(content, drill, tense ?? "preterite")}.
                  </p>
                )}
                <p className="text-muted">{ruleFor(drill)}</p>
                {note && <p className="font-bold">{note}</p>}
              </Verdict>
              <div className="flex gap-3">
                <GhostButton onClick={() => onShowTable(drill.correct_tense, drill.infinitive)} className="flex-1">
                  Table
                </GhostButton>
                <PrimaryButton ref={next} onClick={onNext} className="flex-[2]">
                  Next →
                </PrimaryButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

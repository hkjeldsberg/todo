"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { ruleFor, TENSE_LABEL } from "../lib/forms";
import type { SessionCard } from "../lib/leitner";
import { buildScramble, judgeScramble, type ScrambleVerdict, type Token } from "../lib/scramble";
import type { PasadoContent, PastTense } from "../lib/types";
import styles from "../pasado.module.css";
import { CardTag, GhostButton, PrimaryButton, Verdict, WithTrigger } from "./parts";
import { VerbForm } from "./VerbForm";

type Drag = { index: number; startX: number; startY: number; x: number; y: number; drop: number; width: number };

const TAP_THRESHOLD = 8;

/** Insert-before index nearest the pointer, ignoring the dragged chip itself. */
function insertIndex(x: number, y: number, dragging: number, chips: (HTMLElement | null)[]) {
  let best = dragging;
  let bestDistance = Infinity;
  chips.forEach((chip, index) => {
    if (!chip || index === dragging) return;
    const rect = chip.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    const before = Math.hypot(x - rect.left, y - mid);
    if (before < bestDistance) [bestDistance, best] = [before, index];
    const after = Math.hypot(x - rect.right, y - mid);
    if (after < bestDistance) [bestDistance, best] = [after, index + 1];
  });
  return best;
}

type Props = {
  card: SessionCard;
  content: PasadoContent;
  note: string | null;
  onAnswer: (correct: boolean, answer: string) => void;
  onNext: () => void;
  onShowTable: (tense: PastTense, infinitive: string) => void;
};

/**
 * Advanced mastery (box 4–5): rebuild the sentence from word blocks. Both past
 * forms of the verb are in the bank; the trigger word decides which one fits.
 * Tap a block to place or remove it, drag placed blocks to reorder.
 */
export function Scrambler({ card, content, note, onAnswer, onNext, onShowTable }: Props) {
  const { drill } = card;
  const verb = content.verbs[drill.infinitive];
  const scramble = useMemo(() => buildScramble(content, drill), [content, drill]);
  const [placed, setPlaced] = useState<Token[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [verdict, setVerdict] = useState<ScrambleVerdict | null>(null);
  const chips = useRef<(HTMLElement | null)[]>([]);
  const next = useRef<HTMLButtonElement>(null);
  const checked = verdict !== null;
  const used = new Set(placed.map((t) => t.id));

  useEffect(() => {
    if (checked) next.current?.focus();
  }, [checked]);

  function toggle(token: Token) {
    if (checked) return;
    setPlaced((list) => (used.has(token.id) ? list.filter((t) => t.id !== token.id) : [...list, token]));
  }

  function onDown(event: React.PointerEvent<HTMLElement>, index: number) {
    if (checked) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    setDrag({ index, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, drop: index, width: rect.width });
  }

  function onMove(event: React.PointerEvent<HTMLElement>, index: number) {
    if (!drag || drag.index !== index) return;
    setDrag({ ...drag, x: event.clientX, y: event.clientY, drop: insertIndex(event.clientX, event.clientY, index, chips.current) });
  }

  function onUp(event: React.PointerEvent<HTMLElement>, index: number) {
    if (!drag || drag.index !== index) return;
    const moved = Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY);
    if (moved < TAP_THRESHOLD) {
      setPlaced((list) => list.filter((_, i) => i !== index));
    } else if (drag.drop !== index && drag.drop !== index + 1) {
      setPlaced((list) => {
        const out = [...list];
        const [item] = out.splice(index, 1);
        out.splice(drag.drop > index ? drag.drop - 1 : drag.drop, 0, item);
        return out;
      });
    }
    setDrag(null);
  }

  function check() {
    const v = judgeScramble(scramble, placed);
    setVerdict(v);
    onAnswer(v.correct, placed.map((t) => t.text).join(" "));
  }

  const verbForm = scramble.answer[scramble.verbAt];
  const decoy = scramble.bank.find((t) => t.decoy)!.text;
  const decoyTense: PastTense = drill.correct_tense === "preterite" ? "imperfect" : "preterite";
  const bar = <span aria-hidden className="w-[3px] self-stretch rounded-full bg-accent" />;
  const chipClass = (t: Token) => {
    if (!checked) return "rounded-xl bg-ink text-on-ink shadow-[0_3px_0_var(--ink-shadow)]";
    if (t.decoy) return `${styles[decoyTense]} opacity-60 line-through`;
    if (t.text === verbForm) return `${styles[drill.correct_tense]}`;
    return "rounded-xl bg-ink text-on-ink";
  };

  return (
    <div className="flex flex-1 flex-col gap-5" data-drill={drill.id} data-mode={card.mode}>
      <CardTag
        box={card.box}
        infinitive={verb.infinitive}
        english={verb.english}
        isNew={card.isNew}
        retry={card.retry}
        extra="· word blocks"
      />

      <p className="text-[23px] leading-snug font-bold italic sm:text-[26px]">{drill.english_translation}</p>

      <LayoutGroup>
        <div
          data-testid="pasado-tray"
          className={`flex min-h-[96px] flex-wrap content-start items-center gap-2 rounded-[22px] bg-card p-3.5 shadow-[0_6px_0_var(--card-shadow)] ring-2 ${
            checked ? (verdict.correct ? "ring-pill-deep" : "ring-accent") : "ring-transparent"
          }`}
        >
          {placed.length === 0 && !drag && (
            <span className="pointer-events-none text-[14px] text-faint">Tap the blocks in order. One verb form doesn&apos;t belong.</span>
          )}
          {placed.map((token, index) => (
            <span key={token.id} className="contents">
              {drag && drag.drop === index && drag.index !== index && drag.index !== index - 1 && bar}
              <motion.span
                layoutId={`tok-${card.key}-${token.id}`}
                ref={(el: HTMLSpanElement | null) => {
                  chips.current[index] = el;
                }}
                onPointerDown={(event) => onDown(event, index)}
                onPointerMove={(event) => onMove(event, index)}
                onPointerUp={(event) => onUp(event, index)}
                onPointerCancel={() => setDrag(null)}
                className={`cursor-grab touch-none px-3.5 py-2 text-[18px] font-bold select-none ${chipClass(token)} ${
                  drag?.index === index ? "opacity-25" : ""
                }`}
              >
                {token.text}
              </motion.span>
            </span>
          ))}
          {drag && drag.drop === placed.length && drag.index !== placed.length - 1 && bar}
        </div>

        <div className="flex flex-wrap gap-2.5" data-testid="pasado-bank">
          {scramble.bank.map((token) =>
            used.has(token.id) ? (
              !checked && <span
                key={token.id}
                aria-hidden
                className="min-h-11 rounded-xl border-2 border-dashed border-dash px-3.5 py-2 text-[18px] font-bold text-transparent"
              >
                {token.text}
              </span>
            ) : (
              <motion.button
                key={token.id}
                layoutId={`tok-${card.key}-${token.id}`}
                type="button"
                onClick={() => toggle(token)}
                disabled={checked}
                className={`press min-h-11 rounded-xl px-3.5 py-2 text-[18px] font-bold ${
                  checked && token.decoy ? `${styles[decoyTense]}` : "bg-pill text-ink shadow-[0_4px_0_var(--card-shadow)]"
                }`}
                style={{ ["--press" as string]: "4px" }}
              >
                {token.text}
              </motion.button>
            ),
          )}
        </div>
      </LayoutGroup>

      <div className="mt-auto flex flex-col gap-3 pt-2">
        {!checked ? (
          <div className="flex gap-3">
            <GhostButton onClick={() => setPlaced([])} className="flex-1">
              Reset
            </GhostButton>
            <PrimaryButton onClick={check} disabled={placed.length < scramble.answer.length} className="flex-[2]">
              Check
            </PrimaryButton>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
              <Verdict correct={verdict.correct} title={verdict.correct ? "¡Correcto!" : "Wrong verb form"}>
                <p lang="es" className="text-[17px] font-bold">
                  <SolvedLine content={content} card={card} />
                </p>
                <p>
                  <b>
                    <VerbForm infinitive={drill.infinitive} tense={drill.correct_tense} person={drill.person} form={verbForm} />
                  </b>{" "}
                  is {TENSE_LABEL[drill.correct_tense]}; <s>{decoy}</s> is {TENSE_LABEL[decoyTense]}.
                </p>
                {verdict.correct && !verdict.exactOrder && (
                  <p className="text-muted">Right verb. The usual word order is shown above.</p>
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
          </AnimatePresence>
        )}
      </div>

      {drag && placed[drag.index] && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 scale-110 rounded-xl bg-ink px-3.5 py-2 text-center text-[18px] font-bold text-on-ink shadow-[0_6px_0_var(--accent-shadow)]"
          style={{ left: drag.x - drag.width / 2, top: drag.y - 22, width: drag.width }}
        >
          {placed[drag.index].text}
        </div>
      )}
    </div>
  );
}

/** The model sentence with the trigger underlined and the verb in its tense's style. */
function SolvedLine({ content, card }: { content: PasadoContent; card: SessionCard }) {
  const { drill } = card;
  const form = content.verbs[drill.infinitive].forms[drill.correct_tense][drill.person];
  const [pre, post] = drill.sentence_template.split("{verb}");
  return (
    <>
      <WithTrigger text={pre} trigger={drill.trigger_word} tense={drill.correct_tense} />
      <span className={`${styles[drill.correct_tense]} mr-2 ml-0.5 inline-block px-2`}>
        <VerbForm infinitive={drill.infinitive} tense={drill.correct_tense} person={drill.person} form={form} />
      </span>
      <WithTrigger text={post} trigger={drill.trigger_word} tense={drill.correct_tense} />
    </>
  );
}

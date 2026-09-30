"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PRONOUNS } from "@/features/srs/verbs";
import { TENSE_LABEL } from "../lib/forms";
import { MATRIX, matrixRowOf } from "../lib/matrix";
import { PAST_TENSES, type PasadoContent, type PastTense } from "../lib/types";
import styles from "../pasado.module.css";
import { VerbForm } from "./VerbForm";

const WIDE = "(min-width: 768px)";

function useWide(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(WIDE);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

const PERSON_LABEL = ["yo", "tú", "él", "nos.", "ellos"];

export type DrawerFocus = { tense: PastTense; infinitive: string | null };

/**
 * The Irregular Matrix (PRD §4): a slide-over from the right on wide screens, a
 * bottom sheet on phones. It only overlays the drill, so nothing is lost by peeking.
 */
export function Drawer({
  open,
  focus,
  content,
  onClose,
}: {
  open: boolean;
  focus: DrawerFocus;
  content: PasadoContent;
  onClose: () => void;
}) {
  const wide = useWide();
  const [tense, setTense] = useState<PastTense>(focus.tense);
  const [shownFocus, setShownFocus] = useState(focus);
  const list = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  // A new focus (the "Table" button) switches to its tab.
  if (focus !== shownFocus) {
    setShownFocus(focus);
    setTense(focus.tense);
  }

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !focus.infinitive) return;
    const row = list.current?.querySelector(`[data-verb~="${focus.infinitive}"]`);
    row?.scrollIntoView({ block: "center" });
  }, [open, focus, tense]);

  const focusedRow = focus.infinitive ? matrixRowOf(tense, focus.infinitive) : -1;
  const panel = wide
    ? { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" } }
    : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40" key="drawer">
          <motion.button
            type="button"
            aria-label="Close the table"
            onClick={onClose}
            className="absolute inset-0 bg-ink/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Irregular verbs"
            {...panel}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className={`absolute flex flex-col bg-page shadow-[0_-10px_40px_-10px_rgba(36,19,42,0.5)] ${
              wide
                ? "top-0 right-0 h-full w-[440px] rounded-l-[28px]"
                : "inset-x-0 bottom-0 max-h-[82dvh] rounded-t-[28px] pb-[env(safe-area-inset-bottom)]"
            }`}
          >
            {!wide && <span aria-hidden className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-handle" />}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h2 className="text-[22px] font-extrabold">Irregulars</h2>
              <button
                ref={closeButton}
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-full bg-pill px-4 text-[15px] font-bold"
              >
                Close
              </button>
            </div>

            <div role="tablist" className="mx-5 grid grid-cols-2 gap-2 rounded-[18px] bg-pill-flat p-1.5">
              {PAST_TENSES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tense === t}
                  onClick={() => setTense(t)}
                  className={`relative min-h-11 text-[16px] font-extrabold ${tense === t && t === "preterite" ? "text-on-ink" : ""}`}
                >
                  {tense === t && (
                    <motion.span layoutId="drawer-tab" aria-hidden className={`absolute inset-0 ${styles[t]}`} />
                  )}
                  <span className="relative">
                    {TENSE_LABEL[t]} · {MATRIX[t].length}
                  </span>
                </button>
              ))}
            </div>
            <p className="mx-5 mt-2 text-[13px] text-muted">
              {tense === "preterite"
                ? "The high-frequency list: new roots, no accents, endings -e -iste -o -imos -ieron."
                : "The whole list: every other verb is regular in the imperfect."}
            </p>

            <div ref={list} className="mt-3 flex-1 overflow-y-auto px-5 pb-6" data-testid="pasado-matrix">
              <ul className="flex flex-col gap-2.5">
                {MATRIX[tense].map((row, index) => {
                  const lead = content.verbs[row.infinitives[0]];
                  const on = index === focusedRow;
                  return (
                    <li
                      key={row.infinitives.join("/")}
                      data-verb={row.infinitives.join(" ")}
                      className={`rounded-[18px] p-3.5 ${
                        on ? "bg-card ring-[3px] ring-accent" : "bg-card"
                      } shadow-[0_4px_0_var(--card-shadow)]`}
                    >
                      <p className="flex items-baseline justify-between gap-2">
                        <span className="text-[18px] font-extrabold">
                          {row.infinitives.map((v) => v[0].toUpperCase() + v.slice(1)).join(" / ")}
                        </span>
                        <span className="text-[13px] text-muted">{row.english}</span>
                      </p>
                      <dl className="mt-1.5 grid grid-cols-3 gap-x-3 gap-y-1.5">
                        {PRONOUNS.map((person, i) => (
                          <div key={person}>
                            <dt className="text-[11px] font-bold text-faint uppercase">{PERSON_LABEL[i]}</dt>
                            <dd className="text-[15px] font-bold break-words">
                              <VerbForm
                                infinitive={lead.infinitive}
                                tense={tense}
                                person={person}
                                form={lead.forms[tense][person]}
                              />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-[13px] text-muted">
                Regular {tense === "preterite" ? "pretérito: -ar é aste ó amos aron · -er/-ir í iste ió imos ieron" : "imperfecto: -ar aba abas aba ábamos aban · -er/-ir ía ías ía íamos ían"}.
              </p>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

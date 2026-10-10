"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { dayLabel, dayOf, genderLabel } from "../text";
import type { GlossaryWord } from "../types";
import { ExampleLine, PosChip, speak, SpeakButton } from "./bits";

type Props = {
  word: GlossaryWord | null;
  /** Shown above the word, e.g. "Already in your glossary". */
  notice: string | null;
  onClose: () => void;
  onEdit: (word: GlossaryWord) => void;
  /** Archive (true) or restore (false). */
  onArchive: (word: GlossaryWord, archived: boolean) => Promise<void>;
  /** Permanent; only offered for archived words. */
  onDelete: (word: GlossaryWord) => Promise<void>;
  onRegenerate: (word: GlossaryWord) => Promise<boolean>;
};

/** The look-up card (PRD §3.2): a bottom sheet on phones, a centred card on wide screens. */
export function WordSheet({ word, notice, onClose, onEdit, onArchive, onDelete, onRegenerate }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"delete" | "examples" | "archive" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shownId, setShownId] = useState(word?.id);
  if (word?.id !== shownId) {
    setShownId(word?.id);
    setConfirming(false);
    setBusy(null);
    setError(null);
  }

  useEffect(() => {
    if (!word) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [word, onClose]);

  async function run(kind: "delete" | "examples" | "archive", task: () => Promise<boolean | void>) {
    setBusy(kind);
    setError(null);
    try {
      const ok = await task();
      if (ok === false) setError("Claude isn't reachable right now. Try again in a bit.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const details = word ? genderLabel(word.gender) : null;

  return (
    <AnimatePresence>
      {word && (
        <motion.div
          key="sheet"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 lg:items-center lg:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={word.spanish}
            data-testid="glossary-card"
            className="max-h-[92dvh] w-full max-w-[460px] overflow-y-auto rounded-t-[26px] bg-card px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_-10px_rgba(36,19,42,0.45)] lg:rounded-[26px] lg:pt-5"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            onClick={(event) => event.stopPropagation()}
          >
            <span aria-hidden className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-handle lg:hidden" />
            {notice && <p className="mb-2 rounded-[12px] bg-pill-deep px-3 py-1.5 text-[13px] font-bold">{notice}</p>}

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 lang="es" className="text-[28px] leading-tight font-extrabold">
                  {word.spanish}
                  <SpeakButton label="Read the word aloud" onClick={() => speak(word.spanish)} />
                </h2>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
                  <PosChip pos={word.pos} />
                  {details && <span>{details}</span>}
                  <span data-testid="glossary-card-date">· {dayLabel(dayOf(word.createdAt))}</span>
                  {word.archivedAt && <span>· archived</span>}
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="h-8 w-8 shrink-0 rounded-full bg-pill text-[13px] text-muted">
                ✕
              </button>
            </div>

            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[17px]">
              <dt className="font-bold text-faint">English</dt>
              <dd className="font-bold">{word.english}</dd>
              <dt className="font-bold text-faint">Norsk</dt>
              <dd className="font-bold">{word.norwegian ?? <span className="text-faint">—</span>}</dd>
            </dl>

            {word.examples.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2">
                {word.examples.map((example) => (
                  <ExampleLine key={example.es} example={example} spanish={word.spanish} onSpeak={speak} />
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-[14px] bg-pill-flat px-3 py-2 text-[14px] text-muted">
                Not checked yet. Claude adds examples, Norwegian and the word type next time the list opens.
              </p>
            )}

            {word.themes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {word.themes.map((theme) => (
                  <span key={theme} className="rounded-full bg-pill px-2.5 py-1 text-[12px] font-bold text-muted">
                    {theme}
                  </span>
                ))}
              </div>
            )}

            {error && (
              <p role="alert" className="mt-3 text-[14px] font-bold text-accent">
                {error}
              </p>
            )}

            {confirming ? (
              <div className="mt-4 rounded-[16px] bg-ai p-3">
                <p className="text-[15px] font-bold">Delete “{word.spanish}” for good? This can&apos;t be undone.</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setConfirming(false)} className="min-h-11 flex-1 rounded-full bg-card text-[15px] font-bold">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => run("delete", () => onDelete(word))}
                    className="min-h-11 flex-1 rounded-full bg-accent text-[15px] font-extrabold text-white"
                  >
                    {busy === "delete" ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2" data-testid="glossary-card-actions">
                <button
                  type="button"
                  onClick={() => onEdit(word)}
                  className="min-h-11 rounded-full bg-ink px-2 text-[14px] font-extrabold whitespace-nowrap text-on-ink"
                >
                  Edit
                </button>
                {word.archivedAt ? (
                  <>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => run("archive", () => onArchive(word, false))}
                      className="min-h-11 rounded-full bg-pill px-2 text-[14px] font-bold whitespace-nowrap"
                    >
                      {busy === "archive" ? "Restoring…" : "Restore"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(true)}
                      className="min-h-11 rounded-full bg-pill px-2 text-[14px] font-bold whitespace-nowrap text-muted"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={busy !== null || word.status !== "checked"}
                      onClick={() => run("examples", () => onRegenerate(word))}
                      className="min-h-11 rounded-full bg-pill px-2 text-[14px] font-bold whitespace-nowrap disabled:opacity-40"
                    >
                      {busy === "examples" ? "Writing…" : "New examples"}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => run("archive", () => onArchive(word, true))}
                      className="min-h-11 rounded-full bg-pill px-2 text-[14px] font-bold whitespace-nowrap"
                    >
                      {busy === "archive" ? "Archiving…" : "Archive"}
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

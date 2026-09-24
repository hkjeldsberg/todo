"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  SENTENCES_PER_DAY,
  type DiarySentence,
  type Failure,
} from "@/features/diary/diary";
import { reviewSaved, saveSentence } from "@/features/diary/actions";
import Feedback from "@/features/diary/Feedback";

/**
 * Five sentences a day. Writing a slot asks for the Spanish and for what you
 * think it means; saving stores the sentence first and only then asks Claude to
 * mark it, so a slow or failed review can never cost you the writing. Reading
 * mode shows only the Spanish — the page stays your own words until you ask for
 * the verdict.
 */
export default function SentenceList({
  day,
  initial,
}: {
  day: string;
  initial: DiarySentence[];
}) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<number | null>(null);

  const slots = Array.from({ length: SENTENCES_PER_DAY }, (_, position) =>
    rows.find((row) => row.position === position),
  );
  const written = slots.filter((row) => row?.spanish.trim()).length;

  const replace = (saved: DiarySentence) =>
    setRows((current) => [
      ...current.filter((row) => row.position !== saved.position),
      saved,
    ]);

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold">Cinco frases</h2>
        <span
          className={`text-[13px] font-bold ${
            written === SENTENCES_PER_DAY ? "text-accent" : "text-faint"
          }`}
        >
          {written}/{SENTENCES_PER_DAY}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {slots.map((row, position) =>
          editing === position ? (
            <SentenceForm
              key={position}
              day={day}
              position={position}
              row={row}
              onSaved={replace}
              onClose={() => setEditing(null)}
            />
          ) : (
            <SentenceCard
              key={position}
              position={position}
              row={row}
              onEdit={() => setEditing(position)}
              onReviewed={replace}
            />
          ),
        )}
      </div>
    </section>
  );
}

/** The failure, its hint, and whether another tap is worth it. */
function ErrorNote({ error }: { error: Failure }) {
  return (
    <div className="mt-2 rounded-[14px] bg-pill px-3 py-2">
      <p className="text-[13px] leading-snug font-bold text-accent">
        {error.message}
      </p>
      {error.hint && (
        <p className="mt-0.5 text-[12px] leading-snug text-muted">
          {error.hint}
        </p>
      )}
    </div>
  );
}

/**
 * Saving runs two steps with very different costs — a fast write, then a call
 * to Claude that takes seconds. Showing them separately means a stall is
 * legible: you can see which half you are waiting on, and how long it has been.
 */
function Progress({
  step,
  seconds,
}: {
  step: "saving" | "reviewing";
  seconds: number;
}) {
  return (
    <div className="mt-3">
      <ol className="flex flex-col gap-1">
        <li className="flex items-center gap-2 text-[13px]">
          <span className="w-4 text-center font-bold text-accent">
            {step === "saving" ? "○" : "✓"}
          </span>
          <span className={step === "saving" ? "font-bold" : "text-muted"}>
            Guardando la frase
          </span>
        </li>
        <li className="flex items-center gap-2 text-[13px]">
          <span className="w-4 text-center font-bold text-accent">
            {step === "reviewing" ? "○" : "·"}
          </span>
          <span className={step === "reviewing" ? "font-bold" : "text-muted"}>
            Revisando con Claude
            {step === "reviewing" && seconds > 0 ? ` · ${seconds}s` : ""}
          </span>
        </li>
      </ol>

      {/* Indeterminate on purpose: the server does not report progress, so a
          filling bar would be a guess dressed up as information. */}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-pill-flat">
        <div className="diary-progress h-full w-1/3 rounded-full bg-accent" />
      </div>
    </div>
  );
}

function SentenceCard({
  position,
  row,
  onEdit,
  onReviewed,
}: {
  position: number;
  row: DiarySentence | undefined;
  onEdit: () => void;
  onReviewed: (saved: DiarySentence) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const [pending, startTransition] = useTransition();
  const seconds = useElapsed(pending);

  if (!row?.spanish.trim()) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="press rounded-[18px] border-2 border-dashed border-dash px-4 py-3.5 text-left text-[15px] font-bold text-muted"
      >
        + Frase {position + 1}
      </button>
    );
  }

  const review = () =>
    startTransition(async () => {
      setError(null);
      const result = await reviewSaved(row.id);
      if (result.ok) onReviewed(result.data);
      else setError(result.error);
    });

  return (
    <div className="rounded-[18px] bg-card px-4 py-3 shadow-[0_4px_0_var(--card-shadow)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="block w-full text-left"
      >
        <span className="block text-[11px] font-bold text-faint">
          {position + 1}
          {row.feedback ? " · revisada" : " · sin revisar"}
        </span>
        <span className="block text-[16px] leading-snug font-bold">
          {row.spanish}
        </span>
      </button>

      {open && (
        <div className="mt-2 border-t border-dash-card pt-2">
          <p className="text-[14px] text-muted">
            {row.english || "(no translation written)"}
          </p>

          {row.feedback ? (
            <Feedback text={row.feedback} />
          ) : (
            <p className="mt-2 text-[13px] text-faint">Not reviewed yet.</p>
          )}

          {pending && <Progress step="reviewing" seconds={seconds} />}
          {error && <ErrorNote error={error} />}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="press rounded-full bg-pill px-3.5 py-2 text-[13px] font-bold"
            >
              Editar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={review}
              className="press rounded-full bg-pill px-3.5 py-2 text-[13px] font-bold disabled:opacity-50"
            >
              {pending
                ? "Revisando…"
                : row.feedback
                  ? "Revisar otra vez"
                  : "Revisar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SentenceForm({
  day,
  position,
  row,
  onSaved,
  onClose,
}: {
  day: string;
  position: number;
  row: DiarySentence | undefined;
  onSaved: (saved: DiarySentence) => void;
  onClose: () => void;
}) {
  const [spanish, setSpanish] = useState(row?.spanish ?? "");
  const [english, setEnglish] = useState(row?.english ?? "");
  const [error, setError] = useState<Failure | null>(null);
  const [step, setStep] = useState<"saving" | "reviewing" | null>(null);
  const [pending, startTransition] = useTransition();
  const seconds = useElapsed(step === "reviewing");

  const submit = () =>
    startTransition(async () => {
      setError(null);

      setStep("saving");
      const saved = await saveSentence({ day, position, spanish, english });
      if (!saved.ok) {
        setStep(null);
        setError(saved.error);
        return;
      }
      // The writing is safe from here on; the review is a bonus on top.
      onSaved(saved.data);

      setStep("reviewing");
      const reviewed = await reviewSaved(saved.data.id);
      setStep(null);

      if (!reviewed.ok) {
        // Stay open with the reason: the sentence is stored either way, and
        // "Revisar" on the card retries without retyping anything.
        setError(reviewed.error);
        return;
      }

      onSaved(reviewed.data);
      onClose();
    });

  return (
    <div className="rounded-[18px] bg-card px-4 py-3 shadow-[0_4px_0_var(--card-shadow)]">
      <span className="block text-[11px] font-bold text-faint">
        Frase {position + 1}
      </span>

      <textarea
        value={spanish}
        onChange={(event) => setSpanish(event.target.value)}
        rows={2}
        autoFocus
        disabled={pending}
        placeholder="En español…"
        className="mt-1 w-full resize-none bg-transparent text-[16px] leading-snug font-bold outline-none placeholder:font-normal placeholder:text-faint"
      />

      <textarea
        value={english}
        onChange={(event) => setEnglish(event.target.value)}
        rows={2}
        disabled={pending}
        placeholder="What you think it means…"
        className="mt-1 w-full resize-none border-t border-dash-card bg-transparent pt-2 text-[14px] leading-snug text-muted outline-none placeholder:text-faint"
      />

      {step && <Progress step={step} seconds={seconds} />}
      {error && <ErrorNote error={error} />}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !spanish.trim()}
          className="press rounded-full bg-ink px-4 py-2 text-[13px] font-bold text-on-ink disabled:opacity-50"
        >
          {step === "saving"
            ? "Guardando…"
            : step === "reviewing"
              ? "Revisando…"
              : "Guardar y revisar"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="press rounded-full bg-pill px-4 py-2 text-[13px] font-bold disabled:opacity-50"
        >
          {error ? "Cerrar" : "Cancelar"}
        </button>
      </div>
    </div>
  );
}

/**
 * Seconds since `running` turned true — the only honest progress signal here.
 * The clock is read from a ref rather than reset through state, so the effect
 * only ever schedules the interval.
 */
function useElapsed(running: boolean): number {
  const [seconds, setSeconds] = useState(0);
  const start = useRef(0);

  useEffect(() => {
    if (!running) return;
    start.current = Date.now();
    const timer = setInterval(() => {
      setSeconds(Math.round((Date.now() - start.current) / 1000));
    }, 1000);

    // Reset on the way out, so a second review starts from 0 rather than
    // flashing the previous run's count for its first second.
    return () => {
      clearInterval(timer);
      setSeconds(0);
    };
  }, [running]);

  return seconds;
}

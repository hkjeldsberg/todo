"use client";

import type { ReactNode } from "react";
import { LEITNER_INTERVALS } from "@/features/srs/leitner";
import type { PastTense } from "../lib/types";
import styles from "../pasado.module.css";

/** Underlines the trigger word(s) inside `text` (first match, any case). */
export function WithTrigger({ text, trigger, tense }: { text: string; trigger: string; tense: PastTense | null }) {
  const at = tense ? text.toLocaleLowerCase("es").indexOf(trigger.toLocaleLowerCase("es")) : -1;
  if (at < 0) return <>{text}</>;
  const cls = `${styles.trigger} ${tense === "preterite" ? styles.triggerPreterite : styles.triggerImperfect}`;
  return (
    <>
      {text.slice(0, at)}
      <span className={cls} data-trigger>
        {text.slice(at, at + trigger.length)}
      </span>
      {text.slice(at + trigger.length)}
    </>
  );
}

export function CardTag({ box, infinitive, english, isNew, retry, extra }: {
  box: number;
  infinitive: string;
  english: string;
  isNew: boolean;
  retry: boolean;
  extra?: string;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-bold tracking-wide text-muted uppercase">
      <span className="rounded-full bg-pill px-2.5 py-0.5 text-ink">Box {box}</span>
      <span className="normal-case">
        <b className="text-ink">{infinitive}</b> · {english}
      </span>
      {isNew && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-white">new</span>}
      {retry && <span className="rounded-full bg-ai px-2 py-0.5 text-[11px] text-ink">retry</span>}
      {extra && <span>{extra}</span>}
    </p>
  );
}

const days = (box: number) => LEITNER_INTERVALS[box];

/** One line under the verdict on what happened to the verb's box. */
export function boxNote(before: number, after: number, correct: boolean, counted: boolean): string {
  if (!correct) return before > 1 ? `Box ${before} → 1 · back tomorrow` : "Box 1 · back tomorrow";
  if (!counted) return "Practice — the box doesn't move";
  if (after > before) return `Box ${before} → ${after} · back in ${days(after)} days`;
  return `Box ${after} · back in ${days(after)} days`;
}

export function Verdict({ correct, title, children }: { correct: boolean; title: string; children: ReactNode }) {
  return (
    <div
      role="status"
      className={`rounded-[20px] p-4 ${correct ? "bg-card shadow-[0_6px_0_var(--card-shadow)]" : "bg-ai shadow-[0_6px_0_var(--accent-shadow)]"}`}
    >
      <p className="text-[20px] font-extrabold">
        <span className="glyph mr-1.5">{correct ? "✓" : "✗"}</span>
        {title}
      </p>
      <div className="mt-1.5 space-y-1 text-[15px] leading-snug">{children}</div>
    </div>
  );
}

export function PrimaryButton({ children, className = "", ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={`press min-h-14 rounded-full bg-ink px-6 text-[18px] font-extrabold text-on-ink shadow-[0_6px_0_var(--ink-shadow)] disabled:bg-pill-flat disabled:text-faint disabled:shadow-none ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={`press min-h-14 rounded-full bg-pill px-5 text-[16px] font-extrabold text-ink shadow-[0_5px_0_var(--card-shadow)] ${className}`}
      style={{ ["--press" as string]: "5px" }}
    >
      {children}
    </button>
  );
}

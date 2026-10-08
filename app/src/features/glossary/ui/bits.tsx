"use client";

import { useState } from "react";
import { fold, highlightRange, POS_SHORT } from "../text";
import type { Example, Pos } from "../types";

/** One soft colour per word type (PRD §7), used on chips only. */
export const POS_COLOR: Record<Pos, string> = {
  noun: "#ffd6e8",
  verb: "#d6e6ff",
  adjective: "#d4f2dc",
  adverb: "#fff0b8",
  preposition: "#e6dcff",
  expression: "#ffe0c2",
  other: "#ece6dc",
};

export function PosChip({ pos }: { pos: Pos | null }) {
  if (!pos) return <span className="rounded-full bg-ai px-2 py-0.5 text-[11px] font-bold text-ink">unchecked</span>;
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-ink" style={{ background: POS_COLOR[pos] }}>
      {POS_SHORT[pos]}
    </span>
  );
}

/** An example sentence with the headword marked. */
export function ExampleLine({ example, spanish, onSpeak }: { example: Example; spanish: string; onSpeak?: (text: string) => void }) {
  const range = highlightRange(example.es, spanish);
  return (
    <li className="rounded-[14px] bg-pill-flat px-3 py-2">
      <p lang="es" className="text-[16px] leading-snug font-bold">
        {range ? (
          <>
            {example.es.slice(0, range[0])}
            <mark className="rounded bg-pill-deep px-0.5 text-ink">{example.es.slice(range[0], range[1])}</mark>
            {example.es.slice(range[1])}
          </>
        ) : (
          example.es
        )}
        {onSpeak && <SpeakButton label="Read the sentence aloud" onClick={() => onSpeak(example.es)} small />}
      </p>
      <p className="text-[14px] text-muted">{example.en}</p>
    </li>
  );
}

export function SpeakButton({ onClick, label, small }: { onClick: () => void; label: string; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`ml-1.5 inline-flex items-center justify-center rounded-full bg-pill align-middle text-muted hover:text-ink ${
        small ? "h-6 w-6" : "h-9 w-9"
      }`}
    >
      <svg viewBox="0 0 20 20" className={small ? "h-3.5 w-3.5" : "h-4.5 w-4.5"} fill="currentColor" aria-hidden>
        <path d="M3 8h3l4-3.5v11L6 12H3z" />
        <path d="M13 7.2a4 4 0 0 1 0 5.6M15.2 5a7 7 0 0 1 0 10" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/** Spanish text-to-speech with the browser's voice (PRD §3.2, optional in v1). */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("es"));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

/** Toggle existing themes, or type a new one. */
export function ThemePicker({
  value,
  all,
  onChange,
  suggestion,
}: {
  value: string[];
  all: string[];
  onChange: (themes: string[]) => void;
  suggestion?: string | null;
}) {
  const [draft, setDraft] = useState("");
  const options = [...new Set([...all, ...value, ...(suggestion ? [suggestion] : [])])].sort((a, b) => fold(a).localeCompare(fold(b), "es"));
  const toggle = (theme: string) => onChange(value.includes(theme) ? value.filter((t) => t !== theme) : [...value, theme]);
  const add = () => {
    const name = draft.trim().toLocaleLowerCase("es");
    if (name && !value.includes(name)) onChange([...value, name]);
    setDraft("");
  };
  return (
    <div>
      <span className="text-[12px] font-bold text-faint">Themes</span>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {options.map((theme) => {
          const on = value.includes(theme);
          return (
            <button
              key={theme}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(theme)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${on ? "bg-pill-deep text-ink" : "bg-pill text-muted"}`}
            >
              {on ? "✓ " : theme === suggestion ? "+ " : ""}
              {theme}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder="New theme, e.g. en el médico"
          aria-label="New theme"
          lang="es"
          className="min-w-0 flex-1 rounded-xl bg-pill px-3 py-2 text-[15px] outline-none"
        />
        <button type="button" onClick={add} disabled={!draft.trim()} className="rounded-xl bg-pill px-3 text-[14px] font-bold disabled:opacity-40">
          Add
        </button>
      </div>
    </div>
  );
}

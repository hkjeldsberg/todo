"use client";

import { useEffect, useState } from "react";
import { TARGETS, type Target } from "../lib/schema";
import { PressButton } from "./Chip";
import { targetLabel } from "./Library";

const IDEAS = [
  "Una comida en un guachinche con amigos",
  "Planear un fin de semana en La Gomera",
  "El primer día en un trabajo nuevo",
  "Perder el último autobús a casa",
  "Una visita al médico",
  "Buscar piso en Santa Cruz",
];

type Level = "A1" | "A2" | "B1";

/** Topic + grammar toggles (PRD §3A). While Claude writes, a timer keeps you company. */
export default function NewStory({
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  error: string | null;
  onSubmit(input: { topic: string; targets: Target[]; level: Level }): void;
  onCancel(): void;
}) {
  const [topic, setTopic] = useState("");
  const [targets, setTargets] = useState<Target[]>(["preterite", "imperfect", "subjunctive", "reflexive"]);
  const [level, setLevel] = useState<Level>("A2");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => {
      clearInterval(id);
      setSeconds(0);
    };
  }, [busy]);

  const toggle = (target: Target) =>
    setTargets((list) => (list.includes(target) ? list.filter((t) => t !== target) : [...list, target]));

  if (busy) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col items-center justify-center gap-4 bg-page px-6 text-center">
        <div className="flex gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-3 animate-bounce rounded-full bg-accent"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <p className="text-[22px] font-bold">Claude está escribiendo…</p>
        <p className="max-w-[340px] text-[15px] text-muted">
          It writes the story and annotates every word (meaning, tense, links), so this usually takes one to
          two minutes. Keep this tab open.
        </p>
        <p className="text-[28px] font-bold tabular-nums" aria-live="polite">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col bg-page px-[18px] pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))]">
      <header className="mb-5 flex items-center gap-3">
        <PressButton onClick={onCancel} className="min-h-11 px-4 text-[15px]">
          ‹ Cuentos
        </PressButton>
        <h1 className="text-[22px] font-bold">Nuevo cuento</h1>
      </header>

      <form
        className="flex flex-1 flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (topic.trim().length >= 3) onSubmit({ topic, targets, level });
        }}
      >
        <label className="block">
          <span className="text-[12px] font-bold text-faint">¿De qué trata? (topic)</span>
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="e.g. Una comida en un guachinche"
            maxLength={200}
            autoFocus
            className="mt-1 w-full rounded-full bg-pill px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-pill-deep"
          />
        </label>
        <div className="-mt-3 flex flex-wrap gap-2">
          {IDEAS.map((idea) => (
            <button
              type="button"
              key={idea}
              onClick={() => setTopic(idea)}
              className="rounded-full bg-pill-flat px-3 py-1.5 text-[13px] font-bold text-muted"
            >
              {idea}
            </button>
          ))}
        </div>

        <fieldset>
          <legend className="mb-2 text-[12px] font-bold text-faint">Grammar to practise</legend>
          <div className="flex flex-wrap gap-2">
            {TARGETS.map((target) => {
              const on = targets.includes(target);
              return (
                <button
                  type="button"
                  key={target}
                  aria-pressed={on}
                  onClick={() => toggle(target)}
                  className={`min-h-11 rounded-full px-4 text-[15px] font-bold ${
                    on ? "bg-pill-deep text-ink" : "bg-card text-muted shadow-[0_3px_0_var(--card-shadow)]"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {targetLabel(target)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[12px] font-bold text-faint">Level</legend>
          <div className="flex gap-2">
            {(["A1", "A2", "B1"] as const).map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={level === value}
                onClick={() => setLevel(value)}
                className={`min-h-11 min-w-16 rounded-full px-4 text-[15px] font-bold ${
                  level === value ? "bg-pill-deep" : "bg-card text-muted shadow-[0_3px_0_var(--card-shadow)]"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-[18px] bg-accent p-3 text-[14px] font-bold text-white">
            ! {error}
          </p>
        )}

        <PressButton
          type="submit"
          tone="ink"
          depth={6}
          disabled={topic.trim().length < 3}
          className="mt-auto min-h-14 w-full px-5 text-[18px]"
        >
          Escribir el cuento
        </PressButton>
      </form>
    </div>
  );
}

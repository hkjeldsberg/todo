"use client";

import { useEffect, useState } from "react";
import type { GameProps } from "@/features/games/types";
import type { Level, OpuestosProgress, Word } from "../lib/types";
import { pairsOf } from "../lib/words";
import { PairChip, Sheet, chip, inkPill, lightPill } from "./sticker";

function useEscape(run: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);
}

interface SelectProps {
  levels: Level[];
  words: Map<string, Word>;
  allWords: Word[];
  progress: OpuestosProgress;
  unlocked: (i: number) => boolean;
  onPlay: (id: string) => void;
  onExit: () => void;
}

/** Title + level select + the pairs discovered so far. */
export function LevelSelect({ levels, words, allWords, progress, unlocked, onPlay, onExit }: SelectProps) {
  const pairs = pairsOf(
    allWords.map((w) => w.id),
    words,
  );
  const found = new Set(progress.discovered);
  const next = levels.find((l, i) => unlocked(i) && !progress.solved.includes(l.id)) ?? levels[0];
  return (
    <main className="fixed inset-0 overflow-y-auto bg-shell text-ink">
      <div className="mx-auto max-w-5xl px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-[max(24px,env(safe-area-inset-bottom))] sm:px-8">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onExit} className={chip} aria-label="Back to games">
            <span aria-hidden className="text-[20px] leading-none">
              ‹
            </span>
            Juegos
          </button>
          <span className="rounded-full bg-pill-deep px-3 py-1 text-[13px] font-bold">
            {progress.solved.length}/{levels.length} niveles
          </span>
        </div>

        <header className="mt-5 text-center sm:mt-8">
          <p className="text-[13px] font-bold text-muted">Opposites that change physics</p>
          <h1 lang="es" className="text-[34px] leading-tight font-bold sm:text-[44px]">
            El Rayo Modificador
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed">
            Tap any object to zap it, then pick a Spanish word. <strong lang="es">pesado</strong> makes it heavy,{" "}
            <strong lang="es">mojado</strong> makes it slide. Every room has more than one way through.
          </p>
          <button type="button" autoFocus onClick={() => onPlay(next.id)} className={`${inkPill} mt-5 w-full max-w-xs`}>
            {progress.solved.length ? "Seguir jugando ▸" : "Empezar ▸"}
          </button>
        </header>

        <h2 className="mt-8 mb-3 text-[13px] font-bold text-muted">Niveles</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {levels.map((l, i) => {
            const open = unlocked(i);
            const solved = progress.solved.includes(l.id);
            const foundCount = progress.found[l.id]?.length ?? 0;
            return (
              <li key={l.id}>
                <button
                  type="button"
                  disabled={!open}
                  onClick={() => onPlay(l.id)}
                  className={`press flex w-full flex-col gap-2 rounded-[22px] p-4 text-left [--press:6px] disabled:cursor-default ${
                    i % 2 ? "rotate-[0.5deg]" : "-rotate-[0.5deg]"
                  } ${open ? "bg-card shadow-[0_6px_0_var(--card-shadow)]" : "bg-pill-flat text-faint"}`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${
                        solved ? "bg-accent text-white" : open ? "bg-pill" : "bg-card"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span lang="es" className="block truncate text-[18px] leading-tight font-bold">
                        {l.title_es}
                      </span>
                      <span className="block truncate text-[13px] text-muted">
                        {open ? l.title_en : "Solve the level before to open it"}
                      </span>
                    </span>
                    {solved && (
                      <span className="shrink-0 rounded-full bg-pill px-2 py-0.5 text-[12px] font-bold">
                        {foundCount}/{l.layout.solutions.length}
                      </span>
                    )}
                  </span>
                  {open && (
                    <span className="flex flex-wrap gap-1.5">
                      {pairsOf(l.words, words).map((p) => (
                        <PairChip key={p[0].id} a={p[0].word} b={p[1]?.word} />
                      ))}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <h2 className="mt-8 mb-1 text-[13px] font-bold text-muted">
          Tus opuestos · {found.size}/{allWords.length} descubiertos
        </h2>
        <p className="mb-3 text-[13px] text-muted">A word lights up once you&apos;ve fired it. Hover for the English.</p>
        <ul className="flex flex-wrap gap-2">
          {pairs.map((p) => (
            <li key={p[0].id} title={p.map((w) => `${w.word}: ${w.translation}`).join(" / ")}>
              <PairChip a={found.has(p[0].id) ? p[0].word : "?"} b={p[1] ? (found.has(p[1].id) ? p[1].word : "?") : undefined} on={(w) => w !== "?"} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

/** Opening card for a level: the clue in Spanish and English, the offered pairs. */
export function ClueSheet({ level, index, words, onStart }: { level: Level; index: number; words: Map<string, Word>; onStart: () => void }) {
  return (
    <Sheet label={level.title_es} anchor="bottom">
      <p className="text-[12px] font-bold text-muted">Nivel {index + 1}</p>
      <h2 lang="es" className="text-[28px] leading-tight font-bold">
        {level.title_es}
      </h2>
      <p lang="es" className="mt-2 text-[17px] leading-snug">
        {level.clue_es}
      </p>
      <p className="mt-1 text-[14px] text-muted">{level.clue_en}</p>
      <p className="mt-4 mb-2 text-[12px] font-bold text-muted">The ray knows these words</p>
      <div className="flex flex-wrap gap-2">
        {pairsOf(level.words, words).map((p) => (
          <span key={p[0].id} title={p.map((w) => `${w.word}: ${w.translation}`).join(" / ")}>
            <PairChip a={p[0].word} b={p[1]?.word} />
          </span>
        ))}
      </div>
      {index === 0 && (
        <p className="mt-4 rounded-[18px] bg-ai px-4 py-3 text-[14px] leading-snug">
          Tap an object to zap it with the ray, pick a word, then press <strong>Soltar</strong> to let the ball go.
          If it goes wrong, <strong>Reiniciar</strong> puts the room back.
        </p>
      )}
      <button type="button" autoFocus onClick={onStart} className={`${inkPill} mt-5 w-full`}>
        ¡A jugar! ▸
      </button>
    </Sheet>
  );
}

interface SuccessProps {
  level: Level;
  used: Word[];
  solution: number | null;
  found: number[];
  hasNext: boolean;
  onAgain: () => void;
  onNext: () => void;
  onLevels: () => void;
}

export function SuccessSheet({ level, used, solution, found, hasNext, onAgain, onNext, onLevels }: SuccessProps) {
  const total = level.layout.solutions.length;
  return (
    <Sheet label="Solved" anchor="bottom">
      <div className="text-center">
        <p lang="es" className="text-[15px] font-bold text-accent">
          ¡Resuelto!
        </p>
        <h2 lang="es" className="text-[28px] leading-tight font-bold">
          {level.title_es}
        </h2>
        {used.length > 0 ? (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {used.map((w) => (
              <span key={w.id} className="rounded-[14px] bg-pill px-3 py-1.5 text-left">
                <strong lang="es" className="block text-[16px] leading-tight font-bold">
                  {w.word}
                </strong>
                <span className="block text-[12px] text-muted">{w.translation}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[15px]">Solved without a single word. Sneaky.</p>
        )}
        <p className="mt-3 text-[15px]">
          {solution === null ? (
            <>A way through we hadn&apos;t thought of. ¡Genial!</>
          ) : (
            <>
              Solutions found: <strong className="font-bold">{found.length}</strong> of {total}
              {found.length < total && <span className="text-muted"> · there&apos;s another way</span>}
            </>
          )}
        </p>
      </div>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
        <button type="button" onClick={onAgain} className={`${lightPill} flex-1`}>
          Otra solución
        </button>
        {hasNext ? (
          <button type="button" autoFocus onClick={onNext} className={`${inkPill} flex-1`}>
            Siguiente ▸
          </button>
        ) : (
          <button type="button" autoFocus onClick={onLevels} className={`${inkPill} flex-1`}>
            Niveles
          </button>
        )}
      </div>
    </Sheet>
  );
}

interface FailProps {
  title: string;
  cause: string | null;
  /** Words from this run that weren't the way through, with their opposites. */
  suggestions: { word: Word; antonym: Word }[];
  onReset: () => void;
  onLevels: () => void;
}

export function FailSheet({ title, cause, suggestions, onReset, onLevels }: FailProps) {
  useEscape(onReset);
  return (
    <Sheet label="Try again" anchor="bottom">
      <div className="text-center">
        <p lang="es" className="text-[28px] leading-tight font-bold">
          {title}
        </p>
        {cause && (
          <p lang="es" className="mt-1 text-[16px]">
            {cause}
          </p>
        )}
        {suggestions.length > 0 && (
          <div className="mt-4 rounded-[18px] bg-ai px-4 py-3 text-left">
            <p className="text-[13px] font-bold">Try the opposite</p>
            <ul className="mt-1 space-y-1">
              {suggestions.map(({ word, antonym }) => (
                <li key={word.id} className="flex flex-wrap items-baseline gap-x-2 text-[15px]">
                  <span>
                    <span lang="es" className="font-bold line-through decoration-2">
                      {word.word}
                    </span>{" "}
                    <span className="text-[13px] text-muted">{word.translation}</span>
                  </span>
                  <span aria-hidden>▸</span>
                  <span>
                    <span lang="es" className="font-bold text-accent">
                      {antonym.word}
                    </span>{" "}
                    <span className="text-[13px] text-muted">{antonym.translation}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
        <button type="button" onClick={onLevels} className={`${lightPill} flex-1`}>
          Niveles
        </button>
        <button type="button" autoFocus onClick={onReset} className={`${inkPill} flex-1`}>
          Reiniciar
        </button>
      </div>
    </Sheet>
  );
}

interface PauseProps {
  source: GameProps["source"];
  onResume: () => void;
  onLevels: () => void;
  onExit: () => void;
  onResetProgress: () => void;
}

/** Pause menu: physics frozen while it's open. */
export function PauseMenu({ source, onResume, onLevels, onExit, onResetProgress }: PauseProps) {
  const [confirm, setConfirm] = useState(false);
  useEscape(onResume);
  return (
    <Sheet label="Paused" onDismiss={onResume}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[22px] font-bold">Pausa</h2>
        <button type="button" autoFocus onClick={onResume} className={inkPill}>
          Seguir
        </button>
      </div>
      <h3 className="mt-4 mb-2 text-[12px] font-bold text-muted">How it works</h3>
      <ul className="space-y-1.5 text-[14px] leading-snug">
        <li>Tap an object (or its chip at the bottom) to aim the ray, then pick a word. Opposites sit side by side.</li>
        <li>Hold a word, or hover it, to see the English.</li>
        <li>
          <strong lang="es">Soltar</strong> lets the ball go. You can still zap things while it rolls.
        </li>
        <li>
          <strong lang="es">Deshacer</strong> takes back the last word; <strong lang="es">Reiniciar</strong> rebuilds the room.
        </li>
        <li className="hidden sm:list-item">Keys: Tab to an object, Enter to zap, 1–8 for a word, Space to release, Z undo, R reset.</li>
      </ul>
      <div className="mt-4">
        <button type="button" onClick={onLevels} className={`${lightPill} w-full`}>
          Elegir nivel
        </button>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-dash-card pt-3 text-[13px] text-muted">
        <button type="button" onClick={onExit} className="min-h-11 font-bold text-ink">
          ‹ Leave game
        </button>
        {process.env.NODE_ENV !== "production" && <span>Content: {source}</span>}
        {confirm ? (
          <span className="flex gap-3">
            <button
              type="button"
              className="min-h-11 font-bold text-accent"
              onClick={() => {
                onResetProgress();
                setConfirm(false);
              }}
            >
              Yes, reset
            </button>
            <button type="button" className="min-h-11 font-bold" onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" className="min-h-11 font-bold" onClick={() => setConfirm(true)}>
            Reset progress
          </button>
        )}
      </div>
    </Sheet>
  );
}

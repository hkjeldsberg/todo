"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, type Ref } from "react";
import type { Level, LayoutObject, Word } from "../lib/types";
import { agree } from "../lib/words";
import { chip, inkPill, lightPill } from "./sticker";

interface TopBarProps {
  level: Level;
  index: number;
  total: number;
  solved: boolean;
  barRef: Ref<HTMLDivElement>;
  onExit: () => void;
  onMenu: () => void;
}

/** Back chip, the level's clue card, pause chip. */
export function TopBar({ level, index, total, solved, barRef, onExit, onMenu }: TopBarProps) {
  const [english, setEnglish] = useState(false);
  return (
    <header
      ref={barRef}
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start gap-x-3 gap-y-2 px-4 pt-[calc(env(safe-area-inset-top)+10px)] pr-[max(16px,env(safe-area-inset-right))] pl-[max(16px,env(safe-area-inset-left))]"
    >
      <button type="button" onClick={onExit} className={chip} aria-label="Back to games">
        <span aria-hidden className="text-[20px] leading-none">
          ‹
        </span>
        <span className="hidden sm:inline">Juegos</span>
      </button>

      <div className="order-last w-full sm:order-none sm:w-auto sm:max-w-md sm:flex-1">
        <div className="pointer-events-auto -rotate-[0.4deg] rounded-[22px] bg-card px-4 py-2.5 shadow-[0_6px_0_var(--card-shadow)]">
          <div className="flex items-center gap-2">
            <p className="truncate text-[12px] font-bold text-muted">
              Nivel {index + 1} de {total}
              {solved && <span className="ml-2 rounded-full bg-accent px-2 text-white">resuelto</span>}
            </p>
            <button
              type="button"
              onClick={() => setEnglish((e) => !e)}
              aria-pressed={english}
              aria-label="Show the English clue"
              className={`ml-auto -my-2 -mr-2 inline-flex h-11 min-w-11 items-center justify-center rounded-full text-[13px] font-bold ${
                english ? "text-accent" : "text-muted"
              }`}
            >
              EN ?
            </button>
          </div>
          <h1 lang="es" className="truncate text-[20px] leading-tight font-bold">
            {level.title_es}
          </h1>
          <p lang="es" className="text-[14px] leading-snug">
            {level.clue_es}
          </p>
          {english && <p className="mt-0.5 text-[13px] leading-snug text-muted">{level.clue_en}</p>}
        </div>
      </div>

      <button type="button" onClick={onMenu} className={`${chip} ml-auto`} aria-label="Pause and open menu">
        <span aria-hidden className="flex gap-[3px]">
          <span className="h-3.5 w-[4px] rounded-full bg-ink" />
          <span className="h-3.5 w-[4px] rounded-full bg-ink" />
        </span>
        <span className="hidden sm:inline">Menú</span>
      </button>
    </header>
  );
}

interface BottomBarProps {
  targets: LayoutObject[];
  mods: Record<string, Word[]>;
  canRelease: boolean;
  canUndo: boolean;
  barRef: Ref<HTMLDivElement>;
  onZap: (id: string) => void;
  onHover: (id: string | null) => void;
  onRelease: () => void;
  onUndo: () => void;
  onReset: () => void;
}

/**
 * Object tray (a big tap target and a keyboard path for every object the ray
 * can hit) and the run controls.
 */
export function BottomBar({ targets, mods, canRelease, canUndo, barRef, onZap, onHover, onRelease, onUndo, onReset }: BottomBarProps) {
  return (
    <footer
      ref={barRef}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 px-4 pt-2 pr-[max(16px,env(safe-area-inset-right))] pb-[max(14px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] sm:flex-row sm:items-end"
    >
      <div className="no-scrollbar pointer-events-auto -mx-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-[5px] sm:flex-1 sm:flex-wrap">
        <span className="sr-only">Objects you can zap:</span>
        {targets.map((o) => {
          const words = mods[o.id] ?? [];
          return (
            <button
              key={o.id}
              type="button"
              lang="es"
              onClick={() => onZap(o.id)}
              onPointerEnter={(e) => e.pointerType === "mouse" && onHover(o.id)}
              onPointerLeave={() => onHover(null)}
              onFocus={() => onHover(o.id)}
              onBlur={() => onHover(null)}
              title={o.noun_en}
              className={`${chip} px-3.5`}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
              {o.noun}
              {words.length > 0 && (
                <span className="text-[13px] text-accent">{words.map((w) => agree(w.word, o.gender)).join(" · ")}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="pointer-events-auto flex items-center gap-2 sm:shrink-0">
        <button type="button" onClick={onUndo} disabled={!canUndo} className={`${lightPill} min-h-11 px-4 text-[15px]`} title="Undo the last word (Z)">
          Deshacer
        </button>
        <button type="button" onClick={onReset} className={`${lightPill} min-h-11 px-4 text-[15px]`} title="Reset the room (R)">
          Reiniciar
        </button>
        {canRelease && (
          <button type="button" onClick={onRelease} className={`${inkPill} ml-auto min-h-11 flex-1 sm:flex-none`} title="Release (Space)">
            Soltar ▸
          </button>
        )}
      </div>
    </footer>
  );
}

/** Pins a sticker label on each zapped object ("pesada · mojada"); positions are written by the scene. */
export function Labels({
  targets,
  mods,
  register,
}: {
  targets: LayoutObject[];
  mods: Record<string, Word[]>;
  register: (id: string, el: HTMLElement | null) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
      {targets.map((o) => {
        const words = mods[o.id];
        if (!words?.length) return null;
        return (
          <div
            key={o.id}
            ref={(el) => {
              register(o.id, el);
              return () => register(o.id, null);
            }}
            className="absolute top-0 left-0 will-change-transform"
          >
            <span
              lang="es"
              className="block rotate-[-2deg] rounded-full bg-card px-2.5 py-0.5 text-[13px] font-bold whitespace-nowrap text-ink shadow-[0_3px_0_var(--card-shadow)]"
            >
              {words.map((w) => agree(w.word, o.gender)).join(" · ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export interface ToastMsg {
  key: number;
  es: string;
  en: string;
  action?: { label: string; run: () => void };
}

/** Small sticker note above the tray (no-effect words, breaks, the ball got stuck). */
export function Toast({ toast, bottom }: { toast: ToastMsg | null; bottom: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-4" style={{ bottom: bottom + 8 }}>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            role="status"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-[18px] bg-ink px-4 py-2 text-on-ink shadow-[0_4px_0_var(--ink-shadow)]"
          >
            <span className="min-w-0">
              <span lang="es" className="block text-[15px] leading-tight font-bold">
                {toast.es}
              </span>
              <span className="block text-[12px] leading-tight opacity-75">{toast.en}</span>
            </span>
            {toast.action && (
              <button
                type="button"
                onClick={toast.action.run}
                className="press min-h-11 shrink-0 rounded-full bg-accent px-3 text-[14px] font-bold text-white shadow-[0_3px_0_var(--accent-shadow)] [--press:3px]"
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

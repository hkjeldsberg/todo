"use client";

import { GAUNTLET_SECONDS, type GameState } from "../lib/game";
import { textOn } from "../lib/color";
import { ISLANDS, type Island } from "../lib/islands";

/** Sticker chip, 44px tap target. `--press` matches its 3px shadow. */
export const chip =
  "press flex h-11 min-w-11 items-center justify-center rounded-full bg-card px-3 text-[15px] font-bold text-ink shadow-[0_3px_0_var(--card-shadow)] [--press:3px]";

export function TopBar({
  island,
  roomOf,
  state,
  onExit,
  onPause,
}: {
  island: Island;
  roomOf: [number, number];
  state: GameState;
  onExit: () => void;
  onPause: () => void;
}) {
  const n = ISLANDS.findIndex((i) => i.zone === island.zone) + 1;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start gap-2 px-4 pt-[calc(12px+env(safe-area-inset-top))] pr-[max(16px,env(safe-area-inset-right))] pl-[max(16px,env(safe-area-inset-left))]">
      <button type="button" onClick={onExit} className={`${chip} pointer-events-auto`} aria-label="Back to games">
        <span aria-hidden>←</span>
        <span className="ml-1 hidden sm:inline">Games</span>
      </button>

      <div className="flex min-w-0 -rotate-[0.6deg] items-center gap-2 rounded-[22px] bg-card py-1.5 pr-4 pl-1.5 shadow-[0_6px_0_var(--card-shadow)]">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
          style={{ background: island.palette.accent, color: textOn(island.palette.accent) }}
        >
          {n}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[15px] font-bold">{island.name}</span>
          <span className="block truncate text-[12px] font-bold text-muted">
            {state.gauntlet ? "Gauntlet" : island.theme} · {roomOf[0]}/{roomOf[1]}
          </span>
        </span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span
          className="hidden h-11 items-center gap-2 rounded-full bg-pill px-3 text-[13px] font-bold sm:flex"
          aria-label={`${state.solved.length} rooms solved, ${state.mistakes} paradoxes`}
        >
          <span>✓ {state.solved.length}</span>
          <span className="text-muted">✕ {state.mistakes}</span>
        </span>
        <button type="button" onClick={onPause} className={`${chip} pointer-events-auto`} aria-label="Pause">
          <span aria-hidden className="tracking-[-0.1em]">
            II
          </span>
        </button>
      </div>
    </div>
  );
}

export function GauntletTimer({ gauntlet }: { gauntlet: NonNullable<GameState["gauntlet"]> }) {
  const secs = Math.ceil(gauntlet.timeLeft);
  const low = gauntlet.timeLeft < 20;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[calc(76px+env(safe-area-inset-top))] z-20 flex justify-center px-4"
      aria-label={`${secs} seconds left`}
    >
      <div className="w-full max-w-[340px] rounded-[22px] bg-card px-4 py-2.5 shadow-[0_6px_0_var(--card-shadow)]">
        <div className="flex items-baseline justify-between text-[13px] font-bold">
          <span className={low ? "text-accent" : undefined}>¡Colapso! {secs}s</span>
          <span className="text-muted">
            Room {gauntlet.index + 1}/{gauntlet.queue.length}
          </span>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-pill">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-100 ease-linear"
            style={{ width: `${(gauntlet.timeLeft / GAUNTLET_SECONDS) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function Crosshair() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2 z-10 -mt-[6px] -ml-[6px] h-3 w-3 rounded-full border-2 border-white shadow-[0_0_0_2px_var(--ink)]"
    />
  );
}

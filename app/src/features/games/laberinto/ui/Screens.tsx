"use client";

import { textOn } from "../lib/color";
import { ISLANDS } from "../lib/islands";
import type { IslandZone } from "../lib/types";
import { chip } from "./Hud";

const primary =
  "press min-h-12 rounded-full bg-ink px-7 text-[18px] font-bold text-on-ink shadow-[0_6px_0_var(--ink-shadow)]";
const secondary =
  "press min-h-12 rounded-full bg-card px-6 text-[16px] font-bold text-ink shadow-[0_6px_0_var(--card-shadow)]";

function Screen({ onExit, children }: { onExit: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-page">
      <div className="sticky top-0 z-10 bg-page/90 px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-2 backdrop-blur-sm">
        <button type="button" onClick={onExit} className={chip} aria-label="Back to games">
          <span aria-hidden>←</span>
          <span className="ml-1">Games</span>
        </button>
      </div>
      <div className="mx-auto w-full max-w-[720px] px-4 pb-[calc(32px+env(safe-area-inset-bottom))]">{children}</div>
    </div>
  );
}

export function TitleScreen({
  unlocked,
  current,
  solved,
  total,
  hasProgress,
  source,
  onStart,
  onIsland,
  onExit,
}: {
  unlocked: Set<IslandZone>;
  current: IslandZone;
  solved: number;
  total: number;
  hasProgress: boolean;
  source: "supabase" | "bundled";
  onStart: () => void;
  onIsland: (z: IslandZone) => void;
  onExit: () => void;
}) {
  const currentName = ISLANDS.find((i) => i.zone === current)?.name;
  return (
    <Screen onExit={onExit}>
      <header className="mt-4 text-center">
        <p className="text-[13px] font-bold text-muted">Imperfecto or indefinido?</p>
        <h1 className="mt-1 text-[40px] leading-[0.95] font-bold sm:text-[56px]" lang="es">
          El Laberinto
          <span className="mt-1 block text-[20px] text-accent sm:text-[26px]">del Archipiélago</span>
        </h1>
        <p className="mx-auto mt-3 max-w-[36ch] text-[16px] text-muted">
          Read the sentence on the wall. Walk through the door that completes it. Wrong doors loop back.
        </p>
        <button type="button" onClick={onStart} className={`${primary} mt-5`}>
          {hasProgress ? `Continue · ${currentName}` : "Start"}
        </button>
        <p className="mt-3 text-[12px] font-bold text-faint">
          {solved}/{total} rooms solved
        </p>
      </header>

      <h2 className="mt-8 mb-3 text-[14px] font-bold text-muted">Islands</h2>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
        {ISLANDS.map((isl, i) => {
          const open = unlocked.has(isl.zone);
          return (
            <li key={isl.zone} style={{ transform: `rotate(${i % 2 ? 0.6 : -0.6}deg)` }}>
              <button
                type="button"
                disabled={!open}
                onClick={() => onIsland(isl.zone)}
                aria-label={open ? `${isl.name}: ${isl.theme}` : `${isl.name}: locked`}
                className={
                  open
                    ? "press flex h-full min-h-[104px] w-full flex-col items-start rounded-[22px] bg-card p-3 text-left shadow-[0_6px_0_var(--card-shadow)]"
                    : "flex h-full min-h-[104px] w-full cursor-not-allowed flex-col items-start rounded-[22px] bg-pill-flat p-3 text-left text-faint"
                }
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold"
                  style={
                    open
                      ? { background: isl.palette.accent, color: textOn(isl.palette.accent) }
                      : { background: "var(--handle)", color: "#ffffff" }
                  }
                >
                  {i + 1}
                </span>
                <span className="mt-2 text-[17px] leading-tight font-bold">{isl.name}</span>
                <span className={`text-[12px] font-bold ${open ? "text-muted" : ""}`}>
                  {open ? isl.theme : "Locked"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-6 text-center text-[12px] font-bold text-faint">Content: {source}</p>
      )}
    </Screen>
  );
}

export function VictoryScreen({
  mistakes,
  onAgain,
  onExit,
}: {
  mistakes: number;
  onAgain: () => void;
  onExit: () => void;
}) {
  return (
    <Screen onExit={onExit}>
      <div className="mt-10 rounded-[22px] bg-accent px-6 py-8 text-center text-white shadow-[0_8px_0_var(--accent-shadow)]">
        <p className="text-[13px] font-bold opacity-80">Fin</p>
        <h1 className="text-[44px] leading-none font-bold" lang="es">
          ¡Escapaste!
        </h1>
        <p className="mt-1 text-[18px] font-bold" lang="es">
          Siete islas, un tiempo pasado
        </p>
      </div>
      <p className="mt-6 text-center text-[16px] text-muted">
        You survived the El Hierro gauntlet with {mistakes} {mistakes === 1 ? "paradox" : "paradoxes"} along the way.
      </p>
      <div className="mt-5 flex justify-center">
        <button type="button" onClick={onAgain} className={primary}>
          Play again
        </button>
      </div>
    </Screen>
  );
}

export function PauseMenu({
  touch,
  solved,
  mistakes,
  onResume,
  onIslands,
  onExit,
}: {
  touch: boolean;
  solved: number;
  mistakes: number;
  onResume: () => void;
  onIslands: () => void;
  onExit: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--ink)_35%,transparent)] px-4">
      <div
        role="dialog"
        aria-label="Paused"
        className="w-full max-w-[400px] rounded-[22px] bg-card p-5 shadow-[0_6px_0_var(--card-shadow)]"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-[20px] font-bold">Paused</h2>
          <span className="rounded-full bg-pill px-3 py-0.5 text-[12px] font-bold">
            ✓ {solved} · ✕ {mistakes}
          </span>
        </div>
        <ul className="mt-3 space-y-1.5 text-[14px] text-muted">
          {touch ? (
            <>
              <li>Left thumb: joystick to walk</li>
              <li>Right side: drag to look around</li>
              <li>Tap a door to walk through it</li>
            </>
          ) : (
            <>
              <li>W A S D or arrows to walk, mouse to look</li>
              <li>Click a door to walk through it</li>
              <li>Esc to pause</li>
            </>
          )}
        </ul>
        <div className="mt-5 flex flex-col gap-3">
          <button type="button" autoFocus onClick={onResume} className={primary}>
            Resume
          </button>
          <button type="button" onClick={onIslands} className={secondary}>
            Islands
          </button>
          <button type="button" onClick={onExit} className={secondary}>
            Exit to games
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import type { Room } from "../types";
import { Pip, chip } from "./sticker";

interface HudProps {
  room: Room;
  solved: Set<string>;
  /** Only while no overlay is open: the chips stay above every scrim, the card does not. */
  showRoom: boolean;
  onExit: () => void;
  onMenu: () => void;
}

/** Top chrome: back chip, current room card, pause/menu chip. Sits above every overlay's scrim. */
export function Hud({ room, solved, showRoom, onExit, onMenu }: HudProps) {
  const done = room.puzzles.filter((p) => solved.has(p.id)).length;

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex flex-wrap items-start gap-x-3 gap-y-2 px-4 pt-[calc(env(safe-area-inset-top)+10px)] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]">
      <button type="button" onClick={onExit} className={chip} aria-label="Back to games">
        <span aria-hidden className="text-[20px] leading-none">
          ‹
        </span>
        Games
      </button>

      {showRoom && (
        <div className="order-last w-full sm:order-none sm:w-auto sm:max-w-sm">
          <div className="pointer-events-auto rounded-[22px] bg-card px-4 py-2.5 shadow-[0_6px_0_var(--card-shadow)]">
            <p className="truncate text-[12px] font-bold text-muted">
              Memory {room.order_index} · {room.subtitle}
            </p>
            <h1 lang="es" className="truncate text-[20px] leading-tight font-bold">
              {room.title}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <div
                className="flex items-center gap-1.5"
                aria-label={`${done} of ${room.puzzles.length} memories restored`}
                role="img"
              >
                {room.puzzles.map((p) => (
                  <Pip key={p.id} on={solved.has(p.id)} />
                ))}
              </div>
              <span className="rounded-full bg-pill px-2 text-[12px] font-bold">
                {done}/{room.puzzles.length}
              </span>
              <span className="hidden truncate text-[13px] text-muted sm:inline">{room.focus}</span>
            </div>
          </div>
        </div>
      )}

      <button type="button" onClick={onMenu} className={`${chip} ml-auto`} aria-label="Pause and open menu">
        <span aria-hidden className="flex gap-[3px]">
          <span className="h-3.5 w-[4px] rounded-full bg-ink" />
          <span className="h-3.5 w-[4px] rounded-full bg-ink" />
        </span>
        Menu
      </button>
    </header>
  );
}

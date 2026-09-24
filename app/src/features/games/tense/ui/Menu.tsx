"use client";

import { useEffect, useState } from "react";
import type { GameProps } from "@/features/games/types";
import type { RoomSummary } from "../types";
import { TenseKey } from "./Overlays";
import { Sheet, inkPill } from "./sticker";

interface MenuProps {
  rooms: RoomSummary[];
  currentId: string;
  unlocked: (i: number) => boolean;
  completed: string[];
  source: GameProps["source"];
  onSelectRoom: (id: string) => void;
  onReset: () => void;
  onResume: () => void;
  onExit: () => void;
}

/** Pause menu: the room is frozen while it's open. Room picker, how to play, reset. */
export function Menu({ rooms, currentId, unlocked, completed, source, onSelectRoom, onReset, onResume, onExit }: MenuProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onResume();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onResume]);

  return (
    <Sheet label="Paused" onDismiss={onResume}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[22px] font-bold">Paused</h2>
        <button type="button" autoFocus onClick={onResume} className={inkPill}>
          Resume
        </button>
      </div>

      <h3 className="mt-4 mb-2 text-[12px] font-bold text-muted">Memories</h3>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rooms.map((r, i) => {
          const open = unlocked(i);
          const current = r.id === currentId;
          const done = completed.includes(r.id);
          return (
            <li key={r.id}>
              <button
                type="button"
                disabled={!open}
                onClick={() => (current ? onResume() : onSelectRoom(r.id))}
                aria-current={current ? "true" : undefined}
                className={`press flex min-h-12 w-full items-center gap-3 rounded-[18px] px-3 py-2 text-left [--press:3px] disabled:cursor-default ${
                  current
                    ? "bg-pill-deep shadow-[0_3px_0_var(--card-shadow)]"
                    : open
                      ? "bg-pill shadow-[0_3px_0_var(--pill-deep)]"
                      : "bg-pill-flat text-faint"
                }`}
              >
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                    done ? "bg-accent text-white" : "bg-card"
                  }`}
                >
                  {r.order_index}
                </span>
                <span className="min-w-0">
                  <span lang="es" className="block truncate text-[15px] leading-tight font-bold">
                    {r.title}
                  </span>
                  <span className="block truncate text-[12px] text-muted">
                    {open ? (current ? "You are here" : r.subtitle) : "Locked"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <h3 className="mt-5 mb-2 text-[12px] font-bold text-muted">How it works</h3>
      <p className="mb-3 text-[14px]">
        Tap an object with a pink marker to recall its memory, then pick the past tense that fits.
      </p>
      <TenseKey />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-dash-card pt-3 text-[13px] text-muted">
        <button type="button" onClick={onExit} className="min-h-11 font-bold text-ink">
          ‹ Leave game
        </button>
        {process.env.NODE_ENV !== "production" && <span>Content: {source}</span>}
        {confirmReset ? (
          <span className="flex gap-3">
            <button
              type="button"
              className="min-h-11 font-bold text-accent"
              onClick={() => {
                onReset();
                setConfirmReset(false);
              }}
            >
              Yes, reset
            </button>
            <button type="button" className="min-h-11 font-bold" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" className="min-h-11 font-bold" onClick={() => setConfirmReset(true)}>
            Reset progress
          </button>
        )}
      </div>
    </Sheet>
  );
}

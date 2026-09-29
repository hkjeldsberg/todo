"use client";

import type { Inventory } from "../model/inventory";
import type { Miss, SummaryRoom } from "../model/summary";
import { PrimaryButton, SecondaryButton, Stars } from "./bits";

/**
 * End of a dungeon: each room with what you said, then every other true
 * position. Selecting a room shows the gnome there on the map.
 */
export function Summary({
  inv,
  rooms,
  selected,
  onSelect,
  score,
  stars,
  best,
  misses,
  onAgain,
  onMenu,
  onAlbum,
}: {
  inv: Inventory;
  rooms: SummaryRoom[];
  selected: number;
  onSelect: (i: number) => void;
  score: number;
  stars: number;
  best: boolean;
  misses: Miss[];
  onAgain: () => void;
  onMenu: () => void;
  onAlbum: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <div>
          <h2 className="text-[18px] leading-tight font-bold">¡Todas las salas!</h2>
          <p className="text-[13px] text-muted">
            {score} puntos{best ? " · ¡récord!" : ""}
          </p>
        </div>
        <Stars n={stars} size={20} />
      </div>
      <ol className="no-scrollbar mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-3" aria-label="Salas">
        {rooms.map((r, i) => {
          const open = i === selected;
          return (
            <li key={r.spot}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-expanded={open}
                className={`w-full rounded-[18px] px-3 py-2 text-left ${open ? "bg-card shadow-[0_4px_0_var(--card-shadow)]" : "bg-pill-flat"}`}
              >
                <span className="text-[12px] font-bold text-muted">Sala {i + 1}</span>
                <span className="block text-[15px] font-bold text-ink">{r.said}</span>
              </button>
              {open && (
                <div className="mt-1.5 px-1">
                  <p className="text-[12px] font-bold text-muted">También es verdad ({r.others.length}):</p>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {r.others.map((o) => (
                      <li key={o.expression} className="rounded-full bg-pill px-2.5 py-1 text-[13px] text-ink" title={inv.get(o.expression).en}>
                        {o.phrases[0]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
        {misses.length > 0 && (
          <li className="mt-1 rounded-[18px] border-2 border-dashed border-dash px-3 py-2 text-[13px] text-muted">
            <span className="font-bold text-ink">A Repaso:</span> {misses.map((m) => m.sentence).join(" ")}
          </li>
        )}
      </ol>
      <div className="flex flex-wrap items-center justify-center gap-2 px-4 pt-1 pb-3">
        <SecondaryButton onClick={onMenu}>Mazmorras</SecondaryButton>
        <SecondaryButton onClick={onAlbum}>Álbum</SecondaryButton>
        <PrimaryButton onClick={onAgain}>Otra vez</PrimaryButton>
      </div>
    </div>
  );
}

"use client";

import type { Inventory } from "../model/inventory";
import { suggestionLabel } from "../model/phrase";

const LEVELS = ["A1", "A2", "B1"] as const;

/**
 * Every position this dungeon can make true, always listed under the input.
 * Tapping one starts the answer ("El gnomo está detrás de "); tapping a thing on
 * the map finishes it ("…del seto"). Collected album entries carry a tick.
 */
export function Suggestions({
  inv,
  ids,
  album,
  disabled,
  onPick,
}: {
  inv: Inventory;
  ids: string[];
  album: Record<string, unknown>;
  disabled: boolean;
  onPick: (id: string) => void;
}) {
  if (ids.length === 0) return null;
  return (
    <section aria-label="Sugerencias" className="flex flex-col gap-2 pt-1">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-bold text-muted">Sugerencias · {ids.length}</h2>
        <span className="text-[11px] text-faint">tap one, then tap a thing on the map</span>
      </div>
      {LEVELS.map((level) => {
        const group = ids.filter((id) => inv.get(id).level === level);
        if (group.length === 0) return null;
        return (
          <div key={level} className="flex flex-wrap items-center gap-1.5">
            <span className="w-7 shrink-0 text-[11px] font-bold text-faint">{level}</span>
            {group.map((id) => {
              const e = inv.get(id);
              const have = Boolean(album[id]);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onPick(id)}
                  title={e.en}
                  aria-label={`${e.es} — ${e.en}${have ? " (in your album)" : ""}`}
                  className={`press min-h-9 rounded-full px-3 text-[13px] font-bold shadow-[0_3px_0_var(--card-shadow)] [--press:3px] disabled:opacity-50 ${
                    have ? "bg-card text-ink" : "bg-pill text-ink"
                  }`}
                >
                  {have && <span className="mr-1 text-accent">✓</span>}
                  {suggestionLabel(e.es, id, e.ref_count)}
                </button>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}

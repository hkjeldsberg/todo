"use client";

import type { Inventory } from "../model/inventory";
import type { SceneObject } from "../model/types";

/**
 * Suggestions on: 3–4 preposition chips, then the thing it's relative to —
 * tap it on the map or pick it here (keyboard alternative). Keys 1–4 pick chips.
 */
export function Tray({
  inv,
  chips,
  chip,
  refs,
  objects,
  onChip,
  onObject,
  disabled,
}: {
  inv: Inventory;
  chips: string[];
  chip: string | null;
  refs: string[];
  objects: SceneObject[];
  onChip: (id: string | null) => void;
  onObject: (id: string) => void;
  disabled: boolean;
}) {
  const need = chip ? inv.get(chip).ref_count : 0;
  const names = refs.map((r) => objects.find((o) => o.id === r)?.es ?? r);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Posiciones">
        {chips.map((id, i) => {
          const e = inv.get(id);
          const on = chip === id;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              onClick={() => onChip(on ? null : id)}
              className={`press min-h-12 rounded-full px-3 text-[16px] font-bold shadow-[0_3px_0_var(--card-shadow)] [--press:3px] disabled:opacity-40 ${
                on ? "bg-pill-deep text-ink shadow-[0_3px_0_#C9A460]" : "bg-card text-ink"
              }`}
            >
              <span className="mr-1.5 text-[11px] text-faint">{i + 1}</span>
              {e.ref_count === 2 ? `${e.es} … y …` : e.es}
            </button>
          );
        })}
      </div>
      {chip ? (
        <div>
          <p className="text-[13px] font-bold text-muted">
            {need === 2 ? `Toca dos cosas: ${inv.get(chip).es} ${names[0] ?? "…"} y …` : `Toca la cosa: ${inv.get(chip).es} …`}
          </p>
          <div className="no-scrollbar mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
            {objects.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={disabled}
                onClick={() => onObject(o.id)}
                aria-pressed={refs.includes(o.id)}
                className={`min-h-11 shrink-0 rounded-full px-3 text-[14px] font-bold ${refs.includes(o.id) ? "bg-accent text-white" : "bg-pill-flat text-ink"}`}
              >
                {o.es}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-muted">Elige una posición y luego toca la cosa en el mapa.</p>
      )}
    </div>
  );
}

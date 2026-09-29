"use client";

import { useState } from "react";
import type { Inventory } from "../model/inventory";
import type { Progress } from "../model/progress";
import type { Expression, Level } from "../model/types";

/**
 * The sticker album: all 83 expressions, like an RPG inventory grid. A sticker
 * unlocks the first time you use the expression correctly and keeps the
 * sentence you said.
 */
export function Album({
  inv,
  progress,
  reachable,
  onClose,
}: {
  inv: Inventory;
  progress: Progress;
  /** Expressions some hiding spot can make true. */
  reachable: ReadonlySet<string>;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const got = Object.keys(progress.album).length;
  const levels: Level[] = ["A1", "A2", "B1"];
  const detail = open ? inv.get(open) : null;

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-page" role="dialog" aria-modal="true" aria-label="Álbum">
      <header className="flex items-center justify-between gap-3 bg-shell px-4 pt-[calc(env(safe-area-inset-top)+10px)] pb-3">
        <div>
          <h2 className="text-[20px] leading-tight font-bold">Álbum</h2>
          <p className="text-[13px] text-muted">
            {got} / {inv.list.length} posiciones
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar álbum" className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-[16px] font-bold shadow-[0_3px_0_var(--card-shadow)]">
          ✕
        </button>
      </header>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="mx-auto max-w-[980px]">
          {levels.map((lv) => (
            <section key={lv} className="mt-4">
              <h3 className="text-[14px] font-bold text-muted">{lv}</h3>
              <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {inv.list
                  .filter((e) => e.level === lv)
                  .map((e) => (
                    <li key={e.id}>
                      <Sticker e={e} have={!!progress.album[e.id]} reachable={reachable.has(e.id)} active={open === e.id} onOpen={() => setOpen(open === e.id ? null : e.id)} />
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
      {detail && (
        <div className="border-t-2 border-dash bg-card px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)]" aria-live="polite">
          <div className="mx-auto max-w-[980px]">
            <p className="text-[17px] font-bold">
              {detail.es}
              {detail.region && <span className="ml-2 rounded-full bg-pill px-2 py-[1px] text-[12px] text-ink">{detail.region}</span>}
            </p>
            <p className="text-[14px] text-muted">{detail.en}</p>
            {progress.album[detail.id] ? (
              <p className="mt-1 text-[15px] text-ink">“{progress.album[detail.id].sentence}”</p>
            ) : (
              <p className="mt-1 text-[14px] text-faint">{reachable.has(detail.id) ? "Use it correctly in a garden to collect it." : "No garden hides the gnome this way yet."}</p>
            )}
            {detail.notes && <p className="mt-1 text-[13px] text-muted">{detail.notes}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function Sticker({ e, have, reachable, active, onOpen }: { e: Expression; have: boolean; reachable: boolean; active: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={active}
      className={`flex min-h-[76px] w-full flex-col items-center justify-center rounded-[16px] px-1.5 py-2 text-center ${
        have ? "bg-card shadow-[0_4px_0_var(--card-shadow)]" : "border-2 border-dashed border-dash bg-pill-flat"
      } ${active ? "outline-3 outline-accent" : ""}`}
    >
      {have ? (
        <>
          <span className="text-[14px] leading-tight font-bold text-ink">{e.es}</span>
          {e.region && <span className="mt-0.5 text-[10px] font-bold text-accent">{e.region}</span>}
        </>
      ) : (
        <>
          <span className="text-[18px] font-bold text-faint">?</span>
          <span className="text-[11px] leading-tight text-faint">{reachable ? e.en : "—"}</span>
        </>
      )}
    </button>
  );
}

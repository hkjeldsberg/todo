"use client";

import type { Progress } from "../model/progress";
import type { Scene } from "../model/types";
import { LevelPill, SecondaryButton, Stars } from "./bits";

/** Dungeon select: the four gardens, stars and best score, and the album. */
export function Menu({
  scenes,
  levels,
  progress,
  albumCount,
  total,
  onStart,
  onPreview,
  onAlbum,
}: {
  scenes: Scene[];
  levels: Record<string, string>;
  progress: Progress;
  albumCount: number;
  total: number;
  onStart: (id: string) => void;
  onPreview: (id: string) => void;
  onAlbum: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-end justify-between gap-3 px-4 pt-3">
        <div>
          <h1 className="text-[20px] leading-tight font-bold">El Laberinto del Gnomo</h1>
          <p className="text-[13px] text-muted">Find him, then say where he is — in as many ways as you can.</p>
        </div>
        <SecondaryButton onClick={onAlbum}>
          Álbum {albumCount}/{total}
        </SecondaryButton>
      </div>
      <ul className="no-scrollbar mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
        {scenes.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onStart(s.id)}
              onPointerEnter={() => onPreview(s.id)}
              onFocus={() => onPreview(s.id)}
              className={`press flex min-h-16 w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left shadow-[0_6px_0_var(--card-shadow)] ${
                i === 0 ? "bg-accent text-white shadow-[0_6px_0_var(--accent-shadow)]" : "bg-card text-ink"
              }`}
              style={{ rotate: `${i % 2 ? 0.6 : -0.6}deg` }}
            >
              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[17px] font-bold">{s.title_es}</span>
                  <LevelPill level={levels[s.id]} />
                </span>
                <span className={`block text-[13px] ${i === 0 ? "text-white/80" : "text-muted"}`}>
                  {s.title_en} · {s.targets.length} salas{progress.best[s.id] ? ` · récord ${progress.best[s.id]}` : ""}
                </span>
              </span>
              <Stars n={progress.stars[s.id] ?? 0} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

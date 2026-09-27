"use client";

import type { ComicPage, WasProgress } from "../lib/types";
import styles from "../was.module.css";

type Props = {
  pages: ComicPage[];
  progress: WasProgress;
  source: "supabase" | "bundled";
  onOpen: (pageId: string) => void;
  onExit: () => void;
};

const DEV = process.env.NODE_ENV !== "production";

/** Title screen: the rule in two cards, then every comic page with its progress. */
export function Cover({ pages, progress, source, onOpen, onExit }: Props) {
  const solved = new Set(progress.solved);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 sm:px-6">
      <button
        type="button"
        onClick={onExit}
        className="text-sm font-bold tracking-wider text-(--c-ink)/60 uppercase hover:text-(--c-ink)"
      >
        ← Juegos
      </button>
      <h1 className={`${styles.display} mt-2 text-6xl leading-[1.05] sm:text-7xl`}>
        El Cómic <span className="text-(--c-alarm)">Dinámico</span>
      </h1>
      <p className="mt-4 max-w-xl text-lg">
        Spanish has four ways to say <i>was</i>. Drag <b>era</b>, <b>estaba</b>, <b>fue</b> and <b>estuve</b> into
        the comic to bring each panel to life.
      </p>

      <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-2xl bg-white/70 p-4 shadow-[0_10px_30px_-15px_rgba(11,11,18,0.5)]">
          <p className={`${styles.display} text-2xl`}>Setting the scene</p>
          <p>
            <b>era</b>: traits, identity, time of day. <b>estaba</b>: temporary states and locations.
          </p>
        </div>
        <div className="border-[3px] border-(--c-ink) bg-white p-4 shadow-[4px_4px_0_var(--c-ink)]">
          <p className={`${styles.display} text-2xl`}>Driving the action</p>
          <p>
            <b>fue</b>: completed events. <b>estuve</b>: a temporary state with a fixed duration.
          </p>
        </div>
      </div>

      <h2 className={`${styles.display} mt-10 text-3xl`}>Cómics</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {pages.map((page) => {
          const done = page.panels.filter((p) => solved.has(p.id)).length;
          const completed = progress.completed.includes(page.id);
          return (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => onOpen(page.id)}
                className="block w-full rounded-xl border-[3px] border-(--c-ink) bg-(--c-pop) px-5 py-4 text-left shadow-[4px_4px_0_var(--c-ink)] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--c-ink)]"
              >
                <span className={`${styles.display} block text-3xl`}>{page.title} →</span>
                <span className="text-sm font-bold">
                  {completed ? "✓ Caso cerrado" : done ? `${done}/${page.panels.length} viñetas` : "Nuevo"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {DEV && <p className="mt-8 text-xs text-(--c-ink)/50">content: {source}</p>}
    </main>
  );
}

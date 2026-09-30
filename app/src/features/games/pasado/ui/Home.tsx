"use client";

import { LEITNER_INTERVALS } from "@/features/srs/leitner";
import type { Overview } from "../lib/leitner";
import { NEW_PER_SESSION, SCRAMBLE_FROM_BOX } from "../lib/leitner";
import type { PasadoContent } from "../lib/types";
import styles from "../pasado.module.css";
import { GhostButton, PrimaryButton } from "./parts";

const DEV = process.env.NODE_ENV !== "production";

type Props = {
  content: PasadoContent;
  overview: Overview;
  persisted: boolean;
  source: "supabase" | "bundled";
  onStart: (practice: boolean) => void;
};

/** Start screen: today's count, the two tenses' looks, and the five Leitner boxes. */
export function Home({ content, overview, persisted, source, onStart }: Props) {
  const { due, fresh, shelf } = overview;
  const newToday = Math.min(fresh.length, NEW_PER_SESSION);
  const total = due.length + newToday;
  const seen = shelf.some((box) => box.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[40px] leading-[1.05] font-extrabold sm:text-[52px]">
          El Candado <span className="text-accent">del Tiempo</span>
        </h1>
        <p className="mt-2 max-w-xl text-[17px] text-muted">
          Lock in <b className="text-ink">pretérito</b> or <b className="text-ink">imperfecto</b>, then conjugate.
          Right answers move a verb to a later box; a miss sends it back to box 1 for tomorrow.
        </p>
      </header>

      <section className="rounded-[26px] bg-card p-5 shadow-[0_6px_0_var(--card-shadow)]">
        {total > 0 ? (
          <>
            <p className="text-[15px] font-bold text-muted uppercase">Today</p>
            <p className="mt-1 text-[22px] font-extrabold" data-testid="pasado-today">
              {due.length > 0 && `${due.length} to review`}
              {due.length > 0 && newToday > 0 && " · "}
              {newToday > 0 && `${newToday} new`}
            </p>
            <PrimaryButton onClick={() => onStart(false)} className="mt-4 w-full">
              Start ({total})
            </PrimaryButton>
          </>
        ) : (
          <>
            <p className="text-[22px] font-extrabold" data-testid="pasado-today">All caught up</p>
            <p className="mt-1 text-[15px] text-muted">
              Nothing is due. Practice the weakest verbs anyway: misses still count, hits don&apos;t move boxes.
            </p>
            <GhostButton onClick={() => onStart(true)} className="mt-4 w-full">
              Practice anyway
            </GhostButton>
          </>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className={`${styles.preterite} p-4`}>
          <p className="text-[20px] font-extrabold">Pretérito</p>
          <p className="text-[15px] opacity-85">
            Finished, one-off actions: <i>ayer, anoche, el año pasado, de repente</i>.
          </p>
        </div>
        <div className={`${styles.imperfect} rounded-[26px]! p-4`}>
          <p className="text-[20px] font-extrabold">Imperfecto</p>
          <p className="text-[15px] opacity-85">
            Habits and background: <i>siempre, cada día, de niño, mientras</i>.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-[20px] font-extrabold">Boxes</h2>
        <p className="text-[14px] text-muted">
          Box {SCRAMBLE_FROM_BOX}+ swaps typing for word blocks. <span className={styles.glow}>Amber</span> = irregular root.
        </p>
        <ol className="mt-3 grid grid-cols-5 gap-2" data-testid="pasado-shelf">
          {[1, 2, 3, 4, 5].map((box) => (
            <li key={box} className="flex min-h-28 flex-col rounded-[16px] bg-pill-flat p-2">
              <p className="text-center text-[13px] font-extrabold">Box {box}</p>
              <p className="text-center text-[11px] text-muted">{LEITNER_INTERVALS[box]}d</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {shelf[box].map((v) => (
                  <li
                    key={v}
                    className={`truncate rounded-md bg-card px-1 py-0.5 text-center text-[12px] font-bold ${
                      content.verbs[v].isIrregular ? styles.glow : ""
                    }`}
                  >
                    {v}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[14px] text-muted">
          {fresh.length > 0 ? `${fresh.length} verbs not started yet.` : seen ? "Every verb started." : ""}
        </p>
      </section>

      {!persisted && (
        <p className="rounded-[16px] bg-ai px-4 py-3 text-[14px]">
          Progress isn&apos;t being saved: run <code>supabase/migrations/0008_pasado.sql</code> in the SQL editor.
        </p>
      )}
      {DEV && <p className="text-xs text-faint">drills: {source}</p>}
    </div>
  );
}

"use client";

import { Avatar } from "../avatar/Avatar";
import { TRACK_LABEL } from "../lib/judge";
import { SESSION_CAP, type Overview } from "../lib/srs";
import { TRACKS, type ProbadorContent, type Track } from "../lib/types";
import { TRACK_BG } from "./Play";

const DEV = process.env.NODE_ENV !== "production";

const EXAMPLE: Record<Track, string> = {
  quedar: "Le queda grande.",
  parecer: "Me parece elegante.",
  parecerse: "Se parece a un pirata.",
};

type Props = {
  content: ProbadorContent;
  overview: Overview;
  persisted: boolean;
  source: "supabase" | "bundled";
  onStart: (practice: boolean) => void;
};

/** Start screen: today's sprint, the three tracks and how far along each one is. */
export function Home({ content, overview, persisted, source, onStart }: Props) {
  const dueToday = Math.min(overview.due.length, SESSION_CAP);
  const newToday = Math.min(overview.fresh.length, SESSION_CAP - dueToday);
  const total = dueToday + newToday;
  const hero = content.outfits[content.prompts[0].outfit_id];
  const pirate = content.prompts.find((p) => p.target_verb === "parecerse");
  const sidekick = pirate ? content.outfits[pirate.outfit_id] : hero;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-2 pb-10 sm:px-6">
      <header className="flex items-end gap-2">
        <div className="flex-1">
          <h1 className="text-[44px] leading-none font-extrabold sm:text-[56px]">
            El <span className="text-accent">Probador</span>
          </h1>
          <p className="mt-2 text-[17px] text-muted">
            The fitting room critic. Does it <b className="text-ink">fit</b>, what do you <b className="text-ink">think</b> of it,
            and who does it make them <b className="text-ink">look like</b>?
          </p>
        </div>
        <Avatar look={hero.avatar} layers={hero.layers} className="hidden h-36 w-auto sm:block" />
        <Avatar look={sidekick.avatar} layers={sidekick.layers} className="h-28 w-auto sm:h-36" />
      </header>

      <section className="rounded-[26px] bg-card p-5 shadow-[0_6px_0_var(--card-shadow)]">
        {total > 0 ? (
          <>
            <p className="text-[15px] font-bold text-muted uppercase">Today&apos;s sprint</p>
            <p className="mt-1 text-[22px] font-extrabold" data-testid="probador-today">
              {[dueToday > 0 && `${dueToday} to review`, newToday > 0 && `${newToday} new`].filter(Boolean).join(" · ")}
            </p>
            <button
              type="button"
              onClick={() => onStart(false)}
              className="press mt-4 min-h-14 w-full rounded-full bg-ink text-[18px] font-extrabold text-on-ink shadow-[0_6px_0_var(--ink-shadow)]"
            >
              Start ({total})
            </button>
          </>
        ) : (
          <>
            <p className="text-[22px] font-extrabold" data-testid="probador-today">
              All caught up
            </p>
            <p className="mt-1 text-[15px] text-muted">Nothing is due. Practice the shakiest prompts anyway: misses still count.</p>
            <button
              type="button"
              onClick={() => onStart(true)}
              className="press mt-4 min-h-14 w-full rounded-full bg-pill text-[17px] font-extrabold shadow-[0_5px_0_var(--card-shadow)]"
            >
              Practice anyway
            </button>
          </>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3" data-testid="probador-tracks">
        {TRACKS.map((track) => {
          const t = overview.tracks[track];
          const all = t.fresh + t.learning + t.mastered;
          return (
            <div key={track} className="rounded-[22px] bg-card p-4 shadow-[0_5px_0_var(--card-shadow)]">
              <span className={`inline-block rounded-full px-3 py-1 text-[14px] font-extrabold ${TRACK_BG[track]}`}>
                {TRACK_LABEL[track]}
              </span>
              <p lang="es" className="mt-2 text-[18px] font-extrabold">
                {EXAMPLE[track]}
              </p>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-pill-flat" aria-hidden>
                <div className={TRACK_BG[track]} style={{ width: `${(t.mastered / all) * 100}%` }} />
                <div className={`${TRACK_BG[track]} opacity-40`} style={{ width: `${(t.learning / all) * 100}%` }} />
              </div>
              <p className="mt-1.5 text-[13px] text-muted">
                {t.mastered} mastered · {t.learning} learning · {t.fresh} new
              </p>
            </div>
          );
        })}
      </section>

      <p className="text-[14px] text-muted">
        Build each answer in three taps: pronoun, verb, then how it looks. Stuck for 5 seconds? The next piece pulses.
        Misses come back later in the sprint; right first time moves a prompt to tomorrow, and three days in a row to weekly.
      </p>

      {!persisted && (
        <p className="rounded-[16px] bg-ai px-4 py-3 text-[14px]">
          Progress isn&apos;t being saved: run <code>supabase/migrations/0009_probador.sql</code> and{" "}
          <code>supabase/seed/probador.sql</code> in the SQL editor.
        </p>
      )}
      {DEV && <p className="text-xs text-faint">prompts: {source}</p>}
    </div>
  );
}

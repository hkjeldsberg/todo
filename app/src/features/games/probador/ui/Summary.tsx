"use client";

import { answerSentence, questionWith } from "../lib/content";
import type { Prompt } from "../lib/types";
import { TRACK_TEXT } from "./Play";

/** End of a sprint: first-try score and every prompt that needed another go. */
export function Summary({
  firstTry,
  prompts,
  missed,
  mastered,
  moreDue,
  onAgain,
  onHome,
}: {
  firstTry: number;
  prompts: number;
  missed: Prompt[];
  mastered: number;
  moreDue: boolean;
  onAgain: () => void;
  onHome: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
      <h1 className="text-[38px] leading-tight font-extrabold">{missed.length === 0 ? "¡Impecable!" : "Sprint done"}</h1>
      <p className="text-[20px] font-bold" data-testid="probador-score">
        {firstTry} / {prompts} right first time
        {mastered > 0 && <span className="text-muted"> · {mastered} now weekly</span>}
      </p>
      {missed.length > 0 && (
        <>
          <h2 className="text-[18px] font-extrabold">Worth another look</h2>
          <ul className="flex flex-col gap-2">
            {missed.map((p) => (
              <li key={p.id} className="rounded-[16px] bg-card px-4 py-3 shadow-[0_4px_0_var(--card-shadow)]">
                <p lang="es" className="text-[15px] text-muted">
                  {questionWith(p, p.question_fill)}
                </p>
                <p lang="es" className={`text-[18px] font-extrabold ${TRACK_TEXT[p.target_verb]}`}>
                  {answerSentence(p)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-auto flex gap-3 pt-2">
        <button
          type="button"
          onClick={onHome}
          className="press min-h-14 flex-1 rounded-full bg-pill text-[16px] font-extrabold shadow-[0_5px_0_var(--card-shadow)]"
        >
          Fitting room
        </button>
        {moreDue && (
          <button
            type="button"
            onClick={onAgain}
            className="press min-h-14 flex-[2] rounded-full bg-ink text-[18px] font-extrabold text-on-ink shadow-[0_6px_0_var(--ink-shadow)]"
          >
            Next sprint
          </button>
        )}
      </div>
    </div>
  );
}

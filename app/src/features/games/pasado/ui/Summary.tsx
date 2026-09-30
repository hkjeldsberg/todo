"use client";

import type { PasadoContent } from "../lib/types";
import styles from "../pasado.module.css";
import { GhostButton, PrimaryButton } from "./parts";

export type Move = { infinitive: string; before: number; after: number };

/** End of a session: score and where each verb moved. */
export function Summary({
  content,
  right,
  total,
  moves,
  moreDue,
  onAgain,
  onHome,
}: {
  content: PasadoContent;
  right: number;
  total: number;
  moves: Move[];
  moreDue: boolean;
  onAgain: () => void;
  onHome: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <h1 className="text-[36px] leading-tight font-extrabold">
        {right === total ? "¡Perfecto!" : "Session done"}
      </h1>
      <p className="text-[20px] font-bold" data-testid="pasado-score">
        {right} / {total} right
      </p>
      <ul className="flex flex-col gap-2">
        {moves.map((m) => (
          <li
            key={m.infinitive}
            className="flex items-center justify-between rounded-[16px] bg-card px-4 py-3 shadow-[0_4px_0_var(--card-shadow)]"
          >
            <span className={`text-[17px] font-extrabold ${content.verbs[m.infinitive].isIrregular ? styles.glow : ""}`}>
              {m.infinitive}
            </span>
            <span className={`text-[15px] font-bold ${m.after > m.before ? "text-ink" : m.after < m.before ? "text-accent" : "text-muted"}`}>
              Box {m.before} → {m.after}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex gap-3 pt-2">
        <GhostButton onClick={onHome} className="flex-1">
          Boxes
        </GhostButton>
        {moreDue && (
          <PrimaryButton onClick={onAgain} className="flex-[2]">
            Keep going
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

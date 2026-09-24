"use client";

import { useGrammarProgress } from "@/features/grammar/progress";

/** The same tick as the grid card, in button form at the end of a topic. */
export default function DoneToggle({ slug }: { slug: string }) {
  const { done, toggle } = useGrammarProgress();
  const checked = done.has(slug);

  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => toggle(slug)}
      className={`press mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[16px] font-bold ${
        checked
          ? "bg-accent text-on-ink shadow-[0_6px_0_var(--card-shadow)]"
          : "bg-pill text-ink"
      }`}
    >
      <span>{checked ? "✓" : "○"}</span>
      {checked ? "Under control" : "I've got this"}
    </button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { setTags } from "@/features/diary/actions";
import type { Failure } from "@/features/diary/diary";

/**
 * Topics and words covered that day. Kept as loose chips rather than linked to
 * the grammar cards: what a teacher calls a topic rarely matches a slug.
 */
export default function TagEditor({
  day,
  initial,
}: {
  day: string;
  initial: string[];
}) {
  const [tags, setLocalTags] = useState(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<Failure | null>(null);
  const [pending, startTransition] = useTransition();

  const commit = (next: string[]) => {
    const previous = tags;
    setLocalTags(next);
    setError(null);
    startTransition(async () => {
      const result = await setTags(day, next);
      if (result.ok) return;
      setLocalTags(previous); // Put it back rather than lie about saving.
      setError(result.error);
    });
  };

  const add = () => {
    // One box, several tags: commas split so a whole list can be pasted in.
    const incoming = draft
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (!incoming.length) return;
    commit([...new Set([...tags, ...incoming])]);
    setDraft("");
  };

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold">Temas y palabras</h2>
        {pending && <span className="text-[12px] text-faint">guardando…</span>}
      </div>

      {tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => commit(tags.filter((row) => row !== tag))}
              title="Quitar"
              className="press rounded-full bg-pill px-3 py-1.5 text-[13px] font-bold"
            >
              {tag} <span className="text-muted">×</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-2 rounded-[14px] bg-pill px-3 py-2">
          <p className="text-[13px] leading-snug font-bold text-accent">
            {error.message}
          </p>
          {error.hint && (
            <p className="mt-0.5 text-[12px] leading-snug text-muted">
              {error.hint}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            add();
          }}
          placeholder="subjuntivo, la ropa…"
          className="min-w-0 flex-1 rounded-full bg-card px-4 py-2.5 text-[15px] shadow-[0_3px_0_var(--card-shadow)] outline-none placeholder:text-faint"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="press shrink-0 rounded-full bg-ink px-4 py-2.5 text-[13px] font-bold text-on-ink disabled:opacity-50"
        >
          Añadir
        </button>
      </div>
    </section>
  );
}

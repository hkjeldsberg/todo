"use client";

import { useState } from "react";
import type { StorySummary, Target } from "../lib/schema";
import { PressButton } from "./Chip";

const TARGET_LABEL: Record<Target, string> = {
  preterite: "pretérito",
  imperfect: "imperfecto",
  present: "presente",
  future: "futuro",
  subjunctive: "subjuntivo",
  reflexive: "reflexivos",
};

export function targetLabel(target: Target): string {
  return TARGET_LABEL[target];
}

/** The story list: newest first, the primary action writes a new one. */
export default function Library({
  stories,
  read,
  canGenerate,
  canSave,
  onOpen,
  onNew,
  onDelete,
  onExit,
}: {
  stories: StorySummary[];
  read: string[];
  canGenerate: boolean;
  canSave: boolean;
  onOpen(id: string): void;
  onNew(): void;
  onDelete(id: string): void;
  onExit(): void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col bg-page px-[18px] pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))]">
      <header className="mb-5 flex items-center gap-3">
        <PressButton onClick={onExit} className="min-h-11 px-4 text-[15px]" aria-label="Back to games">
          ‹ Juegos
        </PressButton>
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] leading-none font-bold">Cuentos</h1>
          <p className="mt-1 text-[13px] text-muted">Short stories to read, written by Claude for you.</p>
        </div>
      </header>

      <PressButton
        tone="ink"
        depth={6}
        onClick={onNew}
        disabled={!canGenerate}
        className="mb-2 min-h-14 w-full px-5 text-[18px]"
      >
        + Nuevo cuento
      </PressButton>
      {!canGenerate && (
        <p className="mb-2 text-center text-[12px] font-bold text-faint">
          {canSave ? "Needs ANTHROPIC_API_KEY to write new stories." : "Writing new stories needs the database."}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-4">
        {stories.map((story, index) => {
          const unread = !read.includes(story.id);
          return (
            <li key={story.id} className="sticker" style={{ transform: `rotate(${index % 2 ? 0.5 : -0.5}deg)` }}>
              <div className="flex items-stretch overflow-hidden rounded-[22px] bg-card shadow-[0_6px_0_var(--card-shadow)]">
                <button
                  onClick={() => onOpen(story.id)}
                  className="min-w-0 flex-1 p-4 text-left"
                  aria-label={`Read ${story.title}`}
                >
                  <div className="flex items-center gap-2">
                    {unread && <span className="size-2 shrink-0 rounded-full bg-accent" aria-label="unread" />}
                    <span className="truncate text-[18px] leading-tight font-bold">{story.title}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[14px] text-muted">{story.topic}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-pill-deep px-2 py-0.5 text-[12px] font-bold">{story.level}</span>
                    {story.targets.map((t) => (
                      <span key={t} className="rounded-full bg-pill px-2 py-0.5 text-[12px] font-bold text-muted">
                        {TARGET_LABEL[t]}
                      </span>
                    ))}
                  </div>
                </button>
                {canSave && (
                  <div className="flex flex-col justify-center pr-2">
                    {confirming === story.id ? (
                      <button
                        onClick={() => {
                          setConfirming(null);
                          onDelete(story.id);
                        }}
                        className="min-h-11 rounded-full bg-accent px-3 text-[13px] font-bold text-white"
                      >
                        Delete?
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirming(story.id)}
                        aria-label={`Delete ${story.title}`}
                        className="flex size-11 items-center justify-center text-[16px] font-bold text-faint"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

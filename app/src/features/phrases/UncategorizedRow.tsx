"use client";

import { useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import PhraseRow from "@/features/phrases/PhraseRow";
import { UNCATEGORIZED, useBoard } from "@/features/phrases/store";
import type { Category, Phrase } from "@/features/phrases/types";

/**
 * Not a card: unfiled phrases are a holding area, so they read as a flat row
 * that stays out of the way until you open it.
 */
export default function UncategorizedRow({
  phrases,
  categories,
  newPhraseId,
}: {
  phrases: Phrase[];
  categories: Category[];
  newPhraseId: string | null;
}) {
  const { collapsed, toggleCollapsed } = useBoard();
  const open = !collapsed[UNCATEGORIZED];
  const revealed = useRef<string | null>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: "category:none",
    data: { type: "container", categoryId: null },
  });

  // A suggested phrase lands here, so open the bucket once to show it.
  useEffect(() => {
    if (!newPhraseId || revealed.current === newPhraseId) return;
    if (!phrases.some((phrase) => phrase.id === newPhraseId)) return;
    revealed.current = newPhraseId;
    if (collapsed[UNCATEGORIZED]) toggleCollapsed(UNCATEGORIZED);
  }, [newPhraseId, phrases, collapsed, toggleCollapsed]);

  if (phrases.length === 0 && !isOver) return null;

  return (
    <div ref={setNodeRef} className={isOver ? "opacity-100" : "opacity-80"}>
      <button
        onClick={() => toggleCollapsed(UNCATEGORIZED)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-1"
      >
        <span className="text-[14px] font-bold text-faint">Uncategorized</span>
        <span className="rounded-full bg-pill-flat px-2 py-px text-[12px] font-bold text-faint">
          {phrases.length}
        </span>
        <span aria-hidden className="ml-auto text-[12px] text-faint">
          {open ? "▾" : "▸"}
        </span>
      </button>

      {/* Same grid-row collapse as the cards — see CategoryCard. */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <SortableContext
            items={phrases.map((phrase) => phrase.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="px-1">
              {phrases.map((phrase) => (
                <PhraseRow
                  key={phrase.id}
                  phrase={phrase}
                  categories={categories}
                  tone="flat"
                  isNew={phrase.id === newPhraseId}
                />
              ))}
            </ul>
          </SortableContext>
        </div>
      </div>
    </div>
  );
}

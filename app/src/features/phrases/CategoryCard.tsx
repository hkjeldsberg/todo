"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PhraseRow, { type Tone } from "@/features/phrases/PhraseRow";
import { EditCategoryModal } from "@/features/phrases/dialogs";
import { useBoard } from "@/features/phrases/store";
import type { Category, Phrase } from "@/features/phrases/types";

/** Pasted-sticker tilt. Alternates by index and stays under 1.2°. */
const TILT = [-0.7, 0.6, -0.5, 0.8];

export default function CategoryCard({
  category,
  phrases,
  categories,
  index,
  tone,
  newPhraseId,
}: {
  category: Category;
  phrases: Phrase[];
  categories: Category[];
  index: number;
  tone: Exclude<Tone, "flat">;
  newPhraseId: string | null;
}) {
  const { removeCategory, collapsed, toggleCollapsed } = useBoard();
  const [renaming, setRenaming] = useState(false);
  const open = !collapsed[category.id];
  const accent = tone === "accent";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, data: { type: "category" } });

  // Phrases dropped anywhere on the card land in this category, so an empty
  // card is a valid target too.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `category:${category.id}`,
    data: { type: "container", categoryId: category.id },
  });

  const tilt = isDragging ? 0 : TILT[index % TILT.length];

  return (
    <motion.section
      ref={setNodeRef}
      layout
      style={{
        transform: [CSS.Transform.toString(transform), `rotate(${tilt}deg)`]
          .filter(Boolean)
          .join(" "),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={`sticker rounded-[22px] px-4 pt-4 pb-3.5 ${
        accent
          ? "bg-accent text-white shadow-[0_8px_0_var(--accent-shadow)]"
          : "bg-card shadow-[0_6px_0_var(--card-shadow)]"
      } ${isOver ? "ring-2 ring-ink/25" : ""}`}
    >
      <div ref={setDropRef}>
        <header className="flex items-center gap-2">
          <button
            onClick={() => toggleCollapsed(category.id)}
            aria-expanded={open}
            className="flex min-w-0 items-center gap-2 text-left"
          >
            <span className="truncate text-[17px] font-bold">
              {category.name}
            </span>
            <span
              className={`shrink-0 rounded-full px-2.5 py-px text-[12px] font-bold ${
                accent ? "bg-white/30" : "bg-pill text-muted"
              }`}
            >
              {phrases.length}
            </span>
            <span
              aria-hidden
              className={`shrink-0 text-[11px] ${accent ? "opacity-80" : "text-faint"}`}
            >
              {open ? "▾" : "▸"}
            </span>
          </button>

          <div
            className={`ml-auto flex shrink-0 items-center gap-3 text-[13px] ${
              accent ? "opacity-70" : "text-faint"
            }`}
          >
            <button
              onClick={() => setRenaming(true)}
              aria-label={`Rename category ${category.name}`}
            >
              ✎
            </button>
            <button
              onClick={() => removeCategory(category.id)}
              aria-label={`Delete category ${category.name}`}
            >
              ✕
            </button>
            <button
              {...attributes}
              {...listeners}
              aria-label={`Reorder ${category.name}`}
              className="glyph cursor-grab touch-none active:cursor-grabbing"
            >
              ⠿
            </button>
          </div>
        </header>

        {/* Collapse with a grid-row transition rather than an animated height:
          the swipe-to-switch gesture wrapping this list can interrupt a JS
          spring mid-flight and leave the body stuck at zero. */}
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
              <ul className="mt-2.5">
                {phrases.length === 0 ? (
                  <li
                    className={`py-2 text-[14px] ${accent ? "opacity-70" : "text-faint"}`}
                  >
                    Drop a phrase here
                  </li>
                ) : (
                  phrases.map((phrase) => (
                    <PhraseRow
                      key={phrase.id}
                      phrase={phrase}
                      categories={categories}
                      tone={tone}
                      isNew={phrase.id === newPhraseId}
                    />
                  ))
                )}
              </ul>
            </SortableContext>
          </div>
        </div>
      </div>

      <EditCategoryModal
        open={renaming}
        onClose={() => setRenaming(false)}
        category={category}
      />
    </motion.section>
  );
}

"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useBoard } from "@/features/phrases/store";
import { useReviewSet } from "@/features/phrases/review-set";
import type { Category, Phrase } from "@/features/phrases/types";

/** How the row is tinted: inside a white card, inside a pink one, or bare. */
export type Tone = "light" | "accent" | "flat";

const RULE: Record<Tone, string> = {
  light: "border-t border-dashed border-dash-card",
  accent: "border-t border-dashed border-white/40",
  flat: "border-t border-dashed border-dash",
};

const HANDLE: Record<Tone, string> = {
  light: "text-handle",
  accent: "text-white opacity-55",
  flat: "text-handle",
};

function IconButton({
  label,
  glyph,
  tone,
  onClick,
}: {
  label: string;
  glyph: string;
  tone: Tone;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`px-1 text-[13px] leading-none ${
        tone === "accent" ? "text-white opacity-70" : "text-faint"
      }`}
    >
      {glyph}
    </button>
  );
}

export default function PhraseRow({
  phrase,
  categories,
  tone = "flat",
  isNew = false,
}: {
  phrase: Phrase;
  /** Every category in this scenario — offered as chips while editing. */
  categories: Category[];
  tone?: Tone;
  /** Flag the phrase Claude just generated. */
  isNew?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const review = useReviewSet();
  const [editing, setEditing] = useState(false);
  const [spanish, setSpanish] = useState(phrase.spanish_text);
  const [translation, setTranslation] = useState(phrase.translation_text);
  const [categoryId, setCategoryId] = useState<string | null>(
    phrase.category_id,
  );
  const [scenarioId, setScenarioId] = useState(phrase.scenario_id);
  const { scenarios, editPhrase, removePhrase } = useBoard();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: phrase.id,
    data: { type: "phrase", categoryId: phrase.category_id },
  });

  const moved = scenarioId !== phrase.scenario_id;

  function save() {
    editPhrase({
      id: phrase.id,
      spanish,
      translation,
      scenarioId,
      // A category belongs to one scenario, so moving the phrase drops it.
      categoryId: moved ? null : categoryId,
    });
    setEditing(false);
  }

  function cancel() {
    setSpanish(phrase.spanish_text);
    setTranslation(phrase.translation_text);
    setCategoryId(phrase.category_id);
    setScenarioId(phrase.scenario_id);
    setEditing(false);
  }

  /* Selected chips are a deeper yellow rather than ink: ink is reserved for the
     one primary action in view (Save), so the eye can find it. */
  const chip = (active: boolean) =>
    active
      ? tone === "accent"
        ? "rounded-full bg-white/30 px-2.5 py-1 text-[12px] font-bold"
        : "rounded-full bg-pill-deep px-2.5 py-1 text-[12px] font-bold text-ink"
      : tone === "accent"
        ? "rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-bold opacity-80"
        : "rounded-full bg-pill px-2.5 py-1 text-[12px] font-bold text-muted";

  if (editing) {
    return (
      <li className={`flex flex-col gap-3 py-3 ${RULE[tone]}`}>
        <input
          autoFocus
          value={spanish}
          onChange={(event) => setSpanish(event.target.value)}
          className={`w-full rounded-xl px-3 py-2 text-[16px] font-bold outline-none ${
            tone === "accent" ? "bg-white/20" : "bg-pill"
          }`}
        />
        <input
          value={translation}
          onChange={(event) => setTranslation(event.target.value)}
          className={`w-full rounded-xl px-3 py-2 text-[16px] outline-none ${
            tone === "accent" ? "bg-white/20" : "bg-pill"
          }`}
        />

        <div>
          <div className="mb-1.5 text-[12px] font-bold opacity-70">
            Scenario
          </div>
          <div className="flex flex-wrap gap-1.5">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => setScenarioId(scenario.id)}
                className={chip(scenarioId === scenario.id)}
              >
                {scenario.name}
              </button>
            ))}
          </div>
        </div>

        <div className={moved ? "opacity-50" : undefined}>
          <div className="mb-1.5 text-[12px] font-bold opacity-70">
            {moved ? "Category — uncategorized after the move" : "Category"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              disabled={moved}
              onClick={() => setCategoryId(null)}
              className={chip(categoryId === null)}
            >
              Uncategorized
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                disabled={moved}
                onClick={() => setCategoryId(category.id)}
                className={chip(categoryId === category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 self-end">
          <button
            onClick={cancel}
            className={`rounded-full px-4 py-1.5 text-[13px] font-bold ${
              tone === "accent" ? "bg-white/20" : "bg-pill text-muted"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="press rounded-full bg-ink px-4 py-1.5 text-[13px] font-bold text-on-ink shadow-[0_3px_0_var(--ink-shadow)]"
            style={{ ["--press" as string]: "3px" }}
          >
            Save
          </button>
        </div>
      </li>
    );
  }

  return (
    <motion.li
      ref={setNodeRef}
      layout
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
        opacity: isDragging ? 0.85 : 1,
      }}
      onClick={() => setRevealed((value) => !value)}
      className={`flex cursor-pointer items-center gap-2.5 py-[9px] ${RULE[tone]}`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${phrase.spanish_text}`}
        onClick={(event) => event.stopPropagation()}
        className={`glyph shrink-0 cursor-grab touch-none text-[12px] active:cursor-grabbing ${HANDLE[tone]}`}
      >
        ⠿
      </button>

      <div className="min-w-0 flex-1">
        {isNew && (
          <div
            className={`text-[12px] font-bold ${
              tone === "accent" ? "opacity-80" : "text-accent"
            }`}
          >
            * new
          </div>
        )}
        <div className="text-[16px] break-words">{phrase.spanish_text}</div>
        <AnimatePresence initial={false}>
          {revealed && (
            <motion.div
              key="translation"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={`overflow-hidden text-[14px] ${
                tone === "accent" ? "opacity-80" : "text-muted"
              }`}
            >
              {phrase.translation_text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {revealed && (
          <motion.div
            key="icons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex shrink-0 gap-1.5"
          >
            <IconButton
              label={
                review.has(phrase.id)
                  ? `Remove ${phrase.spanish_text} from Repaso`
                  : `Add ${phrase.spanish_text} to Repaso`
              }
              glyph={review.has(phrase.id) ? "↻✓" : "↻"}
              tone={tone}
              onClick={() => review.toggle(phrase.id)}
            />
            <IconButton
              label={`Edit ${phrase.spanish_text}`}
              glyph="✎"
              tone={tone}
              onClick={() => setEditing(true)}
            />
            <IconButton
              label={`Delete ${phrase.spanish_text}`}
              glyph="✕"
              tone={tone}
              onClick={() => removePhrase(phrase.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

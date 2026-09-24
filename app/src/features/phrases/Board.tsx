"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

import PageHeader from "@/design/PageHeader";
import ScenarioTabs from "@/features/phrases/ScenarioTabs";
import CategoryCard from "@/features/phrases/CategoryCard";
import UncategorizedRow from "@/features/phrases/UncategorizedRow";
import {
  EditScenarioModal,
  NewCategoryModal,
  NewPhraseModal,
  NewScenarioModal,
} from "@/features/phrases/dialogs";
import Link from "next/link";
import { useBoard } from "@/features/phrases/store";
import type { Phrase } from "@/features/phrases/types";

export default function AppShell() {
  const board = useBoard();
  const [phraseModal, setPhraseModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [scenarioModal, setScenarioModal] = useState(false);
  const [editScenario, setEditScenario] = useState(false);
  const [suggesting, startSuggest] = useTransition();

  const active =
    board.scenarios.find((scenario) => scenario.id === board.activeId) ??
    board.scenarios[0] ??
    null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Everything below is derived from the in-memory snapshot — switching tabs
  // never touches the network.
  const categories = useMemo(
    () =>
      board.categories
        .filter((category) => category.scenario_id === active?.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    [board.categories, active?.id],
  );

  const scenarioPhrases = useMemo(
    () =>
      board.phrases
        .filter((phrase) => phrase.scenario_id === active?.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    [board.phrases, active?.id],
  );

  const uncategorized = useMemo(
    () => scenarioPhrases.filter((phrase) => phrase.category_id === null),
    [scenarioPhrases],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, Phrase[]>();
    for (const phrase of scenarioPhrases) {
      if (!phrase.category_id) continue;
      const list = map.get(phrase.category_id) ?? [];
      list.push(phrase);
      map.set(phrase.category_id, list);
    }
    return map;
  }, [scenarioPhrases]);

  /** Phrases of one bucket, in order, with `exclude` taken out. */
  function bucket(categoryId: string | null, exclude: string) {
    const list = categoryId
      ? (byCategory.get(categoryId) ?? [])
      : uncategorized;
    return list.filter((phrase) => phrase.id !== exclude);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active: dragged, over } = event;
    if (!over || dragged.id === over.id) return;

    if (dragged.data.current?.type === "category") {
      const from = categories.findIndex(
        (category) => category.id === dragged.id,
      );
      const to = categories.findIndex((category) => category.id === over.id);
      if (from < 0 || to < 0) return;
      board.setCategoryOrder(
        arrayMove(categories, from, to).map((category) => category.id),
      );
      return;
    }

    if (dragged.data.current?.type !== "phrase") return;

    const overData = over.data.current;
    const phraseId = String(dragged.id);

    // Dropped on a card (or on the uncategorized area) → append to it.
    if (overData?.type === "container") {
      const target = overData.categoryId as string | null;
      board.movePhrase(phraseId, target, bucket(target, phraseId).length);
      return;
    }

    // Dropped on another phrase → take that phrase's slot.
    if (overData?.type === "phrase") {
      const target = overData.categoryId as string | null;
      const index = bucket(target, phraseId).findIndex(
        (phrase) => phrase.id === over.id,
      );
      if (index < 0) return;
      board.movePhrase(phraseId, target, index);
    }
  }

  function switchBy(offset: number) {
    if (!active) return;
    const index = board.scenarios.findIndex(
      (scenario) => scenario.id === active.id,
    );
    const target = board.scenarios[index + offset];
    if (target) board.setActive(target.id);
  }

  function suggest() {
    if (!active) return;
    startSuggest(() => board.suggest(active.id));
  }

  return (
    <div className="mx-auto flex h-full max-w-[520px] flex-col bg-shell">
      <PageHeader title="Frases" />

      <ScenarioTabs
        scenarios={board.scenarios}
        activeId={active?.id ?? null}
        onSelect={board.setActive}
        onEditActive={() => setEditScenario(true)}
        onAdd={() => setScenarioModal(true)}
      />

      {!active ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-page px-6 text-center">
          <p className="text-[16px] text-muted">
            No scenarios yet. Start your first one.
          </p>
          <button
            onClick={() => setScenarioModal(true)}
            className="press rounded-full bg-ink px-5 py-3 text-[16px] font-bold text-on-ink shadow-[0_6px_0_var(--ink-shadow)]"
          >
            + New Scenario
          </button>
        </main>
      ) : (
        <main className="min-h-0 flex-1 overflow-y-auto bg-page px-[18px] pt-[18px] pb-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              drag="x"
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) switchBy(1);
                else if (info.offset.x > 60) switchBy(-1);
              }}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="flex flex-col gap-5"
            >
              {/* A fixed id: dnd-kit otherwise numbers its contexts from a
                  module counter, which lands on a different number on the
                  server than on the client and breaks hydration on the
                  aria-describedby it hands to every draggable. */}
              <DndContext
                id="notebook-board"
                sensors={sensors}
                collisionDetection={closestCorners}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={categories.map((category) => category.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {categories.map((category, index) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      phrases={byCategory.get(category.id) ?? []}
                      categories={categories}
                      index={index}
                      // One card carries the accent so the stack has a focal
                      // point; the rest stay light.
                      tone={index === 0 ? "accent" : "light"}
                      newPhraseId={board.suggestedId}
                    />
                  ))}
                </SortableContext>

                <UncategorizedRow
                  phrases={uncategorized}
                  categories={categories}
                  newPhraseId={board.suggestedId}
                />
              </DndContext>

              <button
                onClick={() => setCategoryModal(true)}
                className="press w-full rounded-[18px] border-2 border-dashed border-dash py-2.5 text-[14px] font-bold text-faint"
                style={{ ["--press" as string]: "2px" }}
              >
                + New Category
              </button>

              {board.error && (
                <p className="text-[14px] font-bold text-accent" role="alert">
                  ! {board.error}{" "}
                  <button onClick={board.dismissError} className="underline">
                    dismiss
                  </button>
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      )}

      {active && (
        <footer className="bg-page px-[18px] pt-2.5 pb-3">
          {board.offline && (
            <div className="mb-1.5 text-center text-[12px] font-bold text-faint">
              offline — changes sync when you reconnect
            </div>
          )}
          {/* One floating element over the list. Manual entry is the everyday
              action and takes the wide half; the two AI affordances bracket it —
              a conversation on the left, a one-shot suggestion on the right. */}
          <div className="press flex overflow-hidden rounded-full shadow-[0_6px_0_var(--ink-shadow)]">
            <Link
              href="/frases/ask"
              aria-label="Ask Claude for phrases"
              title="Ask Claude for phrases"
              className="bg-ink px-5 py-4 text-[18px] font-bold text-ai"
            >
              ?
            </Link>
            <div className="w-px bg-on-ink/25" />
            <button
              onClick={() => setPhraseModal(true)}
              className="flex-1 bg-ink p-4 text-center text-[18px] font-bold text-on-ink"
            >
              + New Phrase
            </button>
            <div className="w-px bg-on-ink/25" />
            <button
              onClick={suggest}
              disabled={suggesting || board.offline}
              aria-label="Suggest one phrase with AI"
              title="Suggest one phrase"
              className="bg-ink px-5 py-4 text-[18px] font-bold text-ai disabled:opacity-50"
            >
              {/* The asterisk sits on the cap line, so nudge it onto the
                  label's optical centre. */}
              <span className="inline-block translate-y-[0.2em] text-[24px] leading-none">
                {suggesting ? "..." : "*"}
              </span>
            </button>
          </div>
        </footer>
      )}

      {active && (
        <>
          <NewPhraseModal
            open={phraseModal}
            onClose={() => setPhraseModal(false)}
            scenarioId={active.id}
            categories={categories}
          />
          <NewCategoryModal
            open={categoryModal}
            onClose={() => setCategoryModal(false)}
            scenarioId={active.id}
          />
          <EditScenarioModal
            open={editScenario}
            onClose={() => setEditScenario(false)}
            scenario={active}
          />
        </>
      )}

      <NewScenarioModal
        open={scenarioModal}
        onClose={() => setScenarioModal(false)}
      />
    </div>
  );
}

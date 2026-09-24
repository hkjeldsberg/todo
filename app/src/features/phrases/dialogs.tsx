"use client";

import { useState } from "react";
import Modal, { Chip, Field } from "@/design/Modal";
import { useBoard } from "@/features/phrases/store";
import { useReviewSet } from "@/features/phrases/review-set";
import type { Category, Scenario } from "@/features/phrases/types";

export function NewPhraseModal({
  open,
  onClose,
  scenarioId,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  scenarioId: string;
  categories: Category[];
}) {
  const { addPhrase } = useBoard();
  const [spanish, setSpanish] = useState("");
  const [translation, setTranslation] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  function submit() {
    if (!spanish.trim() || !translation.trim()) return;
    addPhrase({ scenarioId, categoryId, spanish, translation });
    setSpanish("");
    setTranslation("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Phrase">
      <div className="flex flex-col gap-4">
        <Field
          label="Spanish"
          autoFocus
          value={spanish}
          placeholder="e.g. La cuenta, por favor"
          onChange={(event) => setSpanish(event.target.value)}
        />
        <Field
          label="Translation"
          value={translation}
          placeholder="e.g. The check, please"
          onChange={(event) => setTranslation(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />

        <div>
          <div className="mb-1.5 text-[12px] font-bold text-faint">
            Category
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip
              active={categoryId === null}
              onClick={() => setCategoryId(null)}
            >
              Uncategorized
            </Chip>
            {categories.map((category) => (
              <Chip
                key={category.id}
                active={categoryId === category.id}
                onClick={() => setCategoryId(category.id)}
              >
                {category.name}
              </Chip>
            ))}
          </div>
        </div>

        <button
          onClick={submit}
          className="press self-end rounded-full bg-ink px-5 py-2 text-[15px] font-bold text-on-ink shadow-[0_4px_0_var(--ink-shadow)]"
          style={{ ["--press" as string]: "4px" }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

export function NewCategoryModal({
  open,
  onClose,
  scenarioId,
}: {
  open: boolean;
  onClose: () => void;
  scenarioId: string;
}) {
  const { addCategory } = useBoard();
  const [name, setName] = useState("");

  function submit() {
    const clean = name.trim();
    if (!clean) return;
    addCategory(scenarioId, clean);
    setName("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Category">
      <div className="flex flex-col gap-4">
        <Field
          label="Name"
          autoFocus
          value={name}
          placeholder="e.g. Ordering"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />
        <button
          onClick={submit}
          className="press self-end rounded-full bg-ink px-5 py-2 text-[15px] font-bold text-on-ink shadow-[0_4px_0_var(--ink-shadow)]"
          style={{ ["--press" as string]: "4px" }}
        >
          Create Category
        </button>
      </div>
    </Modal>
  );
}

export function NewScenarioModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addScenario } = useBoard();
  const [name, setName] = useState("");

  function submit() {
    const clean = name.trim();
    if (!clean) return;
    addScenario(clean);
    setName("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Scenario">
      <div className="flex flex-col gap-4">
        <Field
          label="Name"
          autoFocus
          value={name}
          placeholder="e.g. At the Airport"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />

        <button
          onClick={submit}
          className="press self-start rounded-full bg-ink px-5 py-2 text-[15px] font-bold text-on-ink shadow-[0_4px_0_var(--ink-shadow)]"
          style={{ ["--press" as string]: "4px" }}
        >
          Create Scenario
        </button>
      </div>
    </Modal>
  );
}

export function EditScenarioModal({
  open,
  onClose,
  scenario,
}: {
  open: boolean;
  onClose: () => void;
  scenario: Scenario;
}) {
  const { renameScenario, removeScenario, phrases } = useBoard();
  const review = useReviewSet();
  const [name, setName] = useState(scenario.name);
  const [confirming, setConfirming] = useState(false);

  // Reopening on a different scenario must not show the previous one's values.
  const [source, setSource] = useState(scenario);
  if (source !== scenario) {
    setSource(scenario);
    setName(scenario.name);
    setConfirming(false);
  }

  function submit() {
    const clean = name.trim();
    if (!clean) return;
    renameScenario(scenario.id, clean);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Scenario">
      <div className="flex flex-col gap-4">
        <Field
          label="Name"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />

        {(() => {
          const ids = phrases
            .filter((phrase) => phrase.scenario_id === scenario.id)
            .map((phrase) => phrase.id);
          const missing = ids.filter((id) => !review.has(id)).length;
          return (
            <button
              onClick={() => review.addAll(ids)}
              disabled={missing === 0}
              className="self-start rounded-full bg-pill px-4 py-2 text-[14px] font-bold disabled:text-faint"
            >
              {ids.length === 0
                ? "No phrases to review yet"
                : missing === 0
                  ? "↻ All phrases are in Repaso"
                  : `↻ Add ${missing} phrase${missing === 1 ? "" : "s"} to Repaso`}
            </button>
          );
        })()}

        <div className="flex items-center justify-between gap-2">
          {confirming ? (
            <button
              onClick={() => {
                removeScenario(scenario.id);
                onClose();
              }}
              className="rounded-full bg-pill px-4 py-2 text-[14px] font-bold text-muted"
            >
              Delete everything in it?
            </button>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="px-1 text-[14px] font-bold text-faint"
            >
              Delete
            </button>
          )}
          <button
            onClick={submit}
            className="press rounded-full bg-ink px-5 py-2 text-[15px] font-bold text-on-ink shadow-[0_4px_0_var(--ink-shadow)]"
            style={{ ["--press" as string]: "4px" }}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function EditCategoryModal({
  open,
  onClose,
  category,
}: {
  open: boolean;
  onClose: () => void;
  category: Category;
}) {
  const { renameCategory } = useBoard();
  const [name, setName] = useState(category.name);

  const [source, setSource] = useState(category);
  if (source !== category) {
    setSource(category);
    setName(category.name);
  }

  function submit() {
    const clean = name.trim();
    if (!clean) return;
    renameCategory(category.id, clean);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Category">
      <div className="flex flex-col gap-4">
        <Field
          label="Name"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />
        <button
          onClick={submit}
          className="press self-end rounded-full bg-ink px-5 py-2 text-[15px] font-bold text-on-ink shadow-[0_4px_0_var(--ink-shadow)]"
          style={{ ["--press" as string]: "4px" }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

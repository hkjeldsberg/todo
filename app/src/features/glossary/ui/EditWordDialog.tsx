"use client";

import { useState } from "react";
import Modal, { Chip, Field } from "@/design/Modal";
import { draftOf } from "../draft";
import { POS_SHORT } from "../text";
import { GENDERS, POS, type Gender, type GlossaryWord, type WordDraft } from "../types";
import { ThemePicker } from "./bits";

const GENDER_LABEL: Record<Gender, string> = { m: "el (m)", f: "la (f)", mf: "el / la" };

/** Edit everything on a word. Saving marks it checked (I'm the checker now). */
export function EditWordDialog({
  word,
  themes,
  onClose,
  onSave,
}: {
  word: GlossaryWord | null;
  themes: string[];
  onClose: () => void;
  /** Resolves to an error message, or null when saved. */
  onSave: (word: GlossaryWord, draft: WordDraft) => Promise<string | null>;
}) {
  return (
    <Modal open={!!word} onClose={onClose} title="Edit word">
      {word && <EditForm key={word.id} word={word} themes={themes} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function EditForm({
  word,
  themes,
  onClose,
  onSave,
}: {
  word: GlossaryWord;
  themes: string[];
  onClose: () => void;
  onSave: (word: GlossaryWord, draft: WordDraft) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState<WordDraft>(() => {
    const d = draftOf(word);
    const examples = [...d.examples];
    while (examples.length < 2) examples.push({ es: "", en: "" });
    return { ...d, examples };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<WordDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const setExample = (i: number, key: "es" | "en", value: string) =>
    set({ examples: draft.examples.map((e, j) => (j === i ? { ...e, [key]: value } : e)) });

  async function submit() {
    if (!draft.spanish.trim() || !draft.english.trim() || busy) return;
    setBusy(true);
    setError(null);
    const examples = draft.examples.map((e) => ({ es: e.es.trim(), en: e.en.trim() })).filter((e) => e.es && e.en);
    // Hand edits make the entry final; an unchecked word with no type stays unchecked.
    const status = draft.pos ? "checked" : draft.status;
    const message = await onSave(word, { ...draft, examples, status });
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-3"
      data-testid="glossary-edit"
    >
      <Field label="Spanish" value={draft.spanish} onChange={(e) => set({ spanish: e.target.value })} lang="es" autoComplete="off" />
      <Field label="English" value={draft.english} onChange={(e) => set({ english: e.target.value })} autoComplete="off" />
      <Field label="Norsk" value={draft.norwegian ?? ""} onChange={(e) => set({ norwegian: e.target.value })} lang="nb" autoComplete="off" />
      <div>
        <span className="text-[12px] font-bold text-faint">Type</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {POS.map((pos) => (
            <Chip key={pos} active={draft.pos === pos} onClick={() => set({ pos, gender: pos === "noun" ? draft.gender : null })}>
              {POS_SHORT[pos]}
            </Chip>
          ))}
        </div>
      </div>
      {draft.pos === "noun" && (
        <div>
          <span className="text-[12px] font-bold text-faint">Gender</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {GENDERS.map((g) => (
              <Chip key={g} active={draft.gender === g} onClick={() => set({ gender: g })}>
                {GENDER_LABEL[g]}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <ThemePicker value={draft.themes} all={themes} onChange={(t) => set({ themes: t })} />
      {draft.examples.slice(0, 2).map((example, i) => (
        <fieldset key={i} className="flex flex-col gap-1.5 rounded-[14px] bg-pill-flat p-2.5">
          <legend className="px-1 text-[12px] font-bold text-faint">Example {i + 1}</legend>
          <input
            value={example.es}
            onChange={(e) => setExample(i, "es", e.target.value)}
            lang="es"
            aria-label={`Example ${i + 1}, Spanish`}
            placeholder="Spanish sentence"
            className="rounded-xl bg-card px-3 py-2 text-[15px] outline-none"
          />
          <input
            value={example.en}
            onChange={(e) => setExample(i, "en", e.target.value)}
            aria-label={`Example ${i + 1}, English`}
            placeholder="English"
            className="rounded-xl bg-card px-3 py-2 text-[15px] outline-none"
          />
        </fieldset>
      ))}
      {error && <p role="alert" className="text-[14px] font-bold text-accent">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="min-h-12 flex-1 rounded-full bg-pill text-[15px] font-bold">
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || !draft.spanish.trim() || !draft.english.trim()}
          className="min-h-12 flex-[2] rounded-full bg-ink text-[16px] font-extrabold text-on-ink disabled:bg-pill-flat disabled:text-faint"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

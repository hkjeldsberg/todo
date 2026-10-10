"use client";

import { useState } from "react";
import Modal, { Field } from "@/design/Modal";
import { checkNewWord, createWord, type SaveOutcome } from "../actions";
import { draftFromCheck, uncheckedDraft } from "../draft";
import { genderLabel, POS_SHORT } from "../text";
import type { CheckResult, GlossaryWord } from "../types";
import { ExampleLine, ThemePicker } from "./bits";

type Props = {
  open: boolean;
  themes: string[];
  /** Words already in the list, for the instant duplicate check. */
  findExisting: (spanish: string) => GlossaryWord | undefined;
  onClose: () => void;
  /** A new word was saved (open its card). `notice` explains anything unusual. */
  onSaved: (word: GlossaryWord, notice: string | null) => void;
  /** The word is already in the glossary (open that card instead). */
  onDuplicate: (word: GlossaryWord) => void;
};

/** PRD §3.3: type the word and a guess, Claude checks it, then save. */
export function AddWordDialog({ open, themes, findExisting, onClose, onSaved, onDuplicate }: Props) {
  const [spanish, setSpanish] = useState("");
  const [guess, setGuess] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [busy, setBusy] = useState<"check" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setSpanish("");
    setGuess("");
    setPicked([]);
    setResult(null);
    setBusy(null);
    setError(null);
  }

  function close() {
    reset();
    onClose();
  }

  function finish(outcome: SaveOutcome, notice: string | null) {
    reset();
    if (outcome.kind === "duplicate") onDuplicate(outcome.word);
    else onSaved(outcome.word, notice);
  }

  async function check() {
    const s = spanish.trim();
    const g = guess.trim();
    if (!s || !g || busy) return;
    const known = findExisting(s);
    if (known) {
      reset();
      onDuplicate(known);
      return;
    }
    setBusy("check");
    setError(null);
    try {
      const outcome = await checkNewWord(s, g, themes);
      if (outcome.kind === "duplicate") {
        reset();
        onDuplicate(outcome.word);
      } else if (outcome.kind === "unavailable") {
        // Nothing typed is lost: save as is, check later.
        finish(await createWord(uncheckedDraft(s, g, picked)), "Saved without a check. Claude will check it next time the list opens.");
      } else if (!outcome.result.spellingFixed) {
        // Nothing to decide: save Claude's checked entry straight away.
        finish(await createWord(draftFromCheck(outcome.result, g, withSuggestion(picked, outcome.result))), null);
      } else {
        // Claude spelled the word differently: confirm which one to keep.
        setResult(outcome.result);
        setPicked(withSuggestion(picked, outcome.result));
        setBusy(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      setBusy(null);
    }
  }

  async function save(keepMySpelling: boolean) {
    if (!result) return;
    setBusy("save");
    setError(null);
    try {
      const draft = draftFromCheck(result, guess.trim(), picked);
      if (keepMySpelling) draft.spanish = spanish.trim();
      finish(await createWord(draft), null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      setBusy(null);
    }
  }

  return (
    <Modal open={open} onClose={close} title={result ? "Check the spelling" : "Add a word"}>
      {!result ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void check();
          }}
          className="flex flex-col gap-3"
        >
          <Field label="Spanish" value={spanish} onChange={(e) => setSpanish(e.target.value)} lang="es" autoFocus autoComplete="off" autoCapitalize="off" placeholder="la mesa" />
          <Field label="My translation" value={guess} onChange={(e) => setGuess(e.target.value)} autoComplete="off" placeholder="table" />
          <ThemePicker value={picked} all={themes} onChange={setPicked} />
          {error && <p role="alert" className="text-[14px] font-bold text-accent">{error}</p>}
          <button
            type="submit"
            disabled={!spanish.trim() || !guess.trim() || busy !== null}
            className="press mt-1 min-h-12 rounded-full bg-ink text-[16px] font-extrabold text-on-ink shadow-[0_5px_0_var(--ink-shadow)] disabled:bg-pill-flat disabled:text-faint disabled:shadow-none"
          >
            {busy === "check" ? "Checking…" : busy === "save" ? "Saving…" : "Check"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3" data-testid="glossary-check">
          <p className="text-[15px]">
            Did you mean <b lang="es">{result.spanish}</b>? You typed <i lang="es">{spanish.trim()}</i>.
          </p>
          <div>
            <p lang="es" className="text-[22px] font-extrabold">{result.spanish}</p>
            <p className="text-[13px] text-muted">{[POS_SHORT[result.pos], genderLabel(result.gender)].filter(Boolean).join(", ")}</p>
            <p className="mt-1 text-[16px]"><b className="text-faint">English</b> {result.english}</p>
            <p className="text-[16px]"><b className="text-faint">Norsk</b> {result.norwegian}</p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {result.examples.map((example) => (
              <ExampleLine key={example.es} example={example} spanish={result.spanish} />
            ))}
          </ul>
          <ThemePicker value={picked} all={themes} onChange={setPicked} suggestion={result.themeSuggestion} />
          {error && <p role="alert" className="text-[14px] font-bold text-accent">{error}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy !== null} onClick={() => save(true)} className="min-h-12 flex-1 rounded-full bg-pill text-[14px] font-bold">
              Keep “{spanish.trim()}”
            </button>
            <button type="button" disabled={busy !== null} onClick={() => save(false)} className="min-h-12 flex-[1.4] rounded-full bg-ink text-[15px] font-extrabold text-on-ink">
              {busy === "save" ? "Saving…" : `Save “${result.spanish}”`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Pre-select Claude's theme suggestion when I didn't pick one. */
function withSuggestion(picked: string[], result: CheckResult): string[] {
  return picked.length === 0 && result.themeSuggestion ? [result.themeSuggestion] : picked;
}

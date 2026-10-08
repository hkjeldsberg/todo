import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckResult } from "@/features/glossary/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ requireSession: async () => {} }));
const ai = vi.hoisted(() => ({ result: null as CheckResult | null }));
vi.mock("@/features/glossary/ai-core", () => ({
  checkWithClaude: async () => ai.result,
  examplesWithClaude: async () => null,
}));

const actions = await import("@/features/glossary/actions");
const { store } = await import("@/features/glossary/store");
const { uncheckedDraft } = await import("@/features/glossary/draft");

const ventana: CheckResult = {
  spanish: "la ventana",
  spellingFixed: true,
  english: "window",
  norwegian: "vindu",
  pos: "noun",
  gender: "f",
  verdict: "correct",
  note: "",
  examples: [
    { es: "Abre la ventana, por favor.", en: "Open the window, please." },
    { es: "La ventana da al patio.", en: "The window looks onto the courtyard." },
  ],
  themeSuggestion: "en la casa",
};

describe("glossary actions", () => {
  beforeEach(() => {
    vi.stubEnv("GLOSSARY_STORE", "memory");
    delete (globalThis as Record<symbol, unknown>)[Symbol.for("todo.glossary.memory")];
    ai.result = null;
  });

  it("checks a new word, or reports a duplicate before and after the spelling fix", async () => {
    expect(await actions.checkNewWord("la Mesa", "table", [])).toMatchObject({ kind: "duplicate" });
    expect(await actions.checkNewWord("ventanna", "window", [])).toEqual({ kind: "unavailable" });
    ai.result = ventana;
    expect(await actions.checkNewWord("ventanna", "window", [])).toEqual({ kind: "checked", result: ventana });
    ai.result = { ...ventana, spanish: "el árbol" };
    expect(await actions.checkNewWord("arbool", "tree", [])).toMatchObject({ kind: "duplicate", word: { spanish: "el árbol" } });
  });

  it("re-checks an unchecked word: my stored English becomes the guess, Claude's entry replaces it", async () => {
    const saved = await store().insert(uncheckedDraft("ventanna", "window", []));
    expect(await actions.recheckWord(saved.id)).toBeNull(); // Claude still down: left alone
    expect((await store().get(saved.id))?.status).toBe("unchecked");
    ai.result = ventana;
    const checked = await actions.recheckWord(saved.id);
    expect(checked).toMatchObject({
      spanish: "la ventana",
      english: "window",
      norwegian: "vindu",
      myGuess: "window",
      status: "checked",
      themes: ["en la casa"],
    });
    expect(checked?.examples).toHaveLength(2);
  });

  it("keeps my spelling on re-check when the corrected word already exists", async () => {
    const saved = await store().insert(uncheckedDraft("mesaa", "table", []));
    ai.result = { ...ventana, spanish: "la mesa", english: "table", norwegian: "bord" };
    expect(await actions.recheckWord(saved.id)).toMatchObject({ spanish: "mesaa", status: "checked", norwegian: "bord" });
  });

  it("edits, refuses an edit into a duplicate, and deletes", async () => {
    const { words } = await store().list();
    const cafe = words.find((w) => w.spanish === "el café")!;
    const edited = await actions.updateWord(cafe.id, { ...cafe, english: "coffee (drink)" });
    expect(edited).toMatchObject({ kind: "saved", word: { english: "coffee (drink)" } });
    expect(await actions.updateWord(cafe.id, { ...cafe, spanish: "el agua" })).toMatchObject({ kind: "duplicate" });
    await expect(actions.updateWord(cafe.id, { ...cafe, spanish: "" })).rejects.toThrow();
    await actions.deleteWord(cafe.id);
    expect(await store().get(cafe.id)).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { DuplicateWordError, isMemoryStore, store } = await import("@/features/glossary/store");
const { uncheckedDraft, draftOf } = await import("@/features/glossary/draft");

describe("glossary memory store (dev playtests)", () => {
  beforeEach(() => {
    vi.stubEnv("GLOSSARY_STORE", "memory");
    delete (globalThis as Record<symbol, unknown>)[Symbol.for("todo.glossary.memory")];
  });

  it("is only used when asked for, and never in production", () => {
    expect(isMemoryStore()).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(isMemoryStore()).toBe(false);
    vi.unstubAllEnvs();
    expect(isMemoryStore()).toBe(false);
  });

  it("starts with the ten seed words and their themes", async () => {
    const { words, themes } = await store().list();
    expect(words).toHaveLength(10);
    expect(themes).toEqual(["en el nutricionista", "en la calle", "en la casa", "en la tienda", "sentimientos"]);
  });

  it("adds, refuses duplicates (accent/article-insensitive), edits and deletes", async () => {
    const s = store();
    const silla = await s.insert(uncheckedDraft("la silla", "chair", ["en la casa"]));
    expect((await s.list()).words).toHaveLength(11);
    await expect(s.insert(uncheckedDraft("Silla", "seat", []))).rejects.toBeInstanceOf(DuplicateWordError);
    await expect(s.insert(uncheckedDraft("el arbol", "tree", []))).rejects.toThrow(/already in the glossary/);

    const edited = await s.update(silla.id, { ...draftOf(silla), english: "chair (seat)", pos: "noun", gender: "f", status: "checked" });
    expect(edited).toMatchObject({ english: "chair (seat)", status: "checked", createdAt: silla.createdAt });
    const mesa = (await s.list()).words.find((w) => w.spanish === "la mesa")!;
    await expect(s.update(silla.id, { ...draftOf(edited), spanish: "la Mesa" })).rejects.toBeInstanceOf(DuplicateWordError);
    expect(mesa).toBeDefined();

    const redated = await s.update(silla.id, { ...draftOf(edited), date: "2026-09-14" });
    expect(redated.createdAt).toBe("2026-09-14T12:00:00.000Z");
    expect((await s.update(silla.id, draftOf(redated))).createdAt).toBe(redated.createdAt);

    const archived = await s.setArchived(silla.id, true);
    expect(archived.archivedAt).not.toBeNull();
    expect((await s.list()).words.find((w) => w.id === silla.id)?.archivedAt).toBe(archived.archivedAt);
    // an archived word still blocks a duplicate, so re-adding it finds the archived one
    await expect(s.insert(uncheckedDraft("la silla", "chair", []))).rejects.toBeInstanceOf(DuplicateWordError);
    expect((await s.setArchived(silla.id, false)).archivedAt).toBeNull();

    await s.addToReview(silla.id);
    expect((await s.get(silla.id))?.inReview).toBe(true);
    await s.remove(silla.id);
    expect(await s.get(silla.id)).toBeNull();
    expect((await s.list()).words).toHaveLength(10);
  });
});

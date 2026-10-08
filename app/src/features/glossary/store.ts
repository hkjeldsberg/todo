import "server-only";
import { randomUUID } from "node:crypto";
import seed from "@/content/glossary-seed.json";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { spanishKey } from "./text";
import type { GlossaryWord, WordDraft } from "./types";

/**
 * Where glossary words live. Supabase in normal use; `GLOSSARY_STORE=memory`
 * (dev only) keeps them in this process, seeded with the ten starter words, so
 * the page can be played with before migration 0010 is run.
 */
export type Store = {
  list(): Promise<{ words: GlossaryWord[]; themes: string[] }>;
  get(id: string): Promise<GlossaryWord | null>;
  findByKey(key: string): Promise<GlossaryWord | null>;
  insert(draft: WordDraft, source?: "manual" | "import"): Promise<GlossaryWord>;
  update(id: string, draft: WordDraft): Promise<GlossaryWord>;
  remove(id: string): Promise<void>;
  addToReview(id: string): Promise<void>;
};

export class DuplicateWordError extends Error {
  constructor(public existing: GlossaryWord) {
    super(`“${existing.spanish}” is already in the glossary`);
  }
}

export function isMemoryStore(): boolean {
  return process.env.GLOSSARY_STORE === "memory" && process.env.NODE_ENV !== "production";
}

// ── Supabase ────────────────────────────────────────────────────────────────

const WORD_COLUMNS =
  "id, spanish, english, norwegian, pos, gender, my_guess, guess_verdict, guess_note, examples, status, source, created_at, glossary_word_themes(glossary_themes(name))";

type ThemeRef = { name: string } | { name: string }[] | null;
type Row = Record<string, unknown> & { glossary_word_themes?: { glossary_themes: ThemeRef }[] };

function fromRow(row: Row, inReview: boolean): GlossaryWord {
  return {
    id: row.id as string,
    spanish: row.spanish as string,
    english: row.english as string,
    norwegian: (row.norwegian as string | null) ?? null,
    pos: (row.pos as GlossaryWord["pos"]) ?? null,
    gender: (row.gender as GlossaryWord["gender"]) ?? null,
    myGuess: (row.my_guess as string | null) ?? null,
    verdict: (row.guess_verdict as GlossaryWord["verdict"]) ?? null,
    note: (row.guess_note as string | null) ?? null,
    examples: (row.examples as GlossaryWord["examples"]) ?? [],
    status: row.status as GlossaryWord["status"],
    source: row.source as GlossaryWord["source"],
    themes: (row.glossary_word_themes ?? [])
      // many-to-one embeds come back as an object; untyped clients think it's an array
      .flatMap((link) => [link.glossary_themes ?? []].flat().map((t) => t.name))
      .filter(Boolean)
      .sort(),
    inReview,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

function toRow(draft: WordDraft) {
  return {
    spanish: draft.spanish.trim(),
    spanish_key: spanishKey(draft.spanish),
    english: draft.english.trim(),
    norwegian: draft.norwegian?.trim() || null,
    pos: draft.pos,
    gender: draft.gender,
    my_guess: draft.myGuess?.trim() || null,
    guess_verdict: draft.verdict,
    guess_note: draft.note?.trim() || null,
    examples: draft.examples,
    status: draft.status,
  };
}

const supabaseStore: Store = {
  async list() {
    const user_id = currentUserId();
    const [words, themes, review] = await Promise.all([
      db().from("glossary_words").select(WORD_COLUMNS).eq("user_id", user_id).limit(5000),
      db().from("glossary_themes").select("name").eq("user_id", user_id),
      db().from("srs_items").select("ref").eq("user_id", user_id).eq("kind", "glossary"),
    ]);
    if (words.error) throw new Error(words.error.message);
    if (themes.error) throw new Error(themes.error.message);
    if (review.error) throw new Error(review.error.message);
    const inReview = new Set((review.data ?? []).map((r) => (r.ref as string).slice("glossary:".length)));
    return {
      words: (words.data as unknown as Row[]).map((row) => fromRow(row, inReview.has(row.id as string))),
      themes: (themes.data ?? []).map((t) => t.name as string).sort(),
    };
  },

  async get(id) {
    const { data, error } = await db().from("glossary_words").select(WORD_COLUMNS).eq("user_id", currentUserId()).eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const { count } = await db()
      .from("srs_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUserId())
      .eq("kind", "glossary")
      .eq("ref", `glossary:${id}`);
    return fromRow(data as unknown as Row, (count ?? 0) > 0);
  },

  async findByKey(key) {
    const { data, error } = await db().from("glossary_words").select("id").eq("user_id", currentUserId()).eq("spanish_key", key).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? this.get(data.id as string) : null;
  },

  async insert(draft, source = "manual") {
    const existing = await this.findByKey(spanishKey(draft.spanish));
    if (existing) throw new DuplicateWordError(existing);
    const { data, error } = await db()
      .from("glossary_words")
      .insert({ ...toRow(draft), source, user_id: currentUserId() })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await setThemes(data.id as string, draft.themes);
    return (await this.get(data.id as string))!;
  },

  async update(id, draft) {
    const existing = await this.findByKey(spanishKey(draft.spanish));
    if (existing && existing.id !== id) throw new DuplicateWordError(existing);
    const { error } = await db()
      .from("glossary_words")
      .update({ ...toRow(draft), updated_at: new Date().toISOString() })
      .eq("user_id", currentUserId())
      .eq("id", id);
    if (error) throw new Error(error.message);
    await setThemes(id, draft.themes);
    await dropUnusedThemes();
    return (await this.get(id))!;
  },

  async remove(id) {
    // The delete trigger takes the Repaso card with it.
    const { error } = await db().from("glossary_words").delete().eq("user_id", currentUserId()).eq("id", id);
    if (error) throw new Error(error.message);
    await dropUnusedThemes();
  },

  async addToReview(id) {
    const { error } = await db()
      .from("srs_items")
      .upsert(
        { user_id: currentUserId(), kind: "glossary", ref: `glossary:${id}`, source: "glosario", box: 1, next_review_at: new Date().toISOString() },
        { onConflict: "user_id,kind,ref", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
  },
};

/** Replaces a word's themes, creating any new theme names. */
async function setThemes(wordId: string, names: string[]) {
  const user_id = currentUserId();
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const { error: clearError } = await db().from("glossary_word_themes").delete().eq("word_id", wordId);
  if (clearError) throw new Error(clearError.message);
  if (unique.length === 0) return;
  const { data, error } = await db()
    .from("glossary_themes")
    .upsert(unique.map((name) => ({ user_id, name })), { onConflict: "user_id,name" })
    .select("id");
  if (error) throw new Error(error.message);
  const { error: linkError } = await db()
    .from("glossary_word_themes")
    .insert((data ?? []).map((t) => ({ word_id: wordId, theme_id: t.id as string })));
  if (linkError) throw new Error(linkError.message);
}

/** Themes no word uses any more disappear from the suggestions. */
async function dropUnusedThemes() {
  const user_id = currentUserId();
  const [themes, links] = await Promise.all([
    db().from("glossary_themes").select("id").eq("user_id", user_id),
    db().from("glossary_word_themes").select("theme_id"),
  ]);
  if (themes.error || links.error) return;
  const used = new Set((links.data ?? []).map((l) => l.theme_id as string));
  const unused = (themes.data ?? []).map((t) => t.id as string).filter((id) => !used.has(id));
  if (unused.length) await db().from("glossary_themes").delete().in("id", unused);
}

// ── in-memory (dev playtests) ───────────────────────────────────────────────

type Memory = { words: Map<string, GlossaryWord>; review: Set<string> };
const memoryKey = Symbol.for("todo.glossary.memory");

function memory(): Memory {
  const g = globalThis as unknown as Record<symbol, Memory | undefined>;
  if (!g[memoryKey]) {
    const words = new Map<string, GlossaryWord>();
    seed.words.forEach((w, i) => {
      const id = randomUUID();
      words.set(id, {
        id,
        spanish: w.spanish,
        english: w.english,
        norwegian: w.norwegian,
        pos: w.pos as GlossaryWord["pos"],
        gender: (w.gender as GlossaryWord["gender"]) ?? null,
        myGuess: w.my_guess,
        verdict: w.guess_verdict as GlossaryWord["verdict"],
        note: w.guess_note,
        examples: w.examples,
        status: "checked",
        source: "import",
        themes: [...w.themes].sort(),
        inReview: false,
        createdAt: new Date(Date.UTC(2026, 9, 1, 12, i)).toISOString(),
      });
    });
    g[memoryKey] = { words, review: new Set() };
  }
  return g[memoryKey]!;
}

function fromDraft(id: string, draft: WordDraft, base?: GlossaryWord): GlossaryWord {
  const m = memory();
  return {
    id,
    spanish: draft.spanish.trim(),
    english: draft.english.trim(),
    norwegian: draft.norwegian?.trim() || null,
    pos: draft.pos,
    gender: draft.gender,
    myGuess: draft.myGuess?.trim() || null,
    verdict: draft.verdict,
    note: draft.note?.trim() || null,
    examples: draft.examples,
    status: draft.status,
    source: base?.source ?? "manual",
    themes: [...new Set(draft.themes.map((t) => t.trim()).filter(Boolean))].sort(),
    inReview: m.review.has(id),
    createdAt: base?.createdAt ?? new Date().toISOString(),
  };
}

const memoryStore: Store = {
  async list() {
    const words = [...memory().words.values()].map((w) => ({ ...w, inReview: memory().review.has(w.id) }));
    return { words, themes: [...new Set(words.flatMap((w) => w.themes))].sort() };
  },
  async get(id) {
    const word = memory().words.get(id);
    return word ? { ...word, inReview: memory().review.has(id) } : null;
  },
  async findByKey(key) {
    return [...memory().words.values()].find((w) => spanishKey(w.spanish) === key) ?? null;
  },
  async insert(draft, source = "manual") {
    const existing = await this.findByKey(spanishKey(draft.spanish));
    if (existing) throw new DuplicateWordError(existing);
    const id = randomUUID();
    const word = { ...fromDraft(id, draft), source };
    memory().words.set(id, word);
    return word;
  },
  async update(id, draft) {
    const base = memory().words.get(id);
    if (!base) throw new Error("word not found");
    const existing = await this.findByKey(spanishKey(draft.spanish));
    if (existing && existing.id !== id) throw new DuplicateWordError(existing);
    const word = fromDraft(id, draft, base);
    memory().words.set(id, word);
    return word;
  },
  async remove(id) {
    memory().words.delete(id);
    memory().review.delete(id);
  },
  async addToReview(id) {
    memory().review.add(id);
  },
};

export function store(): Store {
  return isMemoryStore() ? memoryStore : supabaseStore;
}

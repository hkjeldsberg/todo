"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import PageHeader from "@/design/PageHeader";
import {
  deleteWord,
  recheckWord,
  regenerateExamples,
  setWordArchived,
  updateWord,
} from "../actions";
import {
  fold,
  groupWords,
  matches,
  POS_LABEL,
  sortWords,
  spanishKey,
} from "../text";
import {
  POS,
  type GlossaryWord,
  type GroupKey,
  type Pos,
  type SortKey,
  type WordDraft,
} from "../types";
import { AddWordDialog } from "./AddWordDialog";
import { PosChip } from "./bits";
import { EditWordDialog } from "./EditWordDialog";
import { WordSheet } from "./WordSheet";

const PREFS_KEY = "glosario:view";
/** Unchecked words re-sent to Claude per page load (PRD §3.3.6), one at a time. */
const RECHECK_PER_LOAD = 5;

type Filter =
  | { kind: "all" }
  | { kind: "unchecked" }
  | { kind: "pos"; pos: Pos }
  | { kind: "theme"; theme: string };

type Prefs = { sort: SortKey; group: GroupKey };
const DEFAULT_PREFS: Prefs = { sort: "spanish", group: "none" };
const PREFS_EVENT = "glosario:prefs";

function readPrefs(raw: string | null): Prefs {
  try {
    const value = JSON.parse(raw ?? "{}");
    return {
      sort: ["spanish", "english", "newest", "oldest"].includes(value.sort)
        ? value.sort
        : DEFAULT_PREFS.sort,
      group: ["none", "pos", "theme", "date"].includes(value.group)
        ? value.group
        : DEFAULT_PREFS.group,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function storedPrefs(): string | null {
  try {
    return window.localStorage.getItem(PREFS_KEY);
  } catch {
    return null;
  }
}

/** Sort/group remembered per device (PRD §3.4); the server render uses the defaults. */
function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const raw = useSyncExternalStore(
    (onChange) => {
      window.addEventListener(PREFS_EVENT, onChange);
      return () => window.removeEventListener(PREFS_EVENT, onChange);
    },
    storedPrefs,
    () => null,
  );
  const prefs = readPrefs(raw);
  const update = (patch: Partial<Prefs>) => {
    try {
      window.localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({ ...prefs, ...patch }),
      );
    } catch {}
    window.dispatchEvent(new Event(PREFS_EVENT));
  };
  return [prefs, update];
}

const sameFilter = (a: Filter, b: Filter) =>
  JSON.stringify(a) === JSON.stringify(b);

export function GlossaryView({
  initialWords,
  initialThemes,
  memory,
}: {
  initialWords: GlossaryWord[];
  initialThemes: string[];
  memory: boolean;
}) {
  const [words, setWords] = useState(initialWords);
  const [themeNames, setThemeNames] = useState(initialThemes);
  const [query, setQuery] = useState("");
  const [{ sort, group }, choose] = usePrefs();
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<GlossaryWord | null>(null);
  /** The archive: archived words, out of the way of the main list. */
  const [inArchive, setInArchive] = useState(false);
  const header = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Group headers stick just under the (variable-height) page header.
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeaderHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const upsert = useCallback((word: GlossaryWord) => {
    setWords((list) =>
      list.some((w) => w.id === word.id)
        ? list.map((w) => (w.id === word.id ? word : w))
        : [word, ...list],
    );
    setThemeNames((names) => [...new Set([...names, ...word.themes])].sort());
  }, []);

  // Words saved while Claude was down get checked now, a few per visit.
  useEffect(() => {
    const pending = initialWords
      .filter((w) => w.status === "unchecked" && !w.archivedAt)
      .slice(0, RECHECK_PER_LOAD);
    if (pending.length === 0) return;
    let cancelled = false;
    void (async () => {
      for (const word of pending) {
        if (cancelled) return;
        try {
          const checked = await recheckWord(word.id);
          if (!checked) return; // Claude still unavailable: try again next visit
          if (!cancelled) upsert(checked);
        } catch {
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialWords, upsert]);

  const open = words.find((w) => w.id === openId) ?? null;
  // Everything below works on one side: the glossary, or the archive.
  const archivedCount = words.filter((w) => w.archivedAt).length;
  const visible = useMemo(
    () => words.filter((w) => Boolean(w.archivedAt) === inArchive),
    [words, inArchive],
  );
  const unchecked = visible.filter((w) => w.status === "unchecked").length;
  const usedPos = POS.filter((pos) => visible.some((w) => w.pos === pos));
  const usedThemes = [...new Set(visible.flatMap((w) => w.themes))].sort(
    (a, b) => fold(a).localeCompare(fold(b), "es"),
  );

  const shown = useMemo(() => {
    const filtered = visible.filter((w) => {
      if (!matches(w, query)) return false;
      if (filter.kind === "unchecked") return w.status === "unchecked";
      if (filter.kind === "pos") return w.pos === filter.pos;
      if (filter.kind === "theme") return w.themes.includes(filter.theme);
      return true;
    });
    return sortWords(filtered, sort);
  }, [visible, query, filter, sort]);
  const groups = groupWords(shown, group, sort === "oldest");

  // Includes archived words: adding one again opens it so it can be restored.
  const findExisting = (spanish: string) =>
    words.find((w) => spanishKey(w.spanish) === spanishKey(spanish));
  const openWord = (word: GlossaryWord, message: string | null = null) => {
    setNotice(message);
    setOpenId(word.id);
  };

  async function saveEdit(
    word: GlossaryWord,
    draft: WordDraft,
  ): Promise<string | null> {
    try {
      const outcome = await updateWord(word.id, draft);
      if (outcome.kind === "duplicate")
        return `“${outcome.word.spanish}” is already in the glossary.`;
      upsert(outcome.word);
      setEditing(null);
      openWord(outcome.word, "Saved");
      return null;
    } catch (cause) {
      return cause instanceof Error ? cause.message : "Couldn't save";
    }
  }

  const switchView = (archive: boolean) => {
    setInArchive(archive);
    setFilter({ kind: "all" });
    setQuery("");
    document.getElementById("scroll-root")?.scrollTo({ top: 0 });
  };

  const filterChip = (label: string, value: Filter, count?: number) => {
    const on = sameFilter(filter, value);
    return (
      <button
        key={label}
        type="button"
        aria-pressed={on}
        onClick={() => setFilter(on ? { kind: "all" } : value)}
        className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold whitespace-nowrap ${on ? "bg-pill-deep text-ink" : "bg-card text-muted"}`}
      >
        {label}
        {count !== undefined && (
          <span className="ml-1 opacity-60">{count}</span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-full bg-page pb-28 lg:pb-12">
      <div ref={header} className="sticky top-0 z-30">
        <PageHeader
          title={inArchive ? "Archive" : "Glosario"}
          aside={
            <button
              type="button"
              onClick={() => setAdding(true)}
              className={`hidden rounded-full bg-ink px-4 py-2 text-[14px] font-extrabold text-on-ink ${inArchive ? "" : "lg:inline-block"}`}
            >
              + Add word
            </button>
          }
        >
          <div className="mx-auto mt-3 flex max-w-3xl flex-col gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Spanish, English or Norsk"
              aria-label="Search the glossary"
              className="min-h-11 w-full rounded-full bg-card px-4 text-[16px] shadow-[0_3px_0_var(--card-shadow)] outline-none"
            />
            <div className="flex items-center gap-2 text-[13px] font-bold text-muted">
              <label className="flex items-center gap-1">
                Sort
                <select
                  value={sort}
                  onChange={(e) => choose({ sort: e.target.value as SortKey })}
                  className="rounded-full bg-card px-2 py-1.5 text-ink"
                >
                  <option value="spanish">Spanish A–Z</option>
                  <option value="english">English A–Z</option>
                  <option value="newest">Date, newest</option>
                  <option value="oldest">Date, oldest</option>
                </select>
              </label>
              <label className="flex items-center gap-1">
                Group
                <select
                  value={group}
                  onChange={(e) =>
                    choose({ group: e.target.value as GroupKey })
                  }
                  className="rounded-full bg-card px-2 py-1.5 text-ink"
                >
                  <option value="none">None</option>
                  <option value="pos">Word type</option>
                  <option value="theme">Theme</option>
                  <option value="date">Date</option>
                </select>
              </label>
              <span
                className="ml-auto whitespace-nowrap"
                data-testid="glossary-count"
              >
                {shown.length === visible.length
                  ? `${visible.length} words`
                  : `${shown.length} of ${visible.length}`}
              </span>
            </div>
            {visible.length > 0 && (
              <div
                className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4"
                data-testid="glossary-filters"
              >
                {unchecked > 0 &&
                  filterChip("Unchecked", { kind: "unchecked" }, unchecked)}
                {usedPos.map((pos) =>
                  filterChip(POS_LABEL[pos], { kind: "pos", pos }),
                )}
                {usedThemes.map((theme) =>
                  filterChip(theme, { kind: "theme", theme }),
                )}
              </div>
            )}
          </div>
        </PageHeader>
      </div>

      <main className="mx-auto max-w-3xl px-4">
        {inArchive && (
          <button
            type="button"
            onClick={() => switchView(false)}
            className="mb-3 text-[14px] font-bold text-muted hover:text-ink"
            data-testid="glossary-archive-back"
          >
            ← Back to the glossary
          </button>
        )}
        {inArchive && visible.length === 0 ? (
          <p className="mt-12 text-center text-[15px] text-muted">
            Nothing archived.
          </p>
        ) : visible.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-[18px] font-bold">
              No words yet. Add your first one.
            </p>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-4 rounded-full bg-ink px-6 py-3 text-[16px] font-extrabold text-on-ink"
            >
              + Add word
            </button>
          </div>
        ) : shown.length === 0 ? (
          <p className="mt-12 text-center text-[15px] text-muted">
            Nothing matches “{query}”.
          </p>
        ) : (
          <div
            className="overflow-clip rounded-[22px] bg-card shadow-[0_6px_0_var(--card-shadow)]"
            data-testid="glossary-list"
          >
            <div className="grid grid-cols-2 gap-3 border-b-2 border-dash px-4 py-2 text-[12px] font-bold tracking-wider text-faint uppercase">
              <span>Español</span>
              <span>English</span>
            </div>
            {groups.map((g) => (
              <section key={g.key} aria-label={g.label || undefined}>
                {g.label && (
                  <h2
                    className="sticky z-10 flex items-baseline justify-between bg-pill-flat px-4 py-1.5 text-[13px] font-extrabold"
                    style={{ top: headerHeight }}
                  >
                    {g.label}
                    <span className="text-[12px] font-bold text-faint">
                      {g.words.length}
                    </span>
                  </h2>
                )}
                <ul>
                  {g.words.map((word) => (
                    <li
                      key={`${g.key}:${word.id}`}
                      className="border-b border-dash-card last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() => openWord(word)}
                        className="grid min-h-12 w-full grid-cols-2 items-center gap-3 px-4 py-2 text-left hover:bg-page"
                      >
                        <span
                          lang="es"
                          className="text-[16px] font-extrabold break-words"
                        >
                          {word.spanish}
                        </span>
                        <span className="flex items-center justify-between gap-2 text-[15px] break-words text-ink/80">
                          {word.english}
                          {word.status === "unchecked" && (
                            <PosChip pos={null} />
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        {/* The way into the archive: deliberately quiet. */}
        {!inArchive && archivedCount > 0 && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => switchView(true)}
              className="text-[13px] text-faint underline-offset-4 hover:text-muted hover:underline"
              data-testid="glossary-archive-link"
            >
              Archive ({archivedCount})
            </button>
          </div>
        )}
        {memory && (
          <p className="mt-6 text-center text-[12px] text-faint">
            dev: in-memory glossary (GLOSSARY_STORE=memory)
          </p>
        )}
      </main>

      {/* phones: floating Add, clear of the tab bar (not in the archive) */}
      {!inArchive && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="Add word"
          className="press fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 min-h-14 rounded-full bg-ink px-5 text-[16px] font-extrabold text-on-ink shadow-[0_5px_0_var(--ink-shadow)] lg:hidden"
        >
          + Add
        </button>
      )}

      <AddWordDialog
        open={adding}
        themes={themeNames}
        findExisting={findExisting}
        onClose={() => setAdding(false)}
        onSaved={(word, message) => {
          setAdding(false);
          upsert(word);
          openWord(word, message);
        }}
        onDuplicate={(word) => {
          setAdding(false);
          openWord(
            word,
            word.archivedAt
              ? "It's in your archive. Restore it to bring it back."
              : "Already in your glossary",
          );
        }}
      />
      <WordSheet
        word={editing ? null : open}
        notice={notice}
        onClose={() => setOpenId(null)}
        onEdit={(word) => setEditing(word)}
        onArchive={async (word, archived) => {
          upsert(await setWordArchived(word.id, archived));
          setOpenId(null);
        }}
        onDelete={async (word) => {
          await deleteWord(word.id);
          setOpenId(null);
          setWords((list) => list.filter((w) => w.id !== word.id));
        }}
        onRegenerate={async (word) => {
          const updated = await regenerateExamples(word.id);
          if (!updated) return false;
          upsert(updated);
          return true;
        }}
      />
      <EditWordDialog
        word={editing}
        themes={themeNames}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
      />
    </div>
  );
}

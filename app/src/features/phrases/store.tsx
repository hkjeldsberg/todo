"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Category, Phrase, Scenario } from "@/features/phrases/types";
import * as server from "@/features/phrases/actions";

export type Snapshot = {
  scenarios: Scenario[];
  categories: Category[];
  phrases: Phrase[];
};

const CACHE_KEY = "todo.snapshot.v1";
const ACTIVE_KEY = "todo.active.v1";
const COLLAPSED_KEY = "todo.collapsed.v1";

/** Key of the implicit bucket for phrases with no category. */
export const UNCATEGORIZED = "uncategorized";

/**
 * The notebook lives in the client. The server render seeds it once; after that
 * every read (tab switch, expand, filter) is local, and writes go out in the
 * background while the UI already shows the result.
 */
type Board = {
  scenarios: Scenario[];
  categories: Category[];
  phrases: Phrase[];
  activeId: string | null;
  offline: boolean;
  error: string | null;
  dismissError: () => void;
  setActive: (id: string) => void;
  addScenario: (name: string) => void;
  renameScenario: (id: string, name: string) => void;
  removeScenario: (id: string) => void;
  addCategory: (scenarioId: string, name: string) => void;
  renameCategory: (id: string, name: string) => void;
  removeCategory: (id: string) => void;
  setCategoryOrder: (ids: string[]) => void;
  addPhrase: (input: {
    scenarioId: string;
    categoryId: string | null;
    spanish: string;
    translation: string;
  }) => void;
  editPhrase: (input: {
    id: string;
    spanish: string;
    translation: string;
    scenarioId: string;
    categoryId: string | null;
  }) => void;
  removePhrase: (id: string) => void;
  /** Drop a phrase at `index` of `categoryId` (null = the uncategorized bucket). */
  movePhrase: (
    phraseId: string,
    categoryId: string | null,
    index: number,
  ) => void;
  suggest: (scenarioId: string) => Promise<void>;
  suggestedId: string | null;
  /** Collapsed cards, keyed by category id or UNCATEGORIZED. */
  collapsed: Record<string, boolean>;
  toggleCollapsed: (key: string) => void;
};

const BoardContext = createContext<Board | null>(null);

function readCache(): Snapshot | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

export function BoardProvider({
  initial,
  children,
}: {
  initial: Snapshot;
  children: React.ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot>(initial);
  const [activeId, setActiveId] = useState<string | null>(
    initial.scenarios[0]?.id ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [suggestedId, setSuggestedId] = useState<string | null>(null);
  // The uncategorized bucket starts closed; cards start open.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    [UNCATEGORIZED]: true,
  });
  const hydrated = useRef(false);

  /* Restoring from localStorage has to happen after mount: reading it during
     render would diverge from the server-rendered HTML and break hydration.
     This is external-store sync, not state derived from props. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    if (initial.scenarios.length === 0) {
      const cached = readCache();
      if (cached && cached.scenarios.length > 0) setSnapshot(cached);
    }

    const lastActive = window.localStorage.getItem(ACTIVE_KEY);
    if (lastActive) setActiveId(lastActive);

    try {
      const stored = window.localStorage.getItem(COLLAPSED_KEY);
      if (stored) setCollapsed(JSON.parse(stored) as Record<string, boolean>);
    } catch {
      // Corrupt value — fall back to the defaults above.
    }
  }, [initial]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist for the next cold start.
  useEffect(() => {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
    } catch {
      // Quota or private mode — the cache is an optimization, never required.
    }
  }, [snapshot]);

  useEffect(() => {
    if (activeId) window.localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed));
    } catch {
      // Same as the snapshot cache: nice to have, never required.
    }
  }, [collapsed]);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  /**
   * Apply an optimistic change, then sync. If the write fails the snapshot is
   * rolled back to exactly what it was before, so the UI never drifts.
   */
  const commit = useCallback(
    (apply: (current: Snapshot) => Snapshot, sync: () => Promise<unknown>) => {
      let rollback: Snapshot | null = null;
      setSnapshot((current) => {
        rollback = current;
        return apply(current);
      });

      void sync().catch((cause: unknown) => {
        if (rollback) setSnapshot(rollback);
        setError(cause instanceof Error ? cause.message : "Sync failed");
      });
    },
    [],
  );

  const value = useMemo<Board>(() => {
    const tempId = () => `temp-${crypto.randomUUID()}`;
    const bucketSize = (
      phrases: Phrase[],
      scenarioId: string,
      categoryId: string | null,
    ) =>
      phrases.filter(
        (phrase) =>
          phrase.scenario_id === scenarioId &&
          phrase.category_id === categoryId,
      ).length;
    const now = () => new Date().toISOString();

    /** Swap an optimistic row's temporary id for the one the database assigned. */
    const swap = <T extends { id: string }>(rows: T[], temp: string, row: T) =>
      rows.map((item) => (item.id === temp ? row : item));

    return {
      ...snapshot,
      activeId,
      offline,
      error,
      suggestedId,
      collapsed,
      toggleCollapsed: (key) =>
        setCollapsed((current) => ({ ...current, [key]: !current[key] })),
      dismissError: () => setError(null),
      setActive: (id) => setActiveId(id),

      addScenario: (name) => {
        const temp = tempId();
        const optimistic: Scenario = {
          id: temp,
          name: name.trim(),
          sort_order: snapshot.scenarios.length,
          created_at: now(),
        };
        setActiveId(temp);
        commit(
          (current) => ({
            ...current,
            scenarios: [...current.scenarios, optimistic],
          }),
          async () => {
            const row = await server.createScenario(name);
            setSnapshot((current) => ({
              ...current,
              scenarios: swap(current.scenarios, temp, row),
            }));
            setActiveId((current) => (current === temp ? row.id : current));
          },
        );
      },

      renameScenario: (id, name) =>
        commit(
          (current) => ({
            ...current,
            scenarios: current.scenarios.map((scenario) =>
              scenario.id === id
                ? { ...scenario, name: name.trim() }
                : scenario,
            ),
          }),
          () => server.renameScenario(id, name),
        ),

      removeScenario: (id) => {
        const remaining = snapshot.scenarios.filter(
          (scenario) => scenario.id !== id,
        );
        setActiveId(remaining[0]?.id ?? null);
        commit(
          (current) => ({
            scenarios: current.scenarios.filter(
              (scenario) => scenario.id !== id,
            ),
            // Mirrors ON DELETE CASCADE in the schema.
            categories: current.categories.filter(
              (category) => category.scenario_id !== id,
            ),
            phrases: current.phrases.filter(
              (phrase) => phrase.scenario_id !== id,
            ),
          }),
          () => server.deleteScenario(id),
        );
      },

      renameCategory: (id, name) =>
        commit(
          (current) => ({
            ...current,
            categories: current.categories.map((category) =>
              category.id === id
                ? { ...category, name: name.trim() }
                : category,
            ),
          }),
          () => server.renameCategory(id, name),
        ),

      addCategory: (scenarioId, name) => {
        const temp = tempId();
        const optimistic: Category = {
          id: temp,
          scenario_id: scenarioId,
          name: name.trim(),
          sort_order: snapshot.categories.filter(
            (category) => category.scenario_id === scenarioId,
          ).length,
          created_at: now(),
        };
        commit(
          (current) => ({
            ...current,
            categories: [...current.categories, optimistic],
          }),
          async () => {
            const row = await server.createCategory(scenarioId, name);
            setSnapshot((current) => ({
              ...current,
              categories: swap(current.categories, temp, row),
            }));
          },
        );
      },

      removeCategory: (id) =>
        commit(
          (current) => ({
            ...current,
            categories: current.categories.filter(
              (category) => category.id !== id,
            ),
            // Matches the schema's ON DELETE SET NULL.
            phrases: current.phrases.map((phrase) =>
              phrase.category_id === id
                ? { ...phrase, category_id: null }
                : phrase,
            ),
          }),
          () => server.deleteCategory(id),
        ),

      setCategoryOrder: (ids) =>
        commit(
          (current) => ({
            ...current,
            categories: current.categories.map((category) => {
              const index = ids.indexOf(category.id);
              return index < 0 ? category : { ...category, sort_order: index };
            }),
          }),
          () => server.reorderCategories(ids),
        ),

      addPhrase: (input) => {
        const temp = tempId();
        const optimistic: Phrase = {
          id: temp,
          scenario_id: input.scenarioId,
          category_id: input.categoryId,
          spanish_text: input.spanish.trim(),
          translation_text: input.translation.trim(),
          sort_order: bucketSize(
            snapshot.phrases,
            input.scenarioId,
            input.categoryId,
          ),
          created_at: now(),
        };
        commit(
          (current) => ({
            ...current,
            phrases: [...current.phrases, optimistic],
          }),
          async () => {
            const row = await server.createPhrase(input);
            setSnapshot((current) => ({
              ...current,
              phrases: swap(current.phrases, temp, row),
            }));
          },
        );
      },

      editPhrase: (input) =>
        commit(
          (current) => ({
            ...current,
            phrases: current.phrases.map((phrase) =>
              phrase.id === input.id
                ? {
                    ...phrase,
                    spanish_text: input.spanish.trim(),
                    translation_text: input.translation.trim(),
                    scenario_id: input.scenarioId,
                    category_id: input.categoryId,
                    sort_order: bucketSize(
                      current.phrases.filter((row) => row.id !== input.id),
                      input.scenarioId,
                      input.categoryId,
                    ),
                  }
                : phrase,
            ),
          }),
          () => server.updatePhrase(input),
        ),

      movePhrase: (phraseId, categoryId, index) => {
        const moving = snapshot.phrases.find((row) => row.id === phraseId);
        if (!moving) return;

        const scenarioId = moving.scenario_id;
        const bucket = (source: Phrase[], target: string | null) =>
          source
            .filter(
              (row) =>
                row.scenario_id === scenarioId &&
                row.category_id === target &&
                row.id !== phraseId,
            )
            .sort((a, b) => a.sort_order - b.sort_order);

        const destination = bucket(snapshot.phrases, categoryId);
        destination.splice(
          Math.max(0, Math.min(index, destination.length)),
          0,
          { ...moving, category_id: categoryId },
        );

        // Only the source and destination buckets renumber.
        const moves = [
          ...destination.map((row, position) => ({
            id: row.id,
            categoryId,
            sortOrder: position,
          })),
          ...(moving.category_id === categoryId
            ? []
            : bucket(snapshot.phrases, moving.category_id).map(
                (row, position) => ({
                  id: row.id,
                  categoryId: moving.category_id,
                  sortOrder: position,
                }),
              )),
        ];

        const byId = new Map(moves.map((move) => [move.id, move]));
        commit(
          (current) => ({
            ...current,
            phrases: current.phrases.map((phrase) => {
              const move = byId.get(phrase.id);
              return move
                ? {
                    ...phrase,
                    category_id: move.categoryId,
                    sort_order: move.sortOrder,
                  }
                : phrase;
            }),
          }),
          () => server.reorderPhrases(moves),
        );
      },

      removePhrase: (id) =>
        commit(
          (current) => ({
            ...current,
            phrases: current.phrases.filter((phrase) => phrase.id !== id),
          }),
          () => server.deletePhrase(id),
        ),

      suggest: async (scenarioId) => {
        setError(null);
        try {
          const row = await server.suggestPhraseAction(scenarioId);
          setSnapshot((current) => ({
            ...current,
            phrases: [...current.phrases, row],
          }));
          setSuggestedId(row.id);
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "Suggestion failed",
          );
        }
      },
    };
  }, [snapshot, activeId, offline, error, suggestedId, collapsed, commit]);

  return <BoardContext value={value}>{children}</BoardContext>;
}

export function useBoard(): Board {
  const value = useContext(BoardContext);
  if (!value) throw new Error("useBoard must be used inside <BoardProvider>");
  return value;
}

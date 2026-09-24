"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { addPhrasesToReview, removePhraseFromReview } from "@/features/srs/actions";

type ReviewSet = {
  has(phraseId: string): boolean;
  toggle(phraseId: string): void;
  addAll(phraseIds: string[]): void;
  error: string | null;
};

const Context = createContext<ReviewSet | null>(null);

/**
 * Which phrases are queued in Repaso. Optimistic like the board store: the mark
 * flips at once and rolls back if the server write fails.
 */
export function ReviewSetProvider({
  initial,
  children,
}: {
  initial: string[];
  children: React.ReactNode;
}) {
  const [ids, setIds] = useState(() => new Set(initial));
  const [error, setError] = useState<string | null>(null);

  const fail = useCallback((cause: unknown, rollback: () => void) => {
    rollback();
    setError(cause instanceof Error ? cause.message : String(cause));
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const had = ids.has(id);
      const flip = (add: boolean) =>
        setIds((current) => {
          const next = new Set(current);
          if (add) next.add(id);
          else next.delete(id);
          return next;
        });
      flip(!had);
      setError(null);
      (had ? removePhraseFromReview(id) : addPhrasesToReview([id])).catch((cause) =>
        fail(cause, () => flip(had)),
      );
    },
    [ids, fail],
  );

  const addAll = useCallback(
    (phraseIds: string[]) => {
      const fresh = phraseIds.filter((id) => !ids.has(id));
      if (fresh.length === 0) return;
      setIds((current) => new Set([...current, ...fresh]));
      setError(null);
      addPhrasesToReview(fresh).catch((cause) =>
        fail(cause, () =>
          setIds((current) => new Set([...current].filter((id) => !fresh.includes(id)))),
        ),
      );
    },
    [ids, fail],
  );

  const value = useMemo(
    () => ({ has: (id: string) => ids.has(id), toggle, addAll, error }),
    [ids, toggle, addAll, error],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useReviewSet(): ReviewSet {
  const value = useContext(Context);
  if (!value) throw new Error("useReviewSet needs <ReviewSetProvider>");
  return value;
}

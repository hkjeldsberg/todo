"use client";

import { useCallback, useEffect, useRef } from "react";
import { recordGameAttempt, saveGameProgress } from "./actions";
import type { Attempt } from "./types";

const SAVE_DELAY_MS = 800;

/**
 * Wires a game's saveProgress/recordAttempt to the server. Progress writes are
 * debounced (games save on every move) and flushed when the tab hides or the
 * game unmounts. Failures are logged, never thrown into the render loop.
 */
export function useGameBridge(slug: string) {
  const pending = useRef<{ state: unknown } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    pending.current = null;
    if (next) {
      saveGameProgress(slug, next.state).catch((cause) =>
        console.error(`[games] save ${slug} failed:`, cause),
      );
    }
  }, [slug]);

  const saveProgress = useCallback(
    (state: unknown) => {
      pending.current = { state };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  const recordAttempt = useCallback(
    (attempt: Attempt) => {
      recordGameAttempt(slug, attempt).catch((cause) =>
        console.error(`[games] attempt ${slug} failed:`, cause),
      );
    },
    [slug],
  );

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  return { saveProgress, recordAttempt };
}

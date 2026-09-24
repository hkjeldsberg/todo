"use client";

import { useCallback, useSyncExternalStore } from "react";
import { loadGrammarProgress, setTopicDone } from "@/features/grammar/actions";

/**
 * Which grammar topics the reader has marked as "under control".
 *
 * Supabase holds the truth so the ticks follow you between phone and laptop and
 * survive a cleared cache — Safari drops script-written storage after a week of
 * not visiting, which is fatal over an eight-week course. localStorage stays in
 * front of it as the offline cache: a tick applies instantly, is queued in
 * `pending`, and is flushed to the server as soon as one write succeeds.
 */
const KEY = "todo.grammar.done.v2";
/** The localStorage-only format this replaced; its ticks are migrated once. */
const LEGACY_KEY = "todo.grammar.done.v1";

type Stored = { done: string[]; pending: [string, boolean][] };

/* done is replaced (never mutated) on every change, so it doubles as the
   snapshot identity useSyncExternalStore compares between renders. */
let done = new Set<string>();
/* Ticks this device has made but the server has not confirmed yet. */
const pending = new Map<string, boolean>();
let started = false;

const listeners = new Set<() => void>();
const EMPTY = new Set<string>();

function emit() {
  for (const listener of listeners) listener();
}

function readLocal(): Stored | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Stored;

    // First run on the new format: carry over whatever v1 had, and queue it
    // all so this device's existing ticks reach the server.
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (!legacy) return null;
    const slugs = JSON.parse(legacy) as string[];
    return { done: slugs, pending: slugs.map((slug) => [slug, true]) };
  } catch {
    return null;
  }
}

function writeLocal() {
  try {
    const stored: Stored = { done: [...done], pending: [...pending] };
    window.localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    /* Private mode or a full quota: the server copy still gets the write. */
  }
}

/** Push every queued tick. Stops at the first failure and keeps the rest. */
async function flush() {
  for (const [slug, isDone] of [...pending]) {
    try {
      await setTopicDone(slug, isDone);
      pending.delete(slug);
    } catch {
      return; // Still offline — try again on the next toggle or page load.
    }
  }
  writeLocal();
}

/** Local cache first (instant), then reconcile with the server. */
function start() {
  if (started) return;
  started = true;

  const local = readLocal();
  if (local) {
    done = new Set(local.done);
    for (const [slug, isDone] of local.pending) pending.set(slug, isDone);
    emit();
  }

  void (async () => {
    try {
      const remote = new Set(await loadGrammarProgress());
      // Unsynced local ticks win over the server copy they haven't reached.
      for (const [slug, isDone] of pending) {
        if (isDone) remote.add(slug);
        else remote.delete(slug);
      }
      done = remote;
      writeLocal();
      emit();
      await flush();
    } catch {
      /* Offline, or the migration hasn't run: the cached copy stands. */
    }
  })();
}

function getSnapshot(): Set<string> {
  return done;
}

/* The server renders nothing ticked; the first client snapshot fills it in. */
function getServerSnapshot(): Set<string> {
  return EMPTY;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();

  // Another tab writing the key fires storage; a write here does not.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== KEY) return;
    const local = readLocal();
    if (!local) return;
    done = new Set(local.done);
    emit();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useGrammarProgress() {
  const progress = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const toggle = useCallback((slug: string) => {
    const next = new Set(done);
    const isDone = !next.has(slug);
    if (isDone) next.add(slug);
    else next.delete(slug);

    done = next;
    pending.set(slug, isDone);
    writeLocal();
    emit();
    void flush();
  }, []);

  return { done: progress, toggle };
}

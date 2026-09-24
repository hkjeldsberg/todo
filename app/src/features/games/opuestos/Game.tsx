"use client";

import { MotionConfig } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Attempt, GameProps } from "@/features/games/types";
import { wordMap } from "./lib/content";
import { emptyProgress, parseProgress, withDiscovered, withSolved } from "./lib/progress";
import { isTarget, viewOf, type Room, type RoomEvent } from "./lib/room";
import type { Level, OpuestosContent, OpuestosProgress, Word } from "./lib/types";
import { agree, pairsOf } from "./lib/words";
import { Stage, type Insets, type Probe } from "./scene/Stage";
import { BottomBar, Labels, Toast, TopBar, type ToastMsg } from "./ui/Hud";
import { RadialMenu } from "./ui/RadialMenu";
import { ClueSheet, FailSheet, LevelSelect, PauseMenu, SuccessSheet } from "./ui/Screens";

type Applied = { object: string; word: string };
type Phase = "clue" | "playing" | "won" | "lost";

/** Dev only: scripts/opuestos-playtest.mjs drives the game through this. */
type DevHook = {
  state(): Record<string, unknown>;
  box(id: string): { x: number; y: number; w: number; h: number } | null;
  apply(object: string, word: string): boolean;
  release(): void;
  reset(): void;
  start(levelId: string): void;
  attempts: Attempt[];
};

declare global {
  interface Window {
    __opuestos?: DevHook;
    __opuestosProgress?: unknown;
  }
}

const DEV = process.env.NODE_ENV !== "production";

/** Dev only: the playtest seeds progress here to unlock levels without a database. */
function playtestProgress(): unknown {
  return DEV ? window.__opuestosProgress : undefined;
}

function usePageVisible(onHide: () => void) {
  const [visible, setVisible] = useState(() => document.visibilityState !== "hidden");
  useEffect(() => {
    const on = () => {
      const v = document.visibilityState !== "hidden";
      setVisible(v);
      if (!v) onHide();
    };
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, [onHide]);
  return visible;
}

function useViewport() {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const on = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}

/** Height of a DOM bar, kept current (the camera frames the room between the bars). */
function useHeight() {
  const [height, setHeight] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    observer.current = new ResizeObserver(() => setHeight(el.getBoundingClientRect().height));
    observer.current.observe(el);
  }, []);
  return [height, ref] as const;
}

/** Active words per object from the firing log: the latest word per engine target, in firing order. */
function modsOf(applied: Applied[], words: Map<string, Word>): Record<string, Word[]> {
  const byObject = new Map<string, Map<string, Word>>();
  for (const a of applied) {
    const w = words.get(a.word);
    if (!w) continue;
    const slots = byObject.get(a.object) ?? new Map<string, Word>();
    slots.delete(w.engine_target);
    slots.set(w.engine_target, w);
    byObject.set(a.object, slots);
  }
  return Object.fromEntries([...byObject].map(([id, slots]) => [id, [...slots.values()]]));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** El Rayo Modificador. Content was validated and sorted by ./server.ts. */
export default function Game({ content, source, initialProgress, saveProgress, recordAttempt, exit }: GameProps) {
  const data = content as OpuestosContent;
  const { levels } = data;
  const words = useMemo(() => wordMap(data), [data]);
  const [progress, setProgress] = useState<OpuestosProgress>(() => parseProgress(playtestProgress() ?? initialProgress));
  const [screen, setScreen] = useState<"select" | "play">("select");
  const [levelId, setLevelId] = useState(() => levels[0].id);
  const [phase, setPhase] = useState<Phase>("clue");
  const [runKey, setRunKey] = useState(0);
  const [applied, setApplied] = useState<Applied[]>([]);
  const [released, setReleased] = useState(false);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [won, setWon] = useState<{ used: Word[]; solution: number | null } | null>(null);
  const [lost, setLost] = useState<{ cause: string | null; wrong: Word[] } | null>(null);
  const pause = useCallback(() => setPaused(true), []);
  const visible = usePageVisible(pause);
  const viewport = useViewport();
  const [topH, topRef] = useHeight();
  const [bottomH, bottomRef] = useHeight();

  const roomRef = useRef<Room | null>(null);
  const probeRef = useRef<Probe | null>(null);
  const labelsRef = useRef(new Map<string, HTMLElement>());
  const recorded = useRef(false);
  const attemptsLog = useRef<Attempt[]>([]);

  const levelIndex = Math.max(0, levels.findIndex((l) => l.id === levelId));
  const level: Level = levels[levelIndex];
  const view = useMemo(() => viewOf(level.layout), [level]);
  const targets = useMemo(() => level.layout.objects.filter(isTarget), [level]);
  const pairs = useMemo(() => pairsOf(level.words, words), [level, words]);
  const mods = useMemo(() => modsOf(applied, words), [applied, words]);
  const hasHeld = useMemo(() => level.layout.objects.some((o) => o.held), [level]);

  // Persist progress whenever it changes after mount (the host debounces the writes).
  const loaded = useRef(progress);
  useEffect(() => {
    if (progress !== loaded.current) saveProgress(progress);
  }, [progress, saveProgress]);

  const record = useCallback(
    (attempt: Attempt) => {
      if (DEV) attemptsLog.current.push(attempt);
      recordAttempt(attempt);
    },
    [recordAttempt],
  );

  const unlocked = useCallback(
    (i: number) => i === 0 || progress.solved.includes(levels[i].id) || progress.solved.includes(levels[i - 1].id),
    [levels, progress.solved],
  );

  const say = useCallback((es: string, en: string, action?: ToastMsg["action"]) => {
    setToast({ key: Date.now() + Math.random(), es, en, action });
  }, []);

  useEffect(() => {
    if (!toast || toast.action) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 650);
    return () => clearTimeout(id);
  }, [flash]);

  const nounOf = useCallback(
    (id: string) => {
      const o = level.layout.objects.find((x) => x.id === id);
      return { noun: o?.noun ?? id, gender: o?.gender ?? "m" };
    },
    [level],
  );

  /** Words this run used on objects no known solution needs: the ones worth reviewing. */
  const wrongWords = useCallback(
    (log: Applied[]) => {
      const good = new Set(level.layout.solutions.flatMap((s) => s.steps.map((st) => `${st.object}:${st.word}`)));
      const out = new Map<string, Word>();
      for (const a of log) {
        const w = words.get(a.word);
        if (w && !good.has(`${a.object}:${a.word}`)) out.set(w.id, w);
      }
      return [...out.values()];
    },
    [level, words],
  );

  /** A run that went nowhere: queue its off-track words for review (once per run). */
  const recordFailure = useCallback(
    (log: Applied[]) => {
      if (recorded.current) return [];
      recorded.current = true;
      const wrong = wrongWords(log);
      for (const w of wrong) {
        const a = log.find((x) => x.word === w.id)!;
        record({ itemRef: w.id, correct: false, answer: `${level.id}:${a.object}` });
      }
      return wrong;
    },
    [wrongWords, record, level.id],
  );

  const resetRun = useCallback(() => {
    const room = roomRef.current;
    const ran = !!room && (released || !hasHeld) && room.applied.length > 0 && room.status === "playing";
    if (ran) recordFailure(room.applied);
    recorded.current = false;
    setRunKey((k) => k + 1);
    setApplied([]);
    setReleased(false);
    setMenu(null);
    setWon(null);
    setLost(null);
    setToast(null);
    setPhase((p) => (p === "clue" ? p : "playing"));
  }, [released, hasHeld, recordFailure]);

  const startLevel = useCallback(
    (id: string) => {
      recorded.current = false;
      setLevelId(id);
      setScreen("play");
      setPhase("clue");
      setRunKey((k) => k + 1);
      setApplied([]);
      setReleased(false);
      setMenu(null);
      setWon(null);
      setLost(null);
      setToast(null);
      setPaused(false);
      setProgress((p) => (p.lastLevel === id ? p : { ...p, lastLevel: id }));
    },
    [],
  );

  const release = useCallback(() => {
    const room = roomRef.current;
    if (!room || released || !hasHeld) return;
    room.release();
    setReleased(true);
  }, [released, hasHeld]);

  const undo = useCallback(() => {
    const room = roomRef.current;
    if (!room || !room.undo()) return;
    setApplied([...room.applied]);
  }, []);

  /** Fire the ray. Returns whether the word changed anything. */
  const fire = useCallback(
    (id: string, wordId: string) => {
      const room = roomRef.current;
      const word = words.get(wordId);
      setMenu(null);
      if (!room || !word) return false;
      const res = room.apply(id, word);
      const { noun, gender } = nounOf(id);
      if (!res.ok) {
        if (res.reason === "same") say(`${cap(noun)} ya está ${agree(word.word, gender)}.`, `Already ${word.translation}.`);
        else say(`«${word.word}» no cambia ${noun}.`, `${word.word} (${word.translation}) does nothing to it.`);
        return false;
      }
      setApplied([...room.applied]);
      setFlash(id);
      setProgress((p) => withDiscovered(p, word.id));
      return true;
    },
    [words, nounOf, say],
  );

  const onEvents = useCallback(
    (events: RoomEvent[]) => {
      const room = roomRef.current;
      if (!room) return;
      for (const e of events) {
        if (e.type === "won") {
          const used = [...new Set(room.applied.map((a) => a.word))].map((w) => words.get(w)!).filter(Boolean);
          const have = new Set(room.applied.map((a) => `${a.object}:${a.word}`));
          const idx = level.layout.solutions.findIndex((s) => s.steps.every((st) => have.has(`${st.object}:${st.word}`)));
          const solution = idx >= 0 ? idx : null;
          if (!recorded.current) {
            recorded.current = true;
            for (const w of used) record({ itemRef: w.id, correct: true, answer: level.id });
          }
          setProgress((p) => withSolved(p, level.id, used.map((w) => w.id), solution));
          setWon({ used, solution });
          setPhase("won");
          setToast(null);
          setMenu(null);
        } else if (e.type === "lost") {
          const wrong = recordFailure(room.applied);
          const brk = room.lastBreak;
          let cause: string | null = null;
          if (brk) {
            const by = nounOf(brk.by);
            const byWords = room.objects.get(brk.by)?.slots;
            const adj = byWords ? Object.values(byWords).map((w) => agree(w!.word, by.gender)) : [];
            cause = `${cap([by.noun, ...adj].join(" "))} ha roto ${nounOf(brk.object).noun}.`;
          }
          setLost({ cause, wrong });
          setPhase("lost");
          setMenu(null);
        } else if (e.type === "stuck") {
          const { noun } = nounOf(e.object);
          say(`${cap(noun)} no se mueve.`, "Stuck. Try another word, or reset.", { label: "Reiniciar", run: () => resetRun() });
        } else if (e.type === "moving") {
          setToast((t) => (t?.action ? null : t));
        } else if (e.type === "break") {
          say(`¡Crac! ${cap(nounOf(e.object).noun)} se ha roto.`, "It shattered.");
        } else if (e.type === "melt") {
          say(`${cap(nounOf(e.object).noun)} se derrite.`, "The ice melts.");
        } else if (e.type === "freeze") {
          say(`${cap(nounOf(e.object).noun)} se congela.`, "The water freezes solid.");
        } else if (e.type === "press") {
          say("El botón abre la puerta.", "The button opens the door.");
        }
      }
    },
    [words, level, record, recordFailure, nounOf, say, resetRun],
  );

  const openRay = useCallback(
    (id: string) => {
      if (phase !== "playing") return;
      const box = probeRef.current?.box(id);
      setHover(null);
      setMenu({ id, x: box ? box.x + box.w / 2 : viewport.width / 2, y: box ? box.y + box.h / 2 : viewport.height / 2 });
    },
    [phase, viewport],
  );

  // Keyboard: Space releases, Z undoes, R resets, Esc pauses.
  const playing = screen === "play" && phase === "playing" && !menu && !paused;
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === " " && tag !== "BUTTON") {
        e.preventDefault();
        release();
      } else if (e.key === "z" || e.key === "Z" || e.key === "u") undo();
      else if (e.key === "r" || e.key === "R") resetRun();
      else if (e.key === "Escape") setPaused(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, release, undo, resetRun]);

  // Dev hook for scripts/opuestos-playtest.mjs.
  const hookState = useRef<() => Record<string, unknown>>(() => ({}));
  const hookActions = useRef<Pick<DevHook, "apply" | "release" | "reset" | "start">>({
    apply: () => false,
    release: () => {},
    reset: () => {},
    start: () => {},
  });
  useEffect(() => {
    if (!DEV) return;
    hookState.current = () => ({
      screen,
      level: level.id,
      phase,
      released,
      applied,
      menu: menu?.id ?? null,
      status: roomRef.current?.status ?? null,
      toast: toast?.es ?? null,
      progress,
    });
    hookActions.current = { apply: fire, release, reset: resetRun, start: startLevel };
  });
  useEffect(() => {
    if (!DEV) return;
    window.__opuestos = {
      state: () => hookState.current(),
      box: (id) => {
        const b = probeRef.current?.box(id);
        return b ?? null;
      },
      apply: (o, w) => hookActions.current.apply(o, w),
      release: () => hookActions.current.release(),
      reset: () => hookActions.current.reset(),
      start: (id) => hookActions.current.start(id),
      attempts: attemptsLog.current,
    };
    return () => {
      delete window.__opuestos;
    };
  }, []);

  const registerLabel = useCallback((id: string, el: HTMLElement | null) => {
    if (el) labelsRef.current.set(id, el);
    else labelsRef.current.delete(id);
  }, []);
  const pinLabel = useCallback((id: string, x: number, y: number) => {
    const el = labelsRef.current.get(id);
    if (el) el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
  }, []);

  const portrait = viewport.width < viewport.height;
  const insets: Insets = useMemo(
    () => ({
      top: topH + 8,
      bottom: bottomH + 8,
      left: portrait ? 8 : 24,
      right: portrait ? 8 : 24,
    }),
    [topH, bottomH, portrait],
  );

  if (screen === "select") {
    return (
      <MotionConfig reducedMotion="user">
        <LevelSelect
          levels={levels}
          words={words}
          allWords={data.words}
          progress={progress}
          unlocked={unlocked}
          onPlay={startLevel}
          onExit={exit}
        />
      </MotionConfig>
    );
  }

  const menuObject = menu ? level.layout.objects.find((o) => o.id === menu.id) : undefined;
  const next = levels[levelIndex + 1];
  const physicsPaused = phase === "clue" || !!menu || paused;

  return (
    <MotionConfig reducedMotion="user">
      <main className="fixed inset-0 overflow-hidden bg-page text-ink select-none">
        <div
          className="absolute inset-0"
          style={{ cursor: hover ? "pointer" : undefined }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const id = probeRef.current?.pick(e.clientX - rect.left, e.clientY - rect.top);
            if (id) openRay(id);
          }}
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse" || menu) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const id = probeRef.current?.pick(e.clientX - rect.left, e.clientY - rect.top) ?? null;
            if (id !== hover) setHover(id);
          }}
        >
          <Stage
            level={level}
            view={view}
            runKey={runKey}
            roomRef={roomRef}
            probeRef={probeRef}
            onPin={pinLabel}
            mods={mods}
            highlight={menu?.id ?? flash ?? hover}
            rayTarget={menu?.id ?? flash}
            paused={physicsPaused}
            visible={visible}
            insets={insets}
            onEvents={onEvents}
          />
        </div>

        <Labels targets={targets} mods={mods} register={registerLabel} />

        <TopBar
          level={level}
          index={levelIndex}
          total={levels.length}
          solved={progress.solved.includes(level.id)}
          barRef={topRef}
          onExit={exit}
          onMenu={() => {
            setMenu(null);
            setPaused(true);
          }}
        />

        <BottomBar
          targets={targets}
          mods={mods}
          canRelease={hasHeld && !released && phase === "playing"}
          canUndo={applied.length > 0 && phase === "playing"}
          barRef={bottomRef}
          onZap={openRay}
          onHover={setHover}
          onRelease={release}
          onUndo={undo}
          onReset={resetRun}
        />

        <Toast toast={phase === "playing" ? toast : null} bottom={bottomH} />

        {menu && menuObject && (
          <RadialMenu
            object={menuObject}
            pairs={pairs}
            active={new Set((mods[menu.id] ?? []).map((w) => w.id))}
            at={{ x: menu.x, y: menu.y }}
            viewport={viewport}
            onPick={(w) => fire(menu.id, w.id)}
            onClose={() => setMenu(null)}
          />
        )}

        {phase === "clue" && !paused && (
          <ClueSheet level={level} index={levelIndex} words={words} onStart={() => setPhase("playing")} />
        )}

        {phase === "won" && won && !paused && (
          <SuccessSheet
            level={level}
            used={won.used}
            solution={won.solution}
            found={progress.found[level.id] ?? []}
            hasNext={!!next}
            onAgain={resetRun}
            onNext={() => next && startLevel(next.id)}
            onLevels={() => setScreen("select")}
          />
        )}

        {phase === "lost" && lost && !paused && (
          <FailSheet
            title="¡Se ha caído!"
            cause={lost.cause}
            suggestions={lost.wrong.map((w) => ({ word: w, antonym: words.get(w.antonym_id)! })).filter((s) => s.antonym)}
            onReset={resetRun}
            onLevels={() => setScreen("select")}
          />
        )}

        {paused && (
          <PauseMenu
            source={source}
            onResume={() => setPaused(false)}
            onLevels={() => {
              setPaused(false);
              setScreen("select");
            }}
            onExit={exit}
            onResetProgress={() => {
              setProgress(emptyProgress());
              setPaused(false);
              setScreen("select");
            }}
          />
        )}
      </main>
    </MotionConfig>
  );
}

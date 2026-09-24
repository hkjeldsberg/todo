"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { GameProps } from "@/features/games/types";
import { parseProgress } from "./lib/content";
import {
  GAUNTLET_SECONDS,
  GAUNTLET_ZONE,
  buildCurriculum,
  createReducer,
  firstNodeOf,
  initialState,
  progressOf,
  unlockedZones,
  type Banner,
  type GameState,
} from "./lib/game";
import { islandByZone } from "./lib/islands";
import type { IslandZone, LaberintoContent } from "./lib/types";
import { createInput, type LockControls, type SceneProbe } from "./scene/Player";
import { Scene } from "./scene/Scene";
import { BannerView } from "./ui/Banner";
import { Controls } from "./ui/Controls";
import { Crosshair, GauntletTimer, TopBar } from "./ui/Hud";
import { PauseMenu, TitleScreen, VictoryScreen } from "./ui/Screens";

const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
// "correct" has no timeout: the player moves on with the Continue button.
const BANNER_MS: Partial<Record<Banner["kind"], number>> = { paradox: 5500, collapse: 2600 };

type DevHook = {
  state(): GameState;
  doorScreen(i: number): { x: number; y: number } | null;
  camera(): [number, number, number] | null;
  walkTo(i: number): void;
  start(nodeId: string): void;
  attempts: { itemRef: string; correct: boolean; answer?: string }[];
};

declare global {
  interface Window {
    __laberinto?: DevHook;
  }
}

function useIsPortrait() {
  const [portrait, setPortrait] = useState(() => window.innerWidth < window.innerHeight);
  useEffect(() => {
    const on = () => setPortrait(window.innerWidth < window.innerHeight);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return portrait;
}

/** Tracks tab visibility; `onHide` runs as the tab goes hidden. */
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

export default function Game({ content, source, initialProgress, saveProgress, recordAttempt, exit }: GameProps) {
  const curriculum = useMemo(() => buildCurriculum(content as LaberintoContent), [content]);
  const reducer = useMemo(() => createReducer(curriculum), [curriculum]);
  const [state, dispatch] = useReducer(reducer, curriculum, (c) => initialState(c, parseProgress(initialProgress)));
  const stateRef = useRef(state);

  const [isTouch] = useState(() => matchMedia("(pointer: coarse)").matches);
  const portrait = useIsPortrait();
  const [paused, setPaused] = useState(false);
  const pause = useCallback(() => setPaused(true), []);
  // Hidden tab: stop rendering (Scene frameloop) and pause the game.
  const visible = usePageVisible(pause);
  const [locked, setLocked] = useState(false);
  // Keyboard-only play (no mouse lock): starts on a movement key, stops on Esc.
  const [keyboard, setKeyboard] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const input = useRef(createInput());
  const controls = useRef<LockControls>(null);
  const probe = useRef<SceneProbe | null>(null);
  const relock = useRef(false);

  const node = curriculum.byId.get(state.nodeId)!;
  // The gauntlet mixes rooms from every island, but they all stand in El Hierro's collapsing world.
  const island = islandByZone(state.gauntlet ? GAUNTLET_ZONE : node.island_zone);
  const islandNodes = curriculum.nodes.filter((n) => n.island_zone === node.island_zone);
  const roomOf: [number, number] = state.gauntlet
    ? [state.gauntlet.index + 1, state.gauntlet.queue.length]
    : [islandNodes.findIndex((n) => n.node_id === node.node_id) + 1, islandNodes.length];

  const playing = state.screen === "playing";
  const engaged = isTouch || locked || keyboard;
  const blocking = state.banner?.kind === "correct" || state.banner?.kind === "collapse";
  const active = playing && visible && !paused && engaged;
  const showPause = playing && !blocking && (paused || !engaged);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Persist progress whenever it actually changes (never on mount).
  const lastSaved = useRef<string | null>(null);
  useEffect(() => {
    const progress = progressOf(curriculum, state);
    const key = JSON.stringify(progress);
    if (lastSaved.current === null || lastSaved.current === key) {
      lastSaved.current = key;
      return;
    }
    lastSaved.current = key;
    saveProgress(progress);
  }, [curriculum, state, saveProgress]);

  // Auto-dismiss comic banners.
  useEffect(() => {
    const ms = state.banner && BANNER_MS[state.banner.kind];
    if (!ms) return;
    const t = setTimeout(() => dispatch({ type: "dismiss" }), ms);
    return () => clearTimeout(t);
  }, [state.banner]);

  // Gauntlet clock (stops while paused).
  const inGauntlet = !!state.gauntlet;
  useEffect(() => {
    if (!inGauntlet || !active) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      dispatch({ type: "tick", dt: (now - last) / 1000 });
      last = now;
    }, 100);
    return () => clearInterval(id);
  }, [inGauntlet, active]);

  // Release the pointer on menus.
  useEffect(() => {
    if ((!playing || paused) && document.pointerLockElement) document.exitPointerLock();
  }, [playing, paused]);

  useEffect(() => {
    if (!playing || isTouch) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") setKeyboard(false);
      else if (MOVE_KEYS.has(e.code) && !paused) setKeyboard(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, isTouch, paused]);

  // Level cleared: free the mouse so Continue can be clicked, remember whether to re-lock.
  const levelCleared = state.banner?.kind === "correct";
  useEffect(() => {
    if (!levelCleared) return;
    relock.current = !!document.pointerLockElement;
    if (relock.current) document.exitPointerLock();
  }, [levelCleared]);

  /** Desktop: grab the mouse again. Must run inside a click / key handler. */
  const engage = useCallback(() => {
    if (isTouch) return;
    setKeyboard(true);
    try {
      controls.current?.lock();
    } catch {
      /* pointer lock refused: keyboard play still works */
    }
  }, [isTouch]);

  const continueNext = useCallback(() => {
    dispatch({ type: "dismiss" });
    if (relock.current) engage();
    else if (!isTouch) setKeyboard(true);
  }, [engage, isTouch]);

  useEffect(() => {
    if (!levelCleared) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "Space" || e.code === "NumpadEnter") {
        e.preventDefault();
        continueNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [levelCleared, continueNext]);

  const onLockChange = useCallback((l: boolean) => {
    setLocked(l);
    if (!l) setKeyboard(false); // Esc releases the mouse: pause
  }, []);

  const onDoor = useCallback(
    (i: number) => {
      const s = stateRef.current;
      const room = curriculum.byId.get(s.nodeId);
      const door = room?.doors[i];
      if (!room || !door || s.screen !== "playing") return;
      const attempt = { itemRef: room.node_id, correct: door.correct, answer: door.text };
      recordAttempt(attempt);
      if (process.env.NODE_ENV !== "production") window.__laberinto?.attempts.push(attempt);
      dispatch({ type: "choose", doorIndex: i });
    },
    [curriculum, recordAttempt],
  );

  const start = useCallback(
    (nodeId?: string) => {
      setPaused(false);
      dispatch({ type: "start", nodeId });
      engage();
    },
    [engage],
  );

  const resume = useCallback(() => {
    setPaused(false);
    engage();
  }, [engage]);

  const toTitle = useCallback(() => {
    setPaused(false);
    dispatch({ type: "title" });
  }, []);

  // Dev-only hook for the headless playtest (scripts/laberinto-playtest.mjs).
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    window.__laberinto = {
      state: () => stateRef.current,
      doorScreen: (i) => probe.current?.doorScreen(i) ?? null,
      camera: () => probe.current?.camera() ?? null,
      walkTo: (i) => {
        input.current.walkTo = i;
      },
      start: (nodeId) => start(nodeId),
      attempts: window.__laberinto?.attempts ?? [],
    };
  }, [start]);

  const collapse = state.gauntlet ? 1 - state.gauntlet.timeLeft / GAUNTLET_SECONDS : 0;
  const alarm = !!state.gauntlet && state.gauntlet.timeLeft < 20;
  const unlocked = unlockedZones(curriculum, state);

  return (
    <main className="fixed inset-0 overflow-hidden bg-ink select-none">
      <div className="absolute inset-0">
        <Scene
          node={node}
          island={island}
          failed={state.failed}
          highlight={active && !blocking ? highlight : null}
          portrait={portrait}
          visible={visible}
          collapse={collapse}
          alarm={alarm}
          spawn={state.spawn}
          pointerLock={!isTouch}
          locked={locked}
          enabled={active && !blocking}
          inputRef={input}
          controlsRef={controls}
          probeRef={probe}
          onDoor={onDoor}
          onAim={setHighlight}
          onLockChange={onLockChange}
        />
      </div>

      {playing && (
        <>
          <Controls inputRef={input} touch={isTouch} locked={locked} enabled={active && !blocking} />
          <TopBar island={island} roomOf={roomOf} state={state} onExit={exit} onPause={pause} />
          {state.gauntlet && <GauntletTimer gauntlet={state.gauntlet} />}
          {locked && <Crosshair />}
          {showPause && (
            <PauseMenu
              touch={isTouch}
              solved={state.solved.length}
              mistakes={state.mistakes}
              onResume={resume}
              onIslands={toTitle}
              onExit={exit}
            />
          )}
        </>
      )}

      {state.banner && (
        <BannerView
          banner={state.banner}
          island={island}
          onContinue={continueNext}
          onDismiss={() => dispatch({ type: "dismiss" })}
        />
      )}

      {state.screen === "title" && (
        <TitleScreen
          unlocked={unlocked}
          current={node.island_zone}
          solved={state.solved.length}
          total={curriculum.nodes.length}
          hasProgress={state.solved.length > 0}
          source={source}
          onStart={() => start()}
          onIsland={(z: IslandZone) => start(firstNodeOf(curriculum, z)!.node_id)}
          onExit={exit}
        />
      )}
      {state.screen === "victory" && (
        <VictoryScreen mistakes={state.mistakes} onAgain={() => start(curriculum.first.node_id)} onExit={exit} />
      )}
    </main>
  );
}

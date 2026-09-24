"use client";

import { useFrame } from "@react-three/fiber";
import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from "react";

/**
 * Game time only advances while the room is not paused (a memory prompt is
 * open), so every ambient animation freezes together.
 */
export interface GameTime {
  t: number;
  paused: boolean;
}

const GameTimeContext = createContext<RefObject<GameTime> | null>(null);

export function GameTimeProvider({ paused, children }: { paused: boolean; children: ReactNode }) {
  const time = useRef<GameTime>({ t: 0, paused });
  useEffect(() => {
    time.current.paused = paused;
  }, [paused]);
  useFrame((_, delta) => {
    if (!time.current.paused) time.current.t += Math.min(delta, 0.1);
  });
  return (
    <GameTimeContext.Provider value={time}>
      {children}
    </GameTimeContext.Provider>
  );
}

export function useGameTime() {
  const ctx = useContext(GameTimeContext);
  if (!ctx) throw new Error("useGameTime must be used inside <GameTimeProvider>");
  return ctx;
}

/** 0 → 1 progress of a one-off animation that started at `since`. */
export function onceProgress(t: number, since: number | null, duration: number) {
  if (since === null) return 0;
  return Math.min(1, Math.max(0, (t - since) / duration));
}

export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeOutBounce = (x: number) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
};

"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LayoutObject, Word } from "../lib/types";
import { agree } from "../lib/words";

interface RadialMenuProps {
  object: LayoutObject;
  /** The level's words, grouped into opposite pairs. */
  pairs: Word[][];
  /** Words already driving this object. */
  active: Set<string>;
  /** Where the object is on screen (px inside the game root). */
  at: { x: number; y: number };
  viewport: { width: number; height: number };
  onPick: (word: Word) => void;
  onClose: () => void;
}

const PILL_W = 92;
const PILL_H = 46;
const LONG_PRESS_MS = 450;

/**
 * The Rayo's word wheel. Opposites sit side by side (joined by a pink arc) so
 * each pair is learned together. Hover, focus or long-press shows the English;
 * digits 1–8 and the arrow keys work too.
 */
export function RadialMenu({ object, pairs, active, at, viewport, onPick, onClose }: RadialMenuProps) {
  const [gloss, setGloss] = useState<Word | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const press = useRef<{ timer: ReturnType<typeof setTimeout> | null; long: boolean }>({ timer: null, long: false });

  // Ring geometry: pairs spread around the circle, partners ±spread apart.
  const { items, radius, center } = useMemo(() => {
    const flat: { word: Word; angle: number; pair: number }[] = [];
    const P = pairs.length;
    const spread = P === 1 ? 90 : P === 2 ? 26 : 21;
    pairs.forEach((pair, k) => {
      const mid = P === 1 ? -90 : -90 + (k * 360) / P;
      pair.forEach((word, i) => {
        const offset = pair.length === 1 ? 0 : i === 0 ? -spread : spread;
        flat.push({ word, angle: ((mid + offset) * Math.PI) / 180, pair: k });
      });
    });
    const maxR = Math.min((viewport.width - PILL_W - 24) / 2, (viewport.height - PILL_H - 140) / 2);
    const radius = Math.max(100, Math.min(142, maxR));
    const half = { x: radius + PILL_W / 2 + 8, y: radius + PILL_H / 2 + 8 };
    const center = {
      x: Math.min(Math.max(at.x, half.x), viewport.width - half.x),
      y: Math.min(Math.max(at.y, half.y + 56), viewport.height - half.y),
    };
    return { items: flat, radius, center };
  }, [pairs, at, viewport]);

  useEffect(() => {
    buttons.current[0]?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= items.length) {
        e.preventDefault();
        onPick(items[n - 1].word);
        return;
      }
      const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const i = buttons.current.findIndex((b) => b === document.activeElement);
      buttons.current[(i + dir + items.length) % items.length]?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, onPick, onClose]);

  const startPress = (word: Word) => {
    press.current.long = false;
    if (press.current.timer) clearTimeout(press.current.timer);
    press.current.timer = setTimeout(() => {
      press.current.long = true;
      setGloss(word);
    }, LONG_PRESS_MS);
  };
  const endPress = () => {
    if (press.current.timer) clearTimeout(press.current.timer);
    press.current.timer = null;
  };

  const pos = (angle: number) => ({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  const gender = object.gender ?? "m";

  return (
    <div className="absolute inset-0 z-30 bg-ink/25" onClick={onClose} role="presentation">
      <motion.div
        role="dialog"
        aria-label={`El rayo: ${object.noun ?? object.id}`}
        className="absolute"
        style={{ left: center.x, top: center.y }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pair arcs */}
        <svg
          className="pointer-events-none absolute overflow-visible"
          style={{ left: 0, top: 0 }}
          width={1}
          height={1}
          aria-hidden
        >
          {pairs.map((pair, k) => {
            if (pair.length < 2) return null;
            const [a, b] = items.filter((it) => it.pair === k);
            const r = radius;
            const p1 = pos(a.angle);
            const p2 = pos(b.angle);
            return (
              <path
                key={k}
                d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={10}
                strokeLinecap="round"
                opacity={0.45}
              />
            );
          })}
        </svg>

        {/* Centre: the target and the English gloss */}
        <div className="absolute flex h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-card px-3 text-center shadow-[0_6px_0_var(--card-shadow)]">
          <span className="text-[11px] font-bold text-muted">El rayo</span>
          <span lang="es" className="text-[17px] leading-tight font-bold">
            {object.noun}
          </span>
          <span className="mt-0.5 min-h-[32px] text-[12px] leading-tight text-muted" aria-live="polite">
            {gloss ? (
              <>
                <strong lang="es" className="font-bold text-accent">
                  {agree(gloss.word, gender)}
                </strong>{" "}
                · {gloss.translation}
              </>
            ) : (
              "Elige una palabra"
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the ray"
          className="absolute flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-ink text-[16px] font-bold text-on-ink shadow-[0_3px_0_var(--ink-shadow)]"
          style={{ left: 0, top: 56 }}
        >
          ✕
        </button>

        {items.map(({ word, angle }, i) => {
          const p = pos(angle);
          const on = active.has(word.id);
          return (
            <button
              key={word.id}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              lang="es"
              title={word.translation}
              aria-label={`${word.word}: ${word.translation}${on ? " (active)" : ""}`}
              aria-pressed={on}
              onPointerDown={() => startPress(word)}
              onPointerUp={endPress}
              onPointerLeave={() => {
                endPress();
                setGloss((g) => (g === word ? null : g));
              }}
              onPointerEnter={(e) => e.pointerType === "mouse" && setGloss(word)}
              onFocus={() => setGloss(word)}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => {
                if (press.current.long) {
                  press.current.long = false;
                  return;
                }
                onPick(word);
              }}
              className={`press absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[17px] font-bold select-none [--press:4px] ${
                on ? "bg-accent text-white shadow-[0_4px_0_var(--accent-shadow)]" : "bg-card text-ink shadow-[0_4px_0_var(--card-shadow)]"
              }`}
              style={{ left: p.x, top: p.y, width: PILL_W, height: PILL_H, WebkitTouchCallout: "none" }}
            >
              <span className="absolute -top-1.5 -left-1 hidden h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-on-ink sm:flex">
                {i + 1}
              </span>
              {word.word}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}

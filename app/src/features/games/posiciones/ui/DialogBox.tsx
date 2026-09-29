"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Retro RPG dialogue box in memo's palette: a stepped (pixel) corner, a double
 * border and a hard offset shadow. Tone picks the ground: card (✓, hints),
 * page (✗), ink (grammar).
 */

export type DialogTone = "good" | "bad" | "grammar" | "info";

const TONES: Record<DialogTone, { box: string; tag: string; shadow: string }> = {
  good: { box: "bg-card text-ink", tag: "bg-accent text-white", shadow: "var(--ink-shadow)" },
  bad: { box: "bg-shell text-ink", tag: "bg-ink text-on-ink", shadow: "var(--ink-shadow)" },
  grammar: { box: "bg-ink text-on-ink", tag: "bg-accent text-white", shadow: "var(--accent-shadow)" },
  info: { box: "bg-card text-ink", tag: "bg-pill-deep text-ink", shadow: "var(--ink-shadow)" },
};

/** 6px pixel steps on every corner. */
const PIXEL_CORNERS =
  "polygon(0 6px, 3px 6px, 3px 3px, 6px 3px, 6px 0, calc(100% - 6px) 0, calc(100% - 6px) 3px, calc(100% - 3px) 3px, calc(100% - 3px) 6px, 100% 6px, 100% calc(100% - 6px), calc(100% - 3px) calc(100% - 6px), calc(100% - 3px) calc(100% - 3px), calc(100% - 6px) calc(100% - 3px), calc(100% - 6px) 100%, 6px 100%, 6px calc(100% - 3px), 3px calc(100% - 3px), 3px calc(100% - 6px), 0 calc(100% - 6px))";

export function DialogBox({
  tone,
  tag,
  children,
  onClose,
  reducedMotion,
}: {
  tone: DialogTone;
  tag: string;
  children: ReactNode;
  onClose?: () => void;
  reducedMotion: boolean;
}) {
  const t = TONES[tone];
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reducedMotion ? false : { y: 16, opacity: 0, scale: 0.97 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 30 }}
      className="relative"
      style={{ filter: `drop-shadow(0 5px 0 ${t.shadow})` }}
    >
      <div className={`relative px-4 pt-3 pb-3.5 ${t.box}`} style={{ clipPath: PIXEL_CORNERS }}>
        <div className="pointer-events-none absolute inset-[4px] border-2 border-current opacity-20" style={{ clipPath: PIXEL_CORNERS }} />
        <div className="flex items-start gap-2">
          <span className={`shrink-0 px-2 py-[1px] text-[12px] font-bold tracking-wide uppercase ${t.tag}`} style={{ clipPath: PIXEL_CORNERS }}>
            {tag}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="-mt-2 -mr-2 ml-auto flex h-11 w-11 items-center justify-center text-[16px] font-bold opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          )}
        </div>
        <div className="mt-1.5">{children}</div>
      </div>
    </motion.div>
  );
}

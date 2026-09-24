"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { Tense } from "../types";

/** Memo "Sticker Tabs" building blocks for the game chrome (tokens from app/src/app/globals.css). */

export const TENSE_LABEL: Record<Tense, { es: string; en: string; hint: string; effect: string }> = {
  imperfect: {
    es: "imperfecto",
    en: "imperfect",
    hint: "background, habit, ongoing",
    effect: "The object keeps moving in a loop.",
  },
  preterite: {
    es: "indefinido",
    en: "preterite",
    hint: "event, completed, interrupts",
    effect: "The room changes once, for good.",
  },
};

/** Primary action: the one ink pill in view. */
export const inkPill =
  "press inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-6 text-[18px] font-bold text-on-ink shadow-[0_6px_0_var(--ink-shadow)] [--press:6px]";

/** Secondary action on a white card. */
export const lightPill =
  "press inline-flex min-h-12 items-center justify-center rounded-full bg-pill px-5 text-[16px] font-bold text-ink shadow-[0_6px_0_var(--pill-deep)] [--press:6px]";

/** Small floating chip over the 3D scene (back, menu). */
export const chip =
  "press pointer-events-auto inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-card px-4 text-[14px] font-bold text-ink shadow-[0_3px_0_var(--card-shadow)] [--press:3px]";

/** Ink scrim + centred (or bottom-anchored on phones) white sticker card. */
export function Sheet({
  children,
  label,
  onDismiss,
  anchor = "center",
  z = "z-30",
}: {
  children: ReactNode;
  label: string;
  onDismiss?: () => void;
  anchor?: "center" | "bottom";
  z?: string;
}) {
  return (
    <div
      className={`absolute inset-0 ${z} flex justify-center bg-ink/35 px-4 pt-[calc(env(safe-area-inset-top)+68px)] pb-[max(16px,env(safe-area-inset-bottom))] ${
        anchor === "bottom" ? "items-end sm:items-center" : "items-center"
      }`}
      onClick={onDismiss}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="no-scrollbar max-h-full w-full max-w-lg overflow-y-auto rounded-[22px] bg-card p-5 shadow-[0_6px_0_var(--card-shadow)] sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Solved / unsolved memory pip. */
export function Pip({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-block h-3 w-3 rotate-45 rounded-[3px] ${on ? "bg-accent shadow-[0_2px_0_var(--accent-shadow)]" : "bg-pill-flat"}`}
    />
  );
}

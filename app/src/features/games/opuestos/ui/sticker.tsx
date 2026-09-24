"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** memo "Sticker Tabs" building blocks for the game chrome (tokens from app/src/app/globals.css). */

/** Primary action: the one ink pill in view. */
export const inkPill =
  "press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[18px] font-bold text-on-ink shadow-[0_6px_0_var(--ink-shadow)] [--press:6px] disabled:opacity-50";

/** Secondary action on a white card. */
export const lightPill =
  "press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-pill px-5 text-[16px] font-bold text-ink shadow-[0_6px_0_var(--pill-deep)] [--press:6px] disabled:opacity-50";

/** Small floating chip over the 3D scene (back, menu, tray). */
export const chip =
  "press pointer-events-auto inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-card px-4 text-[15px] font-bold text-ink shadow-[0_3px_0_var(--card-shadow)] [--press:3px]";

/** Ink scrim + centred (or bottom-anchored on phones) white sticker card. */
export function Sheet({
  children,
  label,
  onDismiss,
  anchor = "center",
  scrim = true,
  z = "z-30",
}: {
  children: ReactNode;
  label: string;
  onDismiss?: () => void;
  anchor?: "center" | "bottom";
  scrim?: boolean;
  z?: string;
}) {
  return (
    <div
      className={`absolute inset-0 ${z} flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+68px)] pb-[max(16px,env(safe-area-inset-bottom))] ${
        scrim ? "bg-ink/35" : "pointer-events-none"
      } ${anchor === "bottom" ? "items-end sm:items-center" : "items-center"}`}
      onClick={onDismiss}
    >
      <motion.div
        role="dialog"
        aria-modal={scrim ? "true" : undefined}
        aria-label={label}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="no-scrollbar pointer-events-auto max-h-full w-full max-w-lg overflow-y-auto rounded-[22px] bg-card p-5 shadow-[0_6px_0_var(--card-shadow)] sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Opposite pair as two joined stickers: pesado | ligero. */
export function PairChip({ a, b, on }: { a: string; b?: string; on?: (w: string) => boolean }) {
  const cell = (w: string, i: number) => (
    <span
      key={i}
      lang="es"
      className={`px-2.5 py-0.5 text-[14px] font-bold ${!b ? "rounded-full" : i === 0 ? "rounded-l-full" : "rounded-r-full"} ${
        on?.(w) === false ? "text-faint" : ""
      } ${on?.(w) ? "bg-accent text-white" : "bg-pill"}`}
    >
      {w}
    </span>
  );
  return (
    <span className="inline-flex items-stretch gap-[2px] rounded-full">
      {cell(a, 0)}
      {b ? cell(b, 1) : null}
    </span>
  );
}

"use client";

import { motion } from "framer-motion";
import type { Banner } from "../lib/game";
import type { Island } from "../lib/islands";

export const TENSE_LABEL = { imperfect: "Imperfecto", preterite: "Indefinido", trap: "Trap" } as const;

const pop = { type: "spring", stiffness: 420, damping: 26 } as const;

/** Wrong door: a speech-bubble sticker with the rule. Tap to dismiss. */
function Paradox({ banner, onDismiss }: { banner: Extract<Banner, { kind: "paradox" }>; onDismiss: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(172px+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 lg:bottom-[calc(40px+env(safe-area-inset-bottom))]">
      <motion.button
        type="button"
        key={banner.id}
        role="alert"
        onClick={onDismiss}
        initial={{ scale: 0.6, opacity: 0, rotate: -3 }}
        animate={{ scale: 1, opacity: 1, rotate: -0.8 }}
        transition={pop}
        className="pointer-events-auto relative w-full max-w-[540px] rounded-[22px] bg-card px-5 pt-3 pb-4 text-left shadow-[0_6px_0_var(--card-shadow)]"
      >
        <span className="inline-block rounded-full bg-accent px-3 py-0.5 text-[13px] font-bold text-white shadow-[0_3px_0_var(--accent-shadow)]">
          ¡Paradoja!
        </span>
        <span className="mt-2 block text-[17px] leading-snug font-bold" lang="es">
          “{banner.door.text}” <span className="text-muted">· {TENSE_LABEL[banner.door.tense]}</span>
        </span>
        <span className="mt-1 block text-[15px] leading-snug">{banner.door.feedback}</span>
        <span className="mt-2 block text-[12px] font-bold text-faint">
          The maze loops you back. The rule is painted on that door.
        </span>
        {/* bubble tail */}
        <span
          aria-hidden
          className="absolute -bottom-3 left-10 h-6 w-6 rotate-45 rounded-[4px] bg-card shadow-[4px_4px_0_var(--card-shadow)]"
        />
      </motion.button>
    </div>
  );
}

function Panel({
  i,
  className,
  style,
  children,
}: {
  i: number;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const tilt = i % 2 ? 0.8 : -0.8;
  return (
    <motion.div
      initial={{ opacity: 0, x: -60, rotate: tilt * 4 }}
      animate={{ opacity: 1, x: 0, rotate: tilt }}
      transition={{ ...pop, delay: i * 0.12 }}
      className={`flex min-h-0 flex-col items-center justify-center rounded-[22px] p-5 text-center ${className}`}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/** Correct door: graphic-novel panels (as stickers) until the player continues. */
function Correct({
  banner,
  island,
  onContinue,
}: {
  banner: Extract<Banner, { kind: "correct" }>;
  island: Island;
  onContinue: () => void;
}) {
  const sentence = banner.prompt.replace(/\.\.\.$|…$/, "") + " " + banner.door.text.replace(/^\.\.\.|^…/, "");
  return (
    <div
      role="status"
      className="absolute inset-0 z-40 flex flex-col gap-4 overflow-y-auto bg-[color-mix(in_srgb,var(--ink)_35%,transparent)] px-4 pt-[calc(16px+env(safe-area-inset-top))] pb-[calc(20px+env(safe-area-inset-bottom))] lg:flex-row lg:items-center lg:justify-center lg:p-10"
    >
      <Panel i={0} className="shrink-0 bg-accent py-6 shadow-[0_8px_0_var(--accent-shadow)] lg:min-h-[340px] lg:max-w-[300px] lg:flex-[0.7]">
        <span className="text-[56px] leading-none font-bold text-white lg:text-[88px]" aria-hidden>
          ¡Zas!
        </span>
        <span className="mt-1 text-[14px] font-bold text-white/80">Door opened</span>
      </Panel>
      <Panel i={1} className="bg-card shadow-[0_6px_0_var(--card-shadow)] lg:min-h-[340px] lg:max-w-[620px] lg:flex-[1.6]">
        <p className="max-w-[34ch] text-[22px] leading-tight font-bold lg:text-[30px]" lang="es">
          {sentence}
        </p>
        <p className="mt-3 max-w-[40ch] text-[15px] leading-snug text-muted">
          <strong className="text-ink">{TENSE_LABEL[banner.door.tense]}.</strong> {banner.door.feedback}
        </p>
        <button
          type="button"
          autoFocus
          onClick={onContinue}
          className="press mt-5 min-h-12 rounded-full bg-ink px-7 text-[18px] font-bold text-on-ink shadow-[0_6px_0_var(--ink-shadow)]"
        >
          Continue →
        </button>
        <span className="mt-2 hidden text-[12px] font-bold text-faint lg:block">or press Enter</span>
      </Panel>
      {banner.islandChanged && (
        <Panel i={2} className="shrink-0 bg-card shadow-[0_6px_0_var(--card-shadow)] lg:min-h-[340px] lg:max-w-[400px] lg:flex-1">
          <span className="text-[13px] font-bold text-muted">Rumbo a</span>
          <span className="my-1 flex items-center gap-2 text-[36px] leading-none font-bold lg:text-[48px]">
            <span className="h-5 w-5 rounded-full" style={{ background: island.palette.accent }} aria-hidden />
            {island.name}
          </span>
          <span className="text-[14px] font-bold text-muted">{island.theme}</span>
        </Panel>
      )}
    </div>
  );
}

function Collapse({ id }: { id: number }) {
  return (
    <motion.div
      key={id}
      role="alert"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 2.1, duration: 0.45 }}
      className="pointer-events-none absolute inset-0 z-40 flex flex-col gap-4 bg-[color-mix(in_srgb,var(--ink)_35%,transparent)] p-4 pt-[calc(16px+env(safe-area-inset-top))] lg:flex-row lg:items-center lg:justify-center lg:p-10"
    >
      <Panel i={0} className="flex-1 bg-accent shadow-[0_8px_0_var(--accent-shadow)] lg:min-h-[300px] lg:max-w-[420px]">
        <span className="text-[64px] leading-none font-bold text-white lg:text-[96px]">¡Crac!</span>
      </Panel>
      <Panel i={1} className="flex-1 bg-ink text-on-ink shadow-[0_6px_0_var(--ink-shadow)] lg:min-h-[300px] lg:max-w-[520px]">
        <p className="text-[26px] leading-tight font-bold" lang="es">
          El Hierro se derrumba…
        </p>
        <p className="mt-2 text-[15px] opacity-80">Time ran out. The gauntlet reshuffles.</p>
      </Panel>
    </motion.div>
  );
}

export function BannerView({
  banner,
  island,
  onContinue,
  onDismiss,
}: {
  banner: Banner;
  island: Island;
  onContinue: () => void;
  onDismiss: () => void;
}) {
  if (banner.kind === "paradox") return <Paradox banner={banner} onDismiss={onDismiss} />;
  if (banner.kind === "collapse") return <Collapse id={banner.id} />;
  return <Correct key={banner.id} banner={banner} island={island} onContinue={onContinue} />;
}

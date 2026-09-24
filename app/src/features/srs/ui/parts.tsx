"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

/** Small tag above a card: kind · box. */
export function CardTag({ label, box, isNew }: { label: string; box: number; isNew: boolean }) {
  return (
    <span className="inline-block rounded-full bg-pill px-3 py-1 text-[12px] font-bold text-muted shadow-[0_3px_0_var(--card-shadow)]">
      {label} · {isNew ? "nueva" : `caja ${box}`}
    </span>
  );
}

/** The verdict after checking: warm yellow when right, pink when wrong. */
export function Verdict({
  correct,
  title,
  lines = [],
  children,
}: {
  correct: boolean;
  title: string;
  lines?: string[];
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      role="status"
      className={`rounded-[22px] p-4 ${
        correct
          ? "bg-pill-deep text-ink shadow-[0_6px_0_var(--card-shadow)]"
          : "bg-accent text-white shadow-[0_6px_0_var(--accent-shadow)]"
      }`}
    >
      <div className="text-[12px] font-bold opacity-80">{correct ? "¡Correcto!" : "Not quite"}</div>
      <div className="mt-0.5 text-[24px] leading-tight font-bold">{title}</div>
      {lines.map((line) => (
        <div key={line} className="mt-1 text-[14px] leading-snug opacity-90">
          {line}
        </div>
      ))}
      {children}
    </motion.div>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "ink" | "light" | "accent";
};

/** Sticker pill button; ink is for the one primary action in view. */
export function Pill({ tone = "ink", className = "", ...props }: ButtonProps) {
  const toneClass = {
    ink: "bg-ink text-on-ink shadow-[0_6px_0_var(--ink-shadow)]",
    light: "bg-card text-ink shadow-[0_6px_0_var(--card-shadow)]",
    accent: "bg-accent text-white shadow-[0_6px_0_var(--accent-shadow)]",
  }[tone];
  return (
    <button
      {...props}
      className={`press min-h-12 rounded-full px-5 py-3 text-[17px] font-bold disabled:pointer-events-none disabled:opacity-40 ${toneClass} ${className}`}
    />
  );
}

/** Continue button that also answers to Enter / Space (Spanyard habit). */
export function ContinueButton({ onContinue }: { onContinue: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code === "Enter" || event.code === "Space") {
        event.preventDefault();
        onContinue();
      }
    }
    // Next tick, so the Enter that submitted the answer doesn't also continue.
    const id = setTimeout(() => window.addEventListener("keydown", onKey), 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [onContinue]);

  return (
    <Pill autoFocus onClick={onContinue} className="w-full">
      Continue →
    </Pill>
  );
}

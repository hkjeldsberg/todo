"use client";

/** Small shared pieces: drawn stars (no glyphs), level pill, primary pill. */

const STAR = "polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

export function Stars({ n, of = 3, size = 16 }: { n: number; of?: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} de ${of} estrellas`} role="img">
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={i < n ? "bg-accent" : "bg-pill-deep"} style={{ width: size, height: size, clipPath: STAR, display: "inline-block" }} />
      ))}
    </span>
  );
}

export function LevelPill({ level }: { level: string }) {
  return <span className="rounded-full bg-pill px-2 py-[1px] text-[12px] font-bold text-ink">{level}</span>;
}

export function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="press min-h-12 rounded-full bg-ink px-6 text-[18px] font-bold text-on-ink shadow-[0_6px_0_var(--ink-shadow)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="press min-h-11 rounded-full bg-card px-4 text-[14px] font-bold text-ink shadow-[0_4px_0_var(--card-shadow)] [--press:4px]">
      {children}
    </button>
  );
}

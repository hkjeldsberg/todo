"use client";

/** "Mostrar sugerencias": a pill switch. Free to use; it only changes the points (5 vs 15). */
export function InputToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex min-h-11 items-center gap-2 rounded-full py-1 pr-1 pl-3 text-[13px] font-bold text-ink"
    >
      <span>Mostrar sugerencias</span>
      <span className={`relative h-7 w-12 rounded-full transition-colors ${on ? "bg-accent" : "bg-pill-deep"}`}>
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-card shadow-[0_2px_0_rgba(36,19,42,0.3)] transition-[left] duration-150 ${on ? "left-6" : "left-1"}`}
        />
      </span>
    </button>
  );
}

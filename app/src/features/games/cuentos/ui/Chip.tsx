"use client";

/** Sticker chip/pill button in memo's style. */
export function PressButton({
  tone = "light",
  className = "",
  depth = 4,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "ink" | "light" | "accent" | "pill";
  depth?: number;
}) {
  const tones = {
    ink: "bg-ink text-on-ink shadow-[0_var(--press)_0_var(--ink-shadow)]",
    light: "bg-card text-ink shadow-[0_var(--press)_0_var(--card-shadow)]",
    accent: "bg-accent text-white shadow-[0_var(--press)_0_var(--accent-shadow)]",
    pill: "bg-pill text-ink shadow-[0_var(--press)_0_var(--card-shadow)]",
  };
  return (
    <button
      {...props}
      className={`press rounded-full font-bold disabled:pointer-events-none disabled:opacity-40 ${tones[tone]} ${className}`}
      style={{ ["--press" as string]: `${depth}px`, ...props.style }}
    />
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type RefObject } from "react";
import styles from "../donde.module.css";
import { candidateZones } from "../model/judge";
import type { ViewState } from "../scene/context";
import { ZOOM_MAX, ZOOM_MIN } from "../scene/context";
import type { DondeState } from "../useDonde";
import { Builder } from "./Builder";

const HOW: Record<string, string> = {
  drag: "Place it",
  flap: "Find it",
  pick: "Find it",
  pin: "Pin it",
  build: "Label it",
};

const HOW_HINT: Record<string, string> = {
  drag: "Drag the piece onto the right spot. Or tap it, then tap a pink spot.",
  flap: "Lift the right cover. Rotate the room to look around.",
  pick: "Tap the right one. Rotate, zoom or change floors to look.",
  pin: "Tap the right building to pin it.",
  build: "Build the label with the Dymo words.",
};

const chip = "press flex h-11 min-w-11 items-center justify-center rounded-full bg-card px-3 text-[15px] font-bold text-ink shadow-[0_3px_0_var(--card-shadow)] [--press:3px]";

export function Hud({ s, viewRef, source, exit }: { s: DondeState; viewRef: RefObject<ViewState>; source: string; exit(): void }) {
  const [hint, setHint] = useState(false);
  const [alt, setAlt] = useState(false);
  const [menu, setMenu] = useState(false);
  const [padBottom, setPadBottom] = useState(110);
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const { task, layout } = s;
  const total = s.book.pages.reduce((n, p) => n + p.tasks.length, 0);
  const isLast = s.pageIndex === s.book.pages.length - 1;
  const multiFloor = layout.floors.length > 1;

  // Tell the camera how much screen the HUD covers, so the diorama centres in the rest.
  useEffect(() => {
    const measure = () => {
      const t = top.current?.getBoundingClientRect();
      const b = bottom.current?.getBoundingClientRect();
      if (t) viewRef.current.padTop = t.bottom + 6;
      if (b) {
        const pb = window.innerHeight - b.top + 6;
        viewRef.current.padBottom = pb;
        setPadBottom(pb);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (top.current) ro.observe(top.current);
    if (bottom.current) ro.observe(bottom.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [viewRef]);

  const choices =
    task && task.mechanic !== "build"
      ? candidateZones(task)
          .map((id) => layout.zones.find((z) => z.id === id))
          .filter((z) => z !== undefined)
          .sort((a, b) => a.label_en.localeCompare(b.label_en))
      : [];

  const rotate = (d: number) => {
    viewRef.current.step += d;
  };
  const zoom = (f: number) => {
    const v = viewRef.current;
    v.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom * f));
  };

  return (
    <>
      {/* ── top: exit chip, page tabs, progress; then the prompt ── */}
      <div ref={top} className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
        <div className="pointer-events-auto flex w-full max-w-[760px] items-center gap-2">
          <button type="button" className={chip} onClick={exit} aria-label="Back to games">
            ✕
          </button>
          <nav className="flex min-w-0 flex-1 justify-center gap-1.5" aria-label="Scrapbook pages">
            {s.book.pages.map((p, i) => {
              const done = p.tasks.every((t) => s.done.includes(t.id));
              const current = i === s.pageIndex;
              return (
                <button
                  key={p.page_id}
                  type="button"
                  onClick={() => s.goToPage(i)}
                  aria-current={current ? "page" : undefined}
                  aria-label={`Page ${i + 1}: ${p.title_en}${done ? " (complete)" : ""}`}
                  title={p.title_es}
                  className={`press flex h-11 min-w-11 items-center justify-center truncate rounded-full px-3 text-[14px] font-bold [--press:3px] ${
                    current ? "bg-accent text-white shadow-[0_3px_0_var(--accent-shadow)]" : done ? "bg-pill-deep text-ink shadow-[0_3px_0_var(--card-shadow)]" : "bg-card text-ink shadow-[0_3px_0_var(--card-shadow)]"
                  }`}
                >
                  <span className="sm:hidden">{i + 1}</span>
                  <span className="hidden sm:inline" lang="es">
                    {i + 1} · {p.title_es}
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="relative flex items-center gap-1.5">
            <span className="rounded-full bg-pill px-2.5 py-1 text-[12px] font-bold text-ink" aria-label={`${s.done.length} of ${total} tasks done`}>
              {s.done.length}/{total}
            </span>
            <button type="button" className={chip} aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              ▾
            </button>
            {menu && (
              <div className="absolute top-13 right-0 z-30 flex w-52 flex-col gap-1 rounded-[22px] bg-card p-2 shadow-[0_6px_0_var(--card-shadow)]">
                <button
                  type="button"
                  className="min-h-11 rounded-full px-3 text-left text-[15px] font-bold hover:bg-pill"
                  onClick={() => {
                    s.reset();
                    setMenu(false);
                  }}
                >
                  Start over
                </button>
                <button type="button" className="min-h-11 rounded-full px-3 text-left text-[15px] font-bold hover:bg-pill" onClick={exit}>
                  Back to games
                </button>
                {source && process.env.NODE_ENV !== "production" && <span className="px-3 pb-1 text-[12px] text-faint">content: {source}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="pointer-events-auto w-full max-w-[640px]" aria-live="polite">
          <AnimatePresence mode="wait">
            {task ? (
              <motion.div
                key={task.id}
                className="flex flex-col items-center gap-1"
                initial={{ y: -30, rotate: -2, opacity: 0 }}
                animate={{ y: 0, rotate: -0.6, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`${styles.dymo} ${styles.dymoAccent}`}>{HOW[task.mechanic]}</span>
                  <button type="button" className="min-h-9 rounded-full bg-pill px-3 text-[13px] font-bold text-ink" aria-expanded={hint} onClick={() => setHint((h) => !h)}>
                    {hint ? "Hide hint" : "Hint ▾"}
                  </button>
                </div>
                <h1 className={`${styles.tape} text-center text-[20px] sm:text-[28px]`} lang="es">
                  {task.prompt_text}
                </h1>
                {hint && (
                  <p className="rounded-full bg-card px-3 py-0.5 text-center text-[13px] font-bold text-muted shadow-[0_3px_0_var(--card-shadow)]">
                    {task.prompt_en} <span className="text-faint">· {HOW_HINT[task.mechanic]}</span>
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div key="done" className="flex flex-col items-center gap-2" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <h1 className={`${styles.tape} text-center text-[22px] sm:text-[28px]`} lang="es">
                  {isLast ? "¡Álbum completo!" : "¡Página completa!"}
                </h1>
                <button
                  type="button"
                  className="press min-h-11 rounded-full bg-ink px-5 text-[16px] font-bold text-on-ink shadow-[0_6px_0_var(--ink-shadow)]"
                  onClick={() => (isLast ? exit() : s.goToPage(s.pageIndex + 1))}
                >
                  {isLast ? "Back to games" : "Next page ▸"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── feedback sticky note: always above the controls, never over the prompt ── */}
      <div className="pointer-events-none fixed inset-x-0 z-20 flex justify-center px-4" style={{ bottom: padBottom + 6 }}>
        <AnimatePresence>
          {s.note && (
            <motion.div
              key={s.note.id}
              role="status"
              className={`pointer-events-auto w-full max-w-[340px] ${styles.sticky} ${s.note.tone === "error" ? styles.stickyError : styles.stickySuccess}`}
              initial={{ y: 30, rotate: s.note.tone === "error" ? 4 : -4, scale: 0.8, opacity: 0 }}
              animate={{ y: 0, rotate: s.note.tone === "error" ? 1.5 : -1.5, scale: 1, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 20 }}
            >
              <span className="absolute top-2.5 left-3 text-[20px]" aria-hidden>
                {s.note.tone === "error" ? "✕" : "*"}
              </span>
              <p className="m-0 pr-6" lang="es">
                {s.note.text}
              </p>
              <button type="button" className="absolute top-0 right-0 h-11 w-11 text-[16px] opacity-60" aria-label="Dismiss note" onClick={s.dismissNote}>
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── bottom: builder / alternatives, then camera controls ── */}
      <div ref={bottom} className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]">
        {task?.mechanic === "build" && (
          <div className="pointer-events-auto w-full max-w-[560px] rounded-[22px] bg-page/95 px-3 py-3 shadow-[0_6px_0_var(--card-shadow)]">
            <Builder key={task.id} task={task} fills={s.fills} onPlace={s.placeWord} onClear={s.clearWord} />
          </div>
        )}
        {alt && choices.length > 0 && (
          <div className="pointer-events-auto flex w-full max-w-[560px] flex-col gap-1.5 rounded-[22px] bg-card p-2.5 shadow-[0_6px_0_var(--card-shadow)]" role="group" aria-label="Choose without dragging">
            <span className="px-1 text-[12px] font-bold text-muted">{task?.mechanic === "drag" ? "Move the piece to:" : "Choose:"}</span>
            <div className="flex flex-wrap gap-1.5">
              {choices.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  className="press min-h-11 rounded-full bg-pill px-3 text-[14px] font-bold text-ink shadow-[0_3px_0_var(--card-shadow)] [--press:3px]"
                  onClick={() => (task?.mechanic === "drag" ? s.dropIntoZone(z.id) : s.chooseZone(z.id))}
                >
                  {z.label_en}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5" role="toolbar" aria-label="Camera">
          <button type="button" className={chip} aria-label="Rotate left" onClick={() => rotate(-1)} style={{ fontSize: 22 }}>
            ⟲
          </button>
          <button type="button" className={chip} aria-label="Rotate right" onClick={() => rotate(1)} style={{ fontSize: 22 }}>
            ⟳
          </button>
          <button type="button" className={chip} aria-label="Zoom out" onClick={() => zoom(1 / 1.3)}>
            −
          </button>
          <button type="button" className={chip} aria-label="Zoom in" onClick={() => zoom(1.3)}>
            +
          </button>
          {multiFloor && (
            <div className="flex rounded-full bg-card p-1 shadow-[0_3px_0_var(--card-shadow)]" role="group" aria-label="Floor">
              {[
                { f: 1, label: "arriba" },
                { f: 0, label: "abajo" },
              ].map(({ f, label }) => (
                <button
                  key={f}
                  type="button"
                  lang="es"
                  aria-pressed={s.floor === f}
                  onClick={() => s.setFloor(f)}
                  className={`h-9 rounded-full px-3 text-[14px] font-bold ${s.floor === f ? "bg-pill-deep text-ink" : "text-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {choices.length > 0 && (
            <button type="button" className={`${chip} ${alt ? "bg-pill-deep" : ""}`} aria-expanded={alt} onClick={() => setAlt((a) => !a)}>
              {alt ? "Hide spots" : "Spots ▸"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

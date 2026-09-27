"use client";

import { motion, useAnimate } from "framer-motion";
import { useEffect, useRef } from "react";
import { VERBS, type Verb } from "../lib/types";
import styles from "../was.module.css";

export type Point = { x: number; y: number };

/** Viewport coordinates of the pointer that moved / released the drag. */
function clientPoint(event: MouseEvent | TouchEvent | PointerEvent): Point {
  if ("changedTouches" in event) {
    const t = event.changedTouches[0];
    return { x: t.clientX, y: t.clientY };
  }
  return { x: event.clientX, y: event.clientY };
}

type Props = {
  solvedCount: number;
  total: number;
  selected: Verb | null;
  rejection: { verb: Verb; key: number } | null;
  onSelect: (verb: Verb | null) => void;
  onDragMove: (point: Point) => void;
  onDrop: (verb: Verb, point: Point) => void;
};

/** Sticky bottom bar: progress + the four draggable verbs (tap to select as a fallback). */
export function VerbBank({ solvedCount, total, selected, rejection, onSelect, onDragMove, onDrop }: Props) {
  return (
    <div className="sticky bottom-0 z-40 border-t-4 border-(--c-ink) bg-(--c-paper)/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-5 sm:px-6">
        <div className="shrink-0 text-center leading-none" aria-live="polite" data-testid="was-progress">
          <span className={`${styles.display} text-3xl`}>
            {solvedCount}/{total}
          </span>
          <span className="block text-[0.65rem] font-bold tracking-wider text-(--c-ink)/60 uppercase">viñetas</span>
        </div>
        <div
          className="grid flex-1 grid-cols-4 gap-2 sm:gap-3"
          role="toolbar"
          aria-label="Verb bank: drag a verb onto a panel, or tap a verb then tap a blank"
        >
          {VERBS.map((verb) => (
            <VerbChip
              key={verb}
              verb={verb}
              selected={selected === verb}
              rejectKey={rejection?.verb === verb ? rejection.key : undefined}
              onSelect={() => onSelect(selected === verb ? null : verb)}
              onDragMove={onDragMove}
              onDrop={(point) => onDrop(verb, point)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function VerbChip({
  verb,
  selected,
  rejectKey,
  onSelect,
  onDragMove,
  onDrop,
}: {
  verb: Verb;
  selected: boolean;
  rejectKey: number | undefined;
  onSelect: () => void;
  onDragMove: (point: Point) => void;
  onDrop: (point: Point) => void;
}) {
  const [scope, animate] = useAnimate();
  // A drag also produces a click on release; ignore that one.
  const dragged = useRef(false);

  useEffect(() => {
    if (rejectKey === undefined) return;
    animate(scope.current, { rotate: [0, -12, 10, -6, 3, 0] }, { duration: 0.5, delay: 0.15 });
  }, [rejectKey, animate, scope]);

  return (
    <div ref={scope}>
      <motion.button
        type="button"
        drag
        dragSnapToOrigin
        dragElastic={1}
        // Snap-back runs as an inertia animation to the origin: these make it bounce.
        dragTransition={{ bounceStiffness: 600, bounceDamping: 18 }}
        whileDrag={{ scale: 1.15, rotate: -4, zIndex: 50, cursor: "grabbing" }}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.96 }}
        onPointerDown={() => {
          dragged.current = false;
        }}
        onDragStart={() => {
          dragged.current = true;
        }}
        onDrag={(e) => onDragMove(clientPoint(e))}
        onDragEnd={(e) => onDrop(clientPoint(e))}
        onClick={() => {
          if (!dragged.current) onSelect();
        }}
        aria-pressed={selected}
        className={`${styles.display} relative w-full cursor-grab touch-none rounded-xl border-[3px] border-(--c-ink) px-1 py-2 text-xl tracking-wider shadow-[3px_3px_0_var(--c-ink)] transition-colors select-none sm:text-2xl ${
          selected ? "bg-(--c-pop)" : "bg-white"
        }`}
      >
        {verb}
      </motion.button>
    </div>
  );
}

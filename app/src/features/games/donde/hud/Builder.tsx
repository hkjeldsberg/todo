"use client";

import { motion, type PanInfo } from "framer-motion";
import { useState } from "react";
import styles from "../donde.module.css";
import { capitalizeFirst } from "../model/grammar";
import type { Task } from "../model/schema";

interface Props {
  task: Task;
  fills: readonly (string | null)[];
  /** Returns false when the grammar rejects the drop. */
  onPlace: (slot: number, token: string) => boolean;
  onClear: (slot: number) => void;
}

/**
 * Dymo sentence builder: a masking-tape sentence with gaps and a tray of embossed word labels.
 * Drag a label onto a gap, or tap a label and then a gap (keyboard friendly). "Hay el…" and
 * "de el" are physically rejected: the label bounces out and a red note explains why.
 */
export function Builder({ task, fills, onPlace, onClear }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [rejected, setRejected] = useState<number | null>(null);
  if (!task.build) return null;

  const parts = task.build.template.split(/(\{\d+\})/).filter(Boolean);
  const used = new Set(fills.filter(Boolean));

  const place = (slot: number, token: string) => {
    setSelected(null);
    if (!onPlace(slot, token)) {
      setRejected(slot);
      setTimeout(() => setRejected(null), 650);
    }
  };

  const onDragEnd = (token: string) => (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const x = info.point.x - window.scrollX;
    const y = info.point.y - window.scrollY;
    const target = document.elementsFromPoint(x, y).find((el) => el instanceof HTMLElement && el.dataset.slot !== undefined) as HTMLElement | undefined;
    if (target) place(Number(target.dataset.slot), token);
  };

  return (
    <div className="flex flex-col items-center gap-2.5 select-none" data-builder>
      <p className={`${styles.tape} flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[19px] sm:text-[24px]`} lang="es">
        {parts.map((part, i) => {
          const m = part.match(/^\{(\d+)\}$/);
          if (!m) return <span key={i}>{i === 0 ? capitalizeFirst(part) : part}</span>;
          const slot = Number(m[1]);
          const value = fills[slot];
          const shown = value && i === 0 ? capitalizeFirst(value) : value;
          return (
            <motion.button
              key={i}
              type="button"
              data-slot={slot}
              className={`${styles.slot} ${value ? styles.slotFilled : ""} ${selected ? styles.slotReady : ""}`}
              animate={rejected === slot ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              aria-label={value ? `Gap ${slot + 1}: ${value}. Activate to remove.` : `Empty gap ${slot + 1}`}
              onClick={() => (selected ? place(slot, selected) : value && onClear(slot))}
            >
              {value ? <span className={styles.dymo}>{shown}</span> : "＿＿"}
            </motion.button>
          );
        })}
      </p>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Word labels">
        {task.build.tokens
          .filter((t) => !used.has(t))
          .map((token) => (
            <motion.button
              key={token}
              type="button"
              lang="es"
              data-token={token}
              className={`${styles.dymo} ${styles.token}`}
              aria-pressed={selected === token}
              drag
              dragSnapToOrigin
              dragElastic={0.9}
              dragTransition={{ bounceStiffness: 500, bounceDamping: 18 }}
              whileDrag={{ scale: 1.12, rotate: -3, zIndex: 5 }}
              onDragEnd={onDragEnd(token)}
              onClick={() => setSelected((s) => (s === token ? null : token))}
            >
              {token}
            </motion.button>
          ))}
      </div>
      <p className="text-[13px] font-bold text-muted">Drag a label into a gap, or tap a label and then a gap.</p>
    </div>
  );
}

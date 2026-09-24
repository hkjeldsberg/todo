"use client";

import { useMemo, useRef, useState } from "react";
import { tokenize } from "../text";
import { CardTag, ContinueButton, Pill, Verdict } from "./parts";
import { normalize, type ViewProps } from "./types";

type Placed = { id: string; token: number };

type Drag = {
  index: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  drop: number;
  width: number;
  height: number;
};

const TAP_THRESHOLD = 8;

/** Insert-before index nearest the pointer, ignoring the dragged chip itself. */
function insertIndex(x: number, y: number, dragging: number, chips: (HTMLElement | null)[]) {
  let best = dragging;
  let bestDistance = Infinity;
  chips.forEach((chip, index) => {
    if (!chip || index === dragging) return;
    const rect = chip.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    const before = Math.hypot(x - rect.left, y - mid);
    if (before < bestDistance) [bestDistance, best] = [before, index];
    const afterDistance = Math.hypot(x - rect.right, y - mid);
    if (afterDistance < bestDistance) [bestDistance, best] = [afterDistance, index + 1];
  });
  return best;
}

/**
 * Build the Spanish sentence from word chips. Tap a chip to place or remove it;
 * drag placed chips to reorder (a pink bar shows where it lands).
 */
export default function ScrambleView({ card, onResult, onNext }: ViewProps<"scramble">) {
  const tokens = useMemo(() => tokenize(card.sentence.spanish), [card.sentence.spanish]);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [seq, setSeq] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [result, setResult] = useState<boolean | null>(null);
  const chips = useRef<(HTMLElement | null)[]>([]);

  const used = new Set(placed.map((p) => p.token));
  const checked = result !== null;

  function toggle(token: number) {
    if (checked) return;
    if (used.has(token)) {
      setPlaced((list) => {
        const at = list.map((p) => p.token).lastIndexOf(token);
        return list.filter((_, index) => index !== at);
      });
    } else {
      setPlaced((list) => [...list, { id: `${token}-${seq}`, token }]);
      setSeq((n) => n + 1);
    }
  }

  function onDown(event: React.PointerEvent<HTMLSpanElement>, index: number) {
    if (checked) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    setDrag({
      index,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      drop: index,
      width: rect.width,
      height: rect.height,
    });
  }

  function onMove(event: React.PointerEvent<HTMLSpanElement>, index: number) {
    if (!drag || drag.index !== index) return;
    const drop = insertIndex(event.clientX, event.clientY, index, chips.current);
    setDrag({ ...drag, x: event.clientX, y: event.clientY, drop });
  }

  function onUp(event: React.PointerEvent<HTMLSpanElement>, index: number) {
    if (!drag || drag.index !== index) return;
    const moved = Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY);
    if (moved < TAP_THRESHOLD) {
      setPlaced((list) => list.filter((_, i) => i !== index));
    } else if (drag.drop !== index && drag.drop !== index + 1) {
      setPlaced((list) => {
        const next = [...list];
        const [item] = next.splice(index, 1);
        next.splice(drag.drop > index ? drag.drop - 1 : drag.drop, 0, item);
        return next;
      });
    }
    setDrag(null);
  }

  function check() {
    const built = placed.map((p) => tokens[p.token]).join(" ");
    const ok = normalize(built) === normalize(tokens.join(" "));
    setResult(ok);
    onResult(ok, built);
  }

  const bar = <span aria-hidden className="w-[3px] self-stretch rounded-full bg-accent" />;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <CardTag label={card.label} box={card.box} isNew={card.isNew} />
      </div>

      <p className="text-[24px] leading-snug font-bold italic">{card.sentence.english}</p>

      <div
        className={`flex min-h-[92px] flex-wrap content-start items-center gap-2 rounded-[22px] bg-card p-3.5 shadow-[0_6px_0_var(--card-shadow)] ring-2 ${
          checked ? (result ? "ring-pill-deep" : "ring-accent") : "ring-transparent"
        }`}
      >
        {placed.length === 0 && !drag && (
          <span className="pointer-events-none text-[14px] text-faint">
            Tap the words below in order.
          </span>
        )}
        {placed.map((p, index) => (
          <span key={p.id} className="contents">
            {drag && drag.drop === index && drag.index !== index && drag.index !== index - 1 && bar}
            <span
              ref={(el) => {
                chips.current[index] = el;
              }}
              onPointerDown={(event) => onDown(event, index)}
              onPointerMove={(event) => onMove(event, index)}
              onPointerUp={(event) => onUp(event, index)}
              onPointerCancel={() => setDrag(null)}
              className={`cursor-grab touch-none rounded-full bg-ink px-3.5 py-2 text-[17px] font-bold text-on-ink select-none ${
                drag?.index === index ? "opacity-25" : "shadow-[0_3px_0_var(--ink-shadow)]"
              }`}
            >
              {tokens[p.token]}
            </span>
          </span>
        ))}
        {drag && drag.drop === placed.length && drag.index !== placed.length - 1 && bar}
      </div>

      <div className="flex flex-wrap gap-2.5">
        {card.order.map((token) => {
          const taken = used.has(token);
          return (
            <button
              key={token}
              onClick={() => toggle(token)}
              disabled={checked}
              aria-pressed={taken}
              className={`press min-h-11 rounded-full px-4 py-2 text-[17px] font-bold ${
                taken
                  ? "bg-pill-flat text-faint shadow-none"
                  : "bg-pill text-ink shadow-[0_4px_0_var(--card-shadow)]"
              }`}
              style={{ ["--press" as string]: "4px" }}
            >
              {tokens[token]}
            </button>
          );
        })}
      </div>

      {checked && (
        <Verdict
          correct={result}
          title={card.word}
          lines={[
            `${card.pos ? `${card.pos} · ` : ""}${card.meaning}`,
            ...(result ? [] : [card.sentence.spanish]),
          ]}
        />
      )}

      <div className="mt-auto flex gap-3 pt-2">
        {!checked ? (
          <>
            <Pill tone="light" onClick={() => setPlaced([])} className="flex-1">
              Reset
            </Pill>
            <Pill onClick={check} disabled={placed.length !== tokens.length} className="flex-[2]">
              Check
            </Pill>
          </>
        ) : (
          <ContinueButton onContinue={onNext} />
        )}
      </div>

      {drag && placed[drag.index] && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 flex scale-110 items-center justify-center rounded-full bg-ink px-3.5 py-2 text-[17px] font-bold text-on-ink shadow-[0_6px_0_var(--accent-shadow)]"
          style={{
            left: drag.x - drag.width / 2,
            top: drag.y - drag.height / 2,
            width: drag.width,
          }}
        >
          {tokens[placed[drag.index].token]}
        </div>
      )}
    </div>
  );
}

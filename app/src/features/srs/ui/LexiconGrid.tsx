"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LexiconCell } from "../lexicon";
import { BOX_COLORS, BOX_NAMES } from "../boxes";


export default function LexiconGrid({ cells, fluency }: { cells: LexiconCell[]; fluency: number }) {
  const [query, setQuery] = useState("");
  const [inspected, setInspected] = useState<LexiconCell | null>(null);

  const started = cells.filter((cell) => cell.box > 0).length;
  const mastered = cells.filter((cell) => cell.box === 5).length;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      cells
        .filter((c) => c.spanish.toLowerCase().includes(q) || c.english.toLowerCase().includes(q))
        .map((c) => c.id),
    );
  }, [query, cells]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          [`${fluency}%`, "fluency"],
          [String(started), "started"],
          [String(mastered), "mastered"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-[18px] bg-card p-3 text-center shadow-[0_4px_0_var(--card-shadow)]">
            <div className="text-[22px] leading-none font-bold">{value}</div>
            <div className="mt-1 text-[12px] font-bold text-faint">{label}</div>
          </div>
        ))}
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search Spanish or English…"
        aria-label="Search words"
        className="w-full rounded-full bg-pill px-5 py-3 text-[16px] outline-none focus:ring-2 focus:ring-pill-deep"
      />

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-bold text-muted">
        {BOX_NAMES.map((name, box) => (
          <span key={name} className="flex items-center gap-1.5">
            <span className="size-3 rounded-[4px]" style={{ background: BOX_COLORS[box] }} />
            {name}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(14px,1fr))] gap-[3px]" role="list">
        {cells.map((cell) => {
          const dim = matches && !matches.has(cell.id);
          return (
            <button
              key={cell.id}
              role="listitem"
              onClick={() => setInspected(cell)}
              aria-label={`${cell.rank}. ${cell.spanish} — ${BOX_NAMES[cell.box]}`}
              className={`aspect-square rounded-[3px] ${
                matches?.has(cell.id) ? "ring-2 ring-ink" : ""
              } ${inspected?.id === cell.id ? "ring-2 ring-accent" : ""}`}
              style={{ background: BOX_COLORS[cell.box], opacity: dim ? 0.2 : 1 }}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {inspected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="sticky bottom-3 flex items-start gap-3 rounded-[22px] bg-card p-4 shadow-[0_6px_0_var(--card-shadow)]"
          >
            <span
              className="mt-1 size-5 shrink-0 rounded-[6px]"
              style={{ background: BOX_COLORS[inspected.box] }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[22px] leading-tight font-bold">{inspected.spanish}</div>
              <div className="text-[15px] text-muted">
                {inspected.pos ? `${inspected.pos} · ` : ""}
                {inspected.english}
              </div>
              <div className="mt-1 text-[12px] font-bold text-faint">
                #{inspected.rank} · {BOX_NAMES[inspected.box]}
                {inspected.nextReview &&
                  ` · next ${new Date(inspected.nextReview).toLocaleDateString("es", { day: "numeric", month: "short" })}`}
              </div>
            </div>
            <button
              onClick={() => setInspected(null)}
              aria-label="Close"
              className="flex size-11 items-center justify-center text-[18px] font-bold text-muted"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

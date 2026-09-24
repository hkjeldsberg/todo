"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Attempt } from "@/features/games/types";
import { assembleSentence } from "./model/grammar";
import { candidateZones, emptyFills, judgeBuild, judgeZone, placeToken } from "./model/judge";
import { parseProgress, type Progress } from "./model/progress";
import type { Page, Scrapbook, Task } from "./model/schema";
import { layouts, type SceneLayout, type V3 } from "./scene/layouts";

export interface Note {
  id: number;
  text: string;
  tone: "error" | "success";
}

export type DropResult = { accepted: true; slot: number } | { accepted: false };

interface Options {
  book: Scrapbook;
  initialProgress: unknown;
  saveProgress(p: Progress): void;
  recordAttempt(a: Attempt): void;
}

const dist2 = (a: V3, b: V3) => (a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2;

/** The storey a task happens on when the learner hasn't picked one: where its piece is. */
function defaultFloor(layout: SceneLayout, task: Task | null): number {
  if (task?.mechanic === "drag") return layout.pieces.find((p) => p.group === task.draggable_id)?.floor ?? 0;
  return 0;
}

export function useDonde({ book, initialProgress, saveProgress, recordAttempt }: Options) {
  const [progress, setProgress] = useState<Progress>(() => parseProgress(initialProgress));
  const [note, setNote] = useState<Note | null>(null);
  const [peek, setPeek] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [floorChoice, setFloorChoice] = useState<{ key: string; floor: number } | null>(null);
  const noteId = useRef(0);
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const peekTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const first = useRef(true);

  // Persist every change after the initial load (the host debounces).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    saveProgress(progress);
  }, [progress, saveProgress]);

  useEffect(
    () => () => {
      clearTimeout(noteTimer.current);
      clearTimeout(peekTimer.current);
    },
    [],
  );

  const pageIndex = Math.min(progress.page, book.pages.length - 1);
  const page: Page = book.pages[pageIndex];
  const layout = layouts[page.visual_layer];
  const task: Task | null = useMemo(() => page.tasks.find((t) => !progress.done.includes(t.id)) ?? null, [page, progress.done]);
  const candidates = useMemo(() => (task && task.mechanic !== "build" ? candidateZones(task) : []), [task]);

  const floorKey = `${pageIndex}:${task?.id ?? "done"}`;
  const floor = floorChoice?.key === floorKey ? floorChoice.floor : defaultFloor(layout, task);
  const setFloor = useCallback((f: number) => setFloorChoice({ key: floorKey, floor: Math.max(0, Math.min(layout.floors.length - 1, f)) }), [floorKey, layout.floors.length]);

  const say = useCallback((text: string, tone: Note["tone"]) => {
    clearTimeout(noteTimer.current);
    const next = { id: ++noteId.current, text, tone };
    setNote(next);
    noteTimer.current = setTimeout(() => setNote((n) => (n?.id === next.id ? null : n)), tone === "error" ? 6000 : 4200);
  }, []);
  const dismissNote = useCallback(() => setNote(null), []);

  const complete = useCallback(
    (t: Task, patch: Partial<Progress> = {}) => {
      setProgress((p) => ({ ...p, ...patch, done: p.done.includes(t.id) ? p.done : [...p.done, t.id] }));
      say(t.success_note, "success");
    },
    [say],
  );

  /** Drag-and-tape: the piece was released over `zoneId` (null: over no zone) at `point`. */
  const dropPiece = useCallback(
    (pieceId: string, zoneId: string | null, point?: V3): DropResult => {
      setSelected(null);
      if (!task || task.mechanic !== "drag") return { accepted: false };
      if (zoneId === null) {
        // Released over nothing: a nudge, not an answer.
        say(task.error_note, "error");
        return { accepted: false };
      }
      const verdict = judgeZone(task, zoneId);
      recordAttempt({ itemRef: task.id, correct: verdict.correct, answer: zoneId });
      if (!verdict.correct) {
        say(verdict.note, "error");
        return { accepted: false };
      }
      const zone = layout.zones.find((z) => z.id === zoneId);
      const slots = zone?.slots ?? [];
      const taken = new Set(Object.entries(progress.placed).filter(([id, pl]) => id !== pieceId && pl.zone === zoneId).map(([, pl]) => pl.slot));
      const free = slots.map((s, i) => ({ i, d: point ? dist2(point, s.pos) : i })).filter((s) => !taken.has(s.i));
      if (free.length === 0) {
        say("That spot is already taken. Try another side.", "error");
        return { accepted: false };
      }
      const slot = free.sort((a, b) => a.d - b.d)[0].i;
      const placed = { ...progress.placed, [pieceId]: { zone: zoneId, slot } };
      const group = layout.pieces.filter((p) => p.group === task.draggable_id);
      if (group.every((p) => placed[p.id]?.zone === task.target_zone)) complete(task, { placed });
      else setProgress((p) => ({ ...p, placed }));
      return { accepted: true, slot };
    },
    [task, layout, progress.placed, say, complete, recordAttempt],
  );

  /** Button alternative for dragging: moves the selected (or next loose) piece into the zone. */
  const dropIntoZone = useCallback(
    (zoneId: string) => {
      if (!task || task.mechanic !== "drag") return;
      const loose = layout.pieces.filter((p) => p.group === task.draggable_id && progress.placed[p.id]?.zone !== task.target_zone);
      const piece = loose.find((p) => p.id === selected) ?? loose[0];
      if (!piece) return;
      const zone = layout.zones.find((z) => z.id === zoneId);
      if (zone && zone.floor !== floor) setFloor(zone.floor);
      dropPiece(piece.id, zoneId);
    },
    [task, layout, progress.placed, selected, floor, setFloor, dropPiece],
  );

  /** Covers, objects and pins. */
  const chooseZone = useCallback(
    (zoneId: string): boolean => {
      if (!task || !["flap", "pick", "pin"].includes(task.mechanic)) return false;
      const verdict = judgeZone(task, zoneId);
      recordAttempt({ itemRef: task.id, correct: verdict.correct, answer: zoneId });
      const zone = layout.zones.find((z) => z.id === zoneId);
      if (zone && zone.floor !== floor) setFloor(zone.floor);
      if (task.mechanic === "flap") {
        // The cover lifts either way; a wrong one drops back after a moment.
        clearTimeout(peekTimer.current);
        setPeek(zoneId);
        if (!verdict.correct) peekTimer.current = setTimeout(() => setPeek((p) => (p === zoneId ? null : p)), 1800);
      }
      if (!verdict.correct) {
        say(verdict.note, "error");
        return false;
      }
      complete(task, { found: [...progress.found, zoneId] });
      return true;
    },
    [task, layout, floor, setFloor, progress.found, say, complete, recordAttempt],
  );

  const fills = useMemo(() => (task?.mechanic === "build" ? (progress.fills[task.id] ?? emptyFills(task)) : []), [task, progress.fills]);

  /** Dymo sentence builder. Returns false when the grammar physically rejects the drop. */
  const placeWord = useCallback(
    (slot: number, token: string): boolean => {
      if (!task || task.mechanic !== "build" || !task.build) return false;
      const current = progress.fills[task.id] ?? emptyFills(task);
      const result = placeToken(task, current, slot, token);
      if (!result.accepted) {
        const tried = current.map((f) => (f === token ? null : f));
        tried[slot] = token;
        // A rejected drop is a wrong answer (e.g. "Hay el gato").
        recordAttempt({ itemRef: task.id, correct: false, answer: assembleSentence(task.build.template, tried) });
        say(result.note, "error");
        return false;
      }
      const verdict = judgeBuild(task, result.fills);
      const patch = { fills: { ...progress.fills, [task.id]: result.fills } };
      if (verdict.status !== "incomplete") {
        recordAttempt({ itemRef: task.id, correct: verdict.status === "correct", answer: assembleSentence(task.build.template, result.fills) });
      }
      if (verdict.status === "correct") complete(task, patch);
      else {
        setProgress((p) => ({ ...p, ...patch }));
        if (verdict.status === "wrong") say(verdict.note, "error");
      }
      return true;
    },
    [task, progress.fills, say, complete, recordAttempt],
  );

  const clearWord = useCallback(
    (slot: number) => {
      if (!task || task.mechanic !== "build") return;
      setProgress((p) => {
        const next = [...(p.fills[task.id] ?? emptyFills(task))];
        next[slot] = null;
        return { ...p, fills: { ...p.fills, [task.id]: next } };
      });
    },
    [task],
  );

  const goToPage = useCallback(
    (index: number) => {
      setNote(null);
      setPeek(null);
      setSelected(null);
      setProgress((p) => ({ ...p, page: Math.max(0, Math.min(book.pages.length - 1, index)) }));
    },
    [book.pages.length],
  );

  const reset = useCallback(() => {
    setNote(null);
    setPeek(null);
    setSelected(null);
    setProgress(parseProgress(null));
  }, []);

  return {
    book,
    pageIndex,
    page,
    layout,
    task,
    candidates,
    done: progress.done,
    placed: progress.placed,
    found: progress.found,
    fills,
    allFills: progress.fills,
    note,
    peek,
    selected,
    setSelected,
    floor,
    setFloor,
    dismissNote,
    dropPiece,
    dropIntoZone,
    chooseZone,
    placeWord,
    clearWord,
    goToPage,
    reset,
  };
}

export type DondeState = ReturnType<typeof useDonde>;

"use client";

import { MotionConfig } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameProps } from "@/features/games/types";
import { emptyProgress, parseProgress, type Progress } from "./progress";
import { ROOM_SCENES, Scene } from "./Scene";
import type { RoomBindings } from "./slot";
import type { AnswerOption, Puzzle, TenseContent } from "./types";
import { Hud } from "./ui/Hud";
import { Menu } from "./ui/Menu";
import { Intro, Loading, RoomComplete } from "./ui/Overlays";
import { Prompt } from "./ui/Prompt";

const shuffle = <T,>(xs: T[]) => {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Dev only: scripts/tense-playtest.mjs seeds progress here to unlock a room without a database. */
function playtestProgress(): unknown {
  if (process.env.NODE_ENV === "production") return undefined;
  return (window as unknown as { __tenseProgress?: unknown }).__tenseProgress;
}

/** The Memory Diorama. Content was validated and sorted by ./server.ts. */
export default function Game({ content, source, initialProgress, saveProgress, recordAttempt, exit }: GameProps) {
  const { rooms } = content as TenseContent;
  const [progress, setProgress] = useState(() => parseProgress(playtestProgress() ?? initialProgress));
  const [chosenRoomId, setChosenRoomId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState<{ puzzle: Puzzle; options: AnswerOption[] } | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);

  // Persist every change after the first render (the host debounces the writes).
  const loaded = useRef(progress);
  useEffect(() => {
    if (progress !== loaded.current) saveProgress(progress);
  }, [progress, saveProgress]);

  const unlocked = useCallback(
    (i: number) => i === 0 || progress.completedRooms.includes(rooms[i - 1].id),
    [rooms, progress.completedRooms],
  );

  // Current room: explicit choice → last visited (if still unlocked) → first unfinished unlocked room.
  const roomId = useMemo(() => {
    if (chosenRoomId) return chosenRoomId;
    const lastIdx = rooms.findIndex((r) => r.id === progress.lastRoom);
    if (lastIdx >= 0 && unlocked(lastIdx)) return rooms[lastIdx].id;
    const next = rooms.findIndex((r, i) => unlocked(i) && !progress.completedRooms.includes(r.id));
    return rooms[next >= 0 ? next : 0].id;
  }, [rooms, chosenRoomId, progress.lastRoom, progress.completedRooms, unlocked]);

  const room = rooms.find((r) => r.id === roomId)!;
  const solved = useMemo(() => new Set(progress.solved), [progress.solved]);

  const selectRoom = (id: string) => {
    setChosenRoomId(id);
    setActive(null);
    setMenuOpen(false);
    setShowComplete(false);
    setJustCompleted(null);
    setProgress((p) => ({ ...p, lastRoom: id }));
  };

  const bindings = useMemo<RoomBindings>(
    () => ({
      puzzleFor: (obj) => room.puzzles.find((p) => p.scene_object === obj),
      isSolved: (id) => solved.has(id),
      onSelect: (puzzle) => {
        setWrong([]);
        setActive({ puzzle, options: shuffle(puzzle.options) });
      },
      interactive: started && !active && !showComplete && !menuOpen,
    }),
    [room, solved, started, active, showComplete, menuOpen],
  );

  const choose = (opt: AnswerOption) => {
    if (!active || solved.has(active.puzzle.id)) return;
    const pid = active.puzzle.id;
    recordAttempt({ itemRef: pid, correct: opt.correct, answer: opt.form });
    if (!opt.correct) {
      setWrong((w) => (w.includes(opt.form) ? w : [...w, opt.form]));
      setProgress((p) => ({ ...p, mistakes: { ...p.mistakes, [pid]: (p.mistakes[pid] ?? 0) + 1 } }));
      return;
    }
    const nowSolved = [...progress.solved, pid];
    const done = room.puzzles.every((p) => nowSolved.includes(p.id));
    setProgress((p) => ({
      ...p,
      solved: p.solved.includes(pid) ? p.solved : [...p.solved, pid],
      completedRooms: done && !p.completedRooms.includes(room.id) ? [...p.completedRooms, room.id] : p.completedRooms,
      lastRoom: room.id,
    }));
    if (done) setJustCompleted(room.id);
  };

  // After the final memory's animation has had time to play, celebrate.
  useEffect(() => {
    if (!justCompleted || active || justCompleted !== roomId) return;
    const id = setTimeout(() => setShowComplete(true), 2600);
    return () => clearTimeout(id);
  }, [justCompleted, active, roomId]);

  const reset = () => {
    const fresh: Progress = emptyProgress();
    setProgress(fresh);
    setChosenRoomId(rooms[0].id);
    setJustCompleted(null);
    setShowComplete(false);
    setMenuOpen(false);
  };

  const roomIndex = rooms.findIndex((r) => r.id === roomId);
  const nextRoom = rooms[roomIndex + 1];
  const hasScene = !!ROOM_SCENES[roomId];

  return (
    <MotionConfig reducedMotion="user">
      <main className="fixed inset-0 overflow-hidden bg-page text-ink select-none">
        {hasScene && <Scene roomId={roomId} bindings={bindings} paused={!!active || !started || menuOpen} />}
        {!hasScene && <Loading missingScene />}

        <Hud
          room={room}
          solved={solved}
          showRoom={started && !active && !menuOpen && !showComplete}
          onExit={exit}
          onMenu={() => {
            setActive(null);
            setMenuOpen(true);
          }}
        />

        {!started && <Intro onStart={() => setStarted(true)} resuming={progress.solved.length > 0} />}

        {active && (
          <Prompt
            puzzle={active.puzzle}
            options={active.options}
            solved={solved.has(active.puzzle.id)}
            wrong={wrong}
            onChoose={choose}
            onClose={() => setActive(null)}
          />
        )}

        {showComplete && (
          <RoomComplete
            room={room}
            mistakes={room.puzzles.reduce((n, p) => n + (progress.mistakes[p.id] ?? 0), 0)}
            nextRoom={nextRoom}
            onNext={() => nextRoom && selectRoom(nextRoom.id)}
            onStay={() => {
              setShowComplete(false);
              setJustCompleted(null);
            }}
          />
        )}

        {menuOpen && (
          <Menu
            rooms={rooms}
            currentId={roomId}
            unlocked={unlocked}
            completed={progress.completedRooms}
            source={source}
            onSelectRoom={selectRoom}
            onReset={reset}
            onResume={() => setMenuOpen(false)}
            onExit={exit}
          />
        )}
      </main>
    </MotionConfig>
  );
}

"use client";

import type { Room, RoomSummary } from "../types";
import { Sheet, TENSE_LABEL, inkPill, lightPill } from "./sticker";

export function TenseKey() {
  return (
    <div className="grid grid-cols-2 gap-2 text-left">
      {(["imperfect", "preterite"] as const).map((t, i) => (
        <div
          key={t}
          className={`rounded-[18px] px-3 py-2.5 ${i === 0 ? "bg-pill -rotate-[0.6deg]" : "bg-ai rotate-[0.6deg]"}`}
        >
          <strong lang="es" className="block text-[15px] font-bold">
            {TENSE_LABEL[t].es}
          </strong>
          <span className="block text-[13px] leading-snug">{TENSE_LABEL[t].hint}</span>
          <span className="mt-1 block text-[12px] font-bold text-muted">
            {t === "imperfect" ? "loops forever" : "changes the room"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Intro({ onStart, resuming }: { onStart: () => void; resuming: boolean }) {
  return (
    <Sheet label="The Memory Diorama">
      <div className="text-center">
        <p className="text-[12px] font-bold text-muted">A Spanish past-tense puzzle</p>
        <h1 className="text-[30px] leading-tight font-bold">The Memory Diorama</h1>
        <p className="mt-2 text-[15px] leading-relaxed">
          These rooms are fragments of a memory. Tap the objects with a pink marker and finish each sentence with
          the right past tense.
        </p>
        <div className="mt-4">
          <TenseKey />
        </div>
        <button type="button" autoFocus onClick={onStart} className={`${inkPill} mt-6 w-full`}>
          {resuming ? "Keep remembering" : "Enter the memory"}
        </button>
      </div>
    </Sheet>
  );
}

export function Loading({ missingScene }: { missingScene: boolean }) {
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center">
      <p className="text-[16px] font-bold text-muted">
        {missingScene ? "This room has no 3D scene yet." : "Recalling the memory…"}
      </p>
    </div>
  );
}

interface RoomCompleteProps {
  room: Room;
  mistakes: number;
  nextRoom?: RoomSummary;
  onNext: () => void;
  onStay: () => void;
}

export function RoomComplete({ room, mistakes, nextRoom, onNext, onStay }: RoomCompleteProps) {
  return (
    <Sheet label="Memory restored">
      <div className="text-center">
        <p lang="es" className="text-[14px] font-bold text-accent">
          ¡Memoria reconstruida!
        </p>
        <h2 lang="es" className="text-[28px] leading-tight font-bold">
          {room.title}
        </h2>
        <p className="mt-2 text-[15px]">
          {room.puzzles.length} memories restored with{" "}
          <strong className="font-bold">
            {mistakes === 0 ? "no mistakes. ¡Perfecto!" : `${mistakes} mistake${mistakes === 1 ? "" : "s"}`}
          </strong>
        </p>
        {nextRoom ? (
          <>
            <div className="mt-4 rounded-[18px] bg-pill px-4 py-3">
              <p className="text-[12px] font-bold text-muted">Next</p>
              <p lang="es" className="text-[17px] font-bold">
                {nextRoom.title}
              </p>
              <p className="text-[13px] text-muted">{nextRoom.focus}</p>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
              <button type="button" onClick={onStay} className={`${lightPill} flex-1`}>
                Stay here
              </button>
              <button type="button" autoFocus onClick={onNext} className={`${inkPill} flex-1`}>
                Next memory →
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 text-[15px]">
              You&apos;ve rebuilt every memory. The imperfect sets the scene; the preterite moves the story forward.
            </p>
            <button type="button" autoFocus onClick={onStay} className={`${inkPill} mt-5 w-full`}>
              Enjoy the room
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}


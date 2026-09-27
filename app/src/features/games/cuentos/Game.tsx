"use client";

import { useState, useTransition } from "react";
import type { GameProps } from "@/features/games/types";
import { createStory, deleteStory, openStory, saveWord, unsaveWord } from "./actions";
import type { CuentosContent } from "./lib/content";
import { parseProgress, type CuentosProgress } from "./lib/progress";
import type { Story, StorySummary, Target } from "./lib/schema";
import Library from "./ui/Library";
import NewStory from "./ui/NewStory";
import Reader from "./ui/Reader";

type View =
  | { name: "library" }
  | { name: "new" }
  | { name: "reading"; story: Story; saved: Set<string> };

/** Cuentos — the Smart Reader (PRD_STORY.md). Library → new story → reader. */
export default function Game({ content: raw, initialProgress, saveProgress, exit }: GameProps) {
  const content = raw as CuentosContent;
  const [stories, setStories] = useState<StorySummary[]>(content.stories);
  const [progress, setProgress] = useState(() => parseProgress(initialProgress));
  const [view, setView] = useState<View>({ name: "library" });
  const [error, setError] = useState<string | null>(null);
  const [generating, startGenerating] = useTransition();
  const [opening, setOpening] = useState<string | null>(null);

  function remember(next: CuentosProgress) {
    setProgress(next);
    saveProgress(next);
  }

  async function open(id: string) {
    setOpening(id);
    setError(null);
    const result = await openStory(id);
    setOpening(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setView({ name: "reading", story: result.data.story, saved: new Set(result.data.saved) });
    remember({ read: progress.read.includes(id) ? progress.read : [...progress.read, id], last: id });
    window.scrollTo(0, 0);
  }

  function create(input: { topic: string; targets: Target[]; level: "A1" | "A2" | "B1" }) {
    setError(null);
    startGenerating(async () => {
      const result = await createStory(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStories((list) => [result.data, ...list]);
      await open(result.data.id);
    });
  }

  async function remove(id: string) {
    const before = stories;
    setStories((list) => list.filter((s) => s.id !== id));
    const result = await deleteStory(id);
    if (!result.ok) {
      setStories(before);
      setError(result.error);
    }
  }

  /** Optimistic: the dot appears at once and is rolled back if the write fails. */
  async function toggleSave(key: string): Promise<string | null> {
    if (view.name !== "reading") return null;
    const { story, saved } = view;
    const wasSaved = saved.has(key);
    const flip = (on: boolean) =>
      setView((v) => {
        if (v.name !== "reading") return v;
        const next = new Set(v.saved);
        if (on) next.add(key);
        else next.delete(key);
        return { ...v, saved: next };
      });
    flip(!wasSaved);
    const result = wasSaved ? await unsaveWord(story.id, key) : await saveWord(story.id, key);
    if (!result.ok) {
      flip(wasSaved);
      return result.error;
    }
    return null;
  }

  if (view.name === "reading") {
    return (
      <Reader
        key={view.story.id}
        story={view.story}
        saved={view.saved}
        canSave={content.canSave}
        onToggleSave={toggleSave}
        onBack={() => setView({ name: "library" })}
      />
    );
  }

  if (view.name === "new" || generating) {
    return (
      <NewStory
        busy={generating}
        error={error}
        onSubmit={create}
        onCancel={() => {
          setError(null);
          setView({ name: "library" });
        }}
      />
    );
  }

  return (
    <>
      <Library
        stories={stories}
        read={progress.read}
        canGenerate={content.canGenerate}
        canSave={content.canSave}
        onOpen={open}
        onNew={() => {
          setError(null);
          setView({ name: "new" });
        }}
        onDelete={remove}
        onExit={exit}
      />
      {(error || opening) && (
        <div
          role={error ? "alert" : "status"}
          className={`fixed inset-x-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-[600px] rounded-[18px] p-3 text-center text-[14px] font-bold ${
            error ? "bg-accent text-white" : "bg-ink text-on-ink"
          }`}
        >
          {error ? `! ${error}` : "Opening…"}
        </div>
      )}
    </>
  );
}

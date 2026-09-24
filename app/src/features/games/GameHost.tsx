"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import type { GameProps } from "./types";
import { useGameBridge } from "./useGameBridge";

function Loading() {
  return (
    <main className="flex h-dvh items-center justify-center bg-page text-[15px] font-bold text-muted">
      Loading…
    </main>
  );
}

// WebGL + browser APIs: client only, one chunk per game so three.js never
// reaches the other pages.
const GAMES: Record<string, ComponentType<GameProps>> = {
  donde: dynamic(() => import("./donde/Game"), { ssr: false, loading: Loading }),
  tense: dynamic(() => import("./tense/Game"), { ssr: false, loading: Loading }),
  laberinto: dynamic(() => import("./laberinto/Game"), { ssr: false, loading: Loading }),
  opuestos: dynamic(() => import("./opuestos/Game"), { ssr: false, loading: Loading }),
};

export default function GameHost({
  slug,
  content,
  source,
  initialProgress,
}: {
  slug: string;
  content: unknown;
  source: "supabase" | "bundled";
  initialProgress: unknown | null;
}) {
  const router = useRouter();
  const { saveProgress, recordAttempt } = useGameBridge(slug);
  const Game = GAMES[slug];
  if (!Game) return null;

  return (
    <Game
      content={content}
      source={source}
      initialProgress={initialProgress}
      saveProgress={saveProgress}
      recordAttempt={recordAttempt}
      exit={() => router.push("/juegos")}
    />
  );
}

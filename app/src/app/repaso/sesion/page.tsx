import Setup from "@/design/Setup";
import { isConfigured } from "@/lib/db";
import { buildSession } from "@/features/srs/session";
import type { SessionFilter, WordMode } from "@/features/srs/types";
import SessionRunner from "@/features/srs/ui/SessionRunner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sesión · todo" };

const FILTERS: SessionFilter[] = ["all", "words", "phrases", "conjugar", "games"];
const MODES: WordMode[] = ["mixed", "cloze", "scramble"];
const TITLES: Record<SessionFilter, string> = {
  all: "Daily review",
  words: "Words",
  phrases: "Phrases",
  conjugar: "Conjugations",
  games: "Game mistakes",
};

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; mode?: string }>;
}) {
  if (!isConfigured()) return <Setup />;
  const params = await searchParams;
  const filter = FILTERS.find((f) => f === params.filter) ?? "all";
  const mode = MODES.find((m) => m === params.mode) ?? "mixed";

  let cards;
  try {
    cards = await buildSession({ filter, mode });
  } catch (cause) {
    return <Setup error={cause instanceof Error ? cause.message : String(cause)} />;
  }
  return <SessionRunner cards={cards} title={TITLES[filter]} />;
}

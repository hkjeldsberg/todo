import type { ChoiceCard } from "@/features/srs/card";

export type SkillTag =
  | "location"
  | "past-tenses"
  | "irregulars"
  | "vocab"
  | "future";

export type Level = "A1" | "A2" | "B1" | "B2";

/** What the /juegos grid and Hoy need to know about a game. Pure data. */
export type GameManifest = {
  slug: string;
  title: string;
  /** Short English line under the title. */
  subtitle: string;
  blurb: string;
  skills: SkillTag[];
  level: Level;
  /** Sticker card tone on the grid. */
  tone: "accent" | "light" | "ink";
};

/** One answer inside a game. `itemRef` must be stable across content reloads. */
export type Attempt = { itemRef: string; correct: boolean; answer?: string };

/** Props every game's client root receives from the host route. */
export type GameProps<Content = unknown, Progress = unknown> = {
  content: Content;
  /** Where the content came from; shown only in dev. */
  source: "supabase" | "bundled";
  /** Last saved progress for this game, or null on first play. */
  initialProgress: Progress | null;
  /** Persist progress. Debounced by the host; call freely. */
  saveProgress(progress: Progress): void;
  /** Report every answer. Wrong answers are queued for review in Repaso. */
  recordAttempt(attempt: Attempt): void;
  /** Leave the game (back to /juegos). */
  exit(): void;
};

/**
 * Server-side half of a game: loads content and turns a missed item into a
 * review card. Lives in `features/games/<slug>/server.ts`, registered in
 * `features/games/server-registry.ts`.
 */
export type GameServerModule<Content = unknown> = {
  loadContent(): Promise<{ content: Content; source: "supabase" | "bundled" }>;
  toReviewCard(itemRef: string, content: Content): ChoiceCard | null;
};

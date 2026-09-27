import bundled from "@/content/cuentos.json";
import { StorySchema, TARGETS, type Story, type StorySummary, type Target } from "./schema";

/** What the game root receives from the server. */
export type CuentosContent = {
  stories: StorySummary[];
  /** false without a database: the library is read-only (bundled sample only). */
  canSave: boolean;
  /** false without an Anthropic key: the "new story" form is disabled. */
  canGenerate: boolean;
};

export type StoryRow = {
  id: string;
  title: string;
  topic: string;
  level: string;
  target_tenses: string[];
  created_at: string;
  content_json?: unknown;
};

export function targetsOf(values: string[]): Target[] {
  return values.filter((v): v is Target => (TARGETS as readonly string[]).includes(v));
}

export function summaryFromRow(row: StoryRow): StorySummary {
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    level: row.level,
    targets: targetsOf(row.target_tenses),
    createdAt: row.created_at,
  };
}

/** A full story from a DB row, or null when its JSON no longer matches the schema. */
export function storyFromRow(row: StoryRow): Story | null {
  const parsed = StorySchema.safeParse(row.content_json);
  return parsed.success ? { ...summaryFromRow(row), content: parsed.data } : null;
}

/** The sample story shipped with the app (works with no database and no AI). */
export function bundledStories(): Story[] {
  return (bundled.stories as unknown[]).flatMap((raw) => {
    const s = raw as Omit<Story, "content"> & { content: unknown; targets: string[] };
    const content = StorySchema.safeParse(s.content);
    return content.success
      ? [{ id: s.id, title: s.title, topic: s.topic, level: s.level, targets: targetsOf(s.targets), createdAt: s.createdAt, content: content.data }]
      : [];
  });
}

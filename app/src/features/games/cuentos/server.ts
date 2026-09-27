import "server-only";
import type { GameServerModule } from "@/features/games/types";
import { db, isConfigured } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { bundledStories, summaryFromRow, type CuentosContent, type StoryRow } from "./lib/content";

const TIMEOUT_MS = 5000;
const SUMMARY = "id, title, topic, level, target_tenses, created_at";

/**
 * The library: the owner's stories, newest first. An empty library gets the
 * bundled sample once, so there is always something to read (and save from).
 */
async function fromSupabase(): Promise<CuentosContent> {
  const user = currentUserId();
  const list = () =>
    db()
      .from("stories")
      .select(SUMMARY)
      .eq("user_id", user)
      .order("created_at", { ascending: false })
      .abortSignal(AbortSignal.timeout(TIMEOUT_MS));

  let { data, error } = await list();
  if (error) throw new Error(error.message);

  if (!data?.length) {
    const rows = bundledStories().map((s) => ({
      user_id: user,
      topic: s.topic,
      level: s.level,
      target_tenses: s.targets,
      title: s.title,
      content_json: s.content,
      model: "bundled",
    }));
    const { error: seedError } = await db().from("stories").insert(rows);
    if (seedError) throw new Error(seedError.message);
    ({ data, error } = await list());
    if (error) throw new Error(error.message);
  }

  return {
    stories: (data as StoryRow[]).map(summaryFromRow),
    canSave: true,
    canGenerate: Boolean(process.env.ANTHROPIC_API_KEY),
  };
}

const server: GameServerModule<CuentosContent> = {
  async loadContent() {
    if (isConfigured()) {
      try {
        return { content: await fromSupabase(), source: "supabase" };
      } catch (cause) {
        console.warn("[cuentos] library from Supabase unavailable, using the bundled sample:", cause);
      }
    }
    return {
      content: { stories: bundledStories(), canSave: false, canGenerate: false },
      source: "bundled",
    };
  },
  // Saved words are Repaso cards of kind 'story' (see features/srs), not game items.
  toReviewCard() {
    return null;
  },
};

export default server;

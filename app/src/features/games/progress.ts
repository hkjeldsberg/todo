import "server-only";
import { db, isConfigured } from "@/lib/db";
import { currentUserId } from "@/lib/user";

/** Saved progress for one game, or null (first play, or no database). */
export async function loadGameProgress(slug: string): Promise<unknown | null> {
  if (!isConfigured()) return null;
  try {
    const { data, error } = await db()
      .from("game_progress")
      .select("state")
      .eq("user_id", currentUserId())
      .eq("game_slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data?.state ?? null;
  } catch (cause) {
    console.error(`[games] progress for ${slug} unavailable:`, cause);
    return null;
  }
}

/** Slugs hidden via todo.games.enabled = false (empty if the table can't be read). */
export async function disabledGames(): Promise<Set<string>> {
  if (!isConfigured()) return new Set();
  try {
    const { data, error } = await db().from("games").select("slug").eq("enabled", false);
    if (error) throw error;
    return new Set((data ?? []).map((row) => row.slug as string));
  } catch {
    return new Set();
  }
}

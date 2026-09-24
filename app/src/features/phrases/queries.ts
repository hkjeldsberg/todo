import "server-only";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import type { Category, Phrase, Scenario } from "@/features/phrases/types";

export type Snapshot = {
  scenarios: Scenario[];
  categories: Category[];
  phrases: Phrase[];
};

/**
 * The whole notebook in three queries. It is small (a few hundred rows at most),
 * so the client caches it and every later interaction is local — no per-tab fetch.
 */
export async function loadSnapshot(): Promise<Snapshot> {
  const [scenarios, categories, phrases] = await Promise.all([
    db()
      .from("scenarios")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    db()
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    db()
      .from("phrases")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const failure = scenarios.error ?? categories.error ?? phrases.error;
  if (failure) throw new Error(failure.message);

  return {
    scenarios: (scenarios.data ?? []) as Scenario[],
    categories: (categories.data ?? []) as Category[],
    phrases: (phrases.data ?? []) as Phrase[],
  };
}

/** Phrase ids queued in Repaso. Empty if the review table can't be read. */
export async function loadReviewedPhraseIds(): Promise<string[]> {
  const { data, error } = await db()
    .from("srs_items")
    .select("ref")
    .eq("user_id", currentUserId())
    .eq("kind", "phrase");
  if (error) {
    console.error("[phrases] review marks unavailable:", error.message);
    return [];
  }
  return (data ?? []).map((row) => String(row.ref).slice("phrase:".length));
}

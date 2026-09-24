import "server-only";
import { db, fetchAll } from "@/lib/db";
import { currentUserId } from "@/lib/user";

export type LexiconCell = {
  id: number;
  rank: number;
  spanish: string;
  english: string;
  pos: string | null;
  box: number;
  nextReview: string | null;
};

/** Every word with its Leitner box (0 = not started), in frequency order. */
export async function loadLexicon(): Promise<LexiconCell[]> {
  const [words, items] = await Promise.all([
    fetchAll<{ id: number; rank: number; spanish: string; english: string; pos: string | null }>(
      (from, to) =>
        db().from("words").select("id, rank, spanish, english, pos").order("rank").range(from, to),
    ),
    fetchAll<{ ref: string; box: number; next_review_at: string }>((from, to) =>
      db()
        .from("srs_items")
        .select("ref, box, next_review_at")
        .eq("user_id", currentUserId())
        .eq("kind", "word")
        .order("ref")
        .range(from, to),
    ),
  ]);
  const byId = new Map(items.map((item) => [Number(item.ref.slice(5)), item]));
  return words.map((word) => {
    const item = byId.get(word.id);
    return { ...word, box: item?.box ?? 0, nextReview: item?.next_review_at ?? null };
  });
}

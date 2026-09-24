"use server";

import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";

/** Slugs of every topic ticked as under control, on any device. */
export async function loadGrammarProgress(): Promise<string[]> {
  await requireSession();

  const { data, error } = await db().from("grammar_progress").select("slug");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.slug as string);
}

/** Ticking inserts the row; unticking removes it. */
export async function setTopicDone(slug: string, done: boolean): Promise<void> {
  await requireSession();

  const { error } = done
    ? await db()
        .from("grammar_progress")
        .upsert(
          { user_id: currentUserId(), slug },
          { onConflict: "user_id,slug" },
        )
    : await db().from("grammar_progress").delete().eq("slug", slug);

  if (error) throw new Error(error.message);
}

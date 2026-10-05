"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { currentUserId } from "@/lib/user";

const StatSchema = z.object({
  seen: z.number().int().min(0),
  right: z.number().int().min(0),
  streak: z.number().int().min(0),
  interval: z.number().int().min(1),
  last: z.iso.datetime(),
  due: z.iso.datetime(),
});

/** Writes one prompt's row (computed client-side by lib/srs.applyAnswer). */
export async function saveProbadorStat(promptId: string, stat: unknown): Promise<void> {
  await requireSession();
  if (!/^[a-z0-9_]+$/.test(promptId)) throw new Error(`bad prompt id ${promptId}`);
  const s = StatSchema.parse(stat);
  const { error } = await db()
    .from("probador_stats")
    .upsert(
      {
        user_id: currentUserId(),
        prompt_id: promptId,
        times_encountered: s.seen,
        times_correct: s.right,
        streak: s.streak,
        current_interval_minutes: s.interval,
        last_played_at: s.last,
        due_at: s.due,
      },
      { onConflict: "user_id,prompt_id" },
    );
  if (error) throw new Error(error.message);
}

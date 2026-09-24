"use server";

import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { chat, type ChatAnswer, type ChatTurn } from "@/features/phrases/chat";

/**
 * Ask Claude for phrases. The scenario's existing vocabulary is sent as context
 * so it stops proposing things the notebook already holds.
 */
export async function askClaude(
  history: ChatTurn[],
  scenarioId: string | null,
): Promise<ChatAnswer> {
  await requireSession();

  let context = "(no scenario selected)";

  if (scenarioId) {
    const [{ data: scenario }, { data: phrases }] = await Promise.all([
      db().from("scenarios").select("name").eq("id", scenarioId).single(),
      db()
        .from("phrases")
        .select("spanish_text, translation_text")
        .eq("scenario_id", scenarioId),
    ]);

    const existing = (phrases ?? [])
      .map((phrase) => `- ${phrase.spanish_text} — ${phrase.translation_text}`)
      .join("\n");

    context = [
      `Scenario: ${scenario?.name ?? "unknown"}`,
      `Existing phrases (${phrases?.length ?? 0}):`,
      existing || "(none yet)",
    ].join("\n");
  }

  return chat(history.slice(-12), context);
}

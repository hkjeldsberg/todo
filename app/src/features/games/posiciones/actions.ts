"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import server from "./server";

/**
 * Fallback parser (PRD §5.3): when the deterministic parser can't read an
 * answer, Claude maps it to ids. Claude never decides truth — the client runs
 * the ids through the relation engine like any other answer.
 */

const MODEL = "claude-haiku-4-5";
const TIMEOUT_MS = 4000;
const FAIL = { ok: false as const, error: "No te entendí — try again" };

const ParseSchema = z.object({
  /** null when the answer isn't a statement of where the gnome is. */
  expression_id: z.string().nullable(),
  reference_ids: z.array(z.string()),
  grammar_issues: z.array(z.string()),
});

export type ClaudeParse = { ok: true; expression_id: string; reference_ids: string[]; grammar_issues: string[] } | { ok: false; error: string };

function systemPrompt(expressions: string, objects: string, subject: string): string {
  return `You map a Spanish learner's answer to ids. The learner is saying where a garden gnome is hiding.

Location expressions (id: surface forms):
${expressions}

Things in this room (id: names):
${objects}

The subject is ${subject}.

Return:
- expression_id: the id of the location expression used, or null if the answer does not say where the gnome is.
- reference_ids: the ids of the things it is located against, in order (two for "entre … y …"), [] if none.
- grammar_issues: short English notes (with the correct Spanish) for real grammar mistakes only — hay with el/la, de el / a el not contracted, wrong article gender, está/están agreement, ser for location, a participle that doesn't agree with el gnomo. [] if the Spanish is fine. Ignore missing accents and capitals.

Never judge whether the sentence is true. Only use ids from the lists.`;
}

export async function parseWithClaude(text: string, sceneId: string): Promise<ClaudeParse> {
  await requireSession();
  const answer = text.trim().slice(0, 200);
  if (!answer || !process.env.ANTHROPIC_API_KEY) return FAIL;

  const { content } = await server.loadContent();
  const scene = content.scenes.find((s) => s.id === sceneId);
  if (!scene) return FAIL;
  const expressions = content.expressions.map((e) => `${e.id}: ${[...e.forms, ...(e.bare ? [e.bare] : [])].join(" | ")}`).join("\n");
  const objects = scene.objects.map((o) => `${o.id}: ${[o.es, ...o.aliases].join(" | ")}`).join("\n");
  const subject = [content.subject.es, ...content.subject.aliases].join(", ");

  const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 });
  let message;
  try {
    message = await client.messages.parse({
      model: MODEL,
      max_tokens: 300,
      system: systemPrompt(expressions, objects, subject),
      messages: [{ role: "user", content: answer }],
      output_config: { format: zodOutputFormat(ParseSchema) },
    });
  } catch (cause) {
    if (cause instanceof Anthropic.APIConnectionTimeoutError) console.warn("[posiciones] Claude fallback timed out");
    else if (cause instanceof Anthropic.RateLimitError) console.warn("[posiciones] Claude fallback rate-limited");
    else if (cause instanceof Anthropic.AuthenticationError) console.error("[posiciones] Anthropic API key rejected");
    else if (cause instanceof Anthropic.APIConnectionError) console.warn("[posiciones] could not reach Claude");
    else if (cause instanceof Anthropic.APIError) console.warn(`[posiciones] Claude error ${cause.status ?? ""}: ${cause.message}`);
    else console.error("[posiciones] Claude fallback failed:", cause);
    return FAIL;
  }

  const out = message.parsed_output;
  if (message.stop_reason === "refusal" || !out || !out.expression_id) return FAIL;
  const known = new Set(content.expressions.map((e) => e.id));
  const things = new Set(scene.objects.map((o) => o.id));
  if (!known.has(out.expression_id) || out.reference_ids.some((r) => !things.has(r))) return FAIL;
  return { ok: true, expression_id: out.expression_id, reference_ids: out.reference_ids.slice(0, 2), grammar_issues: out.grammar_issues.slice(0, 2) };
}

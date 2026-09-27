import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { StorySchema, type StoryContent, type Target } from "./schema";
import { repairStory } from "./text";

/**
 * Story generation (PRD_STORY §4): one Claude call that writes the story AND
 * annotates every token, so the reader never has to parse Spanish at render
 * time. Structured outputs pin the JSON shape; `repairStory` fixes the rest.
 *
 * Kept free of `server-only` so scripts can call it; the Server Action in
 * ../actions.ts is the only app entry point.
 */

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

/**
 * Writing + annotating is mostly careful bookkeeping, not deep reasoning; a lower
 * effort keeps generation well under the serverless time limit.
 */
const EFFORT = (process.env.CUENTOS_EFFORT ?? "medium") as "low" | "medium" | "high";

export type GenerateInput = {
  topic: string;
  targets: Target[];
  level?: "A1" | "A2" | "B1";
};

const TARGET_RULES: Record<Target, string> = {
  preterite: "Use the pretérito indefinido for the completed events of the plot (at least 8 forms).",
  imperfect: "Use the imperfecto for background, descriptions and habits (at least 6 forms).",
  present: "Use the present in the dialogue (at least 6 forms).",
  future: "Use the simple future (-é, -ás…) in the dialogue for plans and predictions (at least 4 forms).",
  subjunctive:
    "Use the present subjunctive in the dialogue after clear triggers — espero que, quiero que, es mejor que, ojalá, para que, cuando + future meaning (at least 5 forms).",
  reflexive:
    "Use reflexive verbs — levantarse, ducharse, acostarse, quedarse, darse cuenta, irse… (at least 8, spread over narrative and dialogue).",
};

function systemPrompt(level: string): string {
  return `You write short Spanish reading stories for a ${level} learner, and annotate every word for an interactive reader.

The story
- 180–260 words, a title, 6–10 nodes. Alternate "narrative" paragraphs (told in the past) with "dialogue" lines (spoken, with a speaker name) so the narrative past and the spoken tenses sit side by side.
- A dialogue node holds only the words spoken, as they would appear in a chat bubble: no dashes (—), no quotation marks, no speech tags like "dijo Marta" (the speaker field names who talks). Narration belongs in narrative nodes.
- Neutral Spanish as spoken in the Canary Islands and Latin America: ustedes, never vosotros. Everyday vocabulary at ${level}, one or two useful new words at most per paragraph.
- Spanish must be flawless: accents (está, pidió, ¿Qué…?), agreement, and the correct tense for each context. Never use a subjunctive where the indicative is required or the other way round.

The annotation
- Split every node into sentences; each sentence has a natural English "translation".
- Split each sentence into tokens exactly as written, one word per token, punctuation attached to its word ("Ayer,", "¿Qué", "carne."). Joining the tokens with single spaces must give the sentence.
- Every token has "translation": its meaning in this context, short ("we went", "the", "to her").
- Every conjugated verb, infinitive, gerund and participle has "lemma" (the infinitive) and "tense". Other words may have "lemma" (masculine singular / base form) and no tense.
- Reflexives: the pronoun and its verb share one "reflexive_id" (r1, r2, …) and both carry the same "group_translation" for the pair ("me" + "levanto" → "I get up"). Attached pronouns (levantarse, sentándose) are one token: give it the reflexive_id alone only if another token in the same sentence belongs to it; otherwise no reflexive_id.
- Subjunctive: the word or phrase that forces it ("Espero", "Quiero", "ojalá", "para") gets a "trigger_id" (s1, s2, …); the subjunctive verb gets "triggered_by" with that id.
- Omit optional fields that do not apply.`;
}

function userPrompt(input: GenerateInput): string {
  const rules = input.targets.map((t) => `- ${TARGET_RULES[t]}`).join("\n");
  return `Topic: ${input.topic.trim()}

Grammar to practise:
${rules || "- A natural mix of past narrative and present-tense dialogue."}`;
}

export class StoryGenerationError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

/** Writes and annotates one story. Takes 1–3 minutes; streams so it can't time out. */
export async function generateStory(input: GenerateInput): Promise<StoryContent> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new StoryGenerationError("Missing ANTHROPIC_API_KEY (see .env.example).", false);
  }
  const level = input.level ?? "A2";
  const client = new Anthropic();

  let message;
  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      system: systemPrompt(level),
      messages: [{ role: "user", content: userPrompt(input) }],
      output_config: { format: zodOutputFormat(StorySchema), effort: EFFORT },
    });
    message = await stream.finalMessage();
  } catch (cause) {
    if (cause instanceof Anthropic.RateLimitError) {
      throw new StoryGenerationError("Claude is busy right now (rate limit). Try again in a minute.", true);
    }
    if (cause instanceof Anthropic.AuthenticationError) {
      throw new StoryGenerationError("The Anthropic API key was rejected.", false);
    }
    if (cause instanceof Anthropic.BadRequestError) {
      throw new StoryGenerationError(`Claude rejected the request: ${cause.message}`, false);
    }
    if (cause instanceof Anthropic.APIConnectionError) {
      throw new StoryGenerationError("Could not reach Claude (connection failed). Try again.", true);
    }
    if (cause instanceof Anthropic.APIError) {
      throw new StoryGenerationError(`Claude error ${cause.status ?? ""}: ${cause.message}`, true);
    }
    throw cause;
  }

  if (message.stop_reason === "refusal") {
    throw new StoryGenerationError("Claude declined to write this story. Try another topic.", false);
  }
  if (message.stop_reason === "max_tokens") {
    throw new StoryGenerationError("The story came out too long and was cut off. Try again.", true);
  }
  if (!message.parsed_output) {
    throw new StoryGenerationError("Claude's answer didn't match the story format. Try again.", true);
  }
  return repairStory(message.parsed_output);
}

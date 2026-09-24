import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Category, Phrase, Scenario } from "@/features/phrases/types";

export type Suggestion = {
  spanish: string;
  translation: string;
  /** Name of an existing category, or null for uncategorized. */
  category: string | null;
};

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

const SYSTEM = [
  "You generate practical Spanish phrases for a learner, tied to a real-world scenario.",
  'Reply with JSON only, no prose: {"spanish": string, "translation": string, "category": string|null}.',
  "The phrase must be natural, immediately usable in the scenario, and must NOT duplicate or paraphrase any existing phrase.",
  "`category` must be exactly one of the provided category names, or null if none fits.",
].join(" ");

export async function suggestPhrase(input: {
  scenario: Scenario;
  categories: Category[];
  phrases: Phrase[];
}): Promise<Suggestion> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY (see .env.example).");
  }

  const categoryNames = input.categories.map((category) => category.name);
  const existing = input.phrases
    .map((phrase) => `- ${phrase.spanish_text} — ${phrase.translation_text}`)
    .join("\n");

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          `Scenario: ${input.scenario.name}`,
          `Categories: ${categoryNames.length ? categoryNames.join(", ") : "(none)"}`,
          `Existing phrases (${input.phrases.length}):`,
          existing || "(none yet)",
        ].join("\n"),
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to generate a phrase");
  }

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  // Strip an accidental ```json fence before parsing.
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  let parsed: Partial<Suggestion>;
  try {
    parsed = JSON.parse(json) as Partial<Suggestion>;
  } catch {
    throw new Error("Claude returned malformed JSON");
  }

  const spanish = String(parsed.spanish ?? "").trim();
  const translation = String(parsed.translation ?? "").trim();
  if (!spanish || !translation)
    throw new Error("Claude returned an empty phrase");

  const category =
    parsed.category && categoryNames.includes(parsed.category)
      ? parsed.category
      : null;

  return { spanish, translation, category };
}

const REVIEW_SYSTEM = [
  "You are marking one sentence written by an adult learner of Latin-American Spanish who is taking an intensive course.",
  "For each mistake: quote the learner's wrong word or short fragment exactly as they wrote it, say what is wrong, name the grammar point (for example: gender agreement, preterite vs imperfect, ser vs estar, por vs para), and give the corrected word or fragment wrapped in double asterisks for bold, like **una camisa**.",
  "Bold is reserved for corrected Spanish — never bold English, a grammar term, or the learner's own error. Everything else is plain text.",
  "Correct in pieces, not in whole: fix at most a few words at a time, inline in the explanation, and never restate the entire corrected sentence in one run. The learner rewrites the sentence themselves; your job is to hand back the parts.",
  "If the learner's English translation does not match what the Spanish actually says, point that out too — it usually means the Spanish says something they did not intend.",
  "If the sentence is correct, say so plainly. You may add one short note on what would sound more natural, with the alternative wording in bold, but keep it to a fragment.",
  "Be specific and brief: at most 120 words, plain text apart from the ** bold markers, no headings, no bullet characters. Write in English.",
].join(" ");

/** Overload and rate limits are transient; everything else is not worth retrying. */
function isTransient(cause: unknown): boolean {
  if (cause instanceof Anthropic.APIConnectionError) return true;
  if (cause instanceof Anthropic.APIError) {
    return (
      cause.status === 429 ||
      cause.status === 500 ||
      cause.status === 502 ||
      cause.status === 503 ||
      cause.status === 529
    );
  }
  return false;
}

/**
 * Feedback on one diary sentence. Deliberately withholds the corrected form:
 * the learner sees what is wrong and fixes it themselves.
 *
 * Retries the transient failures (overloaded, rate-limited, dropped connection)
 * rather than handing the learner an error for something that fixes itself in a
 * second — those were the intermittent failures seen in use.
 */
export async function reviewSentence(input: {
  spanish: string;
  english: string;
}): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set on the server. Add it in the Vercel project settings (or .env locally) and redeploy.",
    );
  }

  const client = new Anthropic({ maxRetries: 0, timeout: 60_000 });
  const attempts = 3;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 800,
        system: REVIEW_SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              `Spanish as written: ${input.spanish}`,
              `What the learner thinks it means: ${input.english || "(not given)"}`,
            ].join("\n"),
          },
        ],
      });

      if (response.stop_reason === "refusal") {
        throw new Error(
          "Claude declined to review this sentence (safety refusal).",
        );
      }

      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();

      if (!text) throw new Error("Claude returned an empty review.");
      return text;
    } catch (cause) {
      if (attempt === attempts || !isTransient(cause)) throw cause;
      // 1s, then 2s. Short enough that the page still feels responsive.
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  throw new Error("Review failed after 3 attempts.");
}

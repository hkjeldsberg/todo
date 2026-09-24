import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Sentence } from "./types";

/** Sentences are short and many: a fast model keeps sessions snappy. */
const MODEL = process.env.ANTHROPIC_FAST_MODEL ?? "claude-haiku-4-5";

const JSON_RULES = `Return ONLY a JSON object, no markdown or commentary: {"spanish": string, "english": string, "cloze": string}.`;

async function ask(system: string, user: string): Promise<Sentence> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in Claude reply");
  const parsed = JSON.parse(match[0]) as Partial<Sentence>;
  if (
    typeof parsed.spanish !== "string" ||
    typeof parsed.english !== "string" ||
    typeof parsed.cloze !== "string" ||
    !parsed.cloze.includes("{{word}}")
  ) {
    throw new Error("Claude reply is missing fields or the {{word}} gap");
  }
  return { spanish: parsed.spanish, english: parsed.english, cloze: parsed.cloze };
}

async function withRetries(fn: () => Promise<Sentence>, tries = 3): Promise<Sentence> {
  let last: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (cause) {
      last = cause;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

/** One A1 sentence using `word`, with the word replaced by {{word}} in `cloze`. */
export function sentenceForWord(word: string, meaning: string): Promise<Sentence> {
  const system = [
    "You are a Spanish teacher. Write one unique, natural, everyday A1-level Spanish sentence (max 10 words) that uses the target word.",
    "Latin-American neutral Spanish. Correct accents and punctuation.",
    '"english" is a natural translation; "cloze" is the Spanish sentence with the target word (in the exact form used) replaced by {{word}}.',
    JSON_RULES,
  ].join(" ");
  return withRetries(() => ask(system, `Target word: "${word}" (${meaning})`));
}

/** One short sentence that uses an exact conjugated form. */
export function sentenceForForm(input: {
  infinitive: string;
  form: string;
  pronoun: string;
  tense: string;
}): Promise<Sentence> {
  const system = [
    "You are a Spanish teacher. Write one short, natural A1–B1 Spanish sentence (max 12 words) that uses the exact conjugated verb form given, and whose context makes that tense the only natural choice.",
    "Latin-American neutral Spanish. Correct accents.",
    '"cloze" replaces the COMPLETE conjugated form (e.g. "he hecho" is one unit) with {{word}}. The subject may be explicit or implied.',
    JSON_RULES,
  ].join(" ");
  return withRetries(() =>
    ask(
      system,
      `Infinitive: ${input.infinitive}, pronoun: ${input.pronoun}, tense: ${input.tense}, form: "${input.form}"`,
    ),
  );
}

/** Resolves to null instead of waiting forever or throwing. */
export async function within<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([
      promise.catch((cause) => {
        console.error("[srs] sentence generation failed:", cause instanceof Error ? cause.message : cause);
        return null;
      }),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

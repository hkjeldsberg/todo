import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { GENDERS, POS, VERDICTS, type CheckResult, type Example } from "./types";

/**
 * The Claude calls behind the glossary (PRD §5). No server-only import, so the
 * enrich script can use it too. Callers handle failures (they return null).
 */

export const MODEL = "claude-haiku-4-5";
export const TIMEOUT_MS = 8000;

const ExampleSchema = z.object({ es: z.string(), en: z.string() });

const CheckSchema = z.object({
  spanish: z.string().describe("The headword, spelling fixed, nouns with their article: 'la nutricionista'"),
  spelling_fixed: z.boolean().describe("true if the Spanish as typed was misspelled or was a different word than intended"),
  english: z.string().describe("Best English translation, verbs as 'to …'"),
  norwegian: z.string().describe("Norwegian Bokmål, dictionary form: 'vindu', 'å lage mat', 'billig'"),
  pos: z.enum(POS),
  gender: z.enum(GENDERS).nullable().describe("nouns only: m, f, or mf for nouns used with both"),
  guess_verdict: z.enum(VERDICTS),
  guess_note: z.string().describe("One short English line on the learner's guess; empty if it was correct"),
  examples: z.array(ExampleSchema).describe("Exactly two example sentences"),
  theme_suggestion: z.string().nullable().describe("One of the existing themes if one fits, else a short new one in Spanish, or null"),
});

const ExamplesSchema = z.object({ examples: z.array(ExampleSchema) });

const EXAMPLE_RULES = `Example sentences: exactly two, A2–B1 level, at most 12 words each, everyday situations, the word used
in the sense being translated, Spain Spanish unless the word is regional, each with a natural English translation.
Use different sentences each time you're asked.`;

const SYSTEM = `You check entries in a Spanish learner's personal glossary. The learner types a Spanish word or expression
and their guess at the English. You return the corrected entry.

- spanish: the headword. Fix spelling (nutralista → nutricionista). Nouns get their article (la mesa, el agua). Verbs in
  the infinitive. Keep multi-word expressions as typed if correct (echar de menos).
- guess_verdict: "correct" if the guess means the same, "close" if nearly (wrong word class, missing nuance, slow vs
  slowly), "different" if it means something else. guess_note: one short English sentence saying what was off; say what
  the guess would be in Spanish when that helps. Empty string when correct.
- english / norwegian: the usual translation in dictionary form, add a short gloss in brackets only if needed to
  disambiguate. Norwegian is Bokmål: nouns in the indefinite form without article (vindu, not vinduet / et vindu),
  verbs as "å …", adjectives in the base form.
${EXAMPLE_RULES}`;

export type CheckInput = { spanish: string; guess: string; themes: string[] };

function client() {
  return new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 });
}

function logFailure(what: string, cause: unknown) {
  if (cause instanceof Anthropic.AuthenticationError) console.error(`[glossary] ${what}: Anthropic API key rejected`);
  else if (cause instanceof Anthropic.APIError) console.warn(`[glossary] ${what}: Claude error ${cause.status ?? ""} ${cause.message}`);
  else console.warn(`[glossary] ${what} failed:`, cause instanceof Error ? cause.message : cause);
}

const clean = (examples: Example[]) =>
  examples
    .map((e) => ({ es: e.es.trim(), en: e.en.trim() }))
    .filter((e) => e.es && e.en)
    .slice(0, 2);

/** Checks a word and the learner's guess. Null when Claude is unavailable or the answer is unusable. */
export async function checkWithClaude(input: CheckInput): Promise<CheckResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const message = await client().messages.parse({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Spanish: ${input.spanish}\nMy guess: ${input.guess}\nExisting themes: ${input.themes.join(", ") || "(none)"}`,
        },
      ],
      output_config: { format: zodOutputFormat(CheckSchema) },
    });
    const out = message.parsed_output;
    if (message.stop_reason === "refusal" || !out || !out.spanish.trim() || !out.english.trim()) return null;
    const examples = clean(out.examples);
    if (examples.length < 2) return null;
    return {
      spanish: out.spanish.trim(),
      spellingFixed: out.spelling_fixed,
      english: out.english.trim(),
      norwegian: out.norwegian.trim(),
      pos: out.pos,
      gender: out.pos === "noun" ? out.gender : null,
      verdict: out.guess_verdict,
      note: out.guess_note.trim(),
      examples,
      themeSuggestion: out.theme_suggestion?.trim() || null,
    };
  } catch (cause) {
    logFailure("check", cause);
    return null;
  }
}

/** Two fresh example sentences for an existing word. */
export async function examplesWithClaude(spanish: string, english: string, avoid: Example[]): Promise<Example[] | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const message = await client().messages.parse({
      model: MODEL,
      max_tokens: 300,
      system: `You write example sentences for a Spanish learner's glossary. ${EXAMPLE_RULES}`,
      messages: [
        {
          role: "user",
          content: `Word: ${spanish} (${english})\nDon't reuse these:\n${avoid.map((e) => `- ${e.es}`).join("\n") || "(none)"}`,
        },
      ],
      output_config: { format: zodOutputFormat(ExamplesSchema) },
    });
    const examples = message.parsed_output ? clean(message.parsed_output.examples) : [];
    return examples.length === 2 ? examples : null;
  } catch (cause) {
    logFailure("examples", cause);
    return null;
  }
}

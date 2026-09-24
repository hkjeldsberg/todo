import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export type ChatTurn = { role: "user" | "assistant"; text: string };

export type ChatSuggestion = { spanish: string; translation: string };

export type ChatAnswer = {
  reply: string;
  /** Phrases the answer proposes, offered to the user as one-tap saves. */
  phrases: ChatSuggestion[];
};

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

const SYSTEM = [
  "You are a Spanish tutor inside a phrasebook app. The user asks for phrases for real situations.",
  "Answer briefly and practically — no filler, no lecturing.",
  'Reply with JSON only, no prose outside it: {"reply": string, "phrases": [{"spanish": string, "translation": string}]}.',
  "`reply` is what the user reads: a short answer, usage notes, or a follow-up question. Keep it under 60 words.",
  "`phrases` holds every concrete Spanish phrase you are proposing, so the app can offer to save them. Use an empty array when you are only asking a clarifying question.",
  "Never repeat a phrase the user says they already have.",
].join(" ");

/** Strip an accidental ```json fence before parsing. */
function parseJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned) as T;
}

export async function chat(
  history: ChatTurn[],
  context: string,
): Promise<ChatAnswer> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY (see .env.example).");
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: `${SYSTEM}\n\nThe user's notebook right now:\n${context}`,
    messages: history.map((turn) => ({
      role: turn.role,
      content: turn.text,
    })),
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to answer");
  }

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  let parsed: Partial<ChatAnswer>;
  try {
    parsed = parseJson<Partial<ChatAnswer>>(text);
  } catch {
    // A non-JSON answer is still useful — show it, just without save buttons.
    return { reply: text.trim(), phrases: [] };
  }

  const phrases = (parsed.phrases ?? [])
    .map((phrase) => ({
      spanish: String(phrase?.spanish ?? "").trim(),
      translation: String(phrase?.translation ?? "").trim(),
    }))
    .filter((phrase) => phrase.spanish && phrase.translation);

  return { reply: String(parsed.reply ?? "").trim(), phrases };
}

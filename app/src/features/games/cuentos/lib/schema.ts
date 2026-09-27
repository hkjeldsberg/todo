import { z } from "zod";

/**
 * The pre-parsed story (PRD_STORY §4). Claude fills this exact shape through
 * structured outputs, so the reader renders straight from JSON — no NLP at
 * render time. One level deeper than the PRD: nodes hold sentences, so a
 * sentence has its own translation (Shift-hover, cloze cards).
 *
 * The schema stays inside what structured outputs accept (no length limits);
 * non-emptiness and the cross-references are enforced by `repairStory`.
 */

export const TENSES = [
  "preterite",
  "imperfect",
  "present",
  "future",
  "conditional",
  "present_perfect",
  "subjunctive",
  "imperfect_subjunctive",
  "imperative",
  "infinitive",
  "gerund",
  "participle",
] as const;
export type Tense = (typeof TENSES)[number];

/** What the grammar toggles can force into a story. */
export const TARGETS = ["preterite", "imperfect", "present", "future", "subjunctive", "reflexive"] as const;
export type Target = (typeof TARGETS)[number];

export const TokenSchema = z.object({
  /** The word as written, with attached punctuation ("comer.", "¿Qué"). */
  text: z.string(),
  /** English gloss of this word in context. */
  translation: z.string(),
  /** Base form: infinitive for verbs, masculine singular for adjectives. */
  lemma: z.string().optional(),
  /** Only on verb forms. */
  tense: z.enum(TENSES).optional(),
  /** Shared by a reflexive pronoun and its verb ("me" + "levanto"). */
  reflexive_id: z.string().optional(),
  /** On both halves of a reflexive group: the pair's meaning ("I get up"). */
  group_translation: z.string().optional(),
  /** On the phrase that forces a subjunctive ("Espero"…). */
  trigger_id: z.string().optional(),
  /** On a subjunctive verb: the trigger_id that caused it. */
  triggered_by: z.string().optional(),
});
export type Token = z.infer<typeof TokenSchema>;

export const SentenceSchema = z.object({
  tokens: z.array(TokenSchema),
  /** Natural English translation of the whole sentence. */
  translation: z.string(),
});
export type Sentence = z.infer<typeof SentenceSchema>;

export const NodeSchema = z.object({
  type: z.enum(["narrative", "dialogue"]),
  /** Only on dialogue. */
  speaker: z.string().optional(),
  sentences: z.array(SentenceSchema),
});
export type StoryNode = z.infer<typeof NodeSchema>;

export const StorySchema = z.object({
  title: z.string(),
  nodes: z.array(NodeSchema),
});
export type StoryContent = z.infer<typeof StorySchema>;

export type StorySummary = {
  id: string;
  title: string;
  topic: string;
  level: string;
  targets: Target[];
  createdAt: string;
};

export type Story = StorySummary & { content: StoryContent };

/** `<node>:<sentence>:<token>` — stable address of a token inside a story. */
export function tokenKey(node: number, sentence: number, token: number): string {
  return `${node}:${sentence}:${token}`;
}

export function parseTokenKey(key: string): [number, number, number] | null {
  const parts = key.split(":").map(Number);
  return parts.length === 3 && parts.every((n) => Number.isInteger(n) && n >= 0)
    ? (parts as [number, number, number])
    : null;
}

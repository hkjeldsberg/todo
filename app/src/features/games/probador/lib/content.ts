import { z } from "zod";
import bundled from "@/content/probador.json";
import { ITEMS } from "../avatar/catalog";
import { FITS, SLOTS, TRACKS, type Outfit, type ProbadorContent, type Prompt } from "./types";

/**
 * Pure content shaping for the server loader (Supabase rows or the bundled
 * JSON) and the tests. No server-only imports here.
 */

const slug = z.string().regex(/^[a-z0-9_]+$/);
const color = z.string().regex(/^#[0-9a-f]{6}$/i);

export const outfitSchema = z.object({
  id: slug,
  avatar: z.object({ skin: color, hair: z.enum(["short", "long", "curly", "bun"]), hairColor: color }),
  layers: z
    .array(
      z.object({
        item: z.string().refine((item) => item in ITEMS, "unknown item"),
        color,
        fit: z.enum(FITS).optional(),
      }),
    )
    .min(1),
  description: z.string().min(1),
  intended_flaw: z.string().min(1),
});

const parts = z.object({ pronoun: z.string().min(1), verb: z.string().min(1), complement: z.string().min(1) });

export const promptSchema = z.object({
  id: slug,
  outfit_id: slug,
  target_verb: z.enum(TRACKS),
  question_text: z.string().refine((s) => s.split("{verb}").length === 2, "needs exactly one {verb}"),
  question_fill: z.string().min(1),
  answer_parts: parts,
  distractor_options: z.object({
    pronoun: z.array(z.string().min(1)).min(1),
    verb: z.array(z.string().min(1)).min(1),
    complement: z.array(z.string().min(1)).min(1),
  }),
  english_translation: z.string().min(1),
});

const contentSchema = z.object({ outfits: z.array(outfitSchema).min(1), prompts: z.array(promptSchema).min(1) });

/** Validates outfits + prompts: unique ids, every prompt's outfit exists, no distractor equals the answer. */
export function shapeContent(raw: unknown): ProbadorContent {
  const parsed = contentSchema.parse(raw);
  const outfits: Record<string, Outfit> = {};
  for (const o of parsed.outfits as Outfit[]) {
    if (outfits[o.id]) throw new Error(`outfit ${o.id} appears twice`);
    outfits[o.id] = o;
  }
  const ids = new Set<string>();
  for (const p of parsed.prompts as Prompt[]) {
    if (ids.has(p.id)) throw new Error(`prompt ${p.id} appears twice`);
    ids.add(p.id);
    if (!outfits[p.outfit_id]) throw new Error(`prompt ${p.id}: no outfit ${p.outfit_id}`);
    for (const slot of SLOTS) {
      const options = p.distractor_options[slot];
      if (options.includes(p.answer_parts[slot])) throw new Error(`prompt ${p.id}: ${slot} distractor equals the answer`);
      if (new Set(options).size !== options.length) throw new Error(`prompt ${p.id}: duplicate ${slot} distractor`);
    }
  }
  const prompts = (parsed.prompts as Prompt[]).slice().sort((a, b) => a.id.localeCompare(b.id));
  return { outfits, prompts };
}

/** Flat todo.probador_outfits + todo.probador_prompts rows → content. */
export function contentFromRows(outfits: unknown[], prompts: unknown[]): ProbadorContent {
  return shapeContent({ outfits, prompts });
}

/** content/probador.json, validated. The single source of truth for this game. */
export function bundledContent(): ProbadorContent {
  return shapeContent(bundled);
}

export function findPrompt(content: ProbadorContent, id: string): Prompt | undefined {
  return content.prompts.find((p) => p.id === id);
}

/** "Le queda grande." */
export function answerSentence(prompt: Prompt): string {
  const { pronoun, verb, complement } = prompt.answer_parts;
  return `${pronoun} ${verb} ${complement}.`;
}

/** The question with its gap: "¿Cómo le ___ la chaqueta?" (or filled in). */
export function questionWith(prompt: Prompt, fill = "___"): string {
  return prompt.question_text.replace("{verb}", fill);
}

import { z } from "zod";
import bundled from "@/content/posiciones.json";
import type { Content } from "./types";

/**
 * Content validation, shared by the server loader (Supabase rows or the bundled
 * JSON), the client root and the tests. No server-only imports here.
 */

const level = z.enum(["A1", "A2", "B1"]);
const category = z.enum(["core", "building", "fluency", "street", "regional"]);
const region = z.enum(["es-419", "es-ES"]).nullable();
const gender = z.enum(["m", "f"]);
const gnumber = z.enum(["sg", "pl"]);

/** "el seto", "la calle Mayor": the article is part of the name. */
const nounPhrase = z.string().regex(/^(el|la|los|las) \S/, "names start with their article");

export const expressionSchema = z.object({
  id: z.string().regex(/^[a-z_]+$/),
  es: z.string().min(1),
  forms: z.array(z.string().min(1)).min(1),
  bare: z.string().min(1).nullable(),
  en: z.string().min(1),
  level,
  category,
  needs_reference: z.boolean(),
  ref_count: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  region,
  standard: z.string().nullable(),
  agrees: z.boolean(),
  notes: z.string().nullable(),
  sort: z.number().int(),
});

export const objectSchema = z.object({
  id: z.string().regex(/^[a-z_]+$/),
  es: nounPhrase,
  gender,
  number: gnumber,
  en: z.string().min(1),
  aliases: z.array(nounPhrase).default([]),
});

export const factSchema = z.object({
  target: z.string().min(1),
  expression: z.string().min(1),
  refs: z.array(z.string()).default([]),
  rotations: z.array(z.number().int().min(0).max(3)).optional(),
  truth: z.boolean().optional(),
});

export const sceneSchema = z.object({
  id: z.string().regex(/^[a-z_]+$/),
  sort: z.number().int(),
  title_es: z.string().min(1),
  title_en: z.string().min(1),
  visual_layer: z.string().min(1),
  objects: z.array(objectSchema).min(1),
  facts: z.array(factSchema).default([]),
  targets: z.array(z.string()).min(1),
});

export const subjectSchema = z.object({
  es: nounPhrase,
  gender,
  number: gnumber,
  en: z.string().min(1),
  aliases: z.array(nounPhrase).default([]),
});

export const contentSchema = z
  .object({
    expressions: z.array(expressionSchema).min(1),
    subject: subjectSchema,
    scenes: z.array(sceneSchema).min(1),
  })
  .superRefine((c, ctx) => {
    const ids = new Set(c.expressions.map((e) => e.id));
    for (const e of c.expressions) {
      if (e.standard && !ids.has(e.standard)) ctx.addIssue({ code: "custom", message: `${e.id}: unknown standard ${e.standard}` });
    }
    for (const s of c.scenes) {
      const objs = new Set(s.objects.map((o) => o.id));
      const spots = new Set(s.targets);
      for (const f of s.facts) {
        if (!ids.has(f.expression)) ctx.addIssue({ code: "custom", message: `${s.id}: fact uses unknown expression ${f.expression}` });
        if (!spots.has(f.target)) ctx.addIssue({ code: "custom", message: `${s.id}: fact targets unknown spot ${f.target}` });
        for (const r of f.refs) if (!objs.has(r)) ctx.addIssue({ code: "custom", message: `${s.id}: fact refers to unknown object ${r}` });
      }
    }
  });

const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort;

/** Validates and sorts. Throws on malformed content. */
export function shapeContent(raw: unknown): Content {
  const c = contentSchema.parse(raw);
  return { ...c, expressions: c.expressions.slice().sort(bySort), scenes: c.scenes.slice().sort(bySort) };
}

/** src/content/posiciones.json, validated: the single source of truth. */
export function bundledContent(): Content {
  return shapeContent(bundled);
}

// ─────────────────────────────────────────────────────────────── DB rows

/** todo.posiciones_expressions row (the JSON's `forms`/`bare`/`standard`/`agrees` aren't columns). */
export const expressionRowSchema = z.object({
  id: z.string(),
  es: z.string(),
  en: z.string(),
  level,
  category,
  needs_reference: z.boolean(),
  ref_count: z.number().int(),
  region,
  notes: z.string().nullable(),
  sort: z.number().int(),
});

export const sceneRowSchema = z.object({
  id: z.string(),
  sort: z.number().int(),
  title_es: z.string(),
  title_en: z.string(),
  visual_layer: z.string(),
  objects: z.array(z.unknown()),
  facts: z.array(z.unknown()),
  targets: z.array(z.string()),
});

/**
 * Joins DB rows into content. The expression table carries the PRD columns; the
 * parser-only fields (forms, bare, standard, agrees) and the subject come from
 * the bundled JSON, matched by id. Rows win for everything they hold.
 */
export function contentFromRows(expressionRows: unknown[], sceneRows: unknown[], base: Content = bundledContent()): Content {
  const rows = z.array(expressionRowSchema).parse(expressionRows);
  const scenes = z.array(sceneRowSchema).parse(sceneRows);
  if (rows.length === 0) throw new Error("todo.posiciones_expressions is empty");
  if (scenes.length === 0) throw new Error("todo.posiciones_scenes is empty");
  const extra = new Map(base.expressions.map((e) => [e.id, e]));
  return shapeContent({
    subject: base.subject,
    expressions: rows.map((r) => {
      const b = extra.get(r.id);
      return {
        ...r,
        forms: b?.forms ?? [r.es],
        bare: b?.bare ?? null,
        standard: b?.standard ?? null,
        agrees: b?.agrees ?? false,
      };
    }),
    scenes,
  });
}

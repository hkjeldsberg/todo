import { z } from "zod";
import bundled from "@/content/pasado.json";
import { PRONOUNS, verbByInfinitive } from "@/features/srs/verbs";
import { MATRIX_VERBS } from "./matrix";
import { PAST_TENSES, type Drill, type PasadoContent, type PastVerb } from "./types";

/**
 * Pure content shaping for the server loader (Supabase rows or the bundled
 * JSON) and the tests. No server-only imports here.
 */

export const drillSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  infinitive: z.string().min(2),
  person: z.enum(PRONOUNS),
  sentence_template: z.string().refine((s) => s.split("{verb}").length === 2, "needs exactly one {verb}"),
  correct_tense: z.enum(PAST_TENSES),
  trigger_word: z.string().min(1),
  english_translation: z.string().min(1),
});

const contentSchema = z.object({ drills: z.array(drillSchema).min(1) });

/** Pretérito + Imperfecto of a verb from the bundled conjugation data (todo.verbs mirrors it). */
export function pastVerb(infinitive: string): PastVerb | undefined {
  const verb = verbByInfinitive(infinitive);
  if (!verb) return undefined;
  return {
    infinitive: verb.infinitive,
    english: verb.english,
    isIrregular: verb.isIrregular,
    forms: { preterite: verb.forms["Pretérito"], imperfect: verb.forms.Imperfecto },
  };
}

/** Validates drills, checks every verb has forms and every trigger sits in its sentence. */
export function shapeContent(raw: unknown): PasadoContent {
  const drills = contentSchema.parse(raw).drills as Drill[];
  const ids = new Set<string>();
  const verbs: Record<string, PastVerb> = {};
  for (const infinitive of [...drills.map((d) => d.infinitive), ...MATRIX_VERBS]) {
    if (verbs[infinitive]) continue;
    const verb = pastVerb(infinitive);
    if (!verb) throw new Error(`no conjugation for ${infinitive}`);
    verbs[infinitive] = verb;
  }
  for (const d of drills) {
    if (ids.has(d.id)) throw new Error(`drill ${d.id} appears twice`);
    ids.add(d.id);
    if (!d.sentence_template.toLowerCase().includes(d.trigger_word.toLowerCase())) {
      throw new Error(`drill ${d.id}: trigger "${d.trigger_word}" is not in the sentence`);
    }
  }
  return { drills: drills.slice().sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true })), verbs };
}

/** Flat todo.past_drills rows → content. */
export function contentFromRows(rows: unknown[]): PasadoContent {
  return shapeContent({ drills: rows });
}

/** content/pasado.json, validated. The single source of truth for this game. */
export function bundledContent(): PasadoContent {
  return shapeContent(bundled);
}

export function findDrill(content: PasadoContent, id: string): Drill | undefined {
  return content.drills.find((d) => d.id === id);
}

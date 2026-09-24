import type { ChoiceCard } from "@/features/srs/card";
import { assembleSentence, lintSentence, normalize } from "./grammar";
import { candidateZones } from "./judge";
import type { Scrapbook, Task } from "./schema";

/**
 * Spanish location phrase for every zone a task can point at. The review card turns
 * a scene zone (which only makes sense in 3D) into the words that describe it.
 */
export const ZONE_PHRASES: Record<string, string> = {
  zone_inside_box: "dentro de la caja",
  zone_on_box: "encima de la caja",
  flap_under_sofa: "debajo del sofá",
  flap_on_sofa: "encima del sofá",
  flap_behind_curtain: "detrás de la cortina",
  pick_clothes_upstairs: "arriba",
  pick_laundry_downstairs: "abajo",
  zone_on_bed: "encima de la cama",
  zone_under_bed: "debajo de la cama",
  zone_plaza_center: "en medio de la plaza",
  zone_plaza_corner: "en la esquina de la plaza",
  zone_around_table: "alrededor de la mesa",
  zone_between_bank_bakery: "entre el banco y la panadería",
  zone_next_to_bakery: "al lado de la panadería",
  zone_behind_bank: "detrás del banco",
  zone_next_to_fountain: "junto a la fuente",
  zone_far_from_fountain: "lejos de la fuente",
  pin_across_park: "enfrente del parque",
  pin_next_to_park: "al lado del parque",
  pin_behind_park: "detrás del parque",
  pick_taxi_ahead: "delante de la casa",
  pick_taxi_behind: "detrás de la casa",
  pin_block_a: "cerca del centro y cerca de la autopista",
  pin_block_b: "cerca del centro, pero lejos de la autopista",
  pin_block_c: "lejos del centro",
  pick_hotel_middle: "en medio de la calle",
  pick_hotel_end: "al final de la calle",
};

/** Typical learner confusions for tasks whose scene has only one candidate zone. */
export const EXTRA_DISTRACTORS: Record<string, string[]> = {
  plaza_chairs: ["encima de la mesa", "debajo de la mesa"],
};

const MAX_OPTIONS = 4;

/** Stable pseudo-shuffle so the right answer isn't always first, yet the card never changes. */
function stableShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return items
    .map((item, i) => ({ item, key: Math.imul(h ^ (i * 2654435761), 1597334677) >>> 0 }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.item);
}

/** "Pon la mochila encima de la cama." + "encima de la cama" → "Pon la mochila ___." */
function cloze(sentence: string, phrase: string): string {
  const at = sentence.toLocaleLowerCase("es").indexOf(phrase.toLocaleLowerCase("es"));
  if (at < 0) return sentence;
  return sentence.slice(0, at) + "___" + sentence.slice(at + phrase.length);
}

function zoneCard(task: Task): ChoiceCard | null {
  const right = ZONE_PHRASES[task.target_zone];
  if (!right) return null;
  const wrong = [
    ...candidateZones(task)
      .slice(1)
      .map((z) => ZONE_PHRASES[z])
      .filter((p): p is string => Boolean(p)),
    ...(EXTRA_DISTRACTORS[task.id] ?? []),
  ].filter((p, i, all) => p !== right && all.indexOf(p) === i);
  if (wrong.length === 0) return null;
  const options = [{ text: right, correct: true }, ...wrong.slice(0, MAX_OPTIONS - 1).map((text) => ({ text, correct: false }))];
  return {
    type: "choice",
    prompt: cloze(task.prompt_text, right),
    hint: task.prompt_en,
    options: stableShuffle(options, task.id),
    explanation: task.error_note,
  };
}

/** Every way to fill the slots with distinct tokens. */
function fillings(tokens: string[], slots: number): string[][] {
  if (slots === 0) return [[]];
  return tokens.flatMap((t) => fillings(tokens.filter((x) => x !== t), slots - 1).map((rest) => [t, ...rest]));
}

function buildCard(task: Task): ChoiceCard | null {
  const build = task.build;
  if (!build) return null;
  const slots = new Set(build.template.match(/\{\d+\}/g) ?? []).size;
  const right = assembleSentence(build.template, build.answers[0]);
  const accepted = new Set(build.answers.map((a) => normalize(assembleSentence(build.template, a))));
  // Wrong options are the typical learner errors: sentences the grammar linter flags
  // (hay + el, de + el, está + un…). One-slot tasks use every other token.
  const wrong = fillings(build.tokens, slots)
    .map((f) => assembleSentence(build.template, f))
    .filter((s) => !accepted.has(normalize(s)))
    .filter((s) => slots === 1 || lintSentence(s).length > 0)
    .slice(0, MAX_OPTIONS - 1);
  if (wrong.length === 0) return null;
  return {
    type: "choice",
    prompt: task.prompt_text,
    hint: task.prompt_en,
    options: stableShuffle([{ text: right, correct: true }, ...wrong.map((text) => ({ text, correct: false }))], task.id),
    explanation: task.success_note,
  };
}

/** A missed Dónde task as a text card for Repaso. `itemRef` is the task id. */
export function taskToReviewCard(itemRef: string, book: Scrapbook): ChoiceCard | null {
  const task = book.pages.flatMap((p) => p.tasks).find((t) => t.id === itemRef);
  if (!task) return null;
  return task.mechanic === "build" ? buildCard(task) : zoneCard(task);
}

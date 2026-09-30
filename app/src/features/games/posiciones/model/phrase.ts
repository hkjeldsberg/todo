import { capitalizeFirst } from "@/features/games/shared/location-grammar";
import type { Inventory } from "./inventory";
import type { Expression, Scene } from "./types";

/**
 * Spanish surface text for a located phrase: "detrás del seto", "junto al pozo",
 * "entre el seto y el jarrón", "a dos metros de la estatua". Contractions are
 * generic: a form ending in "de"/"a" fuses with a following "el".
 */

const NUMBERS = ["cero", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];

export function numberWord(n: number): string {
  return NUMBERS[n] ?? String(n);
}

/** form + noun phrase, with de + el → del and a + el → al. */
export function joinRef(form: string, ref: string): string {
  const words = form.split(" ");
  const last = words[words.length - 1];
  const [article, ...rest] = ref.split(" ");
  if (article === "el" && (last === "de" || last === "a")) {
    return [...words.slice(0, -1), last === "de" ? "del" : "al", ...rest].join(" ");
  }
  return `${form} ${ref}`;
}

/** "a dos metros de" for a distance, else the form as given. */
export function formWithDistance(e: Expression, form: string, metres?: number): string {
  if (e.id !== "a_distancia_de" || metres === undefined) return form;
  return `a ${numberWord(metres)} ${metres === 1 ? "metro" : "metros"} de`;
}

export interface PhraseSpec {
  expression: string;
  refs: string[];
  metres?: number;
  /** The surface form actually used (defaults to the expression's `es`). */
  form?: string;
}

function refName(scene: Scene, id: string): string {
  return scene.objects.find((o) => o.id === id)?.es ?? id;
}

/** "detrás del seto" / "entre el seto y el jarrón" / "boca abajo". */
export function phraseText(inv: Inventory, scene: Scene, spec: PhraseSpec, names?: string[]): string {
  const e = inv.get(spec.expression);
  const form = formWithDistance(e, spec.form ?? e.es, spec.metres);
  const refs = names ?? spec.refs.map((id) => refName(scene, id));
  if (refs.length === 0) return spec.form ?? e.bare ?? e.es;
  if (refs.length === 1) return joinRef(form, refs[0]);
  // Two references: "entre A y B", "en la esquina de A con B".
  const joiner = e.id === "en_la_esquina_con" ? "con" : "y";
  return `${joinRef(form, refs[0])} ${joiner} ${refs[1]}`;
}

/** The verb that reads best with an expression. */
export function verbFor(expressionId: string): string {
  switch (expressionId) {
    case "alrededor_de":
    case "en_torno_a":
      return "da vueltas";
    case "a_traves_de":
      return "mira";
    default:
      return "está";
  }
}

/** Full sentence: "El gnomo está detrás del seto." */
export function sentence(inv: Inventory, scene: Scene, specs: PhraseSpec[], subject = "el gnomo"): string {
  const first = specs[0];
  const verb = first ? verbFor(first.expression) : "está";
  const body = specs.map((s) => phraseText(inv, scene, s)).join(" y ");
  return `${capitalizeFirst(subject)} ${verb} ${body}.`;
}

/** The option text for a gap-fill: the phrase minus the noun ("detrás del", "entre el"). */
export function gapOption(inv: Inventory, scene: Scene, spec: PhraseSpec): string {
  const full = phraseText(inv, scene, { ...spec, refs: spec.refs.slice(0, 1) });
  const ref = refName(scene, spec.refs[0]);
  const noun = ref.split(" ").slice(1).join(" ");
  return full.endsWith(` ${noun}`) ? full.slice(0, -noun.length - 1) : full;
}

/**
 * Tapping a thing while typing adds its name, contracted: "detrás de" + el seto →
 * "detrás del seto". The second thing joins with "y" after "entre el seto" and
 * with "con" after "en la esquina de la calle Mayor".
 */
export function appendRef(text: string, name: string): string {
  const t = text.trimEnd();
  if (!t) return name;
  const words = t.split(/\s+/);
  const last = words[words.length - 1].toLocaleLowerCase("es");
  if (last === "de" || last === "a") return joinRef(t, name);
  const lower = t.toLocaleLowerCase("es");
  const afterEntre = lower.split(/\bentre\b/)[1];
  if (afterEntre !== undefined && afterEntre.trim() && !/\b(y|e)\b/.test(afterEntre)) return `${t} y ${name}`;
  const afterEsquina = lower.split(/\ben la esquina de\b/)[1];
  if (afterEsquina !== undefined && afterEsquina.trim() && !/\bcon\b/.test(afterEsquina)) return `${t} con ${name}`;
  return `${t} ${name}`;
}

/** What a tapped suggestion puts in the text box, ready for a tapped reference. */
export function suggestionText(es: string, refCount: number): string {
  return refCount === 0 ? `El gnomo está ${es}.` : `El gnomo está ${es} `;
}

/** How a suggestion reads in the list: two-reference ones show their frame. */
export function suggestionLabel(es: string, id: string, refCount: number): string {
  if (id === "en_la_esquina_con") return `${es} … con …`;
  return refCount === 2 ? `${es} … y …` : es;
}

import { parseAnswer, type Issue, type PhraseMatch } from "./parse";
import { phraseText, sentence, type PhraseSpec } from "./phrase";
import { DEICTIC, holds, holdsForSomething, ROOM_BARE, ROOM_VAGUE, trueFacts, VIEW_BARE, type Rotation, type Truth, type World } from "./relations";

/**
 * parse → grammar → truth. Every verdict carries the Spanish to show:
 * ✓ the corrected sentence, ✗ what is true instead, ⛔ the rule.
 */

export interface Said {
  /** Expression id as said (regional ids kept, for the album). */
  expression: string;
  refs: string[];
  metres?: number;
  form: string;
}

export type Verdict =
  | { kind: "true"; sentence: string; said: Said[]; notes: string[] }
  | { kind: "false"; said: Said[]; message: string; truth: string }
  | { kind: "grammar"; said: Said[]; rule: string; note: string }
  | { kind: "vague"; said: Said[]; message: string; unlock: boolean }
  | { kind: "unparsed"; message: string };

/** Expressions worth offering as "what is true" (most useful first). */
const PREFERRED = [
  "detras_de",
  "delante_de",
  "dentro_de",
  "encima_de",
  "debajo_de",
  "al_lado_de",
  "entre",
  "a_la_derecha_de",
  "a_la_izquierda_de",
  "al_pie_de",
  "en_lo_alto_de",
  "en_la_cima_de",
  "apoyado_en",
  "colgado_de",
  "al_otro_lado_de",
  "a_traves_de",
  "enfrente_de",
  "en_el_rincon_de",
  "al_fondo_de",
  "en_el_centro_de",
  "alrededor_de",
  "a_orillas_de",
  "al_final_de",
  "cerca_de",
  "en",
];

function rank(t: Truth): number {
  const i = PREFERRED.indexOf(t.expression);
  return i < 0 ? PREFERRED.length : i;
}

/** The best true description to show, preferring the same reference the player used. */
export function bestTruth(world: World, spotId: string, rot: Rotation, sameRefs: string[] = []): Truth | null {
  const truths = trueFacts(world, spotId, rot).filter((t) => t.refs.length > 0 && t.expression !== "a_distancia_de" && t.expression !== "lejos_de");
  if (truths.length === 0) return trueFacts(world, spotId, rot)[0] ?? null;
  const sorted = truths.slice().sort((a, b) => rank(a) - rank(b));
  // Same thing the player named, if there's a useful word for it; else the most useful truth.
  const loose = PREFERRED.indexOf("cerca_de");
  const same = sorted.find((t) => rank(t) < loose && t.refs.some((r) => sameRefs.includes(r)));
  return same ?? sorted[0];
}

type PhraseStatus = { status: "true"; refs: string[] } | { status: "false" } | { status: "vague"; unlock: boolean; message: string };

function product(lists: string[][]): string[][] {
  return lists.reduce<string[][]>((acc, l) => acc.flatMap((a) => l.map((x) => [...a, x])), [[]]);
}

function evalPhrase(world: World, spotId: string, rot: Rotation, p: { expression: string; refs: string[][]; distance?: { min: number; max: number } }): PhraseStatus {
  const meaning = world.inv.meaning(p.expression);
  const e = world.inv.get(p.expression);
  if (DEICTIC.has(meaning)) {
    return { status: "vague", unlock: true, message: "Sí, está ahí… pero ¿dónde exactamente? Say it with a thing: detrás de…, encima de…" };
  }
  if (p.refs.length === 0 && e.needs_reference) {
    if (ROOM_BARE.has(meaning) || VIEW_BARE.has(meaning)) return holds(world, spotId, { expression: meaning, refs: [] }, rot) ? { status: "true", refs: [] } : { status: "false" };
    if (holdsForSomething(world, spotId, meaning, rot)) {
      return { status: "vague", unlock: false, message: `Sí… pero ¿${e.bare ?? e.es} de qué? Name the thing: ${e.forms[0]} + …` };
    }
    return { status: "false" };
  }
  for (const refs of product(p.refs)) {
    if (refs.length === 1 && refs[0] === world.room && ROOM_VAGUE.has(meaning)) {
      if (holds(world, spotId, { expression: "fuera_de", refs: [world.room] }, rot)) return { status: "false" };
      const room = world.objects.find((o) => o.id === world.room)?.es ?? "";
      return { status: "vague", unlock: false, message: `Sí, está en ${room}… pero ¿dónde exactamente?` };
    }
    if (holds(world, spotId, { expression: meaning, refs, distance: p.distance }, rot)) return { status: "true", refs };
  }
  return { status: "false" };
}

function saidOf(p: PhraseMatch, refs?: string[]): Said {
  return { expression: p.expression, refs: refs ?? p.refs.map((r) => r.ids[0]), metres: p.metres, form: p.form };
}

function specOf(s: Said): PhraseSpec {
  return { expression: s.expression, refs: s.refs, metres: s.metres, form: s.form };
}

/** "No está dentro del jarrón — está detrás del jarrón." */
function falseMessage(world: World, spotId: string, rot: Rotation, said: Said, names?: string[]): { message: string; truth: string } {
  const t = bestTruth(world, spotId, rot, said.refs);
  const wrong = phraseText(world.inv, world.scene, specOf(said), names);
  const right = t ? phraseText(world.inv, world.scene, { expression: t.expression, refs: t.refs, metres: t.metres }) : "en otro sitio";
  return { message: `No está ${wrong} — está ${right}.`, truth: t ? sentence(world.inv, world.scene, [{ expression: t.expression, refs: t.refs, metres: t.metres }]) : "" };
}

function regionalNote(world: World, expressionId: string): string | null {
  const e = world.inv.get(expressionId);
  if (!e.region) return null;
  const where = e.region === "es-419" ? "Latin American" : "Spain";
  const std = e.standard ? world.inv.get(e.standard).es : null;
  return std ? `${e.es} is ${where} Spanish; also said: ${std}.` : `${e.es} is used in ${where}.`;
}

function grammarVerdict(said: Said[], issue: Issue): Verdict {
  return { kind: "grammar", said, rule: issue.rule, note: issue.note };
}

/** Judge a typed or spoken answer. */
export function judgeText(world: World, spotId: string, rot: Rotation, text: string): Verdict {
  const r = parseAnswer(text, world);
  if (!r.ok) {
    return {
      kind: "unparsed",
      message: r.reason === "empty" ? "Say where he is: El gnomo está…" : r.unknown ? `No te entendí — I don't know "${r.unknown}" here.` : "No te entendí — try again.",
    };
  }
  const { parsed } = r;
  const said = parsed.phrases.map((p) => saidOf(p));
  if (parsed.issues.length) return grammarVerdict(said, parsed.issues[0]);

  const notes: string[] = [];
  const confirmed: Said[] = [];
  let vague: PhraseStatus | null = null;
  for (const p of parsed.phrases) {
    const st = evalPhrase(world, spotId, rot, { expression: p.expression, refs: p.refs.map((x) => x.ids), distance: p.distance });
    if (st.status === "false") {
      const f = falseMessage(world, spotId, rot, saidOf(p), p.refs.map((x) => x.name));
      return { kind: "false", said, ...f };
    }
    if (st.status === "vague") {
      vague ??= st;
      continue;
    }
    confirmed.push(saidOf(p, st.refs));
  }
  if (confirmed.length === 0 && vague?.status === "vague") return { kind: "vague", said, message: vague.message, unlock: vague.unlock };

  if (parsed.accents.length) notes.push(`Accents: ${parsed.accents.join(", ")}.`);
  if (parsed.missingArticle.length) notes.push(`Use the article: ${parsed.missingArticle.join(", ")}.`);
  for (const s of confirmed) {
    const n = regionalNote(world, s.expression);
    if (n) notes.push(n);
  }
  const all = vague?.status === "vague" && vague.unlock ? said : confirmed;
  return { kind: "true", sentence: sentence(world.inv, world.scene, confirmed.map(specOf)), said: all, notes };
}

/** Judge a chip + tapped reference(s) (suggestions on). */
export function judgeChoice(world: World, spotId: string, rot: Rotation, expression: string, refs: string[]): Verdict {
  const said: Said = { expression, refs, form: world.inv.get(expression).es };
  const st = evalPhrase(world, spotId, rot, { expression, refs: refs.map((r) => [r]) });
  if (st.status === "true") return { kind: "true", sentence: sentence(world.inv, world.scene, [specOf(said)]), said: [said], notes: [] };
  if (st.status === "vague") return { kind: "vague", said: [said], message: st.message, unlock: false };
  return { kind: "false", said: [said], ...falseMessage(world, spotId, rot, said) };
}

/** Judge what Claude parsed (fallback): truth still comes from the relation engine. */
export function judgeParsedIds(world: World, spotId: string, rot: Rotation, expression: string, refs: string[], grammar: string[]): Verdict {
  const said: Said = { expression, refs, form: world.inv.get(expression).es };
  if (grammar.length) return { kind: "grammar", said: [said], rule: "claude", note: grammar[0] };
  return judgeChoice(world, spotId, rot, expression, refs);
}

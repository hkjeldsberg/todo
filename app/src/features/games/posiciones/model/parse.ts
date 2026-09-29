import { lintSentence, NOTES, type GrammarRule } from "@/features/games/shared/location-grammar";
import { articleInfo, namesOf, type Inventory } from "./inventory";
import type { World } from "./relations";
import type { Gender, GNumber } from "./types";

/**
 * Deterministic parser for typed or spoken answers. Longest match over
 *
 *   [filler]* [subject]? [verb]? [posture]? ( [modifier]* expression reference ([y|con] reference)? )+ [verb subject]?
 *
 * Accent- and case-insensitive (voice), knows every form and bare form in the
 * inventory, the scene's object names and aliases, articles, and the generic
 * contractions de + el → del, a + el → al. It never decides truth: it returns
 * what was said, the grammar problems it saw, and gentle notes (accents,
 * a missing article).
 */

// ─────────────────────────────────────────────────────────────── tokens

export interface Tok {
  raw: string;
  norm: string;
}

/** Lower case, no diacritics (ñ → n): what voice and phone keyboards give us. */
export function fold(s: string): string {
  return s.toLocaleLowerCase("es").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function tokenize(text: string): Tok[] {
  return text
    .replace(/[¿?¡!.,;:"«»“”()[\]…—–/]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({ raw, norm: fold(raw) }));
}

// ─────────────────────────────────────────────────────────────── results

export type ParseRule =
  | GrammarRule
  | "article-gender"
  | "participle-agreement"
  | "missing-de"
  | "extra-de"
  | "ser-location"
  | "subject-number"
  | "entre-two"
  | "hay-subject";

export interface Issue {
  rule: ParseRule;
  note: string;
}

export interface RefMatch {
  /** Candidate object ids (several when the noun is ambiguous: "la lápida"). */
  ids: string[];
  /** The name as the content spells it, with its article ("la lápida grande"). */
  name: string;
  gender: Gender;
  number: GNumber;
}

export interface PhraseMatch {
  expression: string;
  /** The inventory form that matched ("detrás de", "al comienzo de"). */
  form: string;
  refs: RefMatch[];
  /** For distance phrases: the range said, in metres. */
  distance?: { min: number; max: number };
  metres?: number;
}

export interface Parsed {
  phrases: PhraseMatch[];
  subject: { number: GNumber; definite: boolean } | null;
  verb: string | null;
  issues: Issue[];
  /** Gentle corrections that don't block (accents, a missing article). */
  accents: string[];
  missingArticle: string[];
}

export type ParseResult = { ok: true; parsed: Parsed } | { ok: false; reason: "empty" | "unparsed"; unknown?: string };

// ─────────────────────────────────────────────────────────────── lexicon

interface ExprEntry {
  id: string;
  /** Folded tokens to match. */
  tokens: string[];
  /** Canonical (accented) words, for the accent notes. */
  words: string[];
  form: string;
  /** form = full form; bare = valid without a reference; stub = form minus its de/a (only valid as an error). */
  kind: "form" | "bare" | "stub";
  tail: "de" | "a" | null;
  agrees: boolean;
}

interface NameEntry {
  ids: string[];
  tokens: string[];
  words: string[];
  name: string;
  gender: Gender;
  number: GNumber;
}

interface Lexicon {
  inv: Inventory;
  exprs: ExprEntry[];
  names: NameEntry[];
  subjects: Map<string, { number: GNumber; words: string[] }>;
}

const cache = new WeakMap<World, Lexicon>();

function lexicon(world: World): Lexicon {
  const hit = cache.get(world);
  if (hit) return hit;
  const exprs: ExprEntry[] = [];
  const push = (id: string, form: string, kind: ExprEntry["kind"], agrees: boolean) => {
    const words = form.split(" ");
    const last = words[words.length - 1];
    exprs.push({
      id,
      tokens: words.map(fold),
      words,
      form,
      kind,
      tail: last === "de" || last === "a" ? last : null,
      agrees,
    });
  };
  for (const e of world.inv.list) {
    if (e.id === "a_distancia_de" || e.id === "a_manzanas_de" || e.id === "a_cuadras_de") continue; // matched by matchDistance
    for (const form of e.forms) push(e.id, form, "form", e.agrees);
    if (e.bare && !e.forms.includes(e.bare)) push(e.id, e.bare, "bare", e.agrees);
    if (e.ref_count > 0) {
      for (const form of e.forms) {
        const words = form.split(" ");
        const last = words[words.length - 1];
        const stub = words.slice(0, -1).join(" ");
        if ((last === "de" || last === "a") && stub && stub !== e.bare) push(e.id, stub, "stub", e.agrees);
      }
    }
  }
  exprs.sort((a, b) => b.tokens.length - a.tokens.length || kindRank(a.kind) - kindRank(b.kind));

  const byKey = new Map<string, NameEntry>();
  for (const o of world.objects) {
    for (const n of namesOf(o)) {
      const words = n.es.split(" ").slice(1);
      const tokens = words.map(fold);
      const key = `${tokens.join(" ")}|${n.gender}|${n.number}`;
      const prev = byKey.get(key);
      if (prev) prev.ids.push(o.id);
      else byKey.set(key, { ids: [o.id], tokens, words, name: n.es, gender: n.gender, number: n.number });
    }
  }
  const names = [...byKey.values()].sort((a, b) => b.tokens.length - a.tokens.length);

  const subjects = new Map<string, { number: GNumber; words: string[] }>();
  for (const s of [world.subject.es, ...world.subject.aliases]) {
    const noun = s.split(" ").slice(1).join(" ");
    subjects.set(fold(noun), { number: "sg", words: [noun] });
    subjects.set(fold(`${noun}s`), { number: "pl", words: [`${noun}s`] });
  }
  const lex = { inv: world.inv, exprs, names, subjects };
  cache.set(world, lex);
  return lex;
}

const kindRank = (k: ExprEntry["kind"]) => (k === "form" ? 0 : k === "bare" ? 1 : 2);

// ─────────────────────────────────────────────────────────────── closed word lists

const FILLERS: string[][] = [
  ["yo", "creo", "que"],
  ["creo", "que"],
  ["me", "parece", "que"],
  ["esta", "claro", "que"],
  ["lo", "veo"],
  ["ya", "lo", "veo"],
  ["pues"],
  ["mira"],
  ["vale"],
  ["bueno"],
  ["ah"],
  ["oh"],
  ["ajá"].map(fold),
  ["si"],
  ["ahora"],
  ["ya"],
];

const TRAILERS: string[][] = [["creo"], ["ahora"], ["otra", "vez"], ["verdad"], ["no"], ["jaja"]];

const MODIFIERS: string[][] = [["justo"], ["justamente"], ["muy"], ["bastante"], ["un", "poco"], ["mas", "o", "menos"], ["casi"], ["todavia"], ["aun"], ["ahora"], ["tambien"]];

interface VerbDef {
  tokens: string[];
  words: string[];
  lemma: "estar" | "haber" | "ser" | "other";
  number: GNumber;
}

const VERBS: VerbDef[] = [
  { tokens: ["se", "ha", "escondido"], words: ["se", "ha", "escondido"], lemma: "other", number: "sg" },
  { tokens: ["esta", "dando", "vueltas"], words: ["está", "dando", "vueltas"], lemma: "estar", number: "sg" },
  { tokens: ["se", "encuentra"], words: ["se", "encuentra"], lemma: "estar", number: "sg" },
  { tokens: ["se", "encuentran"], words: ["se", "encuentran"], lemma: "estar", number: "pl" },
  { tokens: ["se", "esconde"], words: ["se", "esconde"], lemma: "other", number: "sg" },
  { tokens: ["se", "oculta"], words: ["se", "oculta"], lemma: "other", number: "sg" },
  { tokens: ["se", "asoma"], words: ["se", "asoma"], lemma: "other", number: "sg" },
  { tokens: ["esta", "mirando"], words: ["está", "mirando"], lemma: "estar", number: "sg" },
  { tokens: ["esta", "corriendo"], words: ["está", "corriendo"], lemma: "estar", number: "sg" },
  { tokens: ["da", "vueltas"], words: ["da", "vueltas"], lemma: "other", number: "sg" },
  { tokens: ["esta"], words: ["está"], lemma: "estar", number: "sg" },
  { tokens: ["estan"], words: ["están"], lemma: "estar", number: "pl" },
  { tokens: ["hay"], words: ["hay"], lemma: "haber", number: "sg" },
  { tokens: ["queda"], words: ["queda"], lemma: "other", number: "sg" },
  { tokens: ["quedan"], words: ["quedan"], lemma: "other", number: "pl" },
  { tokens: ["mira"], words: ["mira"], lemma: "other", number: "sg" },
  { tokens: ["corre"], words: ["corre"], lemma: "other", number: "sg" },
  { tokens: ["sigue"], words: ["sigue"], lemma: "other", number: "sg" },
  { tokens: ["es"], words: ["es"], lemma: "ser", number: "sg" },
  { tokens: ["son"], words: ["son"], lemma: "ser", number: "pl" },
];

/** Posture participles after the verb; they agree with the gnome. */
const POSTURES = ["escondid", "sentad", "tumbad", "acostad", "subid", "metid", "agachad", "ocult", "colocad", "situad", "parad", "asomad"];

const SUBJECT_DETS: Record<string, { number: GNumber; definite: boolean; gender: Gender }> = {
  el: { number: "sg", definite: true, gender: "m" },
  la: { number: "sg", definite: true, gender: "f" },
  los: { number: "pl", definite: true, gender: "m" },
  un: { number: "sg", definite: false, gender: "m" },
  una: { number: "sg", definite: false, gender: "f" },
  unos: { number: "pl", definite: false, gender: "m" },
  este: { number: "sg", definite: true, gender: "m" },
  ese: { number: "sg", definite: true, gender: "m" },
  aquel: { number: "sg", definite: true, gender: "m" },
  nuestro: { number: "sg", definite: true, gender: "m" },
  mi: { number: "sg", definite: true, gender: "m" },
  tu: { number: "sg", definite: true, gender: "m" },
};

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
};
const FEW = new Set(["unos", "unas", "pocos", "pocas", "algunos", "algunas", "varios", "varias"]);

/** Size/colour words people add to a noun that the content doesn't list. */
const LOOSE_ADJECTIVES = new Set(["grande", "pequeno", "pequena", "verde", "alto", "alta", "viejo", "vieja", "rojo", "roja", "gris", "blanco", "blanca", "azul", "marron", "negro", "negra", "bonito", "bonita"]);

// ─────────────────────────────────────────────────────────────── parser state

interface Span {
  start: number;
  end: number;
}

interface Cand {
  end: number;
  phrase: PhraseMatch;
  issues: Issue[];
  /** token index → canonical word, for accent notes. */
  canon: [number, string][];
  missingArticle: string[];
}

class Parser {
  private readonly t: Tok[];
  private readonly lex: Lexicon;
  unknown: string | undefined;
  /** Token indices read as modifiers ("justo", "un poco"): the linter skips them. */
  readonly mods = new Set<number>();

  constructor(tokens: Tok[], lex: Lexicon) {
    this.t = tokens;
    this.lex = lex;
  }

  private seq(i: number, seqs: string[][]): number {
    for (const s of seqs) if (s.every((w, k) => this.t[i + k]?.norm === w)) return i + s.length;
    return i;
  }

  skipFillers(i: number, lists = FILLERS): number {
    for (;;) {
      const j = this.seq(i, lists);
      if (j === i) return i;
      i = j;
    }
  }

  verb(i: number): (Span & { def: VerbDef }) | null {
    for (const def of VERBS) if (def.tokens.every((w, k) => this.t[i + k]?.norm === w)) return { start: i, end: i + def.tokens.length, def };
    return null;
  }

  posture(i: number): (Span & { suffix: string; word: string }) | null {
    const w = this.t[i]?.norm;
    if (!w) return null;
    for (const stem of POSTURES) {
      const m = w.match(new RegExp(`^${stem}(o|a|os|as)$`));
      if (m) return { start: i, end: i + 1, suffix: m[1], word: `${stem}o` };
    }
    if (w === "de" && this.t[i + 1]?.norm === "pie") return { start: i, end: i + 2, suffix: "o", word: "de pie" };
    return null;
  }

  subject(i: number): (Span & { number: GNumber; definite: boolean; detGender: Gender | null; words: string[] }) | null {
    const det = SUBJECT_DETS[this.t[i]?.norm ?? ""];
    const j = det ? i + 1 : i;
    const noun = this.lex.subjects.get(this.t[j]?.norm ?? "");
    if (noun) {
      return { start: i, end: j + 1, number: noun.number, definite: det?.definite ?? true, detGender: det?.gender ?? null, words: noun.words };
    }
    // "Él está…" (pronoun), voice gives "el".
    if (this.t[i]?.norm === "el" && this.verb(i + 1)) return { start: i, end: i + 1, number: "sg", definite: true, detGender: null, words: ["él"] };
    return null;
  }

  /** A reference noun phrase. `implicitEl`: the article already fused into del/al. */
  np(i: number, implicitEl: boolean): { end: number; ref: RefMatch; issues: Issue[]; canon: [number, string][]; missingArticle: boolean } | null {
    const tok = this.t[i];
    if (!tok) return null;
    const art = implicitEl ? null : articleInfo(tok.norm);
    const j = art ? i + 1 : i;
    let hit: NameEntry | null = null;
    for (const n of this.lex.names) {
      if (n.tokens.every((w, k) => this.t[j + k]?.norm === w)) {
        hit = n;
        break;
      }
    }
    let end: number;
    let ids: string[];
    if (hit) {
      end = j + hit.tokens.length;
      ids = hit.ids;
    } else {
      // Head noun only ("la lápida" when there are three): every object with that head.
      const heads = this.lex.names.filter((n) => n.tokens[0] === this.t[j]?.norm);
      if (heads.length === 0) {
        if (this.t[j] && (art || implicitEl)) this.unknown ??= this.t[j].raw;
        return null;
      }
      hit = heads[0];
      end = j + 1;
      ids = [...new Set(heads.flatMap((h) => h.ids))];
    }
    while (this.t[end] && LOOSE_ADJECTIVES.has(this.t[end].norm)) end++;

    const issues: Issue[] = [];
    const noun = hit.words.join(" ");
    const artGender = implicitEl ? "m" : art?.gender;
    const artNumber = implicitEl ? "sg" : art?.number;
    if ((implicitEl || art) && (artGender !== hit.gender || artNumber !== hit.number)) {
      issues.push({ rule: "article-gender", note: articleNote(noun, hit) });
    }
    const canon: [number, string][] = hit.words.map((w, k) => [j + k, w]);
    return {
      end,
      ref: { ids, name: hit.name, gender: hit.gender, number: hit.number },
      issues,
      canon,
      missingArticle: !art && !implicitEl,
    };
  }

  private matchEntry(e: ExprEntry, i: number): { end: number; contracted: boolean; suffix: string | null } | null {
    let contracted = false;
    let suffix: string | null = null;
    for (let k = 0; k < e.tokens.length; k++) {
      const tok = this.t[i + k];
      if (!tok) return null;
      const w = e.tokens[k];
      const isLast = k === e.tokens.length - 1;
      if (isLast && e.kind === "form" && e.tail && ((w === "de" && tok.norm === "del") || (w === "a" && tok.norm === "al"))) {
        contracted = true;
        continue;
      }
      if (k === 0 && e.agrees) {
        const stem = w.replace(/o$/, "");
        const m = tok.norm.match(/^(.*?)(o|a|os|as)$/);
        if (!m || m[1] !== stem) return null;
        suffix = m[2];
        continue;
      }
      if (tok.norm !== w) return null;
    }
    return { end: i + e.tokens.length, contracted, suffix };
  }

  /** "a dos metros de", "a unos pasos del", "a tres manzanas de". */
  private distance(i: number): { end: number; id: string; min: number; max: number; metres?: number; form: string; contracted: boolean } | null {
    if (this.t[i]?.norm !== "a") return null;
    const q = this.t[i + 1]?.norm;
    const unit = this.t[i + 2]?.norm;
    const link = this.t[i + 3]?.norm;
    if (!q || !unit || (link !== "de" && link !== "del")) return null;
    const n = NUMBER_WORDS[q] ?? (/^\d+$/.test(q) ? Number(q) : null);
    const few = FEW.has(q);
    if (n === null && !few) return null;
    const unitBase = unit.replace(/(es|s)$/, "");
    const id = unitBase === "metro" || unitBase === "paso" ? "a_distancia_de" : unitBase === "manzana" ? "a_manzanas_de" : unitBase === "cuadra" ? "a_cuadras_de" : null;
    if (!id) return null;
    let min: number;
    let max: number;
    if (few) [min, max] = [0.8, 4.2];
    else if (unitBase === "paso") [min, max] = n! <= 2 ? [0.2, 2.5] : [n! - 1, n! + 1];
    else [min, max] = [n! - 0.75, n! + 0.75];
    const form = this.t.slice(i, i + 3).map((x) => x.raw.toLocaleLowerCase("es")).join(" ") + " de";
    return { end: i + 4, id, min, max, metres: unitBase === "metro" && n !== null ? n : undefined, form, contracted: link === "del" };
  }

  /** Every way to read one located phrase at i, longest first. */
  phrase(i0: number): Cand[] {
    const i = this.skipFillers(i0, MODIFIERS);
    for (let k = i0; k < i; k++) this.mods.add(k);
    const out: Cand[] = [];
    const inv = this.lex.inv;

    const d = this.distance(i);
    if (d) {
      const np = this.np(d.end, d.contracted);
      if (np) {
        out.push({
          end: np.end,
          phrase: { expression: d.id, form: d.form, refs: [np.ref], distance: { min: d.min, max: d.max }, metres: d.metres },
          issues: [...np.issues, ...this.uncontracted(d.contracted ? null : "de", d.end)],
          canon: np.canon,
          missingArticle: np.missingArticle ? [np.ref.name] : [],
        });
      }
    }

    for (const e of this.lex.exprs) {
      const m = this.matchEntry(e, i);
      if (!m) continue;
      const exp = inv.get(e.id);
      const canon: [number, string][] = e.words.map((w, k) => [i + k, w] as [number, string]);
      if (m.contracted) canon[canon.length - 1] = [m.end - 1, e.tail === "de" ? "del" : "al"];
      const issues: Issue[] = [];
      if (e.agrees && m.suffix && m.suffix !== "o") {
        const head = e.words[0];
        issues.push({ rule: "participle-agreement", note: `${head} agrees with el gnomo (masculine, singular): ${head}, not ${head.replace(/o$/, m.suffix)}.` });
        canon[0] = [i, e.words[0].replace(/o$/, m.suffix)];
      }

      if (exp.ref_count === 0) {
        out.push({ end: m.end, phrase: { expression: e.id, form: e.form, refs: [] }, issues, canon, missingArticle: [] });
        // "en el sótano del mausoleo": an optional complement.
        const link = this.t[m.end]?.norm;
        if (link === "de" || link === "del") {
          const np = this.np(m.end + 1, link === "del");
          if (np) out.push({ end: np.end, phrase: { expression: e.id, form: e.form, refs: [np.ref] }, issues: [...issues, ...np.issues], canon: [...canon, ...np.canon], missingArticle: [] });
        }
        continue;
      }

      if (e.kind === "form") {
        const np = this.np(m.end, m.contracted);
        if (!np) {
          // "entre del seto…": a de that doesn't belong.
          const extra = this.t[m.end]?.norm;
          if (!e.tail && (extra === "de" || extra === "del")) {
            const np2 = this.np(m.end + 1, extra === "del");
            if (np2) {
              issues.push({ rule: "extra-de", note: `${e.form} takes no de: ${e.form} ${np2.ref.name}.` });
              out.push(this.withSecond(e, exp.ref_count, { end: np2.end, phrase: { expression: e.id, form: e.form, refs: [np2.ref] }, issues: [...issues, ...np2.issues], canon: [...canon, ...np2.canon], missingArticle: [] }));
            }
          }
          continue;
        }
        const base: Cand = {
          end: np.end,
          phrase: { expression: e.id, form: e.form, refs: [np.ref] },
          issues: [...issues, ...np.issues, ...this.uncontracted(m.contracted ? null : e.tail, m.end)],
          canon: [...canon, ...np.canon],
          missingArticle: np.missingArticle ? [np.ref.name] : [],
        };
        out.push(...this.expand(e, exp.ref_count, base));
        continue;
      }

      // bare or stub: followed by a noun phrase means the de/a is missing.
      const np = this.np(m.end, false);
      if (np && !np.missingArticle) {
        const full = exp.forms[0];
        issues.push({ rule: "missing-de", note: `${e.form} needs ${full.split(" ").pop()} before the thing: ${full} + ${np.ref.name}.` });
        out.push(...this.expand(e, exp.ref_count, { end: np.end, phrase: { expression: e.id, form: full, refs: [np.ref] }, issues: [...issues, ...np.issues], canon: [...canon, ...np.canon], missingArticle: [] }));
      }
      if (e.kind === "bare") out.push({ end: m.end, phrase: { expression: e.id, form: e.form, refs: [] }, issues, canon, missingArticle: [] });
    }
    return out.sort((a, b) => b.end - a.end);
  }

  /** A form ending in de/a followed by a plain "el": de el → del. */
  private uncontracted(tail: "de" | "a" | null, artAt: number): Issue[] {
    if (!tail || this.t[artAt]?.raw !== "el") return [];
    return tail === "de" ? [{ rule: "de-el", note: NOTES["de-el"] }] : [{ rule: "a-el", note: NOTES["a-el"] }];
  }

  /** Two-reference expressions: "entre A y B", "en la esquina de A con B". */
  private expand(e: ExprEntry, refCount: number, base: Cand): Cand[] {
    if (refCount !== 2) return [base];
    return [this.withSecond(e, refCount, base)];
  }

  private withSecond(e: ExprEntry, refCount: number, base: Cand): Cand {
    if (refCount !== 2) return base;
    const joiner = this.t[base.end]?.norm;
    const allowed = e.id === "en_la_esquina_con" ? ["con", "y"] : ["y", "e"];
    if (joiner && allowed.includes(joiner)) {
      // "entre del seto y del jarrón": a stray de before the second thing too.
      const stray = this.t[base.end + 1]?.norm;
      const hasStray = (stray === "de" || stray === "del") && !e.tail;
      const np = hasStray ? this.np(base.end + 2, stray === "del") : this.np(base.end + 1, false);
      if (np) {
        const extra: Issue[] = hasStray && !base.issues.some((x) => x.rule === "extra-de") ? [{ rule: "extra-de", note: `${e.form} takes no de: ${e.form} … y ….` }] : [];
        return {
          end: np.end,
          phrase: { ...base.phrase, refs: [...base.phrase.refs, np.ref] },
          issues: [...base.issues, ...extra, ...np.issues],
          canon: [...base.canon, ...np.canon],
          missingArticle: [...base.missingArticle, ...(np.missingArticle ? [np.ref.name] : [])],
        };
      }
    }
    if (e.id === "en_la_esquina_con") return { ...base, end: -1 }; // needs its second street
    const single = base.phrase.refs[0];
    if (single.number === "pl") return base; // "entre las lápidas"
    return { ...base, issues: [...base.issues, { rule: "entre-two", note: `${e.form} needs two things joined by y: ${e.form} ${single.name} y …` }] };
  }

  /** One or more phrases joined by y. */
  phrases(i: number, depth = 0): { end: number; cands: Cand[] }[] {
    const out: { end: number; cands: Cand[] }[] = [];
    for (const c of this.phrase(i)) {
      if (c.end < 0) continue;
      if (depth < 2) {
        const j = this.t[c.end]?.norm === "y" || this.t[c.end]?.norm === "e" ? c.end + 1 : c.end;
        for (const rest of this.phrases(j, depth + 1)) out.push({ end: rest.end, cands: [c, ...rest.cands] });
      }
      out.push({ end: c.end, cands: [c] });
    }
    return out.sort((a, b) => b.end - a.end);
  }
}

function articleNote(noun: string, hit: NameEntry): string {
  const def = hit.number === "pl" ? (hit.gender === "m" ? "los" : "las") : hit.gender === "m" ? "el" : "la";
  const kind = `${hit.gender === "m" ? "masculine" : "feminine"}${hit.number === "pl" ? " plural" : ""}`;
  const withDe = def === "el" ? "del" : `de ${def}`;
  return `${noun} is ${kind}: ${def} ${noun} (${withDe} ${noun}).`;
}

// ─────────────────────────────────────────────────────────────── entry point

const HAS_ACCENT = /[áéíóúü]/i;

export function parseAnswer(text: string, world: World): ParseResult {
  const t = tokenize(text);
  if (t.length === 0) return { ok: false, reason: "empty" };
  const lex = lexicon(world);
  const p = new Parser(t, lex);

  const start = p.skipFillers(0);
  type Pre = { end: number; subject: ReturnType<Parser["subject"]>; verb: ReturnType<Parser["verb"]>; posture: ReturnType<Parser["posture"]>; hay: boolean };
  const pres: Pre[] = [];
  const withPosture = (end: number, subject: Pre["subject"], verb: Pre["verb"], hay = false) => {
    const post = verb ? p.posture(end) : null;
    if (post) pres.push({ end: post.end, subject, verb, posture: post, hay });
    pres.push({ end, subject, verb, posture: null, hay });
  };
  const s1 = p.subject(start);
  if (s1) {
    const v = p.verb(s1.end);
    if (v) withPosture(v.end, s1, v);
    pres.push({ end: s1.end, subject: s1, verb: null, posture: null, hay: false });
  }
  const v1 = p.verb(start);
  if (v1) {
    const s2 = p.subject(v1.end);
    if (s2) withPosture(s2.end, s2, v1, true);
    withPosture(v1.end, null, v1);
  }
  pres.push({ end: start, subject: null, verb: null, posture: null, hay: false });

  for (const pre of pres) {
    for (const seq of p.phrases(pre.end)) {
      let end = seq.end;
      let subject = pre.subject;
      let verb = pre.verb;
      // Inverted order: "detrás del seto está el gnomo" / "… hay un gnomo".
      if (!verb) {
        const v = p.verb(end);
        if (v) {
          verb = v;
          end = v.end;
          const s = subject ? null : p.subject(end);
          if (s) {
            subject = s;
            end = s.end;
          }
        }
      }
      end = p.skipFillers(end, TRAILERS);
      if (end !== t.length) continue;
      return { ok: true, parsed: finish(t, seq.cands, subject, verb, pre.posture, p.mods) };
    }
  }
  return { ok: false, reason: "unparsed", unknown: p.unknown ?? firstUnknown(t, lex) };
}

function firstUnknown(t: Tok[], lex: Lexicon): string | undefined {
  const known = new Set<string>([
    ...lex.exprs.flatMap((e) => e.tokens),
    ...lex.names.flatMap((n) => n.tokens),
    ...VERBS.flatMap((v) => v.tokens),
    ...Object.keys(SUBJECT_DETS),
    ...lex.subjects.keys(),
    "y",
    "e",
    "de",
    "del",
    "al",
    "los",
    "las",
  ]);
  return t.find((x) => !known.has(x.norm))?.raw;
}

function finish(
  t: Tok[],
  cands: Cand[],
  subject: ReturnType<Parser["subject"]>,
  verb: ReturnType<Parser["verb"]>,
  posture: ReturnType<Parser["posture"]>,
  mods: Set<number>,
): Parsed {
  const issues: Issue[] = cands.flatMap((c) => c.issues);
  const add = (rule: ParseRule, note: string) => {
    if (!issues.some((x) => x.rule === rule)) issues.push({ rule, note });
  };

  // Subject and verb.
  const def = verb?.def;
  if (def?.lemma === "ser") add("ser-location", "Where something is uses estar, not ser: El gnomo está…");
  if (subject && subject.number === "pl") add("subject-number", "There's only one gnome: el gnomo está…");
  if (def?.lemma === "haber") {
    if (subject?.definite) add("hay-definite", NOTES["hay-definite"]);
    if (!subject) add("hay-subject", "Hay needs what there is: Hay un gnomo detrás del seto.");
  }
  if (def?.lemma === "estar" && subject && !subject.definite) add("estar-indefinite", NOTES["estar-indefinite"]);
  if (def && def.lemma !== "haber" && def.number !== (subject?.number ?? "sg") && subject?.number !== "pl") {
    add("estar-agreement", "There's one gnome, so the verb is singular: está.");
  }
  if (subject?.detGender === "f") add("article-gender", "gnomo is masculine: el gnomo.");
  if (posture && posture.suffix !== "o") add("participle-agreement", `${posture.word} agrees with el gnomo (masculine, singular): ${posture.word}.`);

  // The shared linter on the answer as said (verbs re-accented, modifiers dropped).
  const words = t.map((x) => x.raw);
  if (verb) verb.def.words.forEach((w, k) => (words[verb.start + k] = w));
  for (const issue of lintSentence(words.filter((_, k) => !mods.has(k)).join(" "))) add(issue.rule, issue.note);

  // Accents: every word we recognised, compared with its canonical spelling.
  const canon: [number, string][] = cands.flatMap((c) => c.canon);
  if (verb) verb.def.words.forEach((w, k) => canon.push([verb.start + k, w]));
  if (subject) subject.words.forEach((w, k) => canon.push([subject.end - subject.words.length + k, w]));
  const accents = new Set<string>();
  for (const [idx, word] of canon) {
    const raw = t[idx]?.raw.toLocaleLowerCase("es");
    if (raw && HAS_ACCENT.test(word) && raw !== word.toLocaleLowerCase("es") && fold(raw) === fold(word)) accents.add(word);
  }

  return {
    phrases: cands.map((c) => c.phrase),
    subject: subject ? { number: subject.number, definite: subject.definite } : null,
    verb: def ? def.words.join(" ") : null,
    issues,
    accents: [...accents],
    missingArticle: cands.flatMap((c) => c.missingArticle),
  };
}

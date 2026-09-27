import {
  tokenKey,
  type Sentence,
  type StoryContent,
  type Target,
  type Tense,
  type Token,
} from "./schema";

/** Spanish label shown in tooltips. */
export const TENSE_LABEL: Record<Tense, string> = {
  preterite: "pretérito",
  imperfect: "imperfecto",
  present: "presente",
  future: "futuro",
  conditional: "condicional",
  present_perfect: "pretérito perfecto",
  subjunctive: "subjuntivo",
  imperfect_subjunctive: "subjuntivo imperfecto",
  imperative: "imperativo",
  infinitive: "infinitivo",
  gerund: "gerundio",
  participle: "participio",
};

/** The four highlight families of the tense toolbar (PRD §3B). */
export type Highlight = "preterite" | "imperfect" | "subjunctive" | "reflexive";
export const HIGHLIGHTS: Highlight[] = ["preterite", "imperfect", "subjunctive", "reflexive"];

export function highlightOf(token: Token): Highlight | null {
  if (token.reflexive_id) return "reflexive";
  if (token.tense === "preterite") return "preterite";
  if (token.tense === "imperfect") return "imperfect";
  if (token.tense === "subjunctive" || token.tense === "imperfect_subjunctive") return "subjunctive";
  return null;
}

/** Which toolbar highlights start switched on for a story's forced targets. */
export function defaultHighlights(targets: Target[]): Highlight[] {
  const on = HIGHLIGHTS.filter((h) => (targets as string[]).includes(h));
  return on.length ? on : HIGHLIGHTS;
}

const LEADING = /^[¿¡"«“(—–-]+/;
const TRAILING = /[.,;:!?"»”)…—–-]+$/;

/** "¿Qué" → ["¿", "Qué", ""]; "comer." → ["", "comer", "."]. */
export function splitPunct(text: string): [string, string, string] {
  const lead = text.match(LEADING)?.[0] ?? "";
  const rest = text.slice(lead.length);
  const trail = rest.match(TRAILING)?.[0] ?? "";
  return [lead, rest.slice(0, rest.length - trail.length), trail];
}

export function sentenceText(sentence: Sentence): string {
  return sentence.tokens.map((t) => t.text).join(" ");
}

/** The sentence with one token's word replaced by {{word}}; punctuation stays. */
export function clozeFor(sentence: Sentence, index: number): { cloze: string; answer: string } {
  const parts = sentence.tokens.map((t, i) => {
    if (i !== index) return t.text;
    const [lead, , trail] = splitPunct(t.text);
    return `${lead}{{word}}${trail}`;
  });
  return { cloze: parts.join(" "), answer: splitPunct(sentence.tokens[index].text)[1] };
}

/**
 * Three wrong options for a saved verb: other forms of the same verb in the story
 * first (fuimos vs íbamos is the confusion that matters), then other verb forms.
 */
export function distractorsFor(story: StoryContent, answer: string, lemma: string | undefined): string[] {
  const same: string[] = [];
  const other: string[] = [];
  for (const node of story.nodes) {
    for (const sentence of node.sentences) {
      for (const token of sentence.tokens) {
        if (!token.tense) continue;
        const word = splitPunct(token.text)[1];
        if (!word || word.toLowerCase() === answer.toLowerCase()) continue;
        (lemma && token.lemma === lemma ? same : other).push(word);
      }
    }
  }
  return [...new Set([...same, ...other])].slice(0, 3);
}

/**
 * Makes Claude's output safe to render: drops empty tokens, sentences and nodes,
 * speakers on narrative, reflexive groups with a single member, and subjunctive
 * links that point at no trigger. Throws if nothing readable is left.
 */
export function repairStory(story: StoryContent): StoryContent {
  const nodes = story.nodes
    .map((node) => ({
      ...node,
      speaker: node.type === "dialogue" ? node.speaker?.trim() || "—" : undefined,
      sentences: node.sentences
        .map((sentence) => ({
          ...sentence,
          tokens: sentence.tokens.filter((t) => t.text.trim()).map((t) => ({ ...t, text: t.text.trim() })),
        }))
        .filter((sentence) => sentence.tokens.length > 0),
    }))
    .filter((node) => node.sentences.length > 0);

  const all = nodes.flatMap((n) => n.sentences.flatMap((s) => s.tokens));
  const reflexiveCount = new Map<string, number>();
  for (const t of all) if (t.reflexive_id) reflexiveCount.set(t.reflexive_id, (reflexiveCount.get(t.reflexive_id) ?? 0) + 1);
  const triggers = new Set(all.flatMap((t) => (t.trigger_id ? [t.trigger_id] : [])));

  for (const node of nodes) {
    for (const sentence of node.sentences) {
      sentence.tokens = sentence.tokens.map((t) => {
        const fixed: Token = { ...t };
        if (fixed.reflexive_id && (reflexiveCount.get(fixed.reflexive_id) ?? 0) < 2) {
          delete fixed.reflexive_id;
          delete fixed.group_translation;
        }
        if (fixed.triggered_by && !triggers.has(fixed.triggered_by)) delete fixed.triggered_by;
        if (fixed.tense && !fixed.lemma) fixed.lemma = splitPunct(fixed.text)[1].toLowerCase();
        return fixed;
      });
    }
  }

  if (nodes.length === 0) throw new Error("The story came back empty.");
  return { title: story.title.trim() || "Cuento", nodes: nodes.map(({ speaker, ...n }) => (speaker ? { ...n, speaker } : n)) };
}

/** Every token that can be saved to Repaso (verb forms), with its key. */
export function savableTokens(story: StoryContent): { key: string; token: Token }[] {
  const out: { key: string; token: Token }[] = [];
  story.nodes.forEach((node, n) =>
    node.sentences.forEach((sentence, s) =>
      sentence.tokens.forEach((token, t) => {
        if (token.tense) out.push({ key: tokenKey(n, s, t), token });
      }),
    ),
  );
  return out;
}

/** Word count, for the library card. */
export function wordCount(story: StoryContent): number {
  return story.nodes.reduce(
    (sum, node) => sum + node.sentences.reduce((s, sentence) => s + sentence.tokens.length, 0),
    0,
  );
}

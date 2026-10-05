import { SLOTS, type Parts, type Prompt, type Slot, type Track } from "./types";

export const TRACK_LABEL: Record<Track, string> = {
  quedar: "quedar · fit",
  parecer: "parecer · opinion",
  parecerse: "parecerse a · looks like",
};

export const RULE: Record<Track, string> = {
  quedar: "quedar + me/te/le… is how clothes fit you: le queda grande. It agrees with the clothes.",
  parecer: "parecer + me/te/le… is an opinion: me parece elegante (it seems elegant to me).",
  parecerse: "parecerse a is “to look like”: se parece a un pirata — reflexive se, plus a.",
};

/** Which verb a form belongs to: queda/quedan → quedar, parece a → parecerse. */
export function trackOfVerb(form: string): Track | null {
  if (/^parecen? a$/.test(form)) return "parecerse";
  if (/^parec/.test(form)) return "parecer";
  if (/^qued/.test(form)) return "quedar";
  return null;
}

export type Verdict = {
  correct: boolean;
  /** Slots answered wrong, in order. */
  wrong: Slot[];
  /** One short English note per wrong slot. */
  notes: string[];
};

const WHO: Record<string, string> = {
  le: "le = to him / her, the person asked about",
  les: "les = to them",
  me: "me = to me",
  nos: "nos = to us",
};

function pronounNote(prompt: Prompt, chosen: string): string {
  const right = prompt.answer_parts.pronoun;
  if (prompt.target_verb === "parecerse") return `parecerse is reflexive: ${right}, not ${chosen}.`;
  const asked = prompt.question_text.toLowerCase();
  if (/\bte\b/.test(asked) && chosen === "Te") return "The question asks you (te), so you answer with me.";
  if (/\bos\b/.test(asked) && chosen === "Os") return "The question asks you all (os), so you answer with nos.";
  const who = WHO[right.toLowerCase()];
  return `${right}, not ${chosen}${who ? `: ${who}` : ""}.`;
}

function verbNote(prompt: Prompt, chosen: string): string {
  const right = prompt.answer_parts.verb;
  const chosenTrack = trackOfVerb(chosen);
  if (chosenTrack === prompt.target_verb) {
    const plural = right.endsWith("n");
    return `${right}, not ${chosen}: the verb agrees with what's worn, which is ${plural ? "plural" : "singular"}.`;
  }
  return `${right}, not ${chosen}. ${RULE[prompt.target_verb]}`;
}

/** All three slots must match. Each wrong slot gets a note on what gave it away. */
export function judge(prompt: Prompt, built: Parts): Verdict {
  const wrong = SLOTS.filter((slot) => built[slot] !== prompt.answer_parts[slot]);
  const notes = wrong.map((slot) => {
    if (slot === "pronoun") return pronounNote(prompt, built.pronoun);
    if (slot === "verb") return verbNote(prompt, built.verb);
    return `Look at the outfit: “${prompt.answer_parts.complement}”, not “${built.complement}”.`;
  });
  return { correct: wrong.length === 0, wrong, notes };
}

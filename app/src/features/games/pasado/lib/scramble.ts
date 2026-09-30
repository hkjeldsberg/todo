import { tokenize } from "@/features/srs/text";
import { formOf, solvedSentence } from "./forms";
import type { Drill, PasadoContent } from "./types";

export type Token = { id: number; text: string; /** the other tense's form, never part of the answer */ decoy: boolean };

export type Scramble = {
  /** The words in sentence order, punctuation dropped, first word lower-cased. */
  answer: string[];
  /** Index of the verb inside `answer`. */
  verbAt: number;
  /** Shuffled bank: every answer word plus the wrong-tense form. */
  bank: Token[];
};

const lowerFirst = (words: string[]) =>
  words.map((w, i) => (i === 0 ? w.charAt(0).toLocaleLowerCase("es") + w.slice(1) : w));

/** Fisher–Yates; reshuffles if the bank came out in answer order. */
function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildScramble(content: PasadoContent, drill: Drill, random: () => number = Math.random): Scramble {
  const answer = lowerFirst(tokenize(solvedSentence(content, drill)));
  const verb = formOf(content, drill);
  const decoy = formOf(content, drill, drill.correct_tense === "preterite" ? "imperfect" : "preterite");
  const verbAt = answer.findIndex((w) => w.toLocaleLowerCase("es") === verb);
  const tokens: Token[] = [...answer, decoy].map((text, id) => ({ id, text, decoy: id === answer.length }));
  let bank = shuffle(tokens, random);
  for (let tries = 0; tries < 5 && bank.every((t, i) => t.id === i); tries++) bank = shuffle(tokens, random);
  return { answer, verbAt, bank };
}

export type ScrambleVerdict = {
  /** What the Leitner box goes by: the right verb form picked, the decoy left out. */
  correct: boolean;
  /** Same words in the same order as the model sentence. */
  exactOrder: boolean;
};

const same = (a: string, b: string) => a.toLocaleLowerCase("es") === b.toLocaleLowerCase("es");

export function judgeScramble(scramble: Scramble, placed: Token[]): ScrambleVerdict {
  const verb = scramble.answer[scramble.verbAt];
  const correct = !placed.some((t) => t.decoy) && placed.some((t) => same(t.text, verb));
  const exactOrder =
    placed.length === scramble.answer.length && placed.every((t, i) => same(t.text, scramble.answer[i]));
  return { correct, exactOrder };
}

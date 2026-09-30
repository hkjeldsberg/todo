import type { PastTense } from "./types";

/** The drawer rows (PRD §4). `pair` rows show two verbs that share one set of forms. */
export type MatrixRow = { infinitives: string[]; english: string };

export const MATRIX: Record<PastTense, MatrixRow[]> = {
  preterite: [
    { infinitives: ["ser", "ir"], english: "to be / to go (identical)" },
    { infinitives: ["dar"], english: "to give" },
    { infinitives: ["ver"], english: "to see" },
    { infinitives: ["hacer"], english: "to do / make" },
    { infinitives: ["tener"], english: "to have" },
    { infinitives: ["estar"], english: "to be" },
    { infinitives: ["poder"], english: "to be able to" },
    { infinitives: ["poner"], english: "to put" },
    { infinitives: ["saber"], english: "to know" },
    { infinitives: ["querer"], english: "to want" },
    { infinitives: ["venir"], english: "to come" },
    { infinitives: ["decir"], english: "to say" },
  ],
  imperfect: [
    { infinitives: ["ser"], english: "to be" },
    { infinitives: ["ir"], english: "to go" },
    { infinitives: ["ver"], english: "to see" },
  ],
};

export const MATRIX_VERBS = [
  ...new Set([...MATRIX.preterite, ...MATRIX.imperfect].flatMap((row) => row.infinitives)),
];

/** The drawer row that holds a verb, if any. */
export function matrixRowOf(tense: PastTense, infinitive: string): number {
  return MATRIX[tense].findIndex((row) => row.infinitives.includes(infinitive));
}

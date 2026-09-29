/**
 * Content types for El Laberinto del Gnomo. The linguistic content (expressions,
 * object names, authored facts, which spots a scene uses) lives in
 * src/content/posiciones.json and todo.posiciones_*; the grid geometry of each
 * scene lives in ./layouts.ts, keyed by the same ids.
 */

export type Level = "A1" | "A2" | "B1";
export type Category = "core" | "building" | "fluency" | "street" | "regional";
export type Region = "es-419" | "es-ES";
export type Gender = "m" | "f";
export type GNumber = "sg" | "pl";

export interface Expression {
  id: string;
  es: string;
  /** Surface phrases before the reference ("encima de"). */
  forms: string[];
  /** The valid form with no reference ("encima"), or null. */
  bare: string | null;
  en: string;
  level: Level;
  category: Category;
  needs_reference: boolean;
  ref_count: 0 | 1 | 2;
  region: Region | null;
  /** For a regional form: the id of the standard expression it means. */
  standard: string | null;
  /** First word is a participle that agrees with the subject (pegado/pegada…). */
  agrees: boolean;
  notes: string | null;
  sort: number;
}

/** A noun phrase with its article: "el seto", "la calle Mayor". */
export interface NounName {
  es: string;
  gender: Gender;
  number: GNumber;
}

export interface SceneObject {
  id: string;
  /** Canonical noun phrase with its article. */
  es: string;
  gender: Gender;
  number: GNumber;
  /** English with article ("the hedge"), for review hints. */
  en: string;
  /** Other names for the same thing, each with its article ("el arbusto", "la maceta"). */
  aliases: string[];
}

/** An authored truth that geometry can't express (or overrides it). */
export interface Fact {
  /** Spot id. */
  target: string;
  expression: string;
  refs: string[];
  /** Camera rotations (0–3) where it holds; all when omitted. */
  rotations?: number[];
  /** false = authored denial that beats geometry. */
  truth?: boolean;
}

export interface Scene {
  id: string;
  sort: number;
  title_es: string;
  title_en: string;
  /** Picks the layout (geometry, palette, decor) in ./layouts.ts. */
  visual_layer: string;
  objects: SceneObject[];
  facts: Fact[];
  /** Hiding-spot ids, in play order. */
  targets: string[];
}

export interface Subject {
  es: string;
  gender: Gender;
  number: GNumber;
  en: string;
  aliases: string[];
}

export interface Content {
  expressions: Expression[];
  subject: Subject;
  scenes: Scene[];
}

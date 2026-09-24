export type Tense = "imperfect" | "preterite" | "trap";

export const ISLAND_ZONES = [
  "tenerife",
  "gran_canaria",
  "lanzarote",
  "fuerteventura",
  "la_palma",
  "la_gomera",
  "el_hierro",
] as const;

export type IslandZone = (typeof ISLAND_ZONES)[number];

export interface Door {
  text: string;
  correct: boolean;
  tense: Tense;
  /** Rule shown on the door when chosen wrongly, or explanation when chosen correctly. */
  feedback: string;
}

/** One puzzle room. Same columns as `todo.laberinto_nodes`. */
export interface PuzzleNode {
  node_id: string;
  island_zone: IslandZone;
  seq: number;
  ambient_prompt: string;
  doors: Door[];
  feedback_imperfect: string | null;
  next_node_id: string | null;
}

/** The game's content: every room, in any order (the game sorts by `seq`). */
export type LaberintoContent = PuzzleNode[];

/** What is saved through `saveProgress`. The gauntlet always resumes from its start. */
export interface LaberintoProgress {
  nodeId: string;
  solved: string[];
  mistakes: number;
}

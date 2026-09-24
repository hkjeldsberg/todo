export type Tense = "imperfect" | "preterite";

export interface AnswerOption {
  form: string;
  type: Tense;
  correct: boolean;
}

/** One memory fragment attached to a 3D object. Mirrors todo.tense_puzzles. */
export interface Puzzle {
  id: string;
  order_index: number;
  scene_object: string;
  sentence_pre: string;
  sentence_post: string;
  verb_base: string;
  options: AnswerOption[];
  rule_feedback: string;
  translation: string | null;
  anim_trigger: string;
}

/** A memory node (room). Mirrors todo.tense_rooms, with its puzzles attached. */
export interface Room {
  id: string;
  order_index: number;
  title: string;
  subtitle: string;
  focus: string;
  puzzles: Puzzle[];
}

export type RoomSummary = Omit<Room, "puzzles">;

/** Everything the client needs: all rooms, sorted, each with its sorted puzzles. */
export interface TenseContent {
  rooms: Room[];
}

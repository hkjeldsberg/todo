export const TRACKS = ["quedar", "parecer", "parecerse"] as const;
export type Track = (typeof TRACKS)[number];

export const SLOTS = ["pronoun", "verb", "complement"] as const;
export type Slot = (typeof SLOTS)[number];
export type Parts = Record<Slot, string>;

export const FITS = ["big", "small", "long", "short"] as const;
export type Fit = (typeof FITS)[number];

/** One SVG piece on the avatar: an item from avatar/items.tsx, its colour, how badly it fits. */
export type Layer = { item: string; color: string; fit?: Fit };

export type Avatar = { skin: string; hair: "short" | "long" | "curly" | "bun"; hairColor: string };

/** One row of todo.probador_outfits. */
export type Outfit = {
  id: string;
  avatar: Avatar;
  layers: Layer[];
  description: string;
  intended_flaw: string;
};

/** One row of todo.probador_prompts. */
export type Prompt = {
  id: string;
  outfit_id: string;
  target_verb: Track;
  /** "¿Cómo le {verb} la chaqueta?" */
  question_text: string;
  /** What goes in {verb} once answered: "queda". */
  question_fill: string;
  answer_parts: Parts;
  /** Wrong options per slot (the right one is added when the card is dealt). */
  distractor_options: Record<Slot, string[]>;
  english_translation: string;
};

export type ProbadorContent = { outfits: Record<string, Outfit>; prompts: Prompt[] };

/** One todo.probador_stats row, in client shape. No entry = never seen. */
export type Stat = {
  seen: number;
  right: number;
  /** Daily sprints answered right first time, in a row. */
  streak: number;
  /** Minutes until due after the last answer. */
  interval: number;
  /** ISO timestamps */
  last: string;
  due: string;
};

export type Stats = Record<string, Stat>;

/** What the page hands the game as initialProgress. `persisted` = the stats table is reachable. */
export type ProbadorProgress = { stats: Stats; persisted: boolean };

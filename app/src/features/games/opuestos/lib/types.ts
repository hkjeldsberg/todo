/**
 * El Rayo Modificador: shapes shared by the content loader, the physics room,
 * the UI and the tests. Rows mirror todo.opuestos_words / todo.opuestos_levels
 * (supabase/migrations/0004_opuestos.sql).
 */

/** What a word changes. Free text in the DB; these are the ones the room understands. */
export const ENGINE_TARGETS = [
  "scale", // uniform size (grande / pequeño)
  "scale_x", // length (largo / corto)
  "scale_y", // height (alto / bajo)
  "mass", // density multiplier (pesado / ligero)
  "fill", // container contents, density multiplier (lleno / vacío)
  "friction", // surface grip (áspero / suave, mojado / seco)
  "restitution", // bounce (elástico / rígido)
  "hardness", // impact damage multiplier (duro / blando)
  "temperature", // +1 hot / -1 cold: melts ice, freezes water (caliente / frío)
  "strength", // breaking load multiplier (fuerte / débil)
  "speed", // velocity / device speed multiplier (rápido / lento)
  "open", // 1 open / 0 shut (abrir / cerrar)
  "power", // 1 on / 0 off (encender / apagar)
  "lift", // +1 up / -1 down (subir / bajar)
] as const;
export type EngineTarget = (typeof ENGINE_TARGETS)[number];

export const CATEGORIES = ["size", "weight", "touch", "temperature", "condition", "pace", "action"] as const;
export type Category = (typeof CATEGORIES)[number];

/** One modifier word. `id` is a stable slug ('pesado') used as the review itemRef. */
export interface Word {
  id: string;
  word: string;
  antonym_id: string;
  engine_target: EngineTarget;
  value_modifier: number;
  shader_trigger: string;
  translation: string;
  category: Category;
  sort: number;
}

/** Every object type the scene builder (lib/room.ts + scene/Objects.tsx) knows. */
export const OBJECT_KINDS = [
  "ground", // static floor / ledge, not a target
  "ramp", // static, tilted by `angle`
  "plank", // static board anchored at one end, can be breakable
  "wall", // static, grows from its base
  "glass", // static breakable pane (bridge or wall)
  "ice", // static block that melts
  "water", // pool: buoyancy; freezes into a walkable slab
  "door", // static gate
  "plate", // pressure plate that opens `links`
  "fan", // blows `force` along `dir` inside `zone`
  "lift", // kinematic platform between travel[0] and travel[1]
  "pipe", // tunnel with an `opening` above pos
  "ball", // dynamic sphere
  "box", // dynamic cuboid
  "bucket", // dynamic container
] as const;
export type ObjectKind = (typeof OBJECT_KINDS)[number];

export type Vec2 = [number, number];
/** Axis-aligned rectangle [x0, y0, x1, y1] in room units (y up). */
export type Rect = [number, number, number, number];

export interface LayoutObject {
  id: string;
  kind: ObjectKind;
  /** Spanish noun with its article, shown in the ray menu ("la caja", "el agua"). */
  noun?: string;
  /** Grammatical gender for agreement: el agua → fría. */
  gender?: "m" | "f";
  /** English for the noun (hover gloss). */
  noun_en?: string;
  /** Centre (for most kinds). Pipes: inner floor centre. */
  pos: Vec2;
  /** Width, height. Balls: diameter in both. */
  size?: Vec2;
  /** Degrees, counter-clockwise (ramps). */
  angle?: number;
  /** Which point stays put when the object is resized. */
  anchor?: "left" | "right" | "bottom" | "center";
  /** Frozen in place until the player presses Soltar. */
  held?: boolean;
  /** Base density (default 1). The iron ball is dense. */
  density?: number;
  /** Load (mass units) a breakable object holds. Present = breakable. */
  strength?: number;
  /** Water body / fan air column. */
  zone?: Rect;
  /** Fan push direction. */
  dir?: Vec2;
  /** Fan force. */
  force?: number;
  /** Initial device states. */
  on?: boolean;
  open?: boolean;
  frozen?: boolean;
  /** Lift: [down y, up y] for its centre. */
  travel?: Vec2;
  start?: "up" | "down";
  /** Plate: door id it opens. */
  links?: string;
  /** Plate: mass needed. */
  threshold?: number;
  /** Pipe: inner height. */
  opening?: number;
  /** rápido on a resting object pushes it this way. */
  push?: Vec2;
  /** Override the default colour of the kind. */
  color?: string;
  /** Objects are targets by kind unless this says otherwise. */
  target?: boolean;
}

export interface SolutionStep {
  object: string;
  word: string;
  /** Seconds after Soltar (default: before releasing). */
  after?: number;
}

export interface Solution {
  steps: SolutionStep[];
  /** English one-liner for the tests and the success panel. */
  note: string;
}

export interface Layout {
  objects: LayoutObject[];
  goal: { object: string; zone: Rect };
  /** Known ways through the room. Players may find others. */
  solutions: Solution[];
  /** Optional camera frame; default fits every object. */
  view?: Rect;
}

export interface Level {
  id: string;
  sort: number;
  title_es: string;
  title_en: string;
  clue_es: string;
  clue_en: string;
  words: string[];
  layout: Layout;
}

export interface OpuestosContent {
  words: Word[];
  levels: Level[];
}

/** Saved through GameProps.saveProgress. */
export interface OpuestosProgress {
  solved: string[];
  /** Word ids the player has fired at least once. */
  discovered: string[];
  /** level id → indices of layout.solutions found. */
  found: Record<string, number[]>;
  lastLevel: string | null;
}

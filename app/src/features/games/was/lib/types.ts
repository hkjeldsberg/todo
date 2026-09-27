export const VERBS = ["era", "estaba", "fue", "estuve"] as const;
export type Verb = (typeof VERBS)[number];

export const PANEL_TYPES = ["establishing", "action"] as const;
export type PanelType = (typeof PANEL_TYPES)[number];

/** One row of `todo.was_panels`: a comic panel with one blank. */
export type Panel = {
  /** Stable slug id (`robo_1`); also the attempt / review ref. */
  id: string;
  /** Groups 5 panels into one playable page. */
  page_id: string;
  panel_order: number;
  /** `establishing` = soft frame (era / estaba), `action` = jagged frame (fue / estuve). */
  panel_type: PanelType;
  sentence_pre: string;
  sentence_post: string;
  correct_verb: Verb;
  /** Shown on a wrong drop. `*word*` renders as emphasis. */
  rule_feedback: string;
  asset_sketch: string;
  asset_color: string;
};

export type ComicPage = { id: string; title: string; panels: Panel[] };

export type WasContent = { pages: ComicPage[] };

export type WasProgress = {
  /** Panel ids answered correctly (kept across visits). */
  solved: string[];
  /** Page ids with every panel solved. */
  completed: string[];
  lastPage: string | null;
};

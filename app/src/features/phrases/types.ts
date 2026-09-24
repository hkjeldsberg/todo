export type Scenario = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type Category = {
  id: string;
  scenario_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type Phrase = {
  id: string;
  scenario_id: string;
  category_id: string | null;
  spanish_text: string;
  translation_text: string;
  /** Position inside its category (or inside the uncategorized bucket). */
  sort_order: number;
  created_at: string;
};

export type ScenarioBoard = {
  scenario: Scenario;
  categories: Category[];
  phrases: Phrase[];
};

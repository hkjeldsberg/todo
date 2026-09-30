import type { Inventory } from "./inventory";
import { trueFacts, VIEW, type World } from "./relations";

const RANK = { A1: 0, A2: 1, B1: 2 } as const;

/**
 * The "Sugerencias" list for a dungeon: every expression some hiding spot makes
 * true from the (fixed) view of the map, standard forms only (regional ones are still
 * accepted when typed), ordered A1 → B1 and then by inventory order.
 */
export function suggestionsFor(world: World, inv: Inventory): string[] {
  const ids = new Set<string>();
  for (const spot of world.scene.targets)
    for (const fact of trueFacts(world, spot, VIEW)) ids.add(fact.expression);
  return inv.list
    .filter((e) => ids.has(e.id) && !e.standard)
    .sort((a, b) => RANK[a.level] - RANK[b.level] || a.sort - b.sort)
    .map((e) => e.id);
}

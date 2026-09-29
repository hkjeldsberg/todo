import { holds, trueFacts, type Rotation, type Truth, type World } from "./relations";

/**
 * "Mostrar sugerencias": 3–4 preposition chips — one that is true for this
 * hiding spot (with some reference the player then taps) and same-category
 * distractors that are false for every reference.
 */

/** Truths too loose to be the answer a chip teaches. */
const NOT_A_CHIP = new Set(["lejos_de", "a_distancia_de", "de_cara_a", "mas_alla_de", "en_diagonal_a", "al_final_de", "en"]);

export interface Tray {
  target: Truth;
  /** Expression ids, shuffled; includes the target. */
  chips: string[];
}

type Rng = () => number;

function shuffle<T>(xs: T[], rng: Rng): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function falseEverywhere(world: World, spotId: string, rot: Rotation, id: string): boolean {
  const e = world.inv.get(id);
  if (e.ref_count === 2) {
    const things = world.objects.filter((o) => o.id !== world.room);
    for (let i = 0; i < things.length; i++)
      for (let j = i + 1; j < things.length; j++) if (holds(world, spotId, { expression: id, refs: [things[i].id, things[j].id] }, rot)) return false;
    return true;
  }
  return !world.objects.some((o) => holds(world, spotId, { expression: id, refs: [o.id] }, rot));
}

export function trayFor(world: World, spotId: string, rot: Rotation, album: ReadonlySet<string>, rng: Rng = Math.random): Tray | null {
  const truths = trueFacts(world, spotId, rot).filter((t) => t.refs.length > 0 && !NOT_A_CHIP.has(t.expression) && !t.refs.includes(world.room));
  if (truths.length === 0) return null;
  const showcase = world.layout.showcase;
  const score = (t: Truth) => (showcase.includes(t.expression) ? 0 : 2) + (album.has(t.expression) ? 1 : 0) + rng() * 0.9;
  const target = truths
    .map((t) => ({ t, s: score(t) }))
    .sort((a, b) => a.s - b.s)[0].t;
  const e = world.inv.get(target.expression);

  // Same category and shape first ("entre" ↔ "a medio camino entre"), then same category, then core words.
  const usable = (x: (typeof world.inv.list)[number]) => x.needs_reference && x.ref_count > 0 && !x.standard && x.id !== e.id && !NOT_A_CHIP.has(x.id) && x.id !== "a_distancia_de" && x.id !== "en_la_esquina_con";
  const ordered = [
    ...shuffle(world.inv.list.filter((x) => usable(x) && x.category === e.category && x.ref_count === e.ref_count), rng),
    ...shuffle(world.inv.list.filter((x) => usable(x) && x.category === e.category), rng),
    ...shuffle(world.inv.list.filter((x) => usable(x) && x.category === "core"), rng),
  ];
  const distractors: string[] = [];
  for (const x of ordered) {
    if (distractors.length === 3) break;
    if (!distractors.includes(x.id) && falseEverywhere(world, spotId, rot, x.id)) distractors.push(x.id);
  }
  return { target, chips: shuffle([target.expression, ...distractors], rng) };
}

import type { Said } from "./judge";
import { phraseText, sentence } from "./phrase";
import { trueFacts, type Rotation, type Truth, type World } from "./relations";

/**
 * End-of-dungeon summary: what the player said in each room, then every other
 * true position (one or two references per expression), and the few misses
 * that go to Repaso.
 */

export interface PlayedRoom {
  spot: string;
  rotation: Rotation;
  said: Said[];
  /** The answer as typed, or the chip sentence. */
  sentence: string;
}

export interface SummaryRoom {
  spot: string;
  said: string;
  used: string[];
  others: { expression: string; phrases: string[] }[];
}

/** Near-synonyms: after "por debajo del puesto", "debajo del puesto" isn't a new thing to review. */
const FAMILIES: string[][] = [
  ["debajo_de", "bajo", "por_debajo_de"],
  ["detras_de", "tras", "por_detras_de"],
  ["delante_de", "por_delante_de"],
  ["dentro_de", "en_el_interior_de", "en"],
  ["fuera_de", "en_el_exterior_de"],
  ["al_lado_de", "junto_a", "pegado_a"],
  ["enfrente_de", "frente_a", "de_cara_a"],
  ["alrededor_de", "en_torno_a"],
  ["en_la_orilla_de", "a_orillas_de", "en_el_borde_de"],
  ["en_medio_de", "en_el_centro_de"],
  ["encima_de", "sobre", "en_lo_alto_de"],
];
const family = (id: string) => FAMILIES.find((f) => f.includes(id)) ?? [id];

/** Shown last and never sent to Repaso: true, but they don't locate him. */
const LOOSE = new Set(["lejos_de", "a_distancia_de", "a_mano_derecha", "a_mano_izquierda", "todo_recto", "de_cara_a", "al_final_de"]);

export function summarize(world: World, rooms: PlayedRoom[]): SummaryRoom[] {
  return rooms.map((r) => {
    const used = r.said.map((s) => world.inv.meaning(s.expression));
    const byExpr = new Map<string, Truth[]>();
    for (const t of trueFacts(world, r.spot, r.rotation)) {
      if (used.includes(t.expression)) continue;
      byExpr.set(t.expression, [...(byExpr.get(t.expression) ?? []), t]);
    }
    const others = [...byExpr.entries()]
      .sort(([a], [b]) => Number(LOOSE.has(a)) - Number(LOOSE.has(b)))
      .map(([expression, ts]) => ({
        expression,
        phrases: ts.slice(0, 2).map((t) => phraseText(world.inv, world.scene, { expression, refs: t.refs, metres: t.metres })),
      }));
    return { spot: r.spot, said: r.sentence, used: r.said.map((s) => s.expression), others };
  });
}

export interface Miss {
  itemRef: string;
  expression: string;
  sentence: string;
}

/**
 * Up to `max` positions the player could have used, for Repaso: expressions
 * not used anywhere in the run, preferring the dungeon's showcase and ones not
 * yet in the album, at most one per room.
 */
export function missesFor(world: World, rooms: PlayedRoom[], album: ReadonlySet<string>, max = 3): Miss[] {
  const usedAnywhere = new Set(rooms.flatMap((r) => r.said.flatMap((s) => family(world.inv.meaning(s.expression)))));
  const showcase = world.layout.showcase;
  const picked = new Set<string>();
  const out: Miss[] = [];
  const candidates = rooms.map((r) =>
    trueFacts(world, r.spot, r.rotation)
      .filter((t) => !usedAnywhere.has(t.expression) && !LOOSE.has(t.expression) && t.expression !== "en" && !t.refs.includes(world.room))
      .sort((a, b) => weight(a) - weight(b)),
  );
  function weight(t: Truth): number {
    const i = showcase.indexOf(t.expression);
    return (i < 0 ? 10 : i) + (album.has(t.expression) ? 20 : 0);
  }
  for (let k = 0; k < rooms.length && out.length < max; k++) {
    const t = candidates[k].find((x) => !picked.has(x.expression));
    if (!t) continue;
    picked.add(t.expression);
    out.push({
      itemRef: `${world.scene.id}:${rooms[k].spot}:${t.expression}`,
      expression: t.expression,
      sentence: sentence(world.inv, world.scene, [{ expression: t.expression, refs: t.refs, metres: t.metres }]),
    });
  }
  return out;
}

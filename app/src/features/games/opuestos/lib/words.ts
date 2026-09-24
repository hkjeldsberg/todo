import type { Word } from "./types";

/**
 * Spanish agreement for the little label the ray leaves on an object. Every
 * adjective here makes its feminine by swapping a final -o for -a (vacío →
 * vacía keeps its accent); the rest are invariable (grande, suave, débil…).
 * The "not adjectives" show the state they leave behind instead.
 */
const ACTION_STATE: Record<string, { m: string; f: string }> = {
  abrir: { m: "abierto", f: "abierta" },
  cerrar: { m: "cerrado", f: "cerrada" },
  encender: { m: "encendido", f: "encendida" },
  apagar: { m: "apagado", f: "apagada" },
  subir: { m: "arriba", f: "arriba" },
  bajar: { m: "abajo", f: "abajo" },
};

export function agree(word: string, gender: "m" | "f" = "m"): string {
  const action = ACTION_STATE[word];
  if (action) return action[gender];
  if (gender === "f" && word.endsWith("o")) return `${word.slice(0, -1)}a`;
  return word;
}

/** "la caja" + pesado → "la caja pesada"; "el agua" + frío → "el agua fría". */
export function phrase(noun: string, word: string, gender: "m" | "f" = "m"): string {
  return `${noun} ${agree(word, gender)}`;
}

/**
 * A level's words grouped into opposite pairs, in the order they were listed.
 * A word whose antonym is not offered stands alone.
 */
export function pairsOf(ids: string[], words: Map<string, Word>): Word[][] {
  const seen = new Set<string>();
  const pairs: Word[][] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const w = words.get(id);
    if (!w) continue;
    seen.add(id);
    const anti = ids.includes(w.antonym_id) ? words.get(w.antonym_id) : undefined;
    if (anti) seen.add(anti.id);
    pairs.push(anti ? [w, anti] : [w]);
  }
  return pairs;
}

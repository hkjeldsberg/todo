import type { Level } from "./types";

/**
 * Grid geometry of each scene, keyed by `visual_layer` and by the object / spot
 * ids in posiciones.json. One tile = one metre. x grows to the east, z to the
 * south (towards the default camera), y is up. Rooms span [-5, 5] × [-5, 5];
 * a few things (the garden gate path, the market streets) sit just outside.
 *
 * Pure data: the relation engine reads it for truth, the renderer for looks.
 */

export type V2 = [number, number];
export type Dir = "n" | "e" | "s" | "w";

export type Trait =
  | "room" // the scene itself: "el jardín"
  | "area" // flat region you can be in or on (street, path, flowerbed)
  | "walled" // enclosure with inside corners (rincón)
  | "container" // you can be inside it (jarrón, pozo, ataúd, torre)
  | "water"
  | "tall" // has a foot (al pie de) and a top (en lo alto de)
  | "hill" // has a summit (en la cima de)
  | "opening" // you can be in it and look through it (reja, verja)
  | "linear" // has a start and an end (camino, calle)
  | "divider"; // splits the plane: "al otro lado de"

export type PropKind =
  | "none"
  | "hedge"
  | "statue"
  | "urn"
  | "bench"
  | "tree"
  | "chest"
  | "flowers"
  | "gate"
  | "fountain"
  | "well"
  | "stall"
  | "crate"
  | "cart"
  | "lamp"
  | "street"
  | "gravestone"
  | "fence"
  | "deadtree"
  | "crypt"
  | "coffin"
  | "tower"
  | "hill"
  | "pond"
  | "path"
  | "hedgewall"
  | "reja";

export interface Body {
  kind: PropKind;
  /** Footprint centre and size (x, z). */
  at: V2;
  size: V2;
  /** Height of the top surface. */
  h: number;
  /** Free space underneath (bench seat, tree canopy, stall table). */
  clear?: number;
  traits?: Trait[];
  /** The side it faces, for "enfrente de" (absolute, not camera). */
  front?: Dir;
  /** For linear things: which end is the beginning. */
  start?: Dir;
  /** Plural group ("las lápidas") made of these object ids. */
  members?: string[];
  /** Colour variant for the renderer. */
  tint?: string;
  /** Where its name label sits, relative to the footprint centre (default: on top). */
  labelAt?: V2;
}

export type Pose = "stand" | "crouch" | "sit" | "lie_up" | "lie_down" | "hang" | "upside" | "lean" | "peek" | "circle";

export interface SpotGeo {
  /** Gnome position on the grid. */
  at: V2;
  /** Height of the gnome's feet (or lowest point when hanging). */
  y: number;
  pose: Pose;
  /** Object he hangs from / sits in (colgado de). */
  host?: string;
  /** Object he leans on (apoyado en). */
  lean?: string;
  /** Direction he faces (de cara a). */
  face?: Dir;
  /** Only authored facts count (the gnome is moving, e.g. circling the fountain). */
  factsOnly?: boolean;
}

export interface Palette {
  bg: string;
  grass: [string, string];
  outside: string;
  wall: string;
  wallTop: string;
}

export interface Layout {
  level: Level;
  /** Object id of the room itself. */
  room: string;
  wall: "hedge" | "stone" | "houses";
  /** Wall sides left open (streets, gate). */
  openSides?: Dir[];
  palette: Palette;
  objects: Record<string, Body>;
  spots: Record<string, SpotGeo>;
  /** Expressions this dungeon teaches first (chips prefer them). */
  showcase: string[];
}

const ROOM: Body = { kind: "none", at: [0, 0], size: [10, 10], h: 0.02, traits: ["room", "area", "walled"] };

export const LAYOUTS: Record<string, Layout> = {
  // ─────────────────────────────────────────── El Jardín (A1)
  jardin: {
    level: "A1",
    room: "jardin",
    wall: "hedge",
    palette: { bg: "#FFE9B8", grass: ["#8CC152", "#7DB346"], outside: "#D9B77E", wall: "#3F8A3A", wallTop: "#52A447" },
    objects: {
      jardin: ROOM,
      seto: { kind: "hedge", at: [-2.5, -2], size: [2, 1], h: 1.1 },
      estatua: { kind: "statue", at: [2.5, -2.5], size: [1, 1], h: 2.2, traits: ["tall"], front: "s" },
      jarron: { kind: "urn", at: [-2.5, 2], size: [1, 1], h: 0.9, traits: ["container"] },
      banco: { kind: "bench", at: [2.4, 0.6], size: [2, 0.8], h: 0.55, clear: 0.42, front: "n" },
      arbol: { kind: "tree", at: [-0.5, -3.8], size: [2.2, 2.2], h: 3.2, clear: 1.3, traits: ["tall"] },
      cofre: { kind: "chest", at: [4, -1], size: [1, 0.7], h: 0.6, traits: ["container"] },
      flores: { kind: "flowers", at: [0, 0.5], size: [2, 1.2], h: 0.15, traits: ["area"] },
      verja: { kind: "gate", at: [5, 0.5], size: [0.3, 1.6], h: 1.4, traits: ["opening"] },
    },
    spots: {
      j_seto: { at: [-2.3, -3.0], y: 0, pose: "crouch", face: "s" },
      j_jarron: { at: [-2.5, 2], y: 0.15, pose: "peek" },
      j_banco: { at: [2.2, 0.6], y: 0, pose: "crouch", face: "s" },
      j_estatua: { at: [2.5, -2.5], y: 2.2, pose: "stand", face: "s" },
      j_entre: { at: [-2.5, 0], y: 0, pose: "stand", face: "e" },
      j_arbol: { at: [0.2, -3.6], y: 2.3, pose: "upside", host: "arbol" },
      j_fuera: { at: [6, 0.5], y: 0, pose: "stand", face: "w" },
    },
    showcase: ["detras_de", "dentro_de", "al_lado_de", "cerca_de", "debajo_de", "encima_de", "entre"],
  },

  // ─────────────────────────────────────────── El Mercado (A2)
  mercado: {
    level: "A2",
    room: "plaza",
    wall: "houses",
    openSides: ["s", "e"],
    palette: { bg: "#FFE9B8", grass: ["#E8C98F", "#DDBB7E"], outside: "#B9A48A", wall: "#E98A6A", wallTop: "#C8573F" },
    objects: {
      plaza: ROOM,
      fuente: { kind: "fountain", at: [0, 0], size: [2.4, 2.4], h: 0.7, traits: ["container", "water"] },
      pozo: { kind: "well", at: [3, -3], size: [1.2, 1.2], h: 1.0, traits: ["container"] },
      puesto: { kind: "stall", at: [-3, -3.3], size: [2.4, 1.2], h: 1.8, clear: 0.8, front: "s" },
      farola: { kind: "lamp", at: [-1.4, -3.3], size: [0.4, 0.4], h: 3, traits: ["tall"] },
      caja: { kind: "crate", at: [3.5, 1.8], size: [0.9, 0.9], h: 0.8 },
      carro: { kind: "cart", at: [1.2, 3.2], size: [1.6, 1], h: 0.9, clear: 0.45 },
      calle_mayor: { kind: "street", at: [0.75, 5.75], size: [11.5, 1.5], h: 0.02, traits: ["area", "linear"], start: "w" },
      calle_pozo: { kind: "street", at: [5.75, 0.75], size: [1.5, 11.5], h: 0.02, traits: ["area", "linear"], start: "s" },
    },
    spots: {
      m_centro: { at: [0, 1.6], y: 0, pose: "circle", host: "fuente", factsOnly: true },
      m_pozo: { at: [3, -3], y: 0.1, pose: "peek" },
      m_entre: { at: [2.4, 2.5], y: 0, pose: "stand", face: "s" },
      m_puesto: { at: [-3, -3.3], y: 0, pose: "crouch", face: "s" },
      m_enfrente: { at: [-3, -0.8], y: 0, pose: "stand", face: "n" },
      m_esquina: { at: [4.4, 4.4], y: 0, pose: "stand", face: "s" },
      m_farola: { at: [-2.2, -3.3], y: 2.2, pose: "hang", host: "farola" },
    },
    showcase: ["enfrente_de", "en_el_centro_de", "entre", "frente_a", "alrededor_de", "al_fondo_de", "en_la_esquina_de"],
  },

  // ─────────────────────────────────────────── El Cementerio (A2)
  cementerio: {
    level: "A2",
    room: "cementerio",
    wall: "stone",
    palette: { bg: "#F2E3C2", grass: ["#7C8F6A", "#71835F"], outside: "#8C8278", wall: "#8E8594", wallTop: "#A69DAB" },
    objects: {
      cementerio: ROOM,
      lapida_grande: { kind: "gravestone", at: [-2, -1], size: [1.2, 0.4], h: 1.3, front: "s", tint: "big" },
      lapida_pequena: { kind: "gravestone", at: [0.5, -1], size: [0.9, 0.35], h: 0.9, front: "s", tint: "small" },
      lapida_rota: { kind: "gravestone", at: [3, -1], size: [0.9, 0.35], h: 0.6, front: "s", tint: "broken" },
      lapidas: { kind: "none", at: [0.5, -1], size: [6.2, 0.4], h: 1.3, members: ["lapida_grande", "lapida_pequena", "lapida_rota"] },
      valla: { kind: "fence", at: [-1.75, -2.8], size: [6.5, 0.2], h: 1.1, traits: ["divider"] },
      arbol_seco: { kind: "deadtree", at: [3, -3.4], size: [1.6, 1.6], h: 3, clear: 1.2, traits: ["tall"] },
      mausoleo: { kind: "crypt", at: [-3.4, 2.8], size: [2.2, 2], h: 2.2, traits: ["container", "tall"], front: "e" },
      ataud: { kind: "coffin", at: [2.5, 2.4], size: [0.8, 1.8], h: 0.5, traits: ["container"] },
    },
    spots: {
      c_apoyado: { at: [-2, -0.55], y: 0, pose: "lean", lean: "lapida_grande", face: "s" },
      c_valla: { at: [-1, -3.8], y: 0, pose: "stand", face: "s" },
      c_rincon: { at: [4.4, -4.4], y: 0, pose: "crouch", face: "w" },
      c_ataud: { at: [2.5, 2.4], y: 0.15, pose: "lie_up" },
      c_mausoleo: { at: [-3.4, 2.8], y: 0, pose: "peek" },
      c_entre: { at: [1.75, -1], y: 0, pose: "stand", face: "s" },
    },
    showcase: ["al_fondo_de", "al_otro_lado_de", "apoyado_en", "en_el_rincon_de", "entre", "dentro_de", "boca_arriba"],
  },

  // ─────────────────────────────────────────── El Laberinto (B1)
  laberinto: {
    level: "B1",
    room: "laberinto",
    wall: "hedge",
    palette: { bg: "#FFE9B8", grass: ["#6FA85A", "#64994F"], outside: "#C9AE7D", wall: "#2F6E3A", wallTop: "#3E8A48" },
    objects: {
      laberinto: ROOM,
      seto_largo: { kind: "hedgewall", at: [0, 0], size: [10, 0.6], h: 1.4, traits: ["divider"], labelAt: [-3, 0] },
      reja: { kind: "reja", at: [0, 0], size: [1.6, 0.34], h: 1.6, traits: ["opening"] },
      torre: { kind: "tower", at: [3, -3], size: [2, 2], h: 4, traits: ["tall", "container"] },
      colina: { kind: "hill", at: [-3, -3], size: [3, 3], h: 1.4, traits: ["hill", "tall"] },
      estanque: { kind: "pond", at: [-2.8, 2.2], size: [2.6, 2], h: 0.05, traits: ["water"] },
      camino: { kind: "path", at: [3, 2.8], size: [1.2, 4.4], h: 0.02, traits: ["area", "linear"], start: "s" },
    },
    spots: {
      l_reja: { at: [0, 0], y: 0, pose: "peek", face: "n" },
      l_torre_alto: { at: [3, -3], y: 4, pose: "stand", face: "s" },
      l_torre_pie: { at: [1.7, -3], y: 0, pose: "sit", face: "w" },
      l_colina: { at: [-3, -3], y: 1.4, pose: "stand", face: "s" },
      l_mas_alla: { at: [0.2, -2.5], y: 0, pose: "stand", face: "s" },
      l_orilla: { at: [-1.1, 2.2], y: 0, pose: "sit", face: "w" },
      l_camino: { at: [3, 1.0], y: 0, pose: "lie_down" },
    },
    showcase: ["a_traves_de", "en_lo_alto_de", "mas_alla_de", "al_pie_de", "en_la_cima_de", "a_orillas_de", "a_medio_camino_entre", "al_otro_lado_de"],
  },
};

export function layoutFor(visualLayer: string): Layout {
  const l = LAYOUTS[visualLayer];
  if (!l) throw new Error(`no layout for visual_layer ${visualLayer}`);
  return l;
}

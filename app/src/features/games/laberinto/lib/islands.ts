import { warm } from "./color";
import type { IslandZone } from "./types";

export type SignStyle = "graffiti" | "neon" | "stone" | "poster";

export interface Island {
  zone: IslandZone;
  name: string;
  theme: string;
  place: string;
  signStyle: SignStyle;
  palette: {
    sky: string;
    floor: string;
    wall: string;
    accent: string;
    prop: string;
    portal: [string, string];
  };
}

const RAW: Island[] = [
  {
    zone: "tenerife",
    name: "Tenerife",
    theme: "The Foundations",
    place: "Jardín Botánico",
    signStyle: "graffiti",
    palette: { sky: "#f4d35e", floor: "#6a994e", wall: "#e9d8a6", accent: "#bc4749", prop: "#386641", portal: ["#ee9b00", "#0a9396"] },
  },
  {
    zone: "gran_canaria",
    name: "Gran Canaria",
    theme: "The Core Irregulars",
    place: "Dunas de Maspalomas",
    signStyle: "poster",
    palette: { sky: "#8ecae6", floor: "#f2c57c", wall: "#fbe7c6", accent: "#e76f51", prop: "#e9c46a", portal: ["#e76f51", "#264653"] },
  },
  {
    zone: "lanzarote",
    name: "Lanzarote",
    theme: "Mental and Physical States",
    place: "Timanfaya",
    signStyle: "neon",
    palette: { sky: "#2b2d42", floor: "#1b1b1e", wall: "#3a3a40", accent: "#d90429", prop: "#8d0801", portal: ["#d90429", "#ffb703"] },
  },
  {
    zone: "fuerteventura",
    name: "Fuerteventura",
    theme: "Habitual vs. One-Time",
    place: "Corralejo",
    signStyle: "poster",
    palette: { sky: "#a8dadc", floor: "#e9d5a1", wall: "#f1faee", accent: "#1d3557", prop: "#d4a373", portal: ["#457b9d", "#f1faee"] },
  },
  {
    zone: "la_palma",
    name: "La Palma",
    theme: "Complex Timelines",
    place: "Roque de los Muchachos",
    signStyle: "neon",
    palette: { sky: "#14213d", floor: "#3d405b", wall: "#5c5f7a", accent: "#fca311", prop: "#e5e5e5", portal: ["#fca311", "#7209b7"] },
  },
  {
    zone: "la_gomera",
    name: "La Gomera",
    theme: "No Trigger Words",
    place: "Bosque de Garajonay",
    signStyle: "stone",
    palette: { sky: "#b7c9a8", floor: "#2d4a22", wall: "#8a8f7a", accent: "#f2e8cf", prop: "#1f3b16", portal: ["#a7c957", "#132a13"] },
  },
  {
    zone: "el_hierro",
    name: "El Hierro",
    theme: "The Gauntlet",
    place: "Faro de Orchilla",
    signStyle: "stone",
    palette: { sky: "#ff7b54", floor: "#3c2a21", wall: "#7a6a5c", accent: "#ffd23f", prop: "#1a120b", portal: ["#ffd23f", "#ff3c38"] },
  },
];

/** Biome palettes, pulled slightly toward the memo warm yellow (see `warm`). */
export const ISLANDS: Island[] = RAW.map((i) => ({
  ...i,
  palette: {
    sky: warm(i.palette.sky),
    floor: warm(i.palette.floor),
    wall: warm(i.palette.wall),
    accent: warm(i.palette.accent),
    prop: warm(i.palette.prop),
    portal: [warm(i.palette.portal[0]), warm(i.palette.portal[1])],
  },
}));

export const islandByZone = (zone: IslandZone): Island =>
  ISLANDS.find((i) => i.zone === zone) ?? ISLANDS[0];

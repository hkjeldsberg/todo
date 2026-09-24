import type { GameManifest } from "./types";

/**
 * Every game in the app. Adding a game: a folder in features/games/<slug>/
 * (client root + server.ts), an entry here, one line in GameHost.tsx and one in
 * server-registry.ts. The `todo.games` table can hide or reorder games.
 */
export const GAMES: GameManifest[] = [
  {
    slug: "donde",
    title: "Dónde",
    subtitle: "The pop-up scrapbook",
    blurb: "Find and place things in a papercraft diorama to learn where things are.",
    skills: ["location"],
    level: "A1",
    tone: "accent",
  },
  {
    slug: "tense",
    title: "The Memory Diorama",
    subtitle: "Imperfecto vs indefinido",
    blurb: "Pick the right past tense and bring each room's memories back to life.",
    skills: ["past-tenses", "irregulars"],
    level: "A2",
    tone: "light",
  },
  {
    slug: "laberinto",
    title: "El Laberinto",
    subtitle: "Seven islands, three doors",
    blurb: "Walk through the door with the right past tense. Wrong doors loop back.",
    skills: ["past-tenses", "irregulars"],
    level: "B1",
    tone: "ink",
  },
  {
    slug: "opuestos",
    title: "El Rayo Modificador",
    subtitle: "Opposites that change physics",
    blurb: "Zap objects with Spanish opposites: pesado, ligero, elástico… and solve each room your way.",
    skills: ["opposites"],
    level: "A2",
    tone: "light",
  },
];

export function gameBySlug(slug: string): GameManifest | undefined {
  return GAMES.find((game) => game.slug === slug);
}

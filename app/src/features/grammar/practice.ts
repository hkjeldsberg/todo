import { GAMES } from "@/features/games/registry";
import type { SkillTag } from "@/features/games/types";

/** Which skill each grammar topic trains; games tagged with it get linked. */
const TOPIC_SKILLS: Record<string, SkillTag> = {
  ubicacion: "location",
  preposiciones: "location",
  "haber-tener-estar": "location",
  pasado: "past-tenses",
  "fue-estaba-estuve": "past-tenses",
  "preterito-cambia": "past-tenses",
  futuro: "future",
};

/** Drills that fit a topic without being a game. */
const TOPIC_DRILLS: Record<string, { href: string; label: string }[]> = {
  pasado: [{ href: "/repaso/conjugar?group=pasado", label: "Conjugar · pasado" }],
  "fue-estaba-estuve": [{ href: "/repaso/conjugar?group=pasado", label: "Conjugar · pasado" }],
  "preterito-cambia": [{ href: "/repaso/conjugar?group=pasado", label: "Conjugar · pasado" }],
  perfectos: [{ href: "/repaso/conjugar?group=pasado", label: "Conjugar · pasado" }],
  futuro: [{ href: "/repaso/conjugar?group=futuro", label: "Conjugar · futuro" }],
  "presente-regular": [{ href: "/repaso/conjugar?group=presente", label: "Conjugar · presente" }],
};

/** Games and drills to practise a grammar topic with. */
export function practiceFor(slug: string): { href: string; label: string }[] {
  const skill = TOPIC_SKILLS[slug];
  const games = skill
    ? GAMES.filter((game) => game.skills.includes(skill)).map((game) => ({
        href: `/juegos/${game.slug}`,
        label: game.title,
      }))
    : [];
  return [...games, ...(TOPIC_DRILLS[slug] ?? [])];
}

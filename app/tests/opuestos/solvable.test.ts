import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import { bundledContent, wordMap } from "@/features/games/opuestos/lib/content";
import type { Rapier } from "@/features/games/opuestos/lib/room";
import { simulate } from "@/features/games/opuestos/lib/simulate";

/**
 * Headless play-throughs with the exact Rapier build @react-three/rapier ships
 * (the top-level @dimforge/rapier3d-compat is an older copy pulled in by @types/three).
 */
const content = bundledContent();
const words = wordMap(content);
let R: Rapier;

beforeAll(async () => {
  const fromRapier = createRequire(createRequire(import.meta.url).resolve("@react-three/rapier"));
  R = fromRapier("@dimforge/rapier3d-compat") as Rapier;
  await R.init();
});

describe.each(content.levels.map((l) => [l.id, l] as const))("level %s", (_, level) => {
  it("is not solved by doing nothing", () => {
    const r = simulate(R, level, words, [], { maxSeconds: 12 });
    expect(r.status, JSON.stringify(r)).not.toBe("won");
  });

  it.each(level.layout.solutions.map((s, i) => [i, s.note, s] as const))("solution %i (%s) wins", (_, __, solution) => {
    const r = simulate(R, level, words, solution.steps);
    expect(r.status, JSON.stringify(r)).toBe("won");
  });

  it("wins the same way whenever the player releases", () => {
    const steps = level.layout.solutions[0].steps;
    for (const settle of [0.1, 3]) expect(simulate(R, level, words, steps, { settle }).status).toBe("won");
  });
});

describe("words on the wrong things", () => {
  it("pesado on the iron ball still shatters the glass bridge", () => {
    const level = content.levels.find((l) => l.id === "puente")!;
    const r = simulate(R, level, words, [{ object: "bola", word: "pesado" }], { maxSeconds: 8 });
    expect(r.status).toBe("lost");
    expect(r.events).toContain("break:puente");
  });

  it("a fuerte wall of glass stops even a duro ball", () => {
    const level = content.levels.find((l) => l.id === "cristal")!;
    const r = simulate(R, level, words, [{ object: "pelota", word: "duro" }, { object: "cristal", word: "fuerte" }], { maxSeconds: 8 });
    expect(r.status).not.toBe("won");
    expect(r.events).not.toContain("break:cristal");
  });
});

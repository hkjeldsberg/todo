import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import raw from "@/content/opuestos.json";
import { bundledContent, contentFromRows, shapeContent } from "@/features/games/opuestos/lib/content";
import { DYNAMIC_KINDS, isTarget } from "@/features/games/opuestos/lib/room";
import { CATEGORIES, ENGINE_TARGETS, OBJECT_KINDS } from "@/features/games/opuestos/lib/types";
import { agree, pairsOf, phrase } from "@/features/games/opuestos/lib/words";

const content = bundledContent();
const words = new Map(content.words.map((w) => [w.id, w]));
const GAME_DIR = join(__dirname, "../../src/features/games/opuestos");

/** Kinds registered in scene/Objects.tsx's VIEWS map. */
function renderedKinds(): Set<string> {
  const src = readFileSync(join(GAME_DIR, "scene/Objects.tsx"), "utf8");
  const block = src.slice(src.indexOf("export const VIEWS"), src.indexOf("};", src.indexOf("export const VIEWS")));
  return new Set([...block.matchAll(/^\s+(\w+): \w+,$/gm)].map((m) => m[1]));
}

/** The opuestos topic of the grammar pages, which this game must teach. */
function grammarPairs(): string {
  const src = readFileSync(join(__dirname, "../../src/features/grammar/grammar.ts"), "utf8");
  return src.slice(src.indexOf('slug: "opuestos"'), src.indexOf('slug: "preguntas"'));
}

describe("opuestos words", () => {
  it("has unique ids and words", () => {
    expect(new Set(content.words.map((w) => w.id)).size).toBe(content.words.length);
    expect(new Set(content.words.map((w) => w.word)).size).toBe(content.words.length);
  });

  it.each(content.words.map((w) => [w.word, w] as const))("%s: its antonym's antonym is itself, same target and category", (_, w) => {
    const anti = words.get(w.antonym_id);
    expect(anti, `antonym ${w.antonym_id}`).toBeDefined();
    expect(anti!.id).not.toBe(w.id);
    expect(anti!.antonym_id).toBe(w.id);
    expect(anti!.engine_target).toBe(w.engine_target);
    expect(anti!.category).toBe(w.category);
    expect(anti!.value_modifier).not.toBe(w.value_modifier);
    expect(CATEGORIES).toContain(w.category);
    expect(ENGINE_TARGETS).toContain(w.engine_target);
  });

  it("spells the Spanish right (accents) and every pair is in the grammar topic", () => {
    const expected: Record<string, string> = {
      pequeno: "pequeño",
      vacio: "vacío",
      aspero: "áspero",
      frio: "frío",
      debil: "débil",
      rapido: "rápido",
      elastico: "elástico",
      rigido: "rígido",
    };
    for (const [id, word] of Object.entries(expected)) expect(words.get(id)?.word).toBe(word);
    const topic = grammarPairs();
    for (const w of content.words) {
      // elástico / rígido come from the PRD, not the grammar table.
      if (w.id === "elastico" || w.id === "rigido") continue;
      expect(topic, `${w.word} missing from the opuestos grammar topic`).toContain(w.word);
    }
  });

  it("agrees with the noun it labels", () => {
    expect(agree("pesado", "f")).toBe("pesada");
    expect(agree("frío", "f")).toBe("fría");
    expect(agree("vacío", "f")).toBe("vacía");
    expect(agree("pequeño", "f")).toBe("pequeña");
    expect(agree("grande", "f")).toBe("grande");
    expect(agree("débil", "f")).toBe("débil");
    expect(agree("suave", "f")).toBe("suave");
    expect(agree("pesado", "m")).toBe("pesado");
    expect(agree("abrir", "f")).toBe("abierta");
    expect(agree("encender", "m")).toBe("encendido");
    expect(agree("subir", "f")).toBe("arriba");
    expect(phrase("la caja", "pesado", "f")).toBe("la caja pesada");
    expect(phrase("el agua", "frío", "f")).toBe("el agua fría");
  });
});

describe("opuestos levels", () => {
  const rendered = renderedKinds();

  it("are sorted, unique, and between 8 and 12", () => {
    expect(content.levels.length).toBeGreaterThanOrEqual(8);
    expect(content.levels.length).toBeLessThanOrEqual(12);
    const sorts = content.levels.map((l) => l.sort);
    expect(sorts).toEqual([...sorts].sort((a, b) => a - b));
    expect(new Set(content.levels.map((l) => l.id)).size).toBe(content.levels.length);
  });

  it("every object kind has a physics rule set and a renderer", () => {
    expect([...rendered].sort()).toEqual([...OBJECT_KINDS].sort());
  });

  it("every word is offered by at least one level", () => {
    const offered = new Set(content.levels.flatMap((l) => l.words));
    for (const w of content.words) expect(offered.has(w.id), w.word).toBe(true);
  });

  it.each(content.levels.map((l) => [l.id, l] as const))("%s is well formed", (_, level) => {
    // Offered words exist, and come in pairs.
    for (const id of level.words) expect(words.has(id), id).toBe(true);
    for (const pair of pairsOf(level.words, words)) expect(pair, pair[0].word).toHaveLength(2);
    expect(level.words.length).toBeLessThanOrEqual(8); // fits the radial menu
    // Layout objects: unique ids, known kinds, rendered.
    const objects = new Map(level.layout.objects.map((o) => [o.id, o]));
    expect(objects.size).toBe(level.layout.objects.length);
    for (const o of level.layout.objects) {
      expect(OBJECT_KINDS).toContain(o.kind);
      expect(rendered.has(o.kind), o.kind).toBe(true);
      // Anything the ray can hit needs a noun (with article + gender) for the menu and the label.
      if (isTarget(o)) {
        expect(o.noun, `${o.id} noun`).toMatch(/^(el|la) \S/);
        expect(o.gender, `${o.id} gender`).toBeDefined();
        expect(o.noun_en, `${o.id} noun_en`).toBeDefined();
      }
      if (o.kind === "plate") expect(objects.get(o.links!)?.kind).toBe("door");
    }
    // The goal is a moving thing.
    expect(DYNAMIC_KINDS.has(objects.get(level.layout.goal.object)!.kind)).toBe(true);
    // Solutions only use offered words on objects that exist.
    expect(level.layout.solutions.length).toBeGreaterThanOrEqual(1);
    for (const s of level.layout.solutions) {
      for (const st of s.steps) {
        expect(level.words, `${st.word} not offered`).toContain(st.word);
        expect(objects.has(st.object), st.object).toBe(true);
      }
    }
    expect(level.clue_es).toMatch(/[.?!]$/);
    expect(level.clue_en).toMatch(/[.?!]$/);
  });

  it("offers more than one way through everywhere but the first room", () => {
    for (const l of content.levels.slice(1)) expect(l.layout.solutions.length, l.id).toBeGreaterThanOrEqual(2);
  });
});

describe("shapeContent", () => {
  it("builds the same content from flat Supabase rows in any order", () => {
    expect(contentFromRows([...raw.words].reverse(), [...raw.levels].reverse())).toEqual(content);
  });

  it("rejects malformed content", () => {
    expect(() => shapeContent({ words: [], levels: [] })).toThrow();
    const badAntonym = structuredClone(raw);
    badAntonym.words[0].antonym_id = "nada";
    expect(() => shapeContent(badAntonym)).toThrow(/antonym/);
    const badWord = structuredClone(raw);
    badWord.levels[0].words.push("volar");
    expect(() => shapeContent(badWord)).toThrow(/unknown word/);
    const badKind = structuredClone(raw) as { levels: { layout: { objects: { kind: string }[] } }[] };
    badKind.levels[0].layout.objects[0].kind = "trampoline";
    expect(() => shapeContent(badKind)).toThrow();
    const badTarget = structuredClone(raw);
    badTarget.words[0].engine_target = "colour";
    expect(() => shapeContent(badTarget)).toThrow();
  });
});

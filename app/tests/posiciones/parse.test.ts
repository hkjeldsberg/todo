import { describe, expect, it } from "vitest";
import { bundledContent } from "@/features/games/posiciones/model/content";
import { namesOf } from "@/features/games/posiciones/model/inventory";
import { fold, parseAnswer } from "@/features/games/posiciones/model/parse";
import { joinRef } from "@/features/games/posiciones/model/phrase";
import { buildWorld, type World } from "@/features/games/posiciones/model/relations";
import { FIXTURES } from "./fixtures";

const content = bundledContent();
const worlds = new Map<string, World>(content.scenes.map((s) => [s.id, buildWorld(content, s.id)]));

/** Same notation as the fixtures. */
function describeParse(scene: string, text: string): string {
  const r = parseAnswer(text, worlds.get(scene)!);
  if (!r.ok) return "?";
  if (r.parsed.issues.length) return `!${r.parsed.issues[0].rule}`;
  return r.parsed.phrases.map((p) => `${p.expression}:${p.refs.map((ref) => ref.ids.join("|")).join(",")}`).join("+");
}

describe("parser fixtures", () => {
  it("has at least 300 fixtures between the table and the generated ones", () => {
    expect(FIXTURES.length + GENERATED.length).toBeGreaterThanOrEqual(300);
  });

  it.each(FIXTURES)("[%s] %s → %s", (scene, text, expected) => {
    expect(describeParse(scene, text)).toBe(expected);
  });
});

// ── Generated: every form of every expression, accented and voice-style, with a real noun.

const SHARED_FORMS = new Set(["en_la_esquina_con"]);
const GENERATED: [string, string, string][] = [];
{
  const jardin = content.scenes.find((s) => s.id === "jardin")!;
  const [seto, jarron] = ["seto", "jarron"].map((id) => jardin.objects.find((o) => o.id === id)!);
  for (const e of content.expressions) {
    if (SHARED_FORMS.has(e.id) || e.id === "a_distancia_de" || e.id === "a_manzanas_de" || e.id === "a_cuadras_de") continue;
    for (const form of e.forms) {
      let text: string;
      let expected: string;
      if (e.ref_count === 0) {
        text = `El gnomo está ${form}.`;
        expected = `${e.id}:`;
      } else if (e.ref_count === 2) {
        text = `El gnomo está ${joinRef(form, seto.es)} y ${jarron.es}.`;
        expected = `${e.id}:seto,jarron`;
      } else {
        text = `El gnomo está ${joinRef(form, seto.es)}.`;
        expected = `${e.id}:seto`;
      }
      if (e.id === "al_final_de_la_calle" || e.id === "cruzando_la_calle" || e.id === "a_la_vuelta_de_la_esquina" || e.id === "en_la_acera_de_enfrente") {
        GENERATED.push(["mercado", text, expected]);
        GENERATED.push(["mercado", fold(text), expected]);
        continue;
      }
      GENERATED.push(["jardin", text, expected]);
      GENERATED.push(["jardin", fold(text), expected]);
    }
  }
  // Every name and alias of every object, subjectless, voice-style.
  for (const s of content.scenes) {
    for (const o of s.objects) {
      for (const n of namesOf(o)) {
        const ids = s.objects.filter((x) => namesOf(x).some((m) => fold(m.es) === fold(n.es))).map((x) => x.id);
        GENERATED.push([s.id, fold(`esta cerca ${joinRef("de", n.es)}`), `cerca_de:${ids.join("|")}`]);
      }
    }
  }
}

describe("generated fixtures (every form, every name)", () => {
  it.each(GENERATED)("[%s] %s → %s", (scene, text, expected) => {
    expect(describeParse(scene, text)).toBe(expected);
  });
});

describe("parser details", () => {
  const w = worlds.get("jardin")!;
  const parsed = (t: string) => {
    const r = parseAnswer(t, w);
    if (!r.ok) throw new Error(`not parsed: ${t}`);
    return r.parsed;
  };

  it("notes missing accents gently instead of blocking", () => {
    const p = parsed("el gnomo esta detras del arbol");
    expect(p.issues).toEqual([]);
    expect(p.accents).toEqual(expect.arrayContaining(["está", "detrás", "árbol"]));
    expect(parsed("El gnomo está detrás del árbol.").accents).toEqual([]);
  });

  it("notes a missing article without blocking", () => {
    const p = parsed("esta detras de seto");
    expect(p.issues).toEqual([]);
    expect(p.missingArticle).toEqual(["el seto"]);
  });

  it("reads distances as metre ranges", () => {
    const p = parsed("está a dos metros de la estatua");
    expect(p.phrases[0]).toMatchObject({ expression: "a_distancia_de", metres: 2, distance: { min: 1.25, max: 2.75 } });
    expect(parsed("está a unos pasos del banco").phrases[0].distance).toEqual({ min: 0.8, max: 4.2 });
  });

  it("does not treat a capitalised mid-sentence El as the article (proper names)", () => {
    expect(parseAnswer("Está detrás de El seto.", w)).toMatchObject({ ok: true });
    const r = parseAnswer("Está detrás de El seto.", w);
    expect(r.ok && r.parsed.issues.map((i) => i.rule)).not.toContain("de-el");
  });

  it("parses in well under 200 ms", () => {
    const t0 = performance.now();
    for (let i = 0; i < 50; i++) parseAnswer("Yo creo que el gnomo está justo a medio camino entre el seto y el jarrón.", w);
    expect((performance.now() - t0) / 50).toBeLessThan(20);
  });
});

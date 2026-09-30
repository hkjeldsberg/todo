import { describe, expect, it } from "vitest";
import raw from "@/content/posiciones.json";
import { bundledContent, contentFromRows, shapeContent } from "@/features/games/posiciones/model/content";
import { inventoryOf, namesOf, nounName } from "@/features/games/posiciones/model/inventory";
import { LAYOUTS } from "@/features/games/posiciones/model/layouts";
import { emptyProgress, parseProgress } from "@/features/games/posiciones/model/progress";
import { checkGeometry } from "@/features/games/posiciones/model/relations";
import { englishOf, parseItemRef, toReviewCard } from "@/features/games/posiciones/model/review";

const content = bundledContent();

describe("content", () => {
  it("has the 83-expression inventory, the subject and four dungeons", () => {
    expect(content.expressions).toHaveLength(83);
    expect(content.subject.es).toBe("el gnomo");
    expect(content.scenes.map((s) => s.id)).toEqual(["jardin", "mercado", "cementerio", "laberinto"]);
  });

  it("every scene, object and hiding spot has geometry, and every layout object is named in the JSON", () => {
    expect(() => checkGeometry(content)).not.toThrow();
    for (const s of content.scenes) {
      const layout = LAYOUTS[s.visual_layer];
      expect(Object.keys(layout.objects).sort()).toEqual(s.objects.map((o) => o.id).sort());
      expect(Object.keys(layout.spots).sort()).toEqual(s.targets.slice().sort());
      expect(s.objects.map((o) => o.id)).toContain(layout.room);
    }
  });

  it("object genders match their articles, aliases carry their own", () => {
    for (const s of content.scenes)
      for (const o of s.objects) {
        expect(nounName(o.es)).toMatchObject({ gender: o.gender, number: o.number });
        for (const n of namesOf(o)) expect(["el", "la", "los", "las"]).toContain(n.es.split(" ")[0]);
      }
  });

  it("regional expressions point at a standard and are labelled", () => {
    const inv = inventoryOf(content);
    for (const e of content.expressions.filter((x) => x.standard)) {
      expect(e.region).not.toBeNull();
      expect(inv.has(e.standard!)).toBe(true);
    }
  });

  it("agreeing expressions start with a masculine singular participle", () => {
    for (const e of content.expressions.filter((x) => x.agrees)) expect(e.es.split(" ")[0]).toMatch(/ado$/);
  });

  it("rejects facts that point at unknown ids", () => {
    const bad = structuredClone(raw) as { scenes: { facts: unknown[] }[] };
    bad.scenes[0].facts.push({ target: "nope", expression: "en", refs: [] });
    expect(() => shapeContent(bad)).toThrow();
  });
});

describe("DB rows → content", () => {
  const expressionRows = content.expressions
    .map((e) => ({ id: e.id, es: e.es, en: e.en, level: e.level, category: e.category, needs_reference: e.needs_reference, ref_count: e.ref_count, region: e.region, notes: e.notes, sort: e.sort }))
    .reverse();
  const sceneRows = content.scenes.map((s) => ({ ...s })).reverse();

  it("maps todo.posiciones_* rows to the bundled content (parser fields come from the JSON)", () => {
    expect(contentFromRows(expressionRows, sceneRows)).toEqual(content);
  });

  it("rejects empty or malformed rows", () => {
    expect(() => contentFromRows([], sceneRows)).toThrow();
    expect(() => contentFromRows(expressionRows, [])).toThrow();
    expect(() => contentFromRows([{ id: "x" }], sceneRows)).toThrow();
  });

  it("a scene the code has no geometry for fails the geometry check (→ bundled fallback)", () => {
    const moon = contentFromRows(expressionRows, [...sceneRows, { ...sceneRows[0], id: "luna", sort: 9, visual_layer: "luna" }]);
    expect(() => checkGeometry(moon)).toThrow();
  });
});

describe("toReviewCard", () => {
  it("parses item refs", () => {
    expect(parseItemRef("jardin:j_seto:detras_de")).toEqual({ scene: "jardin", spot: "j_seto", expression: "detras_de" });
    expect(parseItemRef("jardin:j_seto")).toBeNull();
    expect(parseItemRef("::")).toBeNull();
  });

  it("returns null for unknown or impossible refs", () => {
    expect(toReviewCard("nope:j_seto:detras_de", content)).toBeNull();
    expect(toReviewCard("jardin:nope:detras_de", content)).toBeNull();
    expect(toReviewCard("jardin:j_seto:nope", content)).toBeNull();
    // Never true at this spot.
    expect(toReviewCard("jardin:j_seto:dentro_de", content)).toBeNull();
  });

  it("builds 'El gnomo está ___ seto.' with a contracted true option and 3 distractors", () => {
    const card = toReviewCard("jardin:j_seto:detras_de", content)!;
    expect(card.prompt).toBe("El gnomo está ___ seto.");
    expect(card.hint).toBe("The gnome is behind the hedge.");
    expect(card.options).toHaveLength(4);
    expect(card.options.filter((o) => o.correct)).toEqual([{ text: "detrás del", correct: true }]);
    for (const o of card.options) expect(o.text).not.toMatch(/\bde el\b|\ba el\b/);
    expect(card.explanation).toMatch(/De \+ el always contracts: detrás del/);
  });

  it("uses de la for feminine references", () => {
    const card = toReviewCard("jardin:j_estatua:encima_de", content)!;
    expect(card.prompt).toBe("El gnomo está ___ estatua.");
    expect(card.options.find((o) => o.correct)?.text).toBe("encima de la");
    expect(card.options.every((o) => /(de la|a la|en la|entre la|sobre la|bajo la|tras la)$/.test(o.text))).toBe(true);
  });

  it("handles two references, no reference, al and camera-relative words", () => {
    const entre = toReviewCard("jardin:j_entre:entre", content)!;
    expect(entre.prompt).toBe("El gnomo está ___ seto y el jarrón.");
    expect(entre.options.find((o) => o.correct)?.text).toBe("entre el");
    expect(entre.hint).toBe("The gnome is between the hedge and the urn.");

    const reves = toReviewCard("jardin:j_arbol:al_reves", content)!;
    expect(reves.prompt).toBe("El gnomo está ___.");
    expect(reves.options.find((o) => o.correct)?.text).toBe("al revés");
    expect(reves.options).toHaveLength(4);

    const junto = toReviewCard("mercado:m_centro:junto_a", content)!;
    expect(junto.options.find((o) => o.correct)?.text).toBe("junto a la");

    // True at rotation 2 only: the card still exists (the English hint carries the meaning).
    expect(toReviewCard("jardin:j_seto:delante_de", content)?.hint).toBe("The gnome is in front of the hedge.");
  });

  it("distractors are never true at that spot", () => {
    for (const s of content.scenes)
      for (const spot of s.targets)
        for (const id of ["detras_de", "dentro_de", "encima_de", "al_pie_de", "entre", "cerca_de"]) {
          const card = toReviewCard(`${s.id}:${spot}:${id}`, content);
          if (!card) continue;
          expect(card.options.filter((o) => o.correct)).toHaveLength(1);
          expect(new Set(card.options.map((o) => o.text)).size).toBe(4);
        }
  });

  it("English: first alternative, keeping 'of'", () => {
    const inv = inventoryOf(content);
    expect(englishOf(inv.get("al_fondo_de"))).toBe("at the back of");
    expect(englishOf(inv.get("en"))).toBe("in");
    expect(englishOf(inv.get("a_distancia_de"), 2)).toBe("two metres from");
  });
});

describe("progress", () => {
  it("returns empty progress for null or garbage", () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress("x")).toEqual(emptyProgress());
    expect(parseProgress(42)).toEqual(emptyProgress());
  });

  it("keeps valid fields and repairs broken ones", () => {
    const p = parseProgress({
      v: 1,
      album: { detras_de: { sentence: "El gnomo está detrás del seto.", scene: "jardin", at: "2026-09-29T10:00:00Z" } },
      stars: { jardin: 2, mercado: 9 },
      best: "nope",
      plays: 3,
      prefs: { suggestions: true, voiceLang: "es-ES", labels: false },
    });
    expect(p.album.detras_de.sentence).toBe("El gnomo está detrás del seto.");
    expect(p.stars).toEqual({});
    expect(p.best).toEqual({});
    expect(p.plays).toBe(3);
    // A v1 save is moved to the new LatAm default; the old toggle pref is dropped.
    expect(p.prefs).toEqual({ voiceLang: "es-419", labels: false });
  });

  it("keeps an explicit voice choice in v2 saves and defaults new players to LatAm", () => {
    expect(parseProgress({ v: 2, prefs: { voiceLang: "es-ES", labels: true } }).prefs.voiceLang).toBe("es-ES");
    expect(emptyProgress().prefs.voiceLang).toBe("es-419");
  });

  it("round-trips", () => {
    const p = { ...emptyProgress(), stars: { jardin: 3 }, best: { jardin: 180 }, plays: 1 };
    expect(parseProgress(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
});

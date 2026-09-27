import { describe, expect, it } from "vitest";
import raw from "@/content/was.json";
import { bundledContent, contentFromRows, findPanel, pageTitle } from "@/features/games/was/lib/content";
import { displayVerb, isCorrect } from "@/features/games/was/lib/game";

const content = bundledContent();

describe("was content", () => {
  it("groups the bundled panels into the El Robo page, in order", () => {
    expect(content.pages.map((p) => p.id)).toEqual(["el_robo_01"]);
    const [page] = content.pages;
    expect(page.title).toBe("El Robo");
    expect(page.panels.map((p) => p.panel_order)).toEqual([1, 2, 3, 4, 5]);
    expect(page.panels.map((p) => p.correct_verb)).toEqual(["era", "estaba", "fue", "estuve", "era"]);
  });

  it("matches panel type to aspect: action panels are preterite, estaba is never action", () => {
    for (const p of content.pages.flatMap((pg) => pg.panels)) {
      if (p.panel_type === "action") expect(["fue", "estuve"]).toContain(p.correct_verb);
      if (p.correct_verb === "estaba") expect(p.panel_type).toBe("establishing");
    }
  });

  it("points every panel at art that exists under public/", async () => {
    const { existsSync } = await import("node:fs");
    for (const p of content.pages.flatMap((pg) => pg.panels)) {
      expect(existsSync(`public${p.asset_sketch}`), p.asset_sketch).toBe(true);
      expect(existsSync(`public${p.asset_color}`), p.asset_color).toBe(true);
    }
  });

  it("sorts rows from the DB and splits pages", () => {
    const rows = [...raw.panels].reverse();
    const extra = { ...raw.panels[0], id: "zoo_1", page_id: "el_zoo_02" };
    const shaped = contentFromRows([...rows, extra]);
    expect(shaped.pages.map((p) => p.id)).toEqual(["el_robo_01", "el_zoo_02"]);
    expect(shaped.pages[0].panels.map((p) => p.id)).toEqual(["robo_1", "robo_2", "robo_3", "robo_4", "robo_5"]);
    expect(findPanel(shaped, "zoo_1")?.page_id).toBe("el_zoo_02");
  });

  it("rejects bad rows", () => {
    expect(() => contentFromRows([])).toThrow();
    expect(() => contentFromRows([{ ...raw.panels[0], correct_verb: "fui" }])).toThrow();
    expect(() => contentFromRows([{ ...raw.panels[0], panel_type: "splash" }])).toThrow();
    expect(() => contentFromRows([raw.panels[0], raw.panels[0]])).toThrow(/twice/);
    expect(() => contentFromRows([raw.panels[0], { ...raw.panels[1], panel_order: 1 }])).toThrow(/panel_order/);
  });

  it("titles page ids and capitalises sentence-initial verbs", () => {
    expect(pageTitle("la_fiesta_sorpresa_03")).toBe("La Fiesta Sorpresa");
    const [first, second] = content.pages[0].panels;
    expect(displayVerb(first, "era")).toBe("Era");
    expect(displayVerb(second, "estaba")).toBe("estaba");
    expect(isCorrect(first, "Era")).toBe(true);
    expect(isCorrect(first, "fue")).toBe(false);
  });
});

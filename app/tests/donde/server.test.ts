import { describe, expect, it } from "vitest";
import seed from "@/content/donde.json";
import { EMPTY_PROGRESS, parseProgress } from "@/features/games/donde/model/progress";
import { taskToReviewCard, ZONE_PHRASES } from "@/features/games/donde/model/review";
import { rowsToScrapbook } from "@/features/games/donde/model/rows";
import { scrapbookSchema } from "@/features/games/donde/model/schema";
import { candidateZones } from "@/features/games/donde/model/judge";
import { lintSentence } from "@/features/games/donde/model/grammar";

const book = scrapbookSchema.parse(seed);
const tasks = book.pages.flatMap((p) => p.tasks);

describe("rowsToScrapbook", () => {
  it("maps todo.donde_pages rows with embedded donde_tasks to the bundled scrapbook", () => {
    const rows = seed.pages
      .map((page, p) => {
        const { tasks: pageTasks, ...rest } = page;
        return {
          ...rest,
          sort: p + 1,
          // DB order is not guaranteed; the mapper sorts by `sort`.
          donde_tasks: pageTasks.map((task, i) => ({ ...task, page_id: page.page_id, sort: i + 1 })).reverse(),
        };
      })
      .reverse();
    const mapped = rowsToScrapbook(rows);
    expect(mapped.pages.map((p) => p.page_id)).toEqual(["sb_apt_01", "sb_plaza_02", "sb_map_03"]);
    expect(mapped.pages[0].tasks[0]).not.toHaveProperty("page_id");
    expect(mapped).toEqual(book);
  });

  it("rejects malformed rows instead of rendering a broken scene", () => {
    expect(() => rowsToScrapbook([{ page_id: "x", sort: 1, title_es: "x", title_en: "x", visual_layer: "moon", donde_tasks: [] }])).toThrow();
  });
});

describe("toReviewCard", () => {
  it("returns null for unknown refs", () => {
    expect(taskToReviewCard("nope", book)).toBeNull();
  });

  it.each(tasks.map((t) => [t.id, t] as const))("%s becomes a choice card with one right answer", (id, task) => {
    const card = taskToReviewCard(id, book);
    expect(card).not.toBeNull();
    if (!card) return;
    expect(card.type).toBe("choice");
    expect(card.hint).toBe(task.prompt_en);
    expect(card.options.filter((o) => o.correct)).toHaveLength(1);
    expect(card.options.length).toBeGreaterThanOrEqual(2);
    expect(new Set(card.options.map((o) => o.text)).size).toBe(card.options.length);
    if (task.mechanic === "build") {
      // The right sentence lints clean; every wrong one is a typical (flagged) error or a wrong token.
      const right = card.options.find((o) => o.correct)!;
      expect(lintSentence(right.text)).toEqual([]);
    } else {
      expect(card.options.find((o) => o.correct)?.text).toBe(ZONE_PHRASES[task.target_zone]);
    }
  });

  it("every candidate zone has a Spanish phrase", () => {
    for (const task of tasks) {
      if (task.mechanic === "build") continue;
      for (const z of candidateZones(task)) expect(ZONE_PHRASES[z], z).toBeTruthy();
    }
  });

  it("clozes the location phrase out of the prompt", () => {
    expect(taskToReviewCard("apt_backpack", book)?.prompt).toBe("Pon la mochila ___.");
    expect(taskToReviewCard("apt_clothes", book)?.prompt).toBe("La ropa de la niña está en el piso de ___.");
  });

  it("build cards offer the hay/está errors as wrong options", () => {
    const card = taskToReviewCard("apt_cat_label", book)!;
    const texts = card.options.map((o) => o.text);
    expect(texts).toContain("El gato está debajo del sofá.");
    expect(texts).toContain("Hay el gato debajo del sofá.");
    const pharmacy = taskToReviewCard("map_pharmacy_label", book)!;
    expect(pharmacy.options.find((o) => o.correct)?.text).toBe("La farmacia está enfrente del parque.");
    expect(pharmacy.options.map((o) => o.text)).toContain("La farmacia está enfrente de el parque.");
  });
});

describe("progress", () => {
  it("parses saved state and falls back on junk", () => {
    expect(parseProgress(null)).toEqual(EMPTY_PROGRESS);
    expect(parseProgress({ page: "x" })).toEqual(EMPTY_PROGRESS);
    const saved = { v: 1, page: 2, done: ["apt_toys"], placed: { toy_bear: { zone: "zone_inside_box", slot: 1 } }, found: [], fills: { apt_cat_label: ["hay", null] } };
    expect(parseProgress(saved)).toEqual(saved);
  });
});

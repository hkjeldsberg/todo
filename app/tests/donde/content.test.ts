import { describe, expect, it } from "vitest";
import seed from "@/content/donde.json";
import { assembleSentence, lintSentence } from "@/features/games/donde/model/grammar";
import { candidateZones } from "@/features/games/donde/model/judge";
import { scrapbookSchema } from "@/features/games/donde/model/schema";
import { layouts } from "@/features/games/donde/scene/layouts";

const book = scrapbookSchema.parse(seed);
const tasks = book.pages.flatMap((p) => p.tasks.map((t) => ({ page: p, task: t })));

describe("donde content", () => {
  it("has the three pages in order, 15 tasks", () => {
    expect(book.pages.map((p) => p.visual_layer)).toEqual(["pop_up_apartment", "polaroid_plaza", "botanico_map"]);
    expect(tasks).toHaveLength(15);
  });

  it("only uses mechanics and layers the DB check constraints allow", () => {
    for (const { page, task } of tasks) {
      expect(["drag", "flap", "pick", "pin", "build"]).toContain(task.mechanic);
      expect(["pop_up_apartment", "polaroid_plaza", "botanico_map"]).toContain(page.visual_layer);
    }
  });

  it("every accepted build answer passes the grammar linter", () => {
    for (const { task } of tasks) {
      if (!task.build) continue;
      for (const answer of task.build.answers) {
        expect(lintSentence(assembleSentence(task.build.template, answer)), `${task.id}: ${answer.join(" ")}`).toEqual([]);
      }
    }
  });

  it("Spanish prompts keep their accents", () => {
    const spanish = tasks.map(({ task }) => `${task.prompt_text} ${task.success_note}`).join(" ");
    expect(spanish).not.toMatch(/\besta\b|\bsofa\b|\bpanaderia\b|\bcarton\b|\bbotanico\b/i);
  });
});

describe("curriculum ↔ 3D scene contract", () => {
  it.each(tasks.map(({ page, task }) => [task.id, page, task] as const))("%s references zones/pieces that exist in its 3D layout", (_, page, task) => {
    const layout = layouts[page.visual_layer];
    const zoneIds = new Set(layout.zones.map((z) => z.id));
    if (task.mechanic === "build") {
      expect(Object.keys(layout.anchors)).toContain(task.target_zone);
    } else {
      for (const z of candidateZones(task)) expect(zoneIds).toContain(z);
      for (const z of Object.keys(task.zone_notes)) expect(zoneIds).toContain(z);
    }
    if (task.mechanic === "drag") {
      const pieces = layout.pieces.filter((p) => p.group === task.draggable_id);
      expect(pieces.length).toBeGreaterThan(0);
      // Every piece of the group needs its own slot in the target zone.
      const target = layout.zones.find((z) => z.id === task.target_zone);
      expect(target?.slots?.length ?? 0).toBeGreaterThanOrEqual(pieces.length);
    }
  });

  it("zones are well formed: hit volumes, valid floors, drop zones have slots", () => {
    const dragZones = new Set(tasks.filter(({ task }) => task.mechanic === "drag").flatMap(({ task }) => candidateZones(task)));
    for (const layout of Object.values(layouts)) {
      for (const zone of layout.zones) {
        expect(zone.hit.length, zone.id).toBeGreaterThan(0);
        expect(zone.floor, zone.id).toBeLessThan(layout.floors.length);
        for (const h of zone.hit) expect(h.size.every((s) => s > 0), zone.id).toBe(true);
        if (dragZones.has(zone.id)) expect(zone.slots?.length ?? 0, zone.id).toBeGreaterThan(0);
      }
      const ids = layout.zones.map((z) => z.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

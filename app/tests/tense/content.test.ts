import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import raw from "@/content/tense.json";
import { bundledContent, contentFromRows, shapeContent } from "@/features/games/tense/content";

const content = bundledContent();
const puzzles = content.rooms.flatMap((r) => r.puzzles.map((p) => ({ room: r.id, ...p })));
const GAME_DIR = join(__dirname, "../../src/features/games/tense");

/** room id → { scene_object → anim it implements }, read from Scene.tsx's ROOM_SCENES and each room file. */
function sceneRegistry() {
  const scene = readFileSync(join(GAME_DIR, "Scene.tsx"), "utf8");
  const imports = new Map(
    [...scene.matchAll(/import \{ (\w+) \} from "\.\/rooms\/(\w+)"/g)].map((m) => [m[1], m[2]]),
  );
  const block = scene.slice(scene.indexOf("ROOM_SCENES"), scene.indexOf("};", scene.indexOf("ROOM_SCENES")));
  const registry = new Map<string, Map<string, string>>();
  for (const [, roomId, component] of block.matchAll(/^\s+(\w+): (\w+),$/gm)) {
    const file = imports.get(component);
    if (!file) throw new Error(`ROOM_SCENES.${roomId} → ${component} has no ./rooms import`);
    const src = readFileSync(join(GAME_DIR, "rooms", `${file}.tsx`), "utf8");
    registry.set(roomId, new Map([...src.matchAll(/<Slot id="([^"]+)" anim="([^"]+)"/g)].map((m) => [m[1], m[2]])));
  }
  return registry;
}

describe("tense content", () => {
  it("validates and is sorted by order_index", () => {
    expect(content.rooms.length).toBeGreaterThan(0);
    const order = content.rooms.map((r) => r.order_index);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    for (const r of content.rooms) {
      const po = r.puzzles.map((p) => p.order_index);
      expect(po).toEqual([...po].sort((a, b) => a - b));
    }
  });

  it("has unique room ids, puzzle ids and scene objects per room", () => {
    expect(new Set(content.rooms.map((r) => r.id)).size).toBe(content.rooms.length);
    expect(new Set(puzzles.map((p) => p.id)).size).toBe(puzzles.length);
    for (const r of content.rooms) {
      expect(new Set(r.puzzles.map((p) => p.scene_object)).size, r.id).toBe(r.puzzles.length);
    }
  });

  it.each(puzzles.map((p) => [`${p.room}/${p.scene_object}`, p] as const))(
    "%s: exactly one correct option, distinct forms, trigger suffix matches its tense",
    (_, p) => {
      const correct = p.options.filter((o) => o.correct);
      expect(correct).toHaveLength(1);
      expect(new Set(p.options.map((o) => o.form)).size).toBe(p.options.length);
      expect(new Set(p.options.map((o) => o.type))).toEqual(new Set(["imperfect", "preterite"]));
      // anim_*_loop = imperfect (continuous), anim_*_once = preterite (permanent change).
      expect(p.anim_trigger.endsWith(correct[0].type === "imperfect" ? "_loop" : "_once")).toBe(true);
      expect(p.sentence_pre + p.sentence_post).not.toContain("___");
    },
  );

  it("maps every room to a registered 3D scene and every scene_object to a <Slot> with that animation", () => {
    const registry = sceneRegistry();
    for (const r of content.rooms) {
      const slots = registry.get(r.id);
      expect(slots, `ROOM_SCENES has no entry for room ${r.id}`).toBeDefined();
      for (const p of r.puzzles) {
        expect(slots!.has(p.scene_object), `${r.id}: no <Slot id="${p.scene_object}">`).toBe(true);
        expect(slots!.get(p.scene_object), `${r.id}/${p.scene_object} anim`).toBe(p.anim_trigger);
      }
    }
  });

  it("builds the same content from flat Supabase rows", () => {
    const roomRows = raw.rooms.map(({ id, order_index, title, subtitle, focus }) => ({ id, order_index, title, subtitle, focus }));
    const puzzleRows = raw.rooms.flatMap((r) => r.puzzles.map((p) => ({ ...p, room_id: r.id })));
    expect(contentFromRows(roomRows.reverse(), puzzleRows.reverse())).toEqual(content);
  });

  it("rejects malformed content", () => {
    expect(() => shapeContent({ rooms: [] })).toThrow();
    const bad = structuredClone(raw);
    bad.rooms[0].puzzles[0].anim_trigger = "spin";
    expect(() => shapeContent(bad)).toThrow();
  });
});

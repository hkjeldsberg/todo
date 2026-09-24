import { describe, expect, it } from "vitest";
import seed from "@/content/laberinto.json";
import { warm } from "@/features/games/laberinto/lib/color";
import { parseContent, parseProgress } from "@/features/games/laberinto/lib/content";
import { buildCurriculum } from "@/features/games/laberinto/lib/game";
import { ISLANDS } from "@/features/games/laberinto/lib/islands";
import { toReviewCard } from "@/features/games/laberinto/lib/review";
import { EYE, ROOM, SPAWN_Z, doorAtRay } from "@/features/games/laberinto/lib/room";
import { ISLAND_ZONES } from "@/features/games/laberinto/lib/types";

const nodes = parseContent(seed);
const c = buildCurriculum(nodes);

describe("curriculum integrity", () => {
  it("parses against the DB row schema", () => {
    expect(nodes).toHaveLength(24);
    expect(new Set(nodes.map((n) => n.node_id)).size).toBe(nodes.length);
    expect(new Set(nodes.map((n) => n.seq)).size).toBe(nodes.length);
  });

  it("every node has exactly 3 doors, exactly one correct, a trap and real feedback", () => {
    for (const n of nodes) {
      expect(n.doors, n.node_id).toHaveLength(3);
      expect(n.doors.filter((d) => d.correct), n.node_id).toHaveLength(1);
      expect(n.doors.some((d) => d.tense === "trap"), n.node_id).toBe(true);
      expect(new Set(n.doors.map((d) => d.text)).size, n.node_id).toBe(3);
      for (const d of n.doors) expect(d.feedback.length, n.node_id).toBeGreaterThan(10);
    }
  });

  it("next_node_id forms one chain through every room in seq order, ending at the last", () => {
    const sorted = c.nodes;
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].next_node_id, sorted[i].node_id).toBe(sorted[i + 1].node_id);
    }
    expect(sorted.at(-1)!.next_node_id).toBeNull();

    const seen = new Set<string>();
    let id: string | null = c.first.node_id;
    while (id) {
      expect(seen.has(id), `cycle at ${id}`).toBe(false);
      seen.add(id);
      id = c.byId.get(id)!.next_node_id;
    }
    expect(seen.size).toBe(nodes.length);
  });

  it("covers all 7 islands in order, each with a biome", () => {
    expect([...new Set(c.nodes.map((n) => n.island_zone))]).toEqual([...ISLAND_ZONES]);
    expect(ISLANDS.map((i) => i.zone)).toEqual([...ISLAND_ZONES]);
  });

  it("rejects malformed rows", () => {
    const bad = structuredClone(seed) as { doors: unknown[] }[];
    bad[0].doors.pop();
    expect(() => parseContent(bad)).toThrow();
    expect(() => parseContent([])).toThrow();
  });
});

describe("toReviewCard", () => {
  it("turns a room into a choice card with the correct door's explanation", () => {
    const card = toReviewCard("tf_botanico_01", nodes)!;
    expect(card.type).toBe("choice");
    expect(card.prompt).toBe(nodes[0].ambient_prompt);
    expect(card.options).toHaveLength(3);
    expect(card.options.filter((o) => o.correct)).toEqual([{ text: "...empezó a llover", correct: true }]);
    expect(card.explanation).toMatch(/empezó/);
  });

  it("returns null for unknown refs", () => {
    expect(toReviewCard("nope", nodes)).toBeNull();
  });
});

describe("parseProgress", () => {
  it("keeps valid fields and drops junk", () => {
    expect(parseProgress(null)).toBeUndefined();
    expect(parseProgress({ nodeId: "x", solved: ["a", 3], mistakes: 2 })).toEqual({
      nodeId: "x",
      solved: ["a"],
      mistakes: 2,
    });
    expect(parseProgress({ solved: "no", mistakes: "2" })).toEqual({ nodeId: undefined, solved: [], mistakes: 0 });
  });
});

describe("door picking", () => {
  const eye = { x: 0, y: EYE, z: SPAWN_Z };
  const toward = (x: number, y: number) => {
    const d = { x: x - eye.x, y: y - eye.y, z: -ROOM.halfD - eye.z };
    const l = Math.hypot(d.x, d.y, d.z);
    return { x: d.x / l, y: d.y / l, z: d.z / l };
  };

  it("hits each doorway and its label, misses the wall between", () => {
    ROOM.doorXs.forEach((x, i) => {
      expect(doorAtRay(eye, toward(x, ROOM.doorH / 2))).toBe(i);
      expect(doorAtRay(eye, toward(x, ROOM.doorH + 0.9))).toBe(i);
    });
    expect(doorAtRay(eye, toward(2.25, 1.5))).toBe(-1);
    expect(doorAtRay(eye, toward(0, 7))).toBe(-1);
    expect(doorAtRay(eye, { x: 0, y: 0, z: 1 })).toBe(-1);
  });
});

describe("warm palette", () => {
  it("returns valid hex and keeps colours close", () => {
    for (const hex of ["#000000", "#ffffff", "#d90429", "#0a9396"]) expect(warm(hex)).toMatch(/^#[0-9a-f]{6}$/);
    expect(warm("#808080")).not.toBe("#808080");
  });
});

import { describe, expect, it } from "vitest";
import seed from "@/content/laberinto.json";
import {
  GAUNTLET_PENALTY,
  GAUNTLET_ROOMS,
  buildCurriculum,
  createReducer,
  firstNodeOf,
  initialState,
  progressOf,
  unlockedZones,
} from "@/features/games/laberinto/lib/game";
import type { PuzzleNode } from "@/features/games/laberinto/lib/types";

const c = buildCurriculum(seed as PuzzleNode[]);
const reducer = createReducer(c, () => 0.42);
const correctIndex = (id: string) => c.byId.get(id)!.doors.findIndex((d) => d.correct);
const wrongIndex = (id: string) => c.byId.get(id)!.doors.findIndex((d) => !d.correct);

describe("reducer", () => {
  it("wrong door loops back into the same room and paints the rule", () => {
    let s = reducer(initialState(c), { type: "start" });
    const spawn = s.spawn;
    const w = wrongIndex(s.nodeId);
    s = reducer(s, { type: "choose", doorIndex: w });
    expect(s.nodeId).toBe(c.first.node_id);
    expect(s.failed).toEqual([w]);
    expect(s.mistakes).toBe(1);
    expect(s.spawn).toBe(spawn + 1);
    expect(s.banner?.kind).toBe("paradox");
  });

  it("correct door advances and flags island change", () => {
    let s = reducer(initialState(c), { type: "start", nodeId: "tf_botanico_03" });
    s = reducer(s, { type: "choose", doorIndex: correctIndex("tf_botanico_03") });
    expect(s.nodeId).toBe("gc_dunas_01");
    expect(s.failed).toEqual([]);
    expect(s.banner).toMatchObject({ kind: "correct", islandChanged: true });
    expect(s.solved).toContain("tf_botanico_03");
  });

  it("entering El Hierro starts a timed gauntlet and penalises mistakes", () => {
    let s = reducer(initialState(c), { type: "start", nodeId: "lg_garajonay_03" });
    s = reducer(s, { type: "choose", doorIndex: correctIndex("lg_garajonay_03") });
    expect(s.gauntlet?.queue).toHaveLength(GAUNTLET_ROOMS);
    expect(s.nodeId).toBe(s.gauntlet!.queue[0]);
    const t = s.gauntlet!.timeLeft;
    s = reducer(s, { type: "choose", doorIndex: wrongIndex(s.nodeId) });
    expect(s.gauntlet!.timeLeft).toBe(t - GAUNTLET_PENALTY);

    for (let i = 0; i < GAUNTLET_ROOMS; i++) s = reducer(s, { type: "choose", doorIndex: correctIndex(s.nodeId) });
    expect(s.screen).toBe("victory");
  });

  it("gauntlet collapses and restarts when time runs out", () => {
    let s = reducer(initialState(c), { type: "start", nodeId: firstNodeOf(c, "el_hierro")!.node_id });
    s = reducer(s, { type: "choose", doorIndex: correctIndex(s.nodeId) });
    s = reducer(s, { type: "tick", dt: 999 });
    expect(s.banner?.kind).toBe("collapse");
    expect(s.gauntlet!.index).toBe(0);
    expect(s.gauntlet!.timeLeft).toBeGreaterThan(0);
  });

  it("unlocks islands up to the furthest reached", () => {
    expect([...unlockedZones(c, { nodeId: c.first.node_id, solved: [] })]).toEqual(["tenerife"]);
    expect(unlockedZones(c, { nodeId: "tf_botanico_01", solved: ["tf_botanico_03"] }).has("gran_canaria")).toBe(true);
  });
});

describe("progress", () => {
  it("restores saved progress and ignores unknown rooms", () => {
    const s = initialState(c, { nodeId: "gc_dunas_01", solved: ["tf_botanico_01"], mistakes: 3 });
    expect(s).toMatchObject({ nodeId: "gc_dunas_01", solved: ["tf_botanico_01"], mistakes: 3, screen: "title" });
    expect(initialState(c, { nodeId: "nope" }).nodeId).toBe(c.first.node_id);
  });

  it("saves the gauntlet as its first room so it restarts cleanly", () => {
    let s = reducer(initialState(c), { type: "start", nodeId: "lg_garajonay_03" });
    s = reducer(s, { type: "choose", doorIndex: correctIndex("lg_garajonay_03") });
    expect(progressOf(c, s)).toEqual({
      nodeId: firstNodeOf(c, "el_hierro")!.node_id,
      solved: s.solved,
      mistakes: s.mistakes,
    });
  });
});

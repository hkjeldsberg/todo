import type { Door, IslandZone, LaberintoProgress, PuzzleNode } from "./types";

export const GAUNTLET_ZONE: IslandZone = "el_hierro";
export const GAUNTLET_ROOMS = 8;
export const GAUNTLET_SECONDS = 90;
export const GAUNTLET_PENALTY = 8;

export interface Gauntlet {
  queue: string[];
  index: number;
  /** Seconds remaining; ticked down by the client. */
  timeLeft: number;
}

export type Banner =
  | { kind: "paradox"; door: Door; doorIndex: number; id: number }
  | { kind: "correct"; door: Door; prompt: string; islandChanged: boolean; id: number }
  | { kind: "collapse"; id: number };

export interface GameState {
  screen: "title" | "playing" | "victory";
  nodeId: string;
  /** Door indices already failed in the current room; their rule stays painted on them. */
  failed: number[];
  solved: string[];
  mistakes: number;
  gauntlet: Gauntlet | null;
  banner: Banner | null;
  /** Bumped on every room (re)entry so the player controller respawns. */
  spawn: number;
}

export type Action =
  | { type: "start"; nodeId?: string }
  | { type: "choose"; doorIndex: number }
  | { type: "tick"; dt: number }
  | { type: "dismiss" }
  | { type: "title" };

export interface Curriculum {
  nodes: PuzzleNode[];
  byId: Map<string, PuzzleNode>;
  first: PuzzleNode;
}

export function buildCurriculum(nodes: PuzzleNode[]): Curriculum {
  const sorted = [...nodes].sort((a, b) => a.seq - b.seq);
  return { nodes: sorted, byId: new Map(sorted.map((n) => [n.node_id, n])), first: sorted[0] };
}

export function firstNodeOf(c: Curriculum, zone: IslandZone): PuzzleNode | undefined {
  return c.nodes.find((n) => n.island_zone === zone);
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** El Hierro: every El Hierro room plus random rooms from the other islands, shuffled. */
export function buildGauntlet(c: Curriculum, rand: () => number = Math.random): Gauntlet {
  const own = c.nodes.filter((n) => n.island_zone === GAUNTLET_ZONE);
  const others = shuffle(
    c.nodes.filter((n) => n.island_zone !== GAUNTLET_ZONE),
    rand,
  ).slice(0, Math.max(0, GAUNTLET_ROOMS - own.length));
  const queue = shuffle([...own, ...others], rand).map((n) => n.node_id);
  return { queue, index: 0, timeLeft: GAUNTLET_SECONDS };
}

export function initialState(c: Curriculum, saved?: Partial<LaberintoProgress>): GameState {
  const nodeId = saved?.nodeId && c.byId.has(saved.nodeId) ? saved.nodeId : c.first.node_id;
  return {
    screen: "title",
    nodeId,
    failed: [],
    solved: saved?.solved ?? [],
    mistakes: saved?.mistakes ?? 0,
    gauntlet: null,
    banner: null,
    spawn: 0,
  };
}

let bannerId = 0;

export function createReducer(c: Curriculum, rand: () => number = Math.random) {
  const enter = (s: GameState, nodeId: string): GameState => {
    const node = c.byId.get(nodeId)!;
    let gauntlet = s.gauntlet;
    if (node.island_zone === GAUNTLET_ZONE && !gauntlet) {
      gauntlet = buildGauntlet(c, rand);
      nodeId = gauntlet.queue[0];
    }
    return { ...s, screen: "playing", nodeId, failed: [], gauntlet, spawn: s.spawn + 1 };
  };

  return function reducer(s: GameState, a: Action): GameState {
    switch (a.type) {
      case "start":
        return enter({ ...s, gauntlet: null, banner: null }, a.nodeId ?? s.nodeId);

      case "title":
        return { ...s, screen: "title", banner: null, gauntlet: null };

      case "dismiss":
        return { ...s, banner: null };

      case "choose": {
        if (s.screen !== "playing") return s;
        const node = c.byId.get(s.nodeId)!;
        const door = node.doors[a.doorIndex];
        if (!door) return s;

        if (!door.correct) {
          // Paradox: loop back into the identical room, rule painted on the failed door.
          const g = s.gauntlet
            ? { ...s.gauntlet, timeLeft: Math.max(0, s.gauntlet.timeLeft - GAUNTLET_PENALTY) }
            : null;
          return {
            ...s,
            gauntlet: g,
            failed: s.failed.includes(a.doorIndex) ? s.failed : [...s.failed, a.doorIndex],
            mistakes: s.mistakes + 1,
            banner: { kind: "paradox", door, doorIndex: a.doorIndex, id: ++bannerId },
            spawn: s.spawn + 1,
          };
        }

        const solved = s.solved.includes(node.node_id) ? s.solved : [...s.solved, node.node_id];
        const base = { ...s, solved };

        if (s.gauntlet) {
          const index = s.gauntlet.index + 1;
          if (index >= s.gauntlet.queue.length) {
            return { ...base, screen: "victory", gauntlet: null, banner: null };
          }
          return {
            ...base,
            nodeId: s.gauntlet.queue[index],
            failed: [],
            gauntlet: { ...s.gauntlet, index },
            banner: { kind: "correct", door, prompt: node.ambient_prompt, islandChanged: false, id: ++bannerId },
            spawn: s.spawn + 1,
          };
        }

        const next = node.next_node_id ? c.byId.get(node.next_node_id) : undefined;
        if (!next) return { ...base, screen: "victory", banner: null };
        const entered = enter(base, next.node_id);
        return {
          ...entered,
          banner: {
            kind: "correct",
            door,
            prompt: node.ambient_prompt,
            islandChanged: next.island_zone !== node.island_zone,
            id: ++bannerId,
          },
        };
      }

      case "tick": {
        if (!s.gauntlet || s.screen !== "playing") return s;
        const timeLeft = s.gauntlet.timeLeft - a.dt;
        if (timeLeft > 0) return { ...s, gauntlet: { ...s.gauntlet, timeLeft } };
        // Collapse: the island crumbles, restart the gauntlet with a fresh shuffle.
        const gauntlet = buildGauntlet(c, rand);
        return {
          ...s,
          gauntlet,
          nodeId: gauntlet.queue[0],
          failed: [],
          banner: { kind: "collapse", id: ++bannerId },
          spawn: s.spawn + 1,
        };
      }
    }
  };
}

/** Islands reachable from the title screen: every island up to the furthest one touched. */
export function unlockedZones(c: Curriculum, s: Pick<GameState, "nodeId" | "solved">): Set<IslandZone> {
  const order = [...new Set(c.nodes.map((n) => n.island_zone))];
  const reachedSeq = Math.max(
    c.byId.get(s.nodeId)?.seq ?? 0,
    ...s.solved.map((id) => (c.byId.get(id)?.seq ?? 0) + 1),
  );
  const reached = c.nodes.filter((n) => n.seq <= reachedSeq).map((n) => n.island_zone);
  const maxIdx = Math.max(0, ...reached.map((z) => order.indexOf(z)));
  return new Set(order.slice(0, maxIdx + 1));
}

/** The save shape. Inside the gauntlet the save points at its first room, so it restarts cleanly. */
export function progressOf(c: Curriculum, s: Pick<GameState, "nodeId" | "solved" | "mistakes" | "gauntlet">): LaberintoProgress {
  const nodeId = s.gauntlet ? (firstNodeOf(c, GAUNTLET_ZONE)?.node_id ?? s.nodeId) : s.nodeId;
  return { nodeId, solved: s.solved, mistakes: s.mistakes };
}

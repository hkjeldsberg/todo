import { Room, STEP, type Rapier } from "./room";
import type { Level, SolutionStep, Word } from "./types";

/**
 * Headless play-through of one level: fire `steps` (before Soltar, or `after`
 * seconds after it), release, and step a bare Rapier world with the same
 * settings as @react-three/rapier's <Physics> until the room is won or lost.
 * Used by the solvability tests and the level-tuning script.
 */
export interface SimResult {
  status: "won" | "lost" | "playing";
  seconds: number;
  events: string[];
  goal: { x: number; y: number };
}

export function simulate(
  R: Rapier,
  level: Level,
  words: Map<string, Word>,
  steps: SolutionStep[],
  { maxSeconds = 20, settle = 0.5 }: { maxSeconds?: number; settle?: number } = {},
): SimResult {
  const world = new R.World({ x: 0, y: -9.81, z: 0 });
  // Mirror <Physics> defaults (see @react-three/rapier Physics.tsx).
  world.timestep = STEP;
  world.integrationParameters.numSolverIterations = 4;
  world.integrationParameters.numInternalPgsIterations = 1;
  world.integrationParameters.minIslandSize = 128;
  world.integrationParameters.maxCcdSubsteps = 1;
  world.integrationParameters.normalizedAllowedLinearError = 0.001;
  world.integrationParameters.normalizedPredictionDistance = 0.002;
  world.lengthUnit = 1;
  world.integrationParameters.contact_natural_frequency = 30;

  const room = new Room(R, world, level);
  const events: string[] = [];
  const tick = () => {
    room.beforeStep();
    world.step();
    room.afterStep();
    for (const e of room.drain()) events.push(`${e.type}:${e.object}`);
  };
  const fire = (s: SolutionStep) => {
    const word = words.get(s.word);
    if (!word) throw new Error(`unknown word ${s.word}`);
    const res = room.apply(s.object, word);
    if (!res.ok) throw new Error(`${level.id}: ${s.word} → ${s.object} failed (${res.reason})`);
  };

  // Let the room settle as it does while the player reads the clue.
  for (let i = 0; i < settle / STEP; i++) tick();
  for (const s of steps.filter((s) => s.after === undefined)) fire(s);
  for (let i = 0; i < 0.3 / STEP; i++) tick();
  room.release();
  const later = steps.filter((s) => s.after !== undefined).sort((a, b) => a.after! - b.after!);
  let seconds = 0;
  while (room.status === "playing" && seconds < maxSeconds) {
    while (later.length && later[0].after! <= seconds) fire(later.shift()!);
    tick();
    seconds += STEP;
  }
  const t = room.goal.body.translation();
  const result: SimResult = { status: room.status, seconds, events, goal: { x: t.x, y: t.y } };
  room.dispose();
  world.free();
  return result;
}

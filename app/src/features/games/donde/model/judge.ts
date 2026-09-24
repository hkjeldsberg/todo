import type { Task } from "./schema";
import { assembleSentence, lintSentence, normalize } from "./grammar";

export interface Verdict {
  correct: boolean;
  note: string;
}

/** Judge a drop / flap / pick / pin. `zoneId` null means "dropped on no zone". */
export function judgeZone(task: Task, zoneId: string | null): Verdict {
  if (zoneId === task.target_zone) return { correct: true, note: task.success_note };
  if (zoneId && zoneId in task.zone_notes) return { correct: false, note: task.zone_notes[zoneId] };
  return { correct: false, note: task.error_note };
}

/** Zones the learner can choose between for this task: the target plus the plausible wrong ones. */
export function candidateZones(task: Task): string[] {
  return [task.target_zone, ...Object.keys(task.zone_notes)];
}

export type Fills = readonly (string | null)[];

export type PlaceResult = { accepted: true; fills: (string | null)[] } | { accepted: false; note: string };

/** Try to drop a Dymo token into a sentence slot. Hard grammar violations are rejected outright. */
export function placeToken(task: Task, fills: Fills, slot: number, token: string): PlaceResult {
  if (!task.build) throw new Error(`${task.id} is not a build task`);
  const next = fills.map((f) => (f === token ? null : f));
  next[slot] = token;
  const blocking = lintSentence(assembleSentence(task.build.template, next)).find((i) => i.severity === "block");
  if (blocking) return { accepted: false, note: blocking.note };
  return { accepted: true, fills: next };
}

export type BuildVerdict = { status: "incomplete" } | { status: "correct"; note: string } | { status: "wrong"; note: string };

export function judgeBuild(task: Task, fills: Fills): BuildVerdict {
  if (!task.build) throw new Error(`${task.id} is not a build task`);
  const slotCount = new Set(task.build.template.match(/\{\d+\}/g)).size;
  if (fills.length < slotCount || fills.slice(0, slotCount).some((f) => f === null)) return { status: "incomplete" };

  const sentence = normalize(assembleSentence(task.build.template, fills));
  const accepted = task.build.answers.some((a) => normalize(assembleSentence(task.build!.template, a)) === sentence);
  if (accepted) return { status: "correct", note: task.success_note };

  const issue = lintSentence(assembleSentence(task.build.template, fills))[0];
  return { status: "wrong", note: issue?.note ?? task.error_note };
}

export function emptyFills(task: Task): (string | null)[] {
  const slotCount = new Set(task.build?.template.match(/\{\d+\}/g) ?? []).size;
  return Array.from({ length: slotCount }, () => null);
}

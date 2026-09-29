"use client";

import { useMemo, useState } from "react";
import type { Attempt } from "@/features/games/types";
import { parseWithClaude } from "./actions";
import { inventoryOf } from "./model/inventory";
import { judgeChoice, judgeParsedIds, judgeText, type Verdict } from "./model/judge";
import { joinRef } from "./model/phrase";
import { parseProgress, type Progress } from "./model/progress";
import { buildWorld, ROTATIONS, trueFacts, type Rotation, type World } from "./model/relations";
import { scoreAnswer, starsFor, type InputMode, type Score } from "./model/score";
import { trayFor, type Tray } from "./model/suggest";
import { missesFor, summarize, type Miss, type PlayedRoom } from "./model/summary";
import type { Content } from "./model/types";

/**
 * Game state: dungeon select → rooms (the gnome hides, you say where) →
 * summary, plus the album. Pure model calls; no timers; the scene reports when
 * the gnome has arrived.
 */

export type Screen = "menu" | "play" | "summary";

export interface RoomLog extends PlayedRoom {
  mode: InputMode;
  points: number;
}

export interface Run {
  id: number;
  scene: string;
  order: string[];
  index: number;
  cleared: boolean;
  rooms: RoomLog[];
  score: number;
  done: { stars: number; best: boolean; misses: Miss[] } | null;
}

export interface Shown {
  verdict: Verdict | { kind: "pending" };
  score?: Score;
  /** True answer that repeats an expression already used this run. */
  repeat?: boolean;
}

function shuffle<T>(xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Tapping a thing while typing adds its name, contracted: "detrás de" + el seto → "detrás del seto". */
export function appendRef(text: string, name: string): string {
  const t = text.trimEnd();
  if (!t) return name;
  const words = t.split(/\s+/);
  const last = words[words.length - 1].toLocaleLowerCase("es");
  if (last === "de" || last === "a") return joinRef(t, name);
  return `${t} ${name}`;
}

export function usePosiciones({
  content,
  initialProgress,
  saveProgress,
  recordAttempt,
}: {
  content: Content;
  initialProgress: unknown;
  saveProgress: (p: Progress) => void;
  recordAttempt: (a: Attempt) => void;
}) {
  const worlds = useMemo(() => new Map<string, World>(content.scenes.map((s) => [s.id, buildWorld(content, s.id)])), [content]);
  const inv = useMemo(() => inventoryOf(content), [content]);
  /** Expressions some spot can make true (album shows the rest as "not in these gardens yet"). */
  const reachable = useMemo(() => {
    const out = new Set<string>();
    for (const w of worlds.values())
      for (const t of w.scene.targets)
        for (const r of ROTATIONS)
          for (const f of trueFacts(w, t, r, { regional: true })) out.add(f.expression);
    for (const id of ["aqui", "ahi", "alli", "aca", "alla"]) out.add(id);
    return out;
  }, [worlds]);

  const [progress, setProgress] = useState<Progress>(() => parseProgress(initialProgress));
  const [screen, setScreen] = useState<Screen>("menu");
  const [preview, setPreview] = useState(content.scenes[0].id);
  const [run, setRun] = useState<Run | null>(null);
  const [rot, setRot] = useState<Rotation>(0);
  const [arrived, setArrived] = useState<string | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [text, setText] = useState("");
  const [tray, setTray] = useState<Tray | null>(null);
  const [chip, setChip] = useState<string | null>(null);
  const [refs, setRefs] = useState<string[]>([]);
  const [summarySel, setSummarySel] = useState(0);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [claudeOff, setClaudeOff] = useState(false);

  const sceneId = run?.scene ?? preview;
  const world = worlds.get(sceneId)!;
  const spot = run ? (screen === "summary" ? (run.rooms[summarySel]?.spot ?? run.order[0]) : run.order[run.index]) : null;
  const gnomeKey = run && spot ? `${run.id}:${spot}` : null;
  const ready = !!gnomeKey && arrived === gnomeKey;
  const suggestions = progress.prefs.suggestions;
  const albumSet = new Set(Object.keys(progress.album));

  const commit = (next: Progress) => {
    setProgress(next);
    saveProgress(next);
  };

  const resetInput = () => {
    setText("");
    setChip(null);
    setRefs([]);
  };

  function refreshTray(w: World, spotId: string, r: Rotation, on = suggestions) {
    setTray(on ? trayFor(w, spotId, r, albumSet) : null);
  }

  function start(id: string) {
    const scene = content.scenes.find((s) => s.id === id);
    if (!scene) return;
    const order = shuffle(scene.targets);
    setRun({ id: Date.now(), scene: id, order, index: 0, cleared: false, rooms: [], score: 0, done: null });
    setPreview(id);
    setRot(0);
    setShown(null);
    resetInput();
    refreshTray(worlds.get(id)!, order[0], 0);
    setScreen("play");
  }

  function toMenu() {
    setScreen("menu");
    setRun(null);
    setShown(null);
    resetInput();
    setRot(0);
  }

  function record(v: Verdict, answer: string) {
    if (!run || !spot || (v.kind !== "true" && v.kind !== "false" && v.kind !== "grammar")) return;
    for (const s of v.said) recordAttempt({ itemRef: `${run.scene}:${spot}:${s.expression}`, correct: v.kind === "true", answer });
  }

  function apply(v: Verdict, mode: InputMode, answer: string) {
    if (!run || !spot) return;
    record(v, answer);
    const now = new Date().toISOString();
    if (v.kind === "true") {
      const score = scoreAnswer(inv, mode, v.said.map((s) => s.expression), albumSet);
      const album = { ...progress.album };
      for (const id of score.unlocked) album[id] = { sentence: v.sentence, scene: run.scene, at: now };
      const usedBefore = new Set(run.rooms.flatMap((r) => r.said.map((s) => inv.meaning(s.expression))));
      const repeat = v.said.every((s) => usedBefore.has(inv.meaning(s.expression)));
      setRun({
        ...run,
        cleared: true,
        score: run.score + score.total,
        rooms: [...run.rooms, { spot, rotation: rot, said: v.said, sentence: v.sentence, mode, points: score.total }],
      });
      if (score.unlocked.length) commit({ ...progress, album });
      setShown({ verdict: v, score, repeat });
      resetInput();
      return;
    }
    if (v.kind === "vague" && v.unlock) {
      const fresh = v.said.filter((s) => !progress.album[s.expression]);
      if (fresh.length) {
        const album = { ...progress.album };
        for (const s of fresh) album[s.expression] = { sentence: `El gnomo está ${world.inv.get(s.expression).es}.`, scene: run.scene, at: now };
        commit({ ...progress, album });
      }
    }
    setShown({ verdict: v });
    setChip(null);
    setRefs([]);
  }

  async function submitText(raw: string) {
    const answer = raw.trim();
    if (!run || !spot || run.cleared || !ready || !answer || shown?.verdict.kind === "pending") return;
    const r = rot;
    const v = judgeText(world, spot, r, answer);
    if (v.kind !== "unparsed" || claudeOff) {
      apply(v, "typed", answer);
      return;
    }
    // The deterministic parser gave up: Claude maps the words to ids, geometry decides.
    setShown({ verdict: { kind: "pending" } });
    let fallback: Verdict;
    try {
      const res = await parseWithClaude(answer, run.scene);
      fallback = res.ok ? judgeParsedIds(world, spot, r, res.expression_id, res.reference_ids, res.grammar_issues) : { kind: "unparsed", message: res.error };
    } catch {
      fallback = { kind: "unparsed", message: "No te entendí — try again" };
    }
    apply(fallback, "typed", answer);
  }

  function pickChip(id: string | null) {
    if (!run || run.cleared) return;
    setChip(id);
    setRefs([]);
    setShown((s) => (s?.verdict.kind === "true" ? s : null));
  }

  function pickObject(id: string) {
    if (screen !== "play" || !run || !spot || run.cleared) return;
    const obj = world.objects.find((o) => o.id === id);
    if (!obj) return;
    if (!suggestions) {
      setText((t) => appendRef(t, obj.es));
      return;
    }
    if (!chip || !ready) return;
    const need = inv.get(chip).ref_count;
    const next = refs.includes(id) ? refs : [...refs, id];
    if (next.length < need) {
      setRefs(next);
      return;
    }
    const v = judgeChoice(world, spot, rot, chip, next);
    const said = v.kind === "true" ? v.sentence : `El gnomo está ${world.inv.get(chip).es} ${next.map((r) => world.objects.find((o) => o.id === r)?.es).join(" y ")}.`;
    apply(v, "chip", said);
  }

  function rotate(delta: 1 | -1) {
    const next = (((rot + delta) % 4) + 4) % 4 as Rotation;
    setRot(next);
    // Left/right/front/behind just changed meaning: drop an open ✗ or hint.
    setShown((s) => (s?.verdict.kind === "true" ? s : null));
    if (screen === "play" && run && spot && !run.cleared) {
      refreshTray(world, spot, next);
      setChip(null);
      setRefs([]);
    }
  }

  function setSuggestions(on: boolean) {
    commit({ ...progress, prefs: { ...progress.prefs, suggestions: on } });
    setChip(null);
    setRefs([]);
    if (run && spot && !run.cleared) refreshTray(world, spot, rot, on);
  }

  function setVoiceLang(l: "es-ES" | "es-419") {
    commit({ ...progress, prefs: { ...progress.prefs, voiceLang: l } });
  }

  function setLabels(on: boolean) {
    commit({ ...progress, prefs: { ...progress.prefs, labels: on } });
  }

  function next() {
    if (!run || !run.cleared) return;
    if (run.index + 1 < run.order.length) {
      const index = run.index + 1;
      setRun({ ...run, index, cleared: false });
      setShown(null);
      resetInput();
      refreshTray(world, run.order[index], rot);
      return;
    }
    finish();
  }

  function finish() {
    if (!run) return;
    const misses = missesFor(world, run.rooms, albumSet, 3);
    for (const m of misses) recordAttempt({ itemRef: m.itemRef, correct: false, answer: "(summary: not used)" });
    const stars = starsFor(run.rooms.map((r) => ({ spot: r.spot, mode: r.mode, expressions: r.said.map((s) => s.expression) })));
    const prevBest = progress.best[run.scene] ?? 0;
    const best = run.score > prevBest;
    commit({
      ...progress,
      stars: { ...progress.stars, [run.scene]: Math.max(progress.stars[run.scene] ?? 0, stars) },
      best: { ...progress.best, [run.scene]: Math.max(prevBest, run.score) },
      plays: progress.plays + 1,
    });
    setRun({ ...run, done: { stars, best, misses } });
    setSummarySel(0);
    setRot(run.rooms[0]?.rotation ?? 0);
    setShown(null);
    resetInput();
    setScreen("summary");
  }

  function selectSummary(i: number) {
    if (!run) return;
    setSummarySel(i);
    setRot(run.rooms[i]?.rotation ?? 0);
  }

  const summary = run && screen === "summary" ? summarize(world, run.rooms) : [];

  return {
    content,
    inv,
    worlds,
    world,
    reachable,
    progress,
    screen,
    run,
    rot,
    spot,
    gnomeKey,
    ready,
    shown,
    text,
    tray,
    chip,
    refs,
    suggestions,
    summary,
    summarySel,
    albumOpen,
    claudeOff,
    setText,
    setPreview,
    setArrived,
    setShown,
    setAlbumOpen,
    setClaudeOff,
    start,
    toMenu,
    submitText,
    pickChip,
    pickObject,
    rotate,
    setSuggestions,
    setVoiceLang,
    setLabels,
    next,
    finish,
    selectSummary,
  };
}

export type PosicionesState = ReturnType<typeof usePosiciones>;

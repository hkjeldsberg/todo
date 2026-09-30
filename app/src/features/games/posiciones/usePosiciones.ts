"use client";

import { useMemo, useState } from "react";
import type { Attempt } from "@/features/games/types";
import { parseWithClaude } from "./actions";
import { inventoryOf } from "./model/inventory";
import { judgeParsedIds, judgeText, type Verdict } from "./model/judge";
import { appendRef, suggestionText } from "./model/phrase";
import { parseProgress, type Progress } from "./model/progress";
import { buildWorld, trueFacts, VIEW, type World } from "./model/relations";
import { scoreAnswer, starsFor, type InputMode, type Score } from "./model/score";
import { suggestionsFor } from "./model/suggest";
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
        for (const f of trueFacts(w, t, VIEW, { regional: true })) out.add(f.expression);
    for (const id of ["aqui", "ahi", "alli", "aca", "alla"]) out.add(id);
    return out;
  }, [worlds]);

  /** Per dungeon: every expression some hiding spot makes true, from any side — the "Sugerencias" list. */
  const levelSuggestions = useMemo(
    () => new Map([...worlds].map(([id, w]) => [id, suggestionsFor(w, inv)])),
    [worlds, inv],
  );

  const [progress, setProgress] = useState<Progress>(() => parseProgress(initialProgress));
  const [screen, setScreen] = useState<Screen>("menu");
  const [preview, setPreview] = useState(content.scenes[0].id);
  const [run, setRun] = useState<Run | null>(null);
  /** One fixed view of the map: no rotation. */
  const rot = VIEW;
  const [arrived, setArrived] = useState<string | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [text, setText] = useState("");
  /** The answer in the box started from a tapped suggestion (scores as "with suggestions"). */
  const [fromSuggestion, setFromSuggestion] = useState(false);
  const [summarySel, setSummarySel] = useState(0);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [claudeOff, setClaudeOff] = useState(false);

  const sceneId = run?.scene ?? preview;
  const world = worlds.get(sceneId)!;
  const spot = run ? (screen === "summary" ? (run.rooms[summarySel]?.spot ?? run.order[0]) : run.order[run.index]) : null;
  const gnomeKey = run && spot ? `${run.id}:${spot}` : null;
  const ready = !!gnomeKey && arrived === gnomeKey;
  const albumSet = new Set(Object.keys(progress.album));

  const commit = (next: Progress) => {
    setProgress(next);
    saveProgress(next);
  };

  const resetInput = () => {
    setText("");
    setFromSuggestion(false);
  };

  /** Typing into the box; clearing it forgets that it came from a suggestion. */
  function editText(value: string) {
    setText(value);
    if (!value.trim()) setFromSuggestion(false);
  }

  function applySuggestion(id: string) {
    if (!run || run.cleared) return;
    setText(suggestionText(inv.get(id).es, inv.get(id).ref_count));
    setFromSuggestion(true);
    setShown((s) => (s?.verdict.kind === "true" ? s : null));
  }

  function start(id: string) {
    const scene = content.scenes.find((s) => s.id === id);
    if (!scene) return;
    const order = shuffle(scene.targets);
    setRun({ id: Date.now(), scene: id, order, index: 0, cleared: false, rooms: [], score: 0, done: null });
    setPreview(id);
    setShown(null);
    resetInput();
    setScreen("play");
  }

  function toMenu() {
    setScreen("menu");
    setRun(null);
    setShown(null);
    resetInput();
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
  }

  async function submitText(raw: string) {
    const answer = raw.trim();
    if (!run || !spot || run.cleared || !ready || !answer || shown?.verdict.kind === "pending") return;
    const r = rot;
    const mode: InputMode = fromSuggestion ? "chip" : "typed";
    const v = judgeText(world, spot, r, answer);
    if (v.kind !== "unparsed" || claudeOff) {
      apply(v, mode, answer);
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
    apply(fallback, mode, answer);
  }

  function pickObject(id: string) {
    if (screen !== "play" || !run || !spot || run.cleared) return;
    const obj = world.objects.find((o) => o.id === id);
    if (obj) setText((t) => appendRef(t, obj.es));
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
    setShown(null);
    resetInput();
    setScreen("summary");
  }

  function selectSummary(i: number) {
    if (!run) return;
    setSummarySel(i);
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
    suggestionsForLevel: levelSuggestions.get(sceneId) ?? [],
    summary,
    summarySel,
    albumOpen,
    claudeOff,
    setText: editText,
    applySuggestion,
    setPreview,
    setArrived,
    setShown,
    setAlbumOpen,
    setClaudeOff,
    start,
    toMenu,
    submitText,
    pickObject,
    setVoiceLang,
    setLabels,
    next,
    finish,
    selectSummary,
  };
}

export type PosicionesState = ReturnType<typeof usePosiciones>;

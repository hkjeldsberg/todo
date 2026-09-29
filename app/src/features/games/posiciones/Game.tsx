"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { GameProps } from "@/features/games/types";
import { bundledContent, contentSchema, shapeContent } from "./model/content";
import type { Verdict } from "./model/judge";
import type { Progress } from "./model/progress";
import { sentence } from "./model/phrase";
import { spotOf, trueFacts } from "./model/relations";
import type { Content } from "./model/types";
import type { GnomeTarget } from "./scene/Gnome";
import { GardenMap } from "./scene/Map";
import { Album } from "./ui/Album";
import { PrimaryButton } from "./ui/bits";
import { CommandBar } from "./ui/CommandBar";
import { DialogBox, type DialogTone } from "./ui/DialogBox";
import { InputToggle } from "./ui/InputToggle";
import { Menu } from "./ui/Menu";
import { Summary } from "./ui/Summary";
import { Tray } from "./ui/Tray";
import { usePosiciones, type PosicionesState, type Shown } from "./usePosiciones";

function parseContent(raw: unknown): Content {
  return contentSchema.safeParse(raw).success ? shapeContent(raw) : bundledContent();
}

function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** The visual viewport height: shrinks when the on-screen keyboard opens, so the input stays visible. */
function subscribeViewport(cb: () => void) {
  const vv = window.visualViewport;
  vv?.addEventListener("resize", cb);
  window.addEventListener("resize", cb);
  return () => {
    vv?.removeEventListener("resize", cb);
    window.removeEventListener("resize", cb);
  };
}

export default function Game({ content, source, initialProgress, saveProgress, recordAttempt, exit }: GameProps) {
  const data = useMemo(() => parseContent(content), [content]);
  const s = usePosiciones({ content: data, initialProgress, saveProgress: saveProgress as (p: Progress) => void, recordAttempt });
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const height = useSyncExternalStore(subscribeViewport, () => Math.round(window.visualViewport?.height ?? window.innerHeight), () => 0);

  // Keyboard: Q/E or [ ] turn the map, 1–4 pick a suggestion chip, Escape drops it, N = next room.
  const { rotate, pickChip, next, tray, run } = s;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "q" || k === "[") rotate(-1);
      else if (k === "e" || k === "]") rotate(1);
      else if (/^[1-4]$/.test(k) && tray?.chips[Number(k) - 1]) pickChip(tray.chips[Number(k) - 1]);
      else if (k === "escape") pickChip(null);
      else if (k === "n" && run?.cleared) next();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rotate, pickChip, next, tray, run]);

  useDevHook(s);

  const spotGeo = s.spot ? spotOf(s.world, s.spot) : spotOf(s.world, s.world.scene.targets[0]);
  const gnome: GnomeTarget = {
    key: s.gnomeKey ?? `preview:${s.world.scene.id}`,
    at: spotGeo.at,
    y: spotGeo.y,
    pose: spotGeo.pose,
    face: spotGeo.face,
    orbit: spotGeo.pose === "circle" && spotGeo.host ? s.world.bodies.get(spotGeo.host)?.at : undefined,
    leanTo: spotGeo.lean ? s.world.bodies.get(spotGeo.lean)?.at : undefined,
  };
  // Things he's inside or under fade so he shows from above.
  const ghosts = s.world.objects
    .filter((o) => {
      const b = s.world.bodies.get(o.id)!;
      const inX = Math.abs(spotGeo.at[0] - b.at[0]) <= b.size[0] / 2 && Math.abs(spotGeo.at[1] - b.at[1]) <= b.size[1] / 2;
      return inX && spotGeo.y < b.h - 0.05 && (b.kind === "tree" || b.kind === "bench" || b.kind === "stall" || b.kind === "cart");
    })
    .map((o) => o.id);

  const playing = s.screen === "play" && !!s.run;
  const pickable = playing && !s.run!.cleared && s.suggestions && !!s.chip;

  return (
    <main
      className="fixed inset-x-0 top-0 flex flex-col overflow-hidden bg-shell select-none lg:flex-row"
      style={{ height: height ? `${height}px` : "100dvh" }}
    >
      <section className="relative min-h-[36%] flex-[3] lg:min-h-0 lg:flex-1">
        <GardenMap
          world={s.world}
          rot={s.rot}
          gnome={gnome}
          pickable={pickable}
          selected={s.refs}
          labels={s.progress.prefs.labels}
          ghosts={ghosts}
          onPick={s.pickObject}
          onArrive={s.setArrived}
          reducedMotion={reducedMotion}
          label={`${s.world.scene.title_es}: mapa del jardín visto desde arriba`}
        />
        <TopBar s={s} exit={exit} source={source} />
        <div className="absolute right-3 bottom-3 z-20 flex gap-2">
          <MapButton label="Girar a la izquierda" onClick={() => s.rotate(-1)}>
            ⟲
          </MapButton>
          <MapButton label="Girar a la derecha" onClick={() => s.rotate(1)}>
            ⟳
          </MapButton>
        </div>
        <button
          type="button"
          onClick={() => s.setLabels(!s.progress.prefs.labels)}
          aria-pressed={s.progress.prefs.labels}
          className="absolute bottom-3 left-3 z-20 min-h-11 rounded-full bg-card/90 px-3 text-[13px] font-bold text-ink shadow-[0_3px_0_var(--card-shadow)]"
        >
          {s.progress.prefs.labels ? "Ocultar nombres" : "Ver nombres"}
        </button>
        {s.shown && playing && (
          <div className="pointer-events-auto absolute inset-x-3 bottom-16 z-20 mx-auto max-w-[560px] lg:bottom-6">
            <Verdict shown={s.shown} s={s} reducedMotion={reducedMotion} />
          </div>
        )}
      </section>

      <section className="relative z-10 -mt-4 flex min-h-0 flex-[2] flex-col rounded-t-[22px] bg-page pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_0_var(--card-shadow)] lg:mt-0 lg:w-[440px] lg:flex-none lg:rounded-none lg:shadow-[-4px_0_0_var(--card-shadow)]">
        {s.screen === "menu" && (
          <Menu
            scenes={s.content.scenes}
            levels={Object.fromEntries(s.content.scenes.map((sc) => [sc.id, s.worlds.get(sc.id)!.layout.level]))}
            progress={s.progress}
            albumCount={Object.keys(s.progress.album).length}
            total={s.inv.list.length}
            onStart={s.start}
            onPreview={s.setPreview}
            onAlbum={() => s.setAlbumOpen(true)}
          />
        )}
        {playing && <PlayPanel s={s} />}
        {s.screen === "summary" && s.run?.done && (
          <Summary
            inv={s.inv}
            rooms={s.summary}
            selected={s.summarySel}
            onSelect={s.selectSummary}
            score={s.run.score}
            stars={s.run.done.stars}
            best={s.run.done.best}
            misses={s.run.done.misses}
            onAgain={() => s.start(s.run!.scene)}
            onMenu={s.toMenu}
            onAlbum={() => s.setAlbumOpen(true)}
          />
        )}
      </section>

      {s.albumOpen && <Album inv={s.inv} progress={s.progress} reachable={s.reachable} onClose={() => s.setAlbumOpen(false)} />}
    </main>
  );
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="glyph press flex h-12 w-12 items-center justify-center rounded-full bg-card text-[22px] font-bold text-ink shadow-[0_4px_0_var(--card-shadow)] [--press:4px]"
    >
      {children}
    </button>
  );
}

function TopBar({ s, exit, source }: { s: PosicionesState; exit: () => void; source: string }) {
  const run = s.run;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3 pt-[calc(env(safe-area-inset-top)+10px)]">
      <button
        type="button"
        onClick={s.screen === "menu" ? exit : s.toMenu}
        aria-label={s.screen === "menu" ? "Salir del juego" : "Volver al mapa de mazmorras"}
        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-card text-[16px] font-bold text-ink shadow-[0_3px_0_var(--card-shadow)]"
      >
        ✕
      </button>
      <div className="pointer-events-auto flex min-w-0 flex-col items-center rounded-[18px] bg-card/95 px-3 py-1 shadow-[0_3px_0_var(--card-shadow)]">
        <span className="truncate text-[14px] font-bold">{s.world.scene.title_es}</span>
        {run && s.screen === "play" && (
          <span className="flex gap-1 py-0.5" aria-label={`Sala ${run.index + 1} de ${run.order.length}`}>
            {run.order.map((id, i) => (
              <span key={id} className={`h-2 w-2 rounded-full ${i < run.index || (i === run.index && run.cleared) ? "bg-accent" : i === run.index ? "bg-ink" : "bg-pill-deep"}`} />
            ))}
          </span>
        )}
        {process.env.NODE_ENV !== "production" && <span className="text-[10px] text-faint">content: {source}</span>}
      </div>
      <span className="pointer-events-auto min-w-11 rounded-full bg-ink px-3 py-2 text-center text-[14px] font-bold text-on-ink shadow-[0_3px_0_var(--ink-shadow)]" aria-label="Puntos">
        {run?.score ?? 0}
      </span>
    </div>
  );
}

function PlayPanel({ s }: { s: PosicionesState }) {
  const run = s.run!;
  const busy = s.shown?.verdict.kind === "pending";
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pt-3 pb-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[16px] font-bold text-ink">{run.cleared ? "¡Encontrado!" : s.ready ? "¿Dónde está el gnomo?" : "El gnomo se esconde…"}</p>
        <InputToggle on={s.suggestions} onChange={s.setSuggestions} />
      </div>
      {run.cleared ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <PrimaryButton onClick={s.next}>{run.index + 1 < run.order.length ? "Siguiente sala" : "Ver resumen"}</PrimaryButton>
          <p className="text-[12px] text-faint">Tecla N</p>
        </div>
      ) : s.suggestions && s.tray ? (
        <Tray inv={s.inv} chips={s.tray.chips} chip={s.chip} refs={s.refs} objects={s.world.objects.filter((o) => o.id !== s.world.room && !s.world.bodies.get(o.id)!.members)} onChip={s.pickChip} onObject={s.pickObject} disabled={!s.ready} />
      ) : (
        <CommandBar text={s.text} onText={s.setText} onSubmit={s.submitText} disabled={!s.ready || busy} voiceLang={s.progress.prefs.voiceLang} onVoiceLang={s.setVoiceLang} />
      )}
      {!run.cleared && !s.suggestions && <p className="text-[12px] text-faint">Tip: tap a thing on the map to add its name. Q / E turn the map.</p>}
    </div>
  );
}

const TAGS: Record<Verdict["kind"] | "pending", { tone: DialogTone; tag: string }> = {
  true: { tone: "good", tag: "¡Sí!" },
  false: { tone: "bad", tag: "No…" },
  grammar: { tone: "grammar", tag: "Gramática" },
  vague: { tone: "info", tag: "Casi" },
  unparsed: { tone: "info", tag: "¿Qué?" },
  pending: { tone: "info", tag: "…" },
};

function Verdict({ shown, s, reducedMotion }: { shown: Shown; s: PosicionesState; reducedMotion: boolean }) {
  const v = shown.verdict;
  const t = TAGS[v.kind];
  const close = v.kind === "true" ? undefined : () => s.setShown(null);
  return (
    <DialogBox key={`${v.kind}:${"message" in v ? v.message : ""}:${"sentence" in v ? v.sentence : ""}`} tone={t.tone} tag={t.tag} onClose={close} reducedMotion={reducedMotion}>
      {v.kind === "true" && (
        <>
          <p className="text-[17px] leading-snug font-bold">{v.sentence}</p>
          {v.notes.map((n) => (
            <p key={n} className="text-[13px] text-muted">
              {n}
            </p>
          ))}
          {shown.repeat && <p className="text-[13px] text-muted">Ya la usaste en esta mazmorra: ¡prueba otra la próxima vez!</p>}
          {shown.score && (
            <p className="mt-1 flex flex-wrap gap-1.5">
              {shown.score.lines.map((l) => (
                <span key={l.label} className="rounded-full bg-pill px-2 py-[1px] text-[12px] font-bold">
                  +{l.points} {l.label}
                </span>
              ))}
            </p>
          )}
        </>
      )}
      {v.kind === "false" && <p className="text-[16px] leading-snug font-bold">{v.message}</p>}
      {v.kind === "grammar" && (
        <>
          <p className="text-[16px] leading-snug font-bold">{v.note}</p>
          <p className="mt-0.5 text-[13px] opacity-75">Fix it and try again.</p>
        </>
      )}
      {(v.kind === "vague" || v.kind === "unparsed") && <p className="text-[16px] leading-snug font-bold">{v.message}</p>}
      {v.kind === "pending" && <p className="text-[15px] font-bold">Pensando…</p>}
    </DialogBox>
  );
}

/** Dev only: state and helpers for the headless playtest (never calls Claude). */
function useDevHook(s: PosicionesState) {
  const live = useRef(s);
  useEffect(() => {
    live.current = s;
  });
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __posiciones?: object };
    w.__posiciones = {
      state: () => {
        const c = live.current;
        return {
          screen: c.screen,
          scene: c.run?.scene ?? null,
          spot: c.spot,
          index: c.run?.index ?? 0,
          rooms: c.run?.order.length ?? 0,
          cleared: c.run?.cleared ?? false,
          ready: c.ready,
          rot: c.rot,
          verdict: c.shown?.verdict.kind ?? null,
          message: c.shown && "message" in c.shown.verdict ? c.shown.verdict.message : c.shown && "note" in c.shown.verdict ? c.shown.verdict.note : null,
          score: c.run?.score ?? 0,
          suggestions: c.suggestions,
          tray: c.tray,
          album: Object.keys(c.progress.album).length,
          stars: c.progress.stars,
          done: c.run?.done ?? null,
        };
      },
      /** True sentences for the current spot and camera turn. */
      truths: () => {
        const c = live.current;
        if (!c.spot) return [];
        return trueFacts(c.world, c.spot, c.rot).map((t) => ({ ...t, sentence: sentence(c.world.inv, c.world.scene, [t]) }));
      },
      names: () => Object.fromEntries(live.current.world.objects.map((o) => [o.id, o.es])),
      noClaude: () => live.current.setClaudeOff(true),
    };
    return () => {
      delete w.__posiciones;
    };
  }, []);
}

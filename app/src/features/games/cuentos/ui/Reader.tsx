"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tokenKey, type Sentence, type Story, type Token } from "../lib/schema";
import {
  HIGHLIGHTS,
  TENSE_LABEL,
  defaultHighlights,
  highlightOf,
  sentenceText,
  splitPunct,
  type Highlight,
} from "../lib/text";
import { PressButton } from "./Chip";
import { HIGHLIGHT_STYLE } from "./palette";

type Located = { key: string; token: Token; sentence: Sentence; sentenceKey: string };
type Active = { key: string; pinned: boolean; rect: DOMRect };

const HOVER_GRACE_MS = 160;

/**
 * The reading canvas (PRD §3B–C). Narrative in paragraphs, dialogue in bubbles.
 * Hover (or tap) a word for its lemma, tense and meaning; reflexive halves and
 * subjunctive triggers light up together; Shift (or "Frase") shows the sentence.
 */
export default function Reader({
  story,
  saved,
  canSave,
  onToggleSave,
  onBack,
}: {
  story: Story;
  saved: Set<string>;
  canSave: boolean;
  onToggleSave(key: string): Promise<string | null>;
  onBack(): void;
}) {
  const [highlights, setHighlights] = useState<Set<Highlight>>(() => new Set(defaultHighlights(story.targets)));
  const [active, setActive] = useState<Active | null>(null);
  const [shift, setShift] = useState(false);
  const [showSentence, setShowSentence] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // key → token, and the tokens linked to each other.
  const index = useMemo(() => {
    const byKey = new Map<string, Located>();
    story.content.nodes.forEach((node, n) =>
      node.sentences.forEach((sentence, s) =>
        sentence.tokens.forEach((token, t) =>
          byKey.set(tokenKey(n, s, t), { key: tokenKey(n, s, t), token, sentence, sentenceKey: `${n}:${s}` }),
        ),
      ),
    );
    return byKey;
  }, [story]);

  const current = active ? index.get(active.key) ?? null : null;

  const linked = useMemo(() => {
    const keys = new Set<string>();
    if (!current) return keys;
    const { token } = current;
    for (const other of index.values()) {
      const t = other.token;
      if (token.reflexive_id && t.reflexive_id === token.reflexive_id) keys.add(other.key);
      if (token.triggered_by && t.trigger_id === token.triggered_by) keys.add(other.key);
      if (token.trigger_id && t.triggered_by === token.trigger_id) keys.add(other.key);
    }
    return keys;
  }, [current, index]);

  const trigger = useMemo(() => {
    if (!current?.token.triggered_by) return null;
    const words = [...index.values()]
      .filter((o) => o.token.trigger_id === current.token.triggered_by)
      .map((o) => splitPunct(o.token.text)[1]);
    return words.length ? words.join(" ") : null;
  }, [current, index]);

  const close = useCallback(() => {
    setActive(null);
    setShowSentence(false);
    setSaveError(null);
  }, []);

  // Shift = translate the sentence; Escape closes; scrolling drops a hover card.
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "Shift") setShift(true);
      if (event.key === "Escape") close();
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === "Shift") setShift(false);
    };
    const scroll = () => setActive((a) => (a && !a.pinned ? null : a));
    const outside = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (tooltipRef.current?.contains(target) || target.closest("[data-token]")) return;
      close();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("pointerdown", outside);
    };
  }, [close]);

  const cancelLeave = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
  };

  const hover = (key: string, element: HTMLElement) => {
    cancelLeave();
    setActive((a) => (a?.pinned ? a : { key, pinned: false, rect: element.getBoundingClientRect() }));
  };

  const leave = () => {
    cancelLeave();
    leaveTimer.current = setTimeout(() => setActive((a) => (a?.pinned ? a : null)), HOVER_GRACE_MS);
  };

  const pin = (key: string, element: HTMLElement) => {
    cancelLeave();
    setSaveError(null);
    setShowSentence(false);
    setActive((a) => (a?.pinned && a.key === key ? null : { key, pinned: true, rect: element.getBoundingClientRect() }));
  };

  async function toggleSave(key: string) {
    setBusyKey(key);
    setSaveError(await onToggleSave(key));
    setBusyKey(null);
  }

  const speakerSide = useMemo(() => {
    const sides = new Map<string, "left" | "right">();
    for (const node of story.content.nodes) {
      if (node.type !== "dialogue" || !node.speaker || sides.has(node.speaker)) continue;
      sides.set(node.speaker, sides.size === 0 ? "left" : "right");
    }
    return sides;
  }, [story]);

  const renderSentence = (sentence: Sentence, n: number, s: number) => {
    const sentenceKey = `${n}:${s}`;
    const inFocus = (shift || showSentence) && current?.sentenceKey === sentenceKey;
    return (
      <span key={sentenceKey} className={inFocus ? "rounded-[6px] bg-pill-deep/70" : undefined}>
        {sentence.tokens.map((token, t) => {
          const key = tokenKey(n, s, t);
          const family = highlightOf(token);
          const style = family && highlights.has(family) ? HIGHLIGHT_STYLE[family] : null;
          const isActive = active?.key === key;
          const isLinked = linked.has(key) && !isActive;
          return (
            <span key={key}>
              <span
                data-token
                role={token.tense ? "button" : undefined}
                tabIndex={token.tense ? 0 : undefined}
                onPointerEnter={(e) => e.pointerType === "mouse" && hover(key, e.currentTarget)}
                onPointerLeave={(e) => e.pointerType === "mouse" && leave()}
                onClick={(e) => pin(key, e.currentTarget)}
                onFocus={(e) => hover(key, e.currentTarget)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    pin(key, e.currentTarget);
                  }
                }}
                className={`relative cursor-pointer rounded-[5px] px-[1px] transition-colors ${
                  isActive ? "outline-2 outline-accent" : isLinked ? "outline-2 outline-dashed outline-accent" : ""
                }`}
                style={style ? { background: style.wash, boxShadow: `inset 0 -2px 0 ${style.line}` } : undefined}
              >
                {token.text}
                {saved.has(key) && (
                  <span
                    aria-label="saved to Repaso"
                    className="absolute -top-1 -right-1 size-2 rounded-full bg-accent ring-2 ring-page"
                  />
                )}
              </span>
              {t < sentence.tokens.length - 1 ? " " : ""}
            </span>
          );
        })}{" "}
      </span>
    );
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[680px] flex-col bg-page pb-[calc(32px+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 bg-page/95 px-[18px] pt-[calc(12px+env(safe-area-inset-top))] pb-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <PressButton onClick={onBack} className="min-h-11 shrink-0 px-4 text-[15px]">
            ‹ Cuentos
          </PressButton>
          <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold">{story.content.title}</h1>
          <span className="shrink-0 rounded-full bg-pill px-2.5 py-1 text-[12px] font-bold text-muted">
            {saved.size} en Repaso
          </span>
        </div>
        {/* Tense toolbar: one toggle per highlight family. */}
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto" role="toolbar" aria-label="Tense highlights">
          {HIGHLIGHTS.map((family) => {
            const on = highlights.has(family);
            const style = HIGHLIGHT_STYLE[family];
            return (
              <button
                key={family}
                aria-pressed={on}
                onClick={() =>
                  setHighlights((set) => {
                    const next = new Set(set);
                    if (on) next.delete(family);
                    else next.add(family);
                    return next;
                  })
                }
                className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold"
                style={{
                  background: on ? style.wash : "var(--pill-flat)",
                  color: on ? "var(--ink)" : "var(--faint)",
                  boxShadow: on ? `inset 0 -3px 0 ${style.line}` : undefined,
                }}
              >
                <span className="size-2.5 rounded-full" style={{ background: style.line, opacity: on ? 1 : 0.35 }} />
                {style.label}
              </button>
            );
          })}
        </div>
      </header>

      <p className="px-[18px] pt-1 pb-4 text-[12px] font-bold text-faint">
        <span className="hidden sm:inline">Hover a word · hold Shift for the whole sentence · click to pin</span>
        <span className="sm:hidden">Tap a word for its meaning</span>
      </p>

      <article className="flex flex-col gap-5 px-[18px] text-[19px] leading-[1.9]">
        {story.content.nodes.map((node, n) =>
          node.type === "narrative" ? (
            <p key={n}>{node.sentences.map((sentence, s) => renderSentence(sentence, n, s))}</p>
          ) : (
            <div
              key={n}
              className={`flex flex-col ${speakerSide.get(node.speaker ?? "") === "right" ? "items-end" : "items-start"}`}
            >
              <span className="mb-1 px-3 text-[12px] font-bold text-muted">{node.speaker}</span>
              <p
                className={`max-w-[88%] rounded-[22px] bg-card px-4 py-2.5 text-[18px] leading-[1.8] shadow-[0_4px_0_var(--card-shadow)] ${
                  speakerSide.get(node.speaker ?? "") === "right" ? "rounded-br-[6px]" : "rounded-bl-[6px]"
                }`}
              >
                {node.sentences.map((sentence, s) => renderSentence(sentence, n, s))}
              </p>
            </div>
          ),
        )}
      </article>

      {current && active && (
        <Tooltip
          ref={tooltipRef}
          located={current}
          rect={active.rect}
          pinned={active.pinned}
          sentence={shift || showSentence ? current.sentence : null}
          trigger={trigger}
          saved={saved.has(current.key)}
          canSave={canSave}
          busy={busyKey === current.key}
          error={saveError}
          onEnter={cancelLeave}
          onLeave={leave}
          onSentence={() => setShowSentence((v) => !v)}
          onSave={() => toggleSave(current.key)}
          onClose={close}
        />
      )}
    </div>
  );
}

function Tooltip({
  ref,
  located,
  rect,
  pinned,
  sentence,
  trigger,
  saved,
  canSave,
  busy,
  error,
  onEnter,
  onLeave,
  onSentence,
  onSave,
  onClose,
}: {
  ref: React.Ref<HTMLDivElement>;
  located: Located;
  rect: DOMRect;
  pinned: boolean;
  sentence: Sentence | null;
  trigger: string | null;
  saved: boolean;
  canSave: boolean;
  busy: boolean;
  error: string | null;
  onEnter(): void;
  onLeave(): void;
  onSentence(): void;
  onSave(): void;
  onClose(): void;
}) {
  const { token } = located;
  const word = splitPunct(token.text)[1] || token.text;
  const family = highlightOf(token);
  const style = family ? HIGHLIGHT_STYLE[family] : null;

  // Floating card next to the word; below it unless the word sits low on screen.
  const width = 300;
  const viewportW = typeof window === "undefined" ? 1024 : window.innerWidth;
  const viewportH = typeof window === "undefined" ? 800 : window.innerHeight;
  const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, 12), viewportW - width - 12);
  const below = rect.bottom < viewportH * 0.58;
  const position = below ? { top: rect.bottom + 10 } : { bottom: viewportH - rect.top + 10 };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`${word}: ${token.translation}`}
      onPointerEnter={onEnter}
      onPointerLeave={(e) => e.pointerType === "mouse" && onLeave()}
      // On phones the card is a bottom sheet; on wider screens it floats by the word.
      className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 rounded-[22px] bg-card p-4 shadow-[0_6px_0_var(--card-shadow),0_18px_40px_rgba(61,33,64,0.18)] sm:inset-x-auto sm:bottom-auto sm:w-[300px] sm:[left:var(--tip-left)] sm:[top:var(--tip-top)] sm:[bottom:var(--tip-bottom)]"
      style={
        {
          "--tip-left": `${left}px`,
          "--tip-top": "top" in position ? `${position.top}px` : "auto",
          "--tip-bottom": "bottom" in position ? `${position.bottom}px` : "auto",
        } as React.CSSProperties
      }
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[22px] leading-tight font-bold">{word}</div>
          {token.lemma && token.lemma.toLowerCase() !== word.toLowerCase() && (
            <div className="text-[13px] text-muted">
              de <span className="font-bold text-ink">{token.lemma}</span>
            </div>
          )}
        </div>
        {token.tense && (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold"
            style={{ background: style?.wash ?? "var(--pill)", boxShadow: style ? `inset 0 -2px 0 ${style.line}` : undefined }}
          >
            {TENSE_LABEL[token.tense]}
          </span>
        )}
        {pinned && (
          <button onClick={onClose} aria-label="Close" className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center text-[15px] font-bold text-faint">
            ✕
          </button>
        )}
      </div>

      <p className="mt-2 text-[16px] font-bold">{token.group_translation || token.translation || "—"}</p>
      {token.reflexive_id && token.group_translation && (
        <p className="mt-0.5 text-[12px] font-bold" style={{ color: HIGHLIGHT_STYLE.reflexive.line }}>
          reflexive — read together with its pair
        </p>
      )}
      {trigger && (
        <p className="mt-0.5 text-[12px] font-bold" style={{ color: HIGHLIGHT_STYLE.subjunctive.line }}>
          subjuntivo because of «{trigger}»
        </p>
      )}
      {token.trigger_id && (
        <p className="mt-0.5 text-[12px] font-bold" style={{ color: HIGHLIGHT_STYLE.subjunctive.line }}>
          triggers the subjunctive
        </p>
      )}

      {sentence && (
        <div className="mt-3 rounded-[16px] bg-pill p-3 text-[14px] leading-snug">
          <div className="text-faint">{sentenceText(sentence)}</div>
          <div className="mt-1 font-bold">{sentence.translation}</div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onSentence}
          className="min-h-10 rounded-full bg-pill px-3.5 text-[13px] font-bold sm:hidden"
          aria-pressed={Boolean(sentence)}
        >
          {sentence ? "Hide sentence" : "Frase"}
        </button>
        {token.tense && canSave && (
          <button
            onClick={onSave}
            disabled={busy}
            className={`min-h-10 rounded-full px-3.5 text-[13px] font-bold disabled:opacity-50 ${
              saved ? "bg-pill-deep text-ink" : "bg-ink text-on-ink"
            }`}
          >
            {busy ? "…" : saved ? "✓ En Repaso · quitar" : "Guardar en Repaso"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[12px] font-bold text-accent">
          ! {error}
        </p>
      )}
    </div>
  );
}

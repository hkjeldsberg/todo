"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { useSpeech } from "./useSpeech";

/**
 * Suggestions off: say it or type it. Hold the mic to talk, release to send;
 * typing always works. The input is 16px (no iOS zoom).
 */
export function CommandBar({
  text,
  onText,
  onSubmit,
  disabled,
  voiceLang,
  onVoiceLang,
}: {
  text: string;
  onText: (t: string) => void;
  onSubmit: (t: string) => void;
  disabled: boolean;
  voiceLang: "es-ES" | "es-419";
  onVoiceLang: (l: "es-ES" | "es-419") => void;
}) {
  const speech = useSpeech(voiceLang, (heard) => {
    onText(heard);
    onSubmit(heard);
  });
  const input = useRef<HTMLInputElement>(null);

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    speech.start();
  };
  const up = () => speech.stop();
  const keyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      speech.start();
    }
  };
  const keyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") speech.stop();
  };

  return (
    <div className="flex flex-col gap-2.5">
      <form
        className="flex items-stretch gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(text);
        }}
      >
        <label className="sr-only" htmlFor="posiciones-answer">
          ¿Dónde está el gnomo?
        </label>
        <input
          ref={input}
          id="posiciones-answer"
          value={speech.listening ? speech.interim : text}
          onChange={(e) => onText(e.target.value)}
          placeholder="El gnomo está…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck={false}
          enterKeyHint="send"
          lang="es"
          className="min-h-12 min-w-0 flex-1 rounded-[16px] border-2 border-dash bg-card px-4 text-[16px] text-ink outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="press min-h-12 rounded-full bg-ink px-5 text-[16px] font-bold text-on-ink shadow-[0_5px_0_var(--ink-shadow)] [--press:5px] disabled:opacity-40"
        >
          Decir
        </button>
      </form>
      {speech.supported && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={speech.listening ? "Escuchando: suelta para enviar" : "Mantén pulsado para hablar"}
            aria-pressed={speech.listening}
            disabled={disabled}
            onPointerDown={down}
            onPointerUp={up}
            onPointerCancel={up}
            onKeyDown={keyDown}
            onKeyUp={keyUp}
            onContextMenu={(e) => e.preventDefault()}
            className={`press flex min-h-12 flex-1 touch-none items-center justify-center gap-2 rounded-full text-[15px] font-bold shadow-[0_5px_0_var(--accent-shadow)] [--press:5px] disabled:opacity-40 ${
              speech.listening ? "bg-accent text-white" : "bg-card text-ink"
            }`}
          >
            <MicMark live={speech.listening} />
            {speech.listening ? "Escuchando… suelta para enviar" : "Mantén para hablar"}
          </button>
          <div className="flex rounded-full bg-pill-flat p-1" role="radiogroup" aria-label="Acento del micrófono">
            {(["es-ES", "es-419"] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={voiceLang === l}
                onClick={() => onVoiceLang(l)}
                className={`min-h-10 rounded-full px-3 text-[12px] font-bold ${voiceLang === l ? "bg-pill-deep text-ink" : "text-muted"}`}
              >
                {l === "es-ES" ? "España" : "Latam"}
              </button>
            ))}
          </div>
        </div>
      )}
      {speech.error && <p className="text-[13px] text-accent">{speech.error}</p>}
    </div>
  );
}

/** A small drawn microphone (no icon font, no emoji). */
function MicMark({ live }: { live: boolean }) {
  return (
    <span aria-hidden className="relative inline-flex h-5 w-4 flex-col items-center">
      <span className={`h-3 w-2.5 rounded-full ${live ? "bg-white" : "bg-accent"}`} />
      <span className={`-mt-1 h-2 w-4 rounded-b-full border-2 border-t-0 ${live ? "border-white" : "border-accent"}`} />
      <span className={`h-1 w-0.5 ${live ? "bg-white" : "bg-accent"}`} />
    </span>
  );
}

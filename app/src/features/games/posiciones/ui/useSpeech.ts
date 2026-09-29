"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Hold-to-talk with the Web Speech API. `supported` is false where there is no
 * SpeechRecognition (Firefox, most WebViews): the mic button hides.
 */

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type Ctor = new () => Recognition;

function recognitionCtor(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noop = () => () => {};

export function useSpeech(lang: "es-ES" | "es-419", onFinal: (text: string) => void) {
  const supported = useSyncExternalStore(noop, () => recognitionCtor() !== null, () => false);
  const rec = useRef<Recognition | null>(null);
  const heard = useRef("");
  const final = useRef(onFinal);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    final.current = onFinal;
  });

  const start = useCallback(() => {
    const C = recognitionCtor();
    if (!C || rec.current) return;
    const r = new C();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = true;
    r.maxAlternatives = 1;
    heard.current = "";
    r.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      heard.current = text.trim();
      setInterim(heard.current);
    };
    r.onerror = (e) => {
      if (e.error !== "aborted" && e.error !== "no-speech") setError(e.error === "not-allowed" ? "Allow the microphone to talk." : "The microphone didn't work. Type instead.");
    };
    r.onend = () => {
      rec.current = null;
      setListening(false);
      setInterim("");
      if (heard.current) final.current(heard.current);
    };
    rec.current = r;
    setError(null);
    setListening(true);
    try {
      r.start();
    } catch {
      rec.current = null;
      setListening(false);
    }
  }, [lang]);

  const stop = useCallback(() => rec.current?.stop(), []);

  useEffect(() => () => rec.current?.abort(), []);

  return { supported, listening, interim, error, start, stop };
}

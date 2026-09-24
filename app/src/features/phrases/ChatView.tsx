"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useBoard } from "@/features/phrases/store";
import { askClaude } from "@/features/phrases/chat-actions";
import type { ChatSuggestion } from "@/features/phrases/chat";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  phrases: ChatSuggestion[];
};

export default function ChatView() {
  const board = useBoard();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, true>>({});
  const [target, setTarget] = useState<string | null>(board.activeId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  const targetScenario =
    board.scenarios.find((scenario) => scenario.id === target) ?? null;

  async function send() {
    const text = draft.trim();
    if (!text || pending) return;

    const outgoing: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      phrases: [],
    };
    const history = [...messages, outgoing];
    setMessages(history);
    setDraft("");
    setPending(true);
    setError(null);

    try {
      const answer = await askClaude(
        history.map((message) => ({ role: message.role, text: message.text })),
        target,
      );
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: answer.reply,
          phrases: answer.phrases,
        },
      ]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Claude is unreachable",
      );
    } finally {
      setPending(false);
    }
  }

  function save(messageId: string, index: number, phrase: ChatSuggestion) {
    if (!target) return;
    board.addPhrase({
      scenarioId: target,
      categoryId: null,
      spanish: phrase.spanish,
      translation: phrase.translation,
    });
    setSaved((current) => ({ ...current, [`${messageId}:${index}`]: true }));
  }

  return (
    <div className="mx-auto flex min-h-full max-w-[520px] flex-col bg-page">
      <header className="sticky top-0 z-30 bg-shell px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-3">
        <div className="flex items-center justify-between">
          <Link href="/frases" className="text-[14px] font-bold text-muted">
            ← Frases
          </Link>
          <span className="text-[17px] font-bold">? Ask</span>
        </div>

        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
          <span className="shrink-0 py-1 text-[12px] font-bold text-faint">
            save to
          </span>
          {board.scenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => setTarget(scenario.id)}
              className={
                target === scenario.id
                  ? "shrink-0 rounded-full bg-ink px-3 py-1 text-[13px] font-bold whitespace-nowrap text-on-ink"
                  : "shrink-0 rounded-full bg-tab px-3 py-1 text-[13px] font-bold whitespace-nowrap text-muted"
              }
            >
              {scenario.name}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 bg-page px-[18px] pt-4 pb-4">
        {messages.length === 0 && (
          <div className="text-[15px] text-muted">
            Ask for phrases in plain language — “how do I complain about a cold
            meal?”, “polite ways to ask for the wifi password”, “gym small
            talk”.
            {targetScenario
              ? ` Claude sees what “${targetScenario.name}” already contains and won't repeat it.`
              : " Pick a scenario above to save answers into it."}
          </div>
        )}

        <ul className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.li
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <div className="mb-1 text-[12px] font-bold text-faint">
                  {message.role === "user" ? "you" : "claude"}
                </div>
                <div className="text-[16px] whitespace-pre-wrap">
                  {message.text}
                </div>

                {message.phrases.length > 0 && (
                  <ul className="mt-2.5 flex flex-col gap-2">
                    {message.phrases.map((phrase, index) => {
                      const key = `${message.id}:${index}`;
                      return (
                        <li
                          key={key}
                          className="flex items-start justify-between gap-3 rounded-[18px] bg-card px-4 py-3 shadow-[0_4px_0_var(--card-shadow)]"
                        >
                          <div className="min-w-0">
                            <div className="text-[16px] font-bold break-words">
                              {phrase.spanish}
                            </div>
                            <div className="text-[14px] text-muted">
                              {phrase.translation}
                            </div>
                          </div>
                          <button
                            disabled={!target || saved[key]}
                            onClick={() => save(message.id, index, phrase)}
                            className={
                              saved[key]
                                ? "shrink-0 rounded-full bg-pill px-3 py-1.5 text-[13px] font-bold text-muted"
                                : "press shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-[13px] font-bold text-on-ink shadow-[0_3px_0_var(--ink-shadow)] disabled:opacity-40"
                            }
                          >
                            {saved[key] ? "saved ✓" : "+ Save"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {pending && (
          <div className="mt-4 text-[14px] font-bold text-faint">
            ··· thinking ···
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 text-[14px] font-bold text-accent">
            ! {error}
          </p>
        )}
        <div ref={endRef} />
      </main>

      <footer className="sticky bottom-0 z-30 flex items-center gap-2 bg-page px-[18px] pt-2.5 pb-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void send();
          }}
          placeholder="Ask for phrases…"
          className="min-w-0 flex-1 rounded-full bg-pill px-4 py-3 text-[16px] outline-none"
        />
        <button
          onClick={() => void send()}
          disabled={pending || board.offline}
          className="press shrink-0 rounded-full bg-ink px-5 py-3 text-[16px] font-bold text-on-ink shadow-[0_4px_0_var(--ink-shadow)] disabled:opacity-40"
        >
          Ask
        </button>
      </footer>
    </div>
  );
}

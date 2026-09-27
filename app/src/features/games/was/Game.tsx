"use client";

import { MotionConfig } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import type { GameProps } from "@/features/games/types";
import { FONT_VARS } from "./fonts";
import { parseProgress, withPageReset, withSolved } from "./lib/progress";
import type { Panel, Verb, WasContent, WasProgress } from "./lib/types";
import { ComicPage } from "./ui/ComicPage";
import { Cover } from "./ui/Cover";
import styles from "./was.module.css";

/** El Cómic Dinámico. Content was validated and grouped into pages by ./server.ts. */
export default function Game({ content, source, initialProgress, saveProgress, recordAttempt, exit }: GameProps) {
  const { pages } = content as WasContent;
  const [progress, setProgress] = useState<WasProgress>(() => parseProgress(initialProgress));
  const [pageId, setPageId] = useState<string | null>(null);
  // Bumped on "Otra vez" so the page remounts with fresh animations.
  const [visit, setVisit] = useState(0);

  const solvedIds = useMemo(() => new Set(progress.solved), [progress.solved]);
  const pageIndex = pages.findIndex((p) => p.id === pageId);
  const page = pageIndex >= 0 ? pages[pageIndex] : null;

  const update = useCallback(
    (next: WasProgress) => {
      setProgress(next);
      saveProgress(next);
    },
    [saveProgress],
  );

  const open = (id: string) => {
    setPageId(id);
    setVisit((v) => v + 1);
    window.scrollTo({ top: 0 });
  };

  const onAnswer = useCallback(
    (panel: Panel, verb: Verb, correct: boolean) => {
      recordAttempt({ itemRef: panel.id, correct, answer: verb });
      if (correct) update(withSolved(progress, content as WasContent, panel.id));
    },
    [recordAttempt, update, progress, content],
  );

  const next = pageIndex >= 0 && pageIndex < pages.length - 1 ? pages[pageIndex + 1].id : null;

  return (
    <MotionConfig reducedMotion="user">
      <div className={`${FONT_VARS} ${styles.root}`}>
        {page ? (
          <ComicPage
            key={`${page.id}:${visit}`}
            page={page}
            solvedIds={solvedIds}
            onAnswer={onAnswer}
            onBack={() => setPageId(null)}
            onReplay={() => {
              update(withPageReset(progress, content as WasContent, page.id));
              open(page.id);
            }}
            onNext={next ? () => open(next) : null}
          />
        ) : (
          <Cover pages={pages} progress={progress} source={source} onOpen={open} onExit={exit} />
        )}
      </div>
    </MotionConfig>
  );
}

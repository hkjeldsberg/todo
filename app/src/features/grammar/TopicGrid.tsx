"use client";

import Link from "next/link";
import {
  LEVELS,
  TAG_LABEL,
  TOPICS,
  topicsByLevel,
  type Topic,
} from "@/features/grammar/grammar";
import { useGrammarProgress } from "@/features/grammar/progress";

/**
 * The bento grid, split into level bands. Client-side because each card
 * carries a check box the reader ticks when a topic feels under control.
 */
export default function TopicGrid() {
  const { done, toggle } = useGrammarProgress();

  return (
    <>
      <p className="mb-4 flex items-baseline justify-between gap-3 text-[15px] text-muted">
        <span>Tick a topic once it feels under control.</span>
        <span className="text-[13px] font-bold whitespace-nowrap text-faint">
          {`${done.size}/${TOPICS.length}`}
        </span>
      </p>

      <NextUp done={done} />

      <div className="flex flex-col gap-7">
        {LEVELS.map((band) => {
          const topics = topicsByLevel(band.level);
          const ticked = topics.filter((topic) => done.has(topic.slug)).length;

          return (
            <section key={String(band.level)}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-bold">
                    {typeof band.level === "number" && `${band.level} · `}
                    {band.title}
                  </h2>
                  <p className="text-[13px] text-muted">{band.blurb}</p>
                </div>
                <span
                  className={`text-[13px] font-bold whitespace-nowrap ${
                    ticked === topics.length ? "text-accent" : "text-faint"
                  }`}
                >
                  {ticked}/{topics.length}
                </span>
              </div>

              {/* Bento: half-width cards pair up, full-width ones break the
                  row. Each band keeps an even number of halves so no section
                  ends on a ragged half-row. */}
              <div className="grid grid-cols-2 gap-4">
                {topics.map((topic, index) => (
                  <Card
                    key={topic.slug}
                    topic={topic}
                    index={index}
                    checked={done.has(topic.slug)}
                    onToggle={() => toggle(topic.slug)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

/**
 * The first untouched topic, which is also the lowest incomplete band's first
 * gap — TOPICS is stored in band order, so plain array order gets it right.
 */
function NextUp({ done }: { done: Set<string> }) {
  const next = TOPICS.find((topic) => !done.has(topic.slug));

  if (!next) {
    return (
      <div className="sticker mb-6 rounded-[20px] bg-accent p-4 text-on-ink shadow-[0_6px_0_var(--card-shadow)]">
        <span className="text-[11px] font-bold text-on-ink/75">All ticked</span>
        <p className="text-[16px] leading-tight font-bold">
          Every topic is under control.
        </p>
        <p className="mt-1 text-[13px] leading-snug text-on-ink/85">
          Untick anything that stops feeling that way.
        </p>
      </div>
    );
  }

  const band = LEVELS.find((level) => level.level === next.level);

  return (
    <Link
      href={`/grammar/${next.slug}`}
      className="press mb-6 flex items-center gap-3 rounded-[20px] bg-ink p-4 text-on-ink shadow-[0_6px_0_var(--ink-shadow)]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold text-on-ink/70">
          Next up{band ? ` · ${band.title}` : ""}
        </span>
        <span className="block truncate text-[16px] leading-tight font-bold">
          {next.title}
        </span>
        <span className="mt-1 block truncate text-[13px] leading-snug text-on-ink/80">
          {next.blurb}
        </span>
      </span>
      <span aria-hidden className="text-[18px] font-bold">
        →
      </span>
    </Link>
  );
}

function Card({
  topic,
  index,
  checked,
  onToggle,
}: {
  topic: Topic;
  index: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const highlight = index % 4 === 0;

  return (
    <Link
      href={`/grammar/${topic.slug}`}
      className={`sticker press relative flex flex-col justify-between gap-2 rounded-[20px] p-4 shadow-[0_6px_0_var(--card-shadow)] ${
        topic.span === 2 ? "col-span-2" : ""
      } ${highlight ? "bg-accent text-on-ink" : "bg-card"} ${
        checked ? "opacity-60" : ""
      }`}
      // Each card sits at its own slight angle, like a pasted sticker.
      style={{ transform: `rotate(${index % 2 ? 0.7 : -0.7}deg)` }}
    >
      <span
        className={`text-[11px] font-bold ${
          highlight ? "text-on-ink/75" : "text-faint"
        }`}
      >
        {TAG_LABEL[topic.tag]}
      </span>
      <span className="pr-8 text-[16px] leading-tight font-bold">
        {topic.title}
      </span>
      <span
        className={`text-[13px] leading-snug ${
          highlight ? "text-on-ink/85" : "text-muted"
        }`}
      >
        {topic.blurb}
      </span>

      {/* Inside the link, so the tap has to be stopped by hand. */}
      <button
        type="button"
        aria-pressed={checked}
        aria-label={
          checked
            ? `Mark ${topic.title} as not learned yet`
            : `Mark ${topic.title} as under control`
        }
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggle();
        }}
        className={`absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-full border-2 text-[14px] font-bold ${
          checked
            ? "border-ink bg-ink text-on-ink"
            : highlight
              ? "border-on-ink/40 text-transparent"
              : "border-dash-card text-transparent"
        }`}
      >
        ✓
      </button>
    </Link>
  );
}

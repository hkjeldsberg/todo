"use client";

import { useState } from "react";
import { CardTag, ContinueButton, Verdict } from "./parts";
import type { ViewProps } from "./types";

/** Multiple choice: conjugation drills and missed game items. */
export default function ChoiceView({ card, onResult, onNext }: ViewProps<"choice">) {
  const [picked, setPicked] = useState<number | null>(null);
  const { prompt, hint, options, explanation } = card.card;
  const correctIndex = options.findIndex((option) => option.correct);
  const checked = picked !== null;
  const right = checked && options[picked].correct;
  const [before, after] = prompt.includes("___") ? prompt.split("___") : [prompt, null];

  function pick(index: number) {
    if (checked) return;
    setPicked(index);
    onResult(options[index].correct, options[index].text);
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <CardTag label={card.label} box={card.box} isNew={card.isNew} />
      </div>

      <p className="text-[24px] leading-snug font-bold">
        {before}
        {after !== null && (
          <>
            <span
              className={`mx-0.5 inline-block min-w-20 rounded-full px-3 text-center ${
                !checked ? "bg-pill-deep" : right ? "bg-ink text-on-ink" : "bg-accent text-white"
              }`}
            >
              {checked ? options[correctIndex]?.text : " "}
            </span>
            {after}
          </>
        )}
      </p>
      {hint && <p className="-mt-3 text-[15px] text-muted">{hint}</p>}

      <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
        {options.map((option, index) => {
          const state = !checked
            ? "bg-card text-ink shadow-[0_5px_0_var(--card-shadow)]"
            : option.correct
              ? "bg-ink text-on-ink shadow-none"
              : index === picked
                ? "bg-accent text-white shadow-none"
                : "bg-pill-flat text-faint shadow-none";
          return (
            <button
              key={`${option.text}-${index}`}
              onClick={() => pick(index)}
              disabled={checked}
              className={`press min-h-13 rounded-[18px] px-4 py-3 text-left text-[17px] leading-snug font-bold ${state}`}
              style={{ ["--press" as string]: "5px" }}
            >
              {option.text}
            </button>
          );
        })}
      </div>

      {checked && (
        <Verdict
          correct={right}
          title={options[correctIndex]?.text ?? ""}
          lines={explanation ? [explanation] : []}
        >
          {card.table && (
            <div className="mt-3 rounded-[16px] bg-white/25 p-3 text-[14px]">
              <div className="mb-1 font-bold">{card.table.title}</div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
                {card.table.rows.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="opacity-75">{label}</dt>
                    <dd className="font-bold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Verdict>
      )}

      <div className="mt-auto pt-2">{checked && <ContinueButton onContinue={onNext} />}</div>
    </div>
  );
}

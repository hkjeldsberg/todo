"use client";

import { useEffect, useRef } from "react";
import type { Scenario } from "@/features/phrases/types";

/**
 * The scenario strip, directly under the page nav. The active tab shares the
 * page background so it reads as one continuous sheet with the content below.
 */
export default function ScenarioTabs({
  scenarios,
  activeId,
  onSelect,
  onEditActive,
  onAdd,
}: {
  scenarios: Scenario[];
  activeId: string | null;
  onSelect: (id: string) => void;
  /** Tapping the tab you're already on opens its rename dialog. */
  onEditActive: () => void;
  onAdd: () => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const tabs = useRef(new Map<string, HTMLButtonElement>());

  /* Centre the selected tab so its neighbours on both sides stay visible. The
     browser clamps the scroll, so the first and last tabs simply rest against
     their edge. Scrolling the strip directly (rather than scrollIntoView) keeps
     the gesture from bubbling out to the page. */
  useEffect(() => {
    const container = strip.current;
    const tab = activeId ? tabs.current.get(activeId) : null;
    if (!container || !tab) return;

    // Measure against the container: `offsetLeft` is relative to the nearest
    // positioned ancestor, which is not the strip.
    const stripRect = container.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const target =
      container.scrollLeft +
      (tabRect.left - stripRect.left) -
      (container.clientWidth - tabRect.width) / 2;

    if (Math.abs(container.scrollLeft - target) < 1) return;

    container.scrollTo({
      left: target,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [activeId, scenarios]);

  return (
    <div className="flex items-end gap-2 bg-shell px-3">
      <div
        ref={strip}
        className="no-scrollbar flex min-w-0 flex-1 items-end gap-[5px] overflow-x-auto"
      >
        {scenarios.map((scenario) => {
          const isActive = scenario.id === activeId;
          return (
            <button
              key={scenario.id}
              ref={(node) => {
                if (node) tabs.current.set(scenario.id, node);
                else tabs.current.delete(scenario.id);
              }}
              onClick={() =>
                isActive ? onEditActive() : onSelect(scenario.id)
              }
              title={isActive ? "Rename scenario" : scenario.name}
              className={
                isActive
                  ? "shrink-0 rounded-t-[14px] bg-page px-3.5 pt-3 pb-3.5 text-[14px] font-bold whitespace-nowrap"
                  : "shrink-0 rounded-t-[14px] bg-tab px-[11px] pt-[9px] pb-3 text-[13px] text-muted whitespace-nowrap"
              }
            >
              {scenario.name}
            </button>
          );
        })}

        <button
          onClick={onAdd}
          aria-label="New scenario"
          className="shrink-0 rounded-t-[14px] bg-tab px-3 pt-[9px] pb-3 text-[13px] font-bold text-muted"
        >
          +
        </button>
      </div>
    </div>
  );
}

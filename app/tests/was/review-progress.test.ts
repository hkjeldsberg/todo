import { describe, expect, it } from "vitest";
import { bundledContent } from "@/features/games/was/lib/content";
import { emptyProgress, parseProgress, withPageReset, withSolved } from "@/features/games/was/lib/progress";
import { toReviewCard } from "@/features/games/was/lib/review";

const content = bundledContent();
const panelIds = content.pages[0].panels.map((p) => p.id);

describe("toReviewCard", () => {
  it("turns a missed panel into a fill-the-blank card", () => {
    const card = toReviewCard("robo_3", content)!;
    expect(card.type).toBe("choice");
    expect(card.prompt).toBe("El robo ___ increíblemente rápido.");
    expect(card.hint).toBe("Action panel");
    expect(card.options.map((o) => o.text)).toEqual(["era", "estaba", "fue", "estuve"]);
    expect(card.options.filter((o) => o.correct).map((o) => o.text)).toEqual(["fue"]);
    expect(card.explanation).not.toContain("*");
  });

  it("puts the blank first when the verb opens the sentence", () => {
    expect(toReviewCard("robo_1", content)!.prompt).toBe("___ una noche oscura y lluviosa en Madrid.");
  });

  it.each(panelIds)("%s: exactly one right answer", (id) => {
    expect(toReviewCard(id, content)!.options.filter((o) => o.correct)).toHaveLength(1);
  });

  it("returns null for unknown refs", () => {
    expect(toReviewCard("nope", content)).toBeNull();
  });
});

describe("progress", () => {
  it("starts empty on first play or garbage", () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress("x")).toEqual(emptyProgress());
    expect(parseProgress([1])).toEqual(emptyProgress());
    expect(parseProgress({ solved: 3, completed: ["a", "a"], lastPage: 4 })).toEqual({
      solved: [],
      completed: ["a"],
      lastPage: null,
    });
  });

  it("completes a page once all five panels are solved", () => {
    let p = emptyProgress();
    for (const id of panelIds.slice(0, 4)) p = withSolved(p, content, id);
    expect(p.completed).toEqual([]);
    expect(withSolved(p, content, "robo_1")).toEqual(p);
    p = withSolved(p, content, "robo_5");
    expect(p.solved).toEqual(panelIds);
    expect(p.completed).toEqual(["el_robo_01"]);
    expect(p.lastPage).toBe("el_robo_01");
    expect(parseProgress(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });

  it("ignores unknown panels and replays keep the page completed", () => {
    const p = panelIds.reduce((acc, id) => withSolved(acc, content, id), emptyProgress());
    expect(withSolved(p, content, "nope")).toBe(p);
    const replay = withPageReset(p, content, "el_robo_01");
    expect(replay.solved).toEqual([]);
    expect(replay.completed).toEqual(["el_robo_01"]);
  });
});

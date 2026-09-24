import { describe, expect, it } from "vitest";
import seed from "@/content/donde.json";
import { scrapbookSchema, type Task } from "@/features/games/donde/model/schema";
import { candidateZones, emptyFills, judgeBuild, judgeZone, placeToken } from "@/features/games/donde/model/judge";

const book = scrapbookSchema.parse(seed);
const task = (id: string): Task => {
  const t = book.pages.flatMap((p) => p.tasks).find((x) => x.id === id);
  if (!t) throw new Error(id);
  return t;
};

describe("judgeZone", () => {
  const t = task("map_pharmacy");

  it("accepts the target zone", () => {
    expect(judgeZone(t, "pin_across_park")).toEqual({ correct: true, note: t.success_note });
  });

  it("gives the specific note for a plausible wrong zone", () => {
    expect(judgeZone(t, "pin_next_to_park")).toEqual({ correct: false, note: t.zone_notes.pin_next_to_park });
  });

  it("falls back to error_note off-zone", () => {
    expect(judgeZone(t, null).note).toBe(t.error_note);
    expect(judgeZone(t, "zone_unknown").note).toBe(t.error_note);
  });

  it("candidates = target + wrong zones", () => {
    expect(candidateZones(t).sort()).toEqual(["pin_across_park", "pin_behind_park", "pin_next_to_park"]);
  });
});

describe("build: hay vs está (PRD grammar enforcement)", () => {
  const t = task("apt_cat_label");

  it("physically rejects Hay + el gato in either drop order", () => {
    const withHay = placeToken(t, emptyFills(t), 0, "hay");
    expect(withHay.accepted).toBe(true);
    if (!withHay.accepted) return;
    const rejected = placeToken(t, withHay.fills, 1, "el gato");
    expect(rejected).toEqual({ accepted: false, note: "Hay is never used with definite articles (el, la, los, las). Use está." });

    const withCat = placeToken(t, [null, "el gato"], 0, "hay");
    expect(withCat.accepted).toBe(false);
  });

  it("accepts every listed answer", () => {
    expect(judgeBuild(t, ["el gato", "está"]).status).toBe("correct");
    expect(judgeBuild(t, ["hay", "un gato"]).status).toBe("correct");
  });

  it("explains un gato + está", () => {
    const v = judgeBuild(t, ["un gato", "está"]);
    expect(v).toMatchObject({ status: "wrong" });
    if (v.status === "wrong") expect(v.note).toMatch(/hay/i);
  });

  it("is incomplete until every slot is filled", () => {
    expect(judgeBuild(t, ["hay", null]).status).toBe("incomplete");
  });

  it("moving a token frees its old slot", () => {
    const r = placeToken(t, ["está", null], 1, "está");
    expect(r).toEqual({ accepted: true, fills: [null, "está"] });
  });
});

describe("build: agreement and contractions", () => {
  it("las sillas + está explains plural", () => {
    const v = judgeBuild(task("plaza_chairs_label"), ["las sillas", "está"]);
    expect(v).toMatchObject({ status: "wrong" });
    if (v.status === "wrong") expect(v.note).toMatch(/están/);
  });

  it("rejects de el, accepts del, explains de la", () => {
    const t = task("map_pharmacy_label");
    expect(placeToken(t, [null], 0, "de el").accepted).toBe(false);
    expect(judgeBuild(t, ["del"]).status).toBe("correct");
    expect(judgeBuild(t, ["de la"])).toEqual({ status: "wrong", note: t.error_note });
  });
});

import type { ChoiceCard } from "@/features/srs/card";
import { bareNoun } from "./inventory";
import { gapOption, joinRef, phraseText } from "./phrase";
import { buildWorld, holds, ROTATIONS, trueFacts, type Truth, type World } from "./relations";
import type { Content, Expression } from "./types";

/**
 * A missed position as a Repaso card: "El gnomo está ___ seto." with the true
 * expression and three same-category distractors, each with its article and
 * contraction ("detrás del", "junto al", "encima de la").
 * itemRef = "<scene>:<spot>:<expressionId>".
 */

export function parseItemRef(itemRef: string): { scene: string; spot: string; expression: string } | null {
  const parts = itemRef.split(":");
  if (parts.length !== 3 || parts.some((p) => !p)) return null;
  return { scene: parts[0], spot: parts[1], expression: parts[2] };
}

/** "at the back / far end of" → "at the back of". */
export function englishOf(e: Expression, metres?: number): string {
  let en = e.en;
  if (metres !== undefined) en = en.replace(/\(.*?\)/, `${metres === 1 ? "one metre" : `${["", "one", "two", "three", "four", "five", "six"][metres] ?? metres} metres`}`);
  if (en.includes(" / ")) {
    const first = en.split(" / ")[0];
    en = en.endsWith(" of") && !first.endsWith(" of") ? `${first} of` : first;
  }
  return en.replace(/\s*\(.*?\)\s*$/, "");
}

function hintFor(world: World, e: Expression, t: Truth): string {
  const names = t.refs.map((r) => world.objects.find((o) => o.id === r)?.en ?? r);
  let en = englishOf(e, t.metres);
  if (e.en.includes("…")) {
    en = e.en.replace("…", names[0] ?? "").replace("…", names[1] ?? "").replace(/\s+/g, " ");
    return `The gnome is ${en.trim()}.`;
  }
  return `The gnome is ${[en, ...names.slice(0, 1)].join(" ")}.`;
}

function explanationFor(e: Expression, option: string): string {
  const contracted = / (del|al)$/.test(option);
  const rule = contracted ? ` ${option.endsWith("del") ? "De + el" : "A + el"} always contracts: ${option}.` : "";
  return `${e.es} = ${englishOf(e)}.${rule}${e.notes && !contracted ? ` ${e.notes}` : ""}`.trim();
}

export function toReviewCard(itemRef: string, content: Content): ChoiceCard | null {
  const ref = parseItemRef(itemRef);
  if (!ref) return null;
  const scene = content.scenes.find((s) => s.id === ref.scene);
  if (!scene || !scene.targets.includes(ref.spot)) return null;
  let world: World;
  try {
    world = buildWorld(content, scene.id);
  } catch {
    return null;
  }
  if (!world.inv.has(ref.expression)) return null;
  const e = world.inv.get(ref.expression);
  const meaning = world.inv.meaning(e.id);

  // A true use of it at this spot (any camera turn; the English hint carries the meaning).
  let truth: Truth | undefined;
  for (const rot of ROTATIONS) {
    truth = trueFacts(world, ref.spot, rot, { regional: true }).find((t) => t.expression === e.id || t.expression === meaning);
    if (truth) break;
  }
  if (!truth) return null;
  truth = { ...truth, expression: e.id };

  const trueAnywhere = (id: string, refs: string[]) => ROTATIONS.some((rot) => holds(world, ref.spot, { expression: id, refs }, rot));
  const refless = truth.refs.length === 0;
  const probe = truth.refs.slice(0, 1);
  const distractorPool = (category: string) =>
    world.inv.list.filter(
      (x) =>
        x.category === category &&
        x.id !== e.id &&
        x.id !== meaning &&
        !x.standard &&
        (refless ? x.ref_count === 0 : x.ref_count === 1) &&
        x.id !== "a_distancia_de" &&
        !trueAnywhere(x.id, refless ? [] : probe),
    );
  const category = e.standard ? world.inv.get(e.standard).category : e.category;
  const distractors = [...distractorPool(category), ...distractorPool("core"), ...distractorPool("building")]
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, 3);
  if (distractors.length < 3) return null;

  if (truth.refs.length === 0) {
    const correct = phraseText(world.inv, scene, truth);
    return {
      type: "choice",
      prompt: "El gnomo está ___.",
      hint: `The gnome is ${englishOf(e)}.`,
      options: [{ text: correct, correct: true }, ...distractors.map((d) => ({ text: d.bare ?? d.es, correct: false }))],
      explanation: explanationFor(e, correct),
    };
  }

  const obj = scene.objects.find((o) => o.id === truth.refs[0])!;
  const noun = bareNoun(obj.es);
  const rest = truth.refs.length === 2 ? ` ${e.id === "en_la_esquina_con" ? "con" : "y"} ${scene.objects.find((o) => o.id === truth.refs[1])!.es}` : "";
  const correct = gapOption(world.inv, scene, truth);
  const optionFor = (d: Expression) => {
    const full = joinRef(d.es, obj.es);
    return full.endsWith(` ${noun}`) ? full.slice(0, -noun.length - 1) : full;
  };
  return {
    type: "choice",
    prompt: `El gnomo está ___ ${noun}${rest}.`,
    hint: hintFor(world, e, truth),
    options: [{ text: correct, correct: true }, ...distractors.map((d) => ({ text: optionFor(d), correct: false }))],
    explanation: explanationFor(e, correct),
  };
}

import type { ChoiceCard } from "@/features/srs/card";
import { PRONOUNS } from "@/features/srs/verbs";
import { findDrill } from "./content";
import { ruleFor } from "./forms";
import type { PasadoContent } from "./types";

/**
 * A missed drill as a Repaso card: the sentence with `___ (infinitive)` and four
 * forms — the right one, the other tense, and both tenses of a neighbouring person.
 * `itemRef` is the drill id; unknown ids give null.
 */
export function toReviewCard(itemRef: string, content: PasadoContent): ChoiceCard | null {
  const drill = findDrill(content, itemRef);
  const verb = drill && content.verbs[drill.infinitive];
  if (!drill || !verb) return null;
  const at = PRONOUNS.indexOf(drill.person);
  const other = PRONOUNS[at === 0 ? 1 : at - 1];
  const right = verb.forms[drill.correct_tense][drill.person];
  const forms = [
    right,
    verb.forms.preterite[drill.person],
    verb.forms.imperfect[drill.person],
    verb.forms.preterite[other],
    verb.forms.imperfect[other],
  ];
  const options = [...new Set(forms)].slice(0, 4).map((text) => ({ text, correct: text === right }));
  return {
    type: "choice",
    prompt: drill.sentence_template.replace("{verb}", `___ (${drill.infinitive})`),
    hint: drill.english_translation,
    options,
    explanation: ruleFor(drill),
  };
}

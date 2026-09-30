"use client";

import type { Pronoun } from "@/features/srs/verbs";
import { irregularSplit } from "../lib/forms";
import type { PastTense } from "../lib/types";
import styles from "../pasado.module.css";

/** A conjugated form with its irregular root glowing amber (regular forms render plain). */
export function VerbForm({
  infinitive,
  tense,
  person,
  form,
}: {
  infinitive: string;
  tense: PastTense;
  person: Pronoun;
  form: string;
}) {
  const split = irregularSplit(infinitive, tense, person, form);
  if (!split) return <>{form}</>;
  return (
    <>
      <span className={styles.glow} data-irregular>
        {split[0]}
      </span>
      {split[1]}
    </>
  );
}

// Checks every unchecked glossary word with Claude Haiku (PRD §5 backfill):  npm run glossary:enrich
// Same prompt as the app. CONCURRENCY words at a time; a few hundred words take a few minutes (and cents).
// Re-runnable: only status=unchecked rows are touched; failures stay unchecked for the next run.
import { checkWithClaude } from "../src/features/glossary/ai-core";
import { spanishKey } from "../src/features/glossary/text";
import { OWNER, scriptDb } from "./glossary-db.mjs";

const db = scriptDb();
const { data: words, error } = await db
  .from("glossary_words")
  .select("id, spanish, english, norwegian, my_guess")
  .eq("user_id", OWNER)
  .eq("status", "unchecked");
if (error) throw new Error(error.message);
const { data: themeRows } = await db.from("glossary_themes").select("id, name").eq("user_id", OWNER);
const themes = (themeRows ?? []).map((t) => t.name as string);
const { data: keyRows } = await db.from("glossary_words").select("id, spanish_key").eq("user_id", OWNER);
const keys = new Map((keyRows ?? []).map((r) => [r.spanish_key as string, r.id as string]));

const CONCURRENCY = 4;
const queue = [...(words ?? [])];
const total = queue.length;
let checked = 0;
let failed = 0;

async function checkOne(word: NonNullable<typeof words>[number]) {
  const guess = (word.my_guess as string | null) ?? (word.english as string);
  const result = await checkWithClaude({ spanish: word.spanish as string, guess, themes });
  if (!result) {
    failed++;
    console.warn(`  skip ${word.spanish}: Claude unavailable`);
    return;
  }
  const key = spanishKey(result.spanish);
  const clash = keys.get(key);
  const spanish = clash && clash !== word.id ? (word.spanish as string) : result.spanish;
  const { error: updateError } = await db
    .from("glossary_words")
    .update({
      spanish,
      spanish_key: spanishKey(spanish),
      english: result.english,
      // A Norwegian translation I wrote myself wins over Claude's.
      norwegian: (word.norwegian as string | null) ?? result.norwegian,
      pos: result.pos,
      gender: result.gender,
      my_guess: guess,
      guess_verdict: result.verdict,
      guess_note: result.note || null,
      examples: result.examples,
      status: "checked",
      updated_at: new Date().toISOString(),
    })
    .eq("id", word.id);
  if (updateError) {
    failed++;
    console.warn(`  fail ${word.spanish}: ${updateError.message}`);
    return;
  }
  keys.set(spanishKey(spanish), word.id as string);
  checked++;
  const mark = result.verdict === "correct" ? "✓" : result.verdict === "close" ? "≈" : "✗";
  console.log(`  [${checked + failed}/${total}] ${mark} ${spanish} — ${result.english} / ${(word.norwegian as string | null) ?? result.norwegian}`);
}

await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let word = queue.shift(); word; word = queue.shift()) await checkOne(word);
  }),
);
console.log(`checked ${checked} · still unchecked ${failed}`);

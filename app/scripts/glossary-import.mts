// One-time import of my word list (PRD §6):  npm run glossary:import -- words.csv
// CSV: spanish,english[,theme] (themes separated by ;). Rows go in as source=import, status=unchecked,
// with the English as my guess; then run `npm run glossary:enrich`. Safe to re-run: duplicates are skipped.
import { readFileSync } from "node:fs";
import { spanishKey } from "../src/features/glossary/text";
import { parseCsv, validateRows } from "./glossary-csv.mjs";
import { OWNER, scriptDb } from "./glossary-db.mjs";

const file = process.argv[2];
if (!file) {
  console.error("usage: npm run glossary:import -- <file.csv>");
  process.exit(1);
}
const { ok, bad, warnings } = validateRows(parseCsv(readFileSync(file, "utf8")));
for (const w of warnings) console.warn(`  warn line ${w.line}: ${w.message}`);
for (const b of bad) console.warn(`  bad  line ${b.line}: ${b.message}`);

const db = scriptDb();
const { data: existing, error } = await db.from("glossary_words").select("spanish_key").eq("user_id", OWNER);
if (error) throw new Error(error.message);
const seen = new Set((existing ?? []).map((r) => r.spanish_key as string));

let inserted = 0;
let duplicate = 0;
for (const row of ok) {
  const key = spanishKey(row.spanish);
  if (seen.has(key)) {
    duplicate++;
    continue;
  }
  seen.add(key);
  const { data, error: insertError } = await db
    .from("glossary_words")
    .insert({ user_id: OWNER, spanish: row.spanish, spanish_key: key, english: row.english, my_guess: row.english, source: "import", status: "unchecked" })
    .select("id")
    .single();
  if (insertError) {
    console.warn(`  fail line ${row.line}: ${insertError.message}`);
    continue;
  }
  if (row.themes.length) {
    const { data: themes, error: themeError } = await db
      .from("glossary_themes")
      .upsert(row.themes.map((name) => ({ user_id: OWNER, name })), { onConflict: "user_id,name" })
      .select("id");
    if (themeError) throw new Error(themeError.message);
    await db.from("glossary_word_themes").insert((themes ?? []).map((t) => ({ word_id: data.id, theme_id: t.id })));
  }
  inserted++;
}
console.log(`inserted ${inserted} · duplicate ${duplicate} · bad rows ${bad.length} · warnings ${warnings.length}`);

/**
 * Compares every legacy table with its copy in `todo` after 0002_copy_legacy.sql:
 * row counts, plus 5 random rows looked up by id. Reads only.
 *
 *   npm run db:verify   (uses NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local)
 */
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile?.(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

const sb = createClient(url, key, { auth: { persistSession: false } });

type Pair = {
  from: [schema: string, table: string];
  to: string;
  /** legacy id column → todo id column; omit to check counts only */
  id?: [string, string];
  /** how a legacy id maps to the todo id value */
  mapId?: (id: unknown) => unknown;
  /** restrict the todo side (e.g. srs_items copied from spanyard) */
  where?: [string, string];
};

const PAIRS: Pair[] = [
  { from: ["memo", "scenarios"], to: "scenarios", id: ["id", "id"] },
  { from: ["memo", "categories"], to: "categories", id: ["id", "id"] },
  { from: ["memo", "phrases"], to: "phrases", id: ["id", "id"] },
  { from: ["memo", "grammar_progress"], to: "grammar_progress", id: ["slug", "slug"] },
  { from: ["memo", "diary_days"], to: "diary_days", id: ["day", "day"] },
  { from: ["memo", "diary_notes"], to: "diary_notes", id: ["id", "id"] },
  { from: ["memo", "diary_sentences"], to: "diary_sentences", id: ["id", "id"] },
  { from: ["spanyard", "words"], to: "words", id: ["id", "id"] },
  { from: ["spanyard", "sentences"], to: "word_sentences" },
  {
    from: ["spanyard", "user_words"],
    to: "srs_items",
    id: ["word_id", "ref"],
    mapId: (id) => `word:${id}`,
    where: ["source", "spanyard"],
  },
  { from: ["donde", "pages"], to: "donde_pages", id: ["page_id", "page_id"] },
  { from: ["donde", "tasks"], to: "donde_tasks", id: ["id", "id"] },
  { from: ["ellabirinto", "nodes"], to: "laberinto_nodes", id: ["node_id", "node_id"] },
  { from: ["tense", "rooms"], to: "tense_rooms", id: ["id", "id"] },
  { from: ["tense", "puzzles"], to: "tense_puzzles", id: ["id", "id"] },
];

async function count(schema: string, table: string, where?: [string, string]) {
  let query = sb.schema(schema).from(table).select("*", { count: "exact", head: true });
  if (where) query = query.eq(where[0], where[1]);
  const { count, error } = await query;
  if (error) return { error: error.message };
  return { count: count ?? 0 };
}

let failures = 0;
for (const pair of PAIRS) {
  const [schema, table] = pair.from;
  const label = `${schema}.${table} → todo.${pair.to}`.padEnd(48);
  const legacy = await count(schema, table);
  const copy = await count("todo", pair.to, pair.where);

  if ("error" in legacy) {
    console.log(`${label} skip  (legacy not readable over the API${legacy.error ? `: ${legacy.error}` : ""} — see 0002 row counts)`);
    continue;
  }
  if ("error" in copy) {
    console.log(`${label} FAIL  (todo: ${copy.error})`);
    failures++;
    continue;
  }

  let spot = "";
  if (pair.id && legacy.count > 0) {
    const [fromId, toId] = pair.id;
    const { data } = await sb.schema(schema).from(table).select(fromId).limit(200);
    const sample = [...(data ?? [])].sort(() => Math.random() - 0.5).slice(0, 5);
    const ids = sample.map((row) => (pair.mapId ?? ((id) => id))((row as unknown as Record<string, unknown>)[fromId]));
    const { data: found } = await sb.schema("todo").from(pair.to).select(toId).in(toId, ids as string[]);
    spot = ` spot ${found?.length ?? 0}/${ids.length}`;
    if ((found?.length ?? 0) !== ids.length) failures++;
  }

  const ok = legacy.count === copy.count;
  if (!ok) failures++;
  console.log(`${label} ${ok ? "ok  " : "FAIL"}  ${legacy.count} → ${copy.count}${spot}`);
}

console.log(failures ? `\n${failures} problem(s).` : "\nAll copied.");
process.exit(failures ? 1 : 0);

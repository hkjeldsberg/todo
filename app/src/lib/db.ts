import "server-only";
import { createClient } from "@supabase/supabase-js";

type TodoClient = ReturnType<typeof createTodoClient>;

let client: TodoClient | null = null;

/**
 * Server-only client bound to the `todo` schema (expose it in Supabase API settings).
 * Uses the service role: the schema has RLS on with no anon policies.
 */
function createTodoClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).",
    );
  }

  return createClient(url, key, {
    db: { schema: "todo" },
    auth: { persistSession: false },
  });
}

export function db(): TodoClient {
  client ??= createTodoClient();
  return client;
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

const PAGE = 1000;

/**
 * Every row of a query, paged past PostgREST's 1000-row cap. `page(from, to)`
 * must build the same ordered query with `.range(from, to)`.
 */
export async function fetchAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

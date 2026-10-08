// Shared Supabase client for the glossary scripts (the app's lib/db is server-only).
import { createClient } from "@supabase/supabase-js";

export const OWNER = "00000000-0000-0000-0000-000000000001";

export function scriptDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. `set -a; source .env.local; set +a`).");
  return createClient(url, key, { db: { schema: "todo" }, auth: { persistSession: false } });
}

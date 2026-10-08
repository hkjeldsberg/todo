import Setup from "@/design/Setup";
import { store, isMemoryStore } from "@/features/glossary/store";
import { GlossaryView } from "@/features/glossary/ui/GlossaryView";
import { isConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Glosario · todo" };

export default async function GlosarioPage() {
  const memory = isMemoryStore();
  if (!memory && !isConfigured()) return <Setup />;

  let data;
  try {
    data = await store().list();
  } catch (cause) {
    // Most often: migration 0010 hasn't been run yet.
    const message = cause instanceof Error ? cause.message : String(cause);
    return <Setup error={`${message} — run app/supabase/migrations/0010_glossary.sql, then seed/glossary.sql.`} />;
  }
  return <GlossaryView initialWords={data.words} initialThemes={data.themes} memory={memory} />;
}

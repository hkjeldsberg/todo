import Setup from "@/design/Setup";
import { isConfigured } from "@/lib/db";
import { buildConjugationDrill } from "@/features/srs/session";
import { TENSE_GROUPS, type TenseGroup } from "@/features/srs/verbs";
import SessionRunner from "@/features/srs/ui/SessionRunner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conjugar · todo" };

export default async function ConjugarPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  if (!isConfigured()) return <Setup />;
  const { group: raw } = await searchParams;
  const group = (Object.keys(TENSE_GROUPS) as TenseGroup[]).find((g) => g === raw) ?? "all";

  let cards;
  try {
    cards = await buildConjugationDrill(group);
  } catch (cause) {
    return <Setup error={cause instanceof Error ? cause.message : String(cause)} />;
  }
  return <SessionRunner cards={cards} title={`Conjugar · ${group}`} />;
}

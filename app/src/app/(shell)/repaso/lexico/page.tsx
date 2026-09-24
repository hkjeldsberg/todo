import PageHeader from "@/design/PageHeader";
import Setup from "@/design/Setup";
import { isConfigured } from "@/lib/db";
import { loadLexicon } from "@/features/srs/lexicon";
import { fluencyScore } from "@/features/srs/leitner";
import LexiconGrid from "@/features/srs/ui/LexiconGrid";

export const dynamic = "force-dynamic";
export const metadata = { title: "Léxico · todo" };

export default async function LexiconPage() {
  if (!isConfigured()) return <Setup />;
  let cells;
  try {
    cells = await loadLexicon();
  } catch (cause) {
    return <Setup error={cause instanceof Error ? cause.message : String(cause)} />;
  }
  const boxes = [0, 0, 0, 0, 0, 0];
  for (const cell of cells) boxes[cell.box]++;

  return (
    <div className="mx-auto flex min-h-full max-w-[520px] flex-col bg-page lg:max-w-[720px]">
      <PageHeader back={{ href: "/repaso", label: "Repaso" }} title="Léxico" aside={`${cells.length} words`} />
      <main className="flex-1 px-[18px] pt-4 pb-7">
        <LexiconGrid cells={cells} fluency={fluencyScore(boxes, Math.max(cells.length, 1))} />
      </main>
    </div>
  );
}

import { isConfigured } from "@/lib/db";
import { loadReviewedPhraseIds, loadSnapshot } from "@/features/phrases/queries";
import { ReviewSetProvider } from "@/features/phrases/review-set";
import { BoardProvider } from "@/features/phrases/store";
import AppShell from "@/features/phrases/Board";
import Setup from "@/design/Setup";

export const dynamic = "force-dynamic";

export default async function FrasesPage() {
  if (!isConfigured()) return <Setup />;

  let snapshot;
  let reviewed: string[];
  try {
    // One round-trip for the whole notebook; the client serves everything after.
    [snapshot, reviewed] = await Promise.all([loadSnapshot(), loadReviewedPhraseIds()]);
  } catch (cause) {
    // Most often: the `todo` schema isn't exposed yet, or the migration hasn't run.
    return <Setup error={cause instanceof Error ? cause.message : String(cause)} />;
  }

  return (
    <BoardProvider initial={snapshot}>
      <ReviewSetProvider initial={reviewed}>
        <AppShell />
      </ReviewSetProvider>
    </BoardProvider>
  );
}

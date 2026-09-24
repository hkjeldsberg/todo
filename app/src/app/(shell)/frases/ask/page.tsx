import { isConfigured } from "@/lib/db";
import { loadSnapshot } from "@/features/phrases/queries";
import { BoardProvider } from "@/features/phrases/store";
import ChatView from "@/features/phrases/ChatView";
import Setup from "@/design/Setup";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  if (!isConfigured()) return <Setup />;

  let snapshot;
  try {
    snapshot = await loadSnapshot();
  } catch (cause) {
    return <Setup error={cause instanceof Error ? cause.message : String(cause)} />;
  }

  // Same provider as the notebook, so saved phrases land in the shared cache.
  return (
    <BoardProvider initial={snapshot}>
      <ChatView />
    </BoardProvider>
  );
}

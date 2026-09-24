import PageHeader from "@/design/PageHeader";
import TopicGrid from "@/features/grammar/TopicGrid";

export const metadata = { title: "Gramática · todo" };

/**
 * The teaching half of the app. The content is static, so unlike the notebook
 * it needs no Supabase snapshot — the only client state is which topics the
 * reader has ticked off, kept in localStorage by the grid.
 */
export default function GrammarPage() {
  return (
    <div className="mx-auto flex min-h-full max-w-[520px] flex-col bg-page lg:max-w-[720px]">
      <PageHeader title="Gramática" />

      <main className="flex-1 px-[18px] pt-4 pb-7">
        <TopicGrid />
      </main>
    </div>
  );
}

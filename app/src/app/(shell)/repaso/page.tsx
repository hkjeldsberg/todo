import Link from "next/link";
import PageHeader from "@/design/PageHeader";
import Setup from "@/design/Setup";
import { isConfigured } from "@/lib/db";
import { reviewStats } from "@/features/srs/session";
import { BOX_COLORS } from "@/features/srs/boxes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Repaso · todo" };

const chip =
  "press flex min-h-11 items-center justify-center rounded-full bg-pill px-4 text-[14px] font-bold shadow-[0_3px_0_var(--card-shadow)]";

export default async function RepasoPage() {
  if (!isConfigured()) return <Setup />;
  let stats;
  try {
    stats = await reviewStats();
  } catch (cause) {
    return <Setup error={cause instanceof Error ? cause.message : String(cause)} />;
  }
  const { dueByKind } = stats;
  const seen = stats.wordBoxes.slice(1).reduce((a, b) => a + b, 0);
  const totalWords = seen + stats.wordBoxes[0];

  const slices = [
    { filter: "words", label: "Palabras", count: dueByKind.word },
    { filter: "phrases", label: "Frases", count: dueByKind.phrase },
    { filter: "conjugar", label: "Conjugar", count: dueByKind.conjugation },
    { filter: "games", label: "Errores de juegos", count: dueByKind.game_item },
  ];

  return (
    <div className="mx-auto flex min-h-full max-w-[520px] flex-col bg-page lg:max-w-[720px]">
      <PageHeader title="Repaso" />
      <main className="flex flex-1 flex-col gap-6 px-[18px] pt-4 pb-9">
        {/* The day's session: the one primary action on the page. */}
        <div className="sticker" style={{ transform: "rotate(-0.6deg)" }}>
          <Link
            href="/repaso/sesion"
            className="press flex flex-col rounded-[22px] bg-accent p-5 text-white shadow-[0_8px_0_var(--accent-shadow)]"
            style={{ ["--press" as string]: "8px" }}
          >
            <span className="text-[12px] font-bold opacity-80">Sesión del día</span>
            <span className="mt-1 text-[28px] leading-tight font-bold">
              {stats.due === 0 && stats.newWords === 0
                ? "Todo al día."
                : `${stats.due} due · ${stats.newWords} new`}
            </span>
            <span className="mt-1 text-[14px] opacity-85">
              Words, saved phrases, conjugations and game mistakes, oldest first.
            </span>
            <span className="mt-3 text-[15px] font-bold">Empezar →</span>
          </Link>
        </div>

        <section>
          <h2 className="mb-2 text-[12px] font-bold text-faint">Only one kind</h2>
          <div className="grid grid-cols-2 gap-3">
            {slices.map((slice) => (
              <Link
                key={slice.filter}
                href={`/repaso/sesion?filter=${slice.filter}`}
                className="press flex items-center justify-between gap-2 rounded-[18px] bg-card px-4 py-3 shadow-[0_5px_0_var(--card-shadow)]"
                style={{ ["--press" as string]: "5px" }}
              >
                <span className="text-[15px] font-bold">{slice.label}</span>
                <span className="rounded-full bg-pill px-2 py-0.5 text-[12px] font-bold text-muted">
                  {slice.count}
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold text-faint">Words as</span>
            <Link href="/repaso/sesion?filter=words&mode=cloze" className={chip}>
              Cloze only
            </Link>
            <Link href="/repaso/sesion?filter=words&mode=scramble" className={chip}>
              Scramble only
            </Link>
          </div>
        </section>

        <section className="rounded-[22px] bg-card p-5 shadow-[0_6px_0_var(--card-shadow)]">
          <h2 className="text-[17px] font-bold">Conjugar</h2>
          <p className="mt-1 text-[14px] text-muted">
            Ten multiple-choice forms, irregulars twice as often. The full table shows after each answer.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/repaso/conjugar?group=pasado" className={chip}>
              Pasado
            </Link>
            <Link href="/repaso/conjugar?group=futuro" className={chip}>
              Futuro
            </Link>
            <Link href="/repaso/conjugar?group=presente" className={chip}>
              Presente
            </Link>
            <Link href="/repaso/conjugar?group=all" className={chip}>
              Todo
            </Link>
          </div>
        </section>

        <Link
          href="/repaso/lexico"
          className="press flex flex-col gap-3 rounded-[22px] bg-card p-5 shadow-[0_6px_0_var(--card-shadow)]"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-[17px] font-bold">Léxico</h2>
            <span className="text-[13px] font-bold text-muted">{stats.fluency}% fluency →</span>
          </div>
          {/* Share of the word list in each box, as one strip. */}
          <div className="flex h-3 overflow-hidden rounded-full bg-pill-flat">
            {stats.wordBoxes.map((count, box) =>
              box === 0 || count === 0 ? null : (
                <span
                  key={box}
                  style={{ width: `${(count / Math.max(totalWords, 1)) * 100}%`, background: BOX_COLORS[box] }}
                />
              ),
            )}
          </div>
          <span className="text-[13px] text-muted">
            {seen} of {totalWords} words started
          </span>
        </Link>
      </main>
    </div>
  );
}

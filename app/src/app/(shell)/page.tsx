import Link from "next/link";
import PageHeader from "@/design/PageHeader";
import Setup from "@/design/Setup";
import { isConfigured } from "@/lib/db";
import { formatDayLong, toDayString } from "@/features/diary/diary";
import { GAMES } from "@/features/games/registry";
import { loadToday } from "@/features/home/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hoy · todo" };

const card = "press flex flex-col rounded-[22px] p-5";
const light = `${card} bg-card shadow-[0_6px_0_var(--card-shadow)]`;

function Tilt({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <div className="sticker" style={{ transform: `rotate(${index % 2 ? 0.6 : -0.6}deg)` }}>
      {children}
    </div>
  );
}

export default async function Hoy() {
  if (!isConfigured()) return <Setup />;
  const day = toDayString(new Date());
  const today = await loadToday(day);
  const { review, diary, lastGame, topic } = today;
  const game = lastGame ?? GAMES[0];

  return (
    <div className="mx-auto flex min-h-full max-w-[520px] flex-col bg-page lg:max-w-[720px]">
      <PageHeader title="Hoy" aside={<span className="inline-block first-letter:uppercase">{formatDayLong(day)}</span>} />
      <main className="grid flex-1 grid-cols-1 content-start gap-6 px-[18px] pt-4 pb-9 lg:grid-cols-2">
        <Tilt index={0}>
          <Link
            href="/repaso/sesion"
            className={`${card} bg-accent text-white shadow-[0_8px_0_var(--accent-shadow)]`}
            style={{ ["--press" as string]: "8px" }}
          >
            <span className="text-[12px] font-bold opacity-80">Repaso</span>
            <span className="mt-1 text-[26px] leading-tight font-bold">
              {!review
                ? "Review"
                : review.due === 0 && review.newWords === 0
                  ? "Todo al día."
                  : `${review.due} due · ${review.newWords} new`}
            </span>
            <span className="mt-1 text-[14px] opacity-85">
              {review ? `${review.fluency}% of the 1000 words` : "Your daily session"}
            </span>
            <span className="mt-3 text-[15px] font-bold">Empezar →</span>
          </Link>
        </Tilt>

        <Tilt index={1}>
          <Link href={`/diario/${day}`} className={light}>
            <span className="text-[12px] font-bold text-faint">Diario</span>
            <span className="mt-1 text-[22px] leading-tight font-bold">
              {diary
                ? diary.written >= diary.total
                  ? "Today is written."
                  : `${diary.written} of ${diary.total} sentences`
                : "Today's entry"}
            </span>
            {/* One dot per sentence slot. */}
            {diary && (
              <span className="mt-2 flex gap-1.5" aria-hidden>
                {Array.from({ length: diary.total }, (_, i) => (
                  <span
                    key={i}
                    className={`size-3 rounded-full ${i < diary.written ? "bg-accent" : "bg-pill-flat"}`}
                  />
                ))}
              </span>
            )}
            <span className="mt-3 text-[15px] font-bold">Escribir →</span>
          </Link>
        </Tilt>

        <Tilt index={2}>
          <Link
            href={`/juegos/${game.slug}`}
            className={`${card} bg-ink text-on-ink shadow-[0_6px_0_var(--ink-shadow)]`}
          >
            <span className="text-[12px] font-bold opacity-70">
              {lastGame ? "Continúa" : "Juega"}
            </span>
            <span className="mt-1 text-[22px] leading-tight font-bold">{game.title}</span>
            <span className="mt-1 text-[14px] opacity-80">{game.subtitle}</span>
            <span className="mt-3 text-[15px] font-bold">Jugar →</span>
          </Link>
        </Tilt>

        {topic && (
          <Tilt index={3}>
            <Link href={`/gramatica/${topic.slug}`} className={light}>
              <span className="text-[12px] font-bold text-faint">Gramática</span>
              <span className="mt-1 text-[22px] leading-tight font-bold">{topic.title}</span>
              <span className="mt-1 text-[14px] text-muted">{topic.blurb}</span>
              <span className="mt-3 text-[15px] font-bold">Leer →</span>
            </Link>
          </Tilt>
        )}
      </main>
    </div>
  );
}

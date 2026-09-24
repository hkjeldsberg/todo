import Link from "next/link";
import PageHeader from "@/design/PageHeader";
import { GAMES } from "@/features/games/registry";
import { disabledGames } from "@/features/games/progress";

export const metadata = { title: "Juegos · todo" };
export const dynamic = "force-dynamic";

const TONE = {
  accent: "bg-accent text-white shadow-[0_8px_0_var(--accent-shadow)]",
  light: "bg-card text-ink shadow-[0_6px_0_var(--card-shadow)]",
  ink: "bg-ink text-on-ink shadow-[0_6px_0_var(--ink-shadow)]",
} as const;

export default async function GamesPage() {
  const hidden = await disabledGames();
  const games = GAMES.filter((game) => !hidden.has(game.slug));

  return (
    <div className="mx-auto flex min-h-full max-w-[520px] flex-col bg-page lg:max-w-[720px]">
      <PageHeader title="Juegos" />
      <main className="grid flex-1 grid-cols-1 content-start gap-5 px-[18px] pt-4 pb-9 sm:grid-cols-2">
        {games.map((game, index) => (
          // Tilt lives on the wrapper so the press travel on the card isn't overridden.
          <div
            key={game.slug}
            className="sticker"
            style={{ transform: `rotate(${index % 2 ? 0.7 : -0.6}deg)` }}
          >
            <Link
              href={`/juegos/${game.slug}`}
              className={`press flex min-h-[150px] flex-col rounded-[22px] p-5 ${TONE[game.tone]}`}
              style={{ ["--press" as string]: game.tone === "accent" ? "8px" : "6px" }}
            >
              <span className="text-[12px] font-bold opacity-70">
                {game.level} · {game.subtitle}
              </span>
              <span className="mt-1 text-[22px] leading-tight font-bold">{game.title}</span>
              <span className="mt-2 text-[14px] leading-snug opacity-85">{game.blurb}</span>
              <span className="mt-auto pt-3 text-[14px] font-bold">Jugar →</span>
            </Link>
          </div>
        ))}
      </main>
    </div>
  );
}

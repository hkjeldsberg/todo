import { notFound } from "next/navigation";
import { connection } from "next/server";
import GameHost from "@/features/games/GameHost";
import { gameBySlug } from "@/features/games/registry";
import { GAME_SERVERS } from "@/features/games/server-registry";
import { loadGameProgress } from "@/features/games/progress";

/** Full-screen game: no section nav. Content and progress load per request. */
export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const manifest = gameBySlug(slug);
  const server = GAME_SERVERS[slug];
  if (!manifest || !server) notFound();

  await connection();
  const [{ content, source }, initialProgress] = await Promise.all([
    server.loadContent(),
    loadGameProgress(slug),
  ]);

  return (
    <GameHost slug={slug} content={content} source={source} initialProgress={initialProgress} />
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `${gameBySlug(slug)?.title ?? "Juego"} · todo` };
}

import "server-only";
import type { GameServerModule } from "./types";
import donde from "./donde/server";
import laberinto from "./laberinto/server";
import tense from "./tense/server";

/** slug → server module (content loader + review-card builder). */
export const GAME_SERVERS: Record<string, GameServerModule<unknown>> = {
  donde: donde as GameServerModule<unknown>,
  tense: tense as GameServerModule<unknown>,
  laberinto: laberinto as GameServerModule<unknown>,
};

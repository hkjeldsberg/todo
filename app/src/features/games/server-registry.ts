import "server-only";
import type { GameServerModule } from "./types";
import donde from "./donde/server";
import laberinto from "./laberinto/server";
import opuestos from "./opuestos/server";
import tense from "./tense/server";
import was from "./was/server";
import cuentos from "./cuentos/server";
import posiciones from "./posiciones/server";
import pasado from "./pasado/server";

/** slug → server module (content loader + review-card builder). */
export const GAME_SERVERS: Record<string, GameServerModule<unknown>> = {
  donde: donde as GameServerModule<unknown>,
  tense: tense as GameServerModule<unknown>,
  laberinto: laberinto as GameServerModule<unknown>,
  opuestos: opuestos as GameServerModule<unknown>,
  was: was as GameServerModule<unknown>,
  cuentos: cuentos as GameServerModule<unknown>,
  posiciones: posiciones as GameServerModule<unknown>,
  pasado: pasado as GameServerModule<unknown>,
};

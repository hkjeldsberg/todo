import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./auth";

/**
 * The proxy gates navigation, but Server Actions are their own POST endpoints —
 * each one re-checks the session before touching the database.
 */
export async function requireSession(): Promise<void> {
  const store = await cookies();
  const ok = await verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!ok) throw new Error("Not authorized");
}

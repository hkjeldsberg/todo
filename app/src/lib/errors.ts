import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Failure } from "@/features/diary/diary";

/** Postgres codes worth translating into something actionable. */
const PG_HINTS: Record<string, string> = {
  "42P01":
    "That table does not exist yet — run the migration in supabase/migrations.",
  "42703":
    "A column is missing — the table exists but an older migration is applied.",
  "42P10":
    "The table is missing the unique constraint the upsert needs (day, position).",
  "23505": "That row already exists.",
  "42501": "The database refused the write — check the service role key.",
  PGRST205:
    "Supabase cannot see that table. Expose the `todo` schema under Settings → API.",
};

type Supabaseish = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

/**
 * Turn whatever went wrong into something worth showing. The point is that the
 * person reading it can tell a missing migration from an overloaded model from
 * a dropped connection, without opening the server logs.
 */
export function describeError(cause: unknown): Failure {
  if (cause instanceof Anthropic.APIConnectionError) {
    return {
      message: "Could not reach Claude (connection failed or timed out).",
      hint: "Usually the network. Try again.",
      retryable: true,
    };
  }

  if (cause instanceof Anthropic.APIError) {
    const status = cause.status;
    if (status === 401) {
      return {
        message: "Claude rejected the API key (401).",
        hint: "ANTHROPIC_API_KEY is missing or wrong on the server.",
        retryable: false,
      };
    }
    if (status === 429) {
      return {
        message: "Rate limited by the Claude API (429).",
        hint: "Wait a moment, then review again.",
        retryable: true,
      };
    }
    if (status === 529 || (typeof status === "number" && status >= 500)) {
      return {
        message: `Claude is overloaded or erroring (${status}).`,
        hint: "This one usually clears in a few seconds.",
        retryable: true,
      };
    }
    return {
      message: `Claude API error ${status ?? "?"}: ${cause.message}`,
      retryable: false,
    };
  }

  if (cause && typeof cause === "object") {
    const row = cause as Supabaseish;
    const code = typeof row.code === "string" ? row.code : null;
    if (code && PG_HINTS[code]) {
      const detail = typeof row.message === "string" ? ` (${row.message})` : "";
      return {
        message: `Database error ${code}${detail}`,
        hint: PG_HINTS[code],
        retryable: false,
      };
    }
  }

  const message = cause instanceof Error ? cause.message : String(cause);
  return { message: message || "Unknown error", retryable: false };
}

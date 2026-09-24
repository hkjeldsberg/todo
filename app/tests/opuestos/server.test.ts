import { beforeEach, describe, expect, it, vi } from "vitest";
import raw from "@/content/opuestos.json";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  configured: false,
  tables: {} as Record<string, { data: unknown[] | null; error: { message: string } | null }>,
}));

vi.mock("@/lib/db", () => ({
  isConfigured: () => state.configured,
  db: () => ({
    from: (table: string) => {
      const result = state.tables[table] ?? { data: null, error: { message: `no table ${table}` } };
      const query = {
        select: () => query,
        order: () => query,
        abortSignal: () => Promise.resolve(result),
      };
      return query;
    },
  }),
}));

const { default: server } = await import("@/features/games/opuestos/server");

describe("opuestos server", () => {
  beforeEach(() => {
    state.configured = false;
    state.tables = {};
  });

  it("uses the bundled JSON without a database", async () => {
    const { content, source } = await server.loadContent();
    expect(source).toBe("bundled");
    expect(content.levels).toHaveLength(raw.levels.length);
  });

  it("falls back to bundled when the tables are missing or empty", async () => {
    state.configured = true;
    expect((await server.loadContent()).source).toBe("bundled");
    state.tables = { opuestos_words: { data: [], error: null }, opuestos_levels: { data: [], error: null } };
    expect((await server.loadContent()).source).toBe("bundled");
  });

  it("reads Supabase rows when they are there", async () => {
    state.configured = true;
    state.tables = {
      opuestos_words: { data: raw.words, error: null },
      opuestos_levels: { data: raw.levels.slice(0, 2), error: null },
    };
    const { content, source } = await server.loadContent();
    expect(source).toBe("supabase");
    expect(content.levels.map((l) => l.id)).toEqual(raw.levels.slice(0, 2).map((l) => l.id));
  });

  it("turns word ids into review cards", async () => {
    const { content } = await server.loadContent();
    expect(server.toReviewCard("ligero", content)?.options.find((o) => o.correct)?.text).toBe("pesado");
    expect(server.toReviewCard("nope", content)).toBeNull();
  });
});

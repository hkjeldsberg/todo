import { beforeEach, describe, expect, it, vi } from "vitest";
import raw from "@/content/probador.json";

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
      const query = { select: () => query, eq: () => query, abortSignal: () => Promise.resolve(result) };
      return query;
    },
  }),
}));

const { default: server } = await import("@/features/games/probador/server");

describe("probador server", () => {
  beforeEach(() => {
    state.configured = false;
    state.tables = {};
  });

  it("uses the bundled JSON and unsaved progress without a database", async () => {
    const { content, source } = await server.loadContent();
    expect(source).toBe("bundled");
    expect(content.prompts).toHaveLength(raw.prompts.length);
    expect(await server.loadProgress!()).toEqual({ stats: {}, persisted: false });
  });

  it("falls back to bundled when tables are missing, empty or malformed", async () => {
    state.configured = true;
    expect((await server.loadContent()).source).toBe("bundled");
    state.tables = { probador_outfits: { data: raw.outfits, error: null }, probador_prompts: { data: [], error: null } };
    expect((await server.loadContent()).source).toBe("bundled");
    state.tables.probador_prompts = { data: [{ id: "x" }], error: null };
    expect((await server.loadContent()).source).toBe("bundled");
  });

  it("reads Supabase rows, including prompts not in the JSON", async () => {
    state.configured = true;
    const extra = { ...raw.prompts[0], id: "q_99" };
    state.tables = {
      probador_outfits: { data: raw.outfits, error: null },
      probador_prompts: { data: [...raw.prompts, extra], error: null },
    };
    const { content, source } = await server.loadContent();
    expect(source).toBe("supabase");
    expect(content.prompts.map((p) => p.id)).toContain("q_99");
  });

  it("loads stats, and says when it can't", async () => {
    state.configured = true;
    expect(await server.loadProgress!()).toEqual({ stats: {}, persisted: false });
    state.tables = {
      probador_stats: {
        data: [{ prompt_id: "q_01", times_encountered: 1, times_correct: 1, streak: 1, current_interval_minutes: 1440, last_played_at: "2026-10-04T10:00:00Z", due_at: "2026-10-05T10:00:00Z" }],
        error: null,
      },
    };
    expect((await server.loadProgress!()) as unknown).toMatchObject({ persisted: true, stats: { q_01: { streak: 1 } } });
  });
});

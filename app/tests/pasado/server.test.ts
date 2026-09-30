import { beforeEach, describe, expect, it, vi } from "vitest";
import raw from "@/content/pasado.json";

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
        eq: () => query,
        abortSignal: () => Promise.resolve(result),
      };
      return query;
    },
  }),
}));

const { default: server } = await import("@/features/games/pasado/server");

describe("pasado server", () => {
  beforeEach(() => {
    state.configured = false;
    state.tables = {};
  });

  it("uses the bundled drills and unsaved progress without a database", async () => {
    const { content, source } = await server.loadContent();
    expect(source).toBe("bundled");
    expect(content.drills).toHaveLength(raw.drills.length);
    expect(await server.loadProgress!()).toEqual({ leitner: {}, persisted: false });
  });

  it("falls back to bundled drills when the table is missing, empty or malformed", async () => {
    state.configured = true;
    expect((await server.loadContent()).source).toBe("bundled");
    state.tables = { past_drills: { data: [], error: null } };
    expect((await server.loadContent()).source).toBe("bundled");
    state.tables = { past_drills: { data: [{ id: "x" }], error: null } };
    expect((await server.loadContent()).source).toBe("bundled");
  });

  it("reads Supabase drills, including ones not in the JSON", async () => {
    state.configured = true;
    const extra = { ...raw.drills[0], id: "ser_9", sentence_template: "Ayer {verb} lunes.", trigger_word: "Ayer" };
    state.tables = { past_drills: { data: [...raw.drills, extra], error: null } };
    const { content, source } = await server.loadContent();
    expect(source).toBe("supabase");
    expect(content.drills.map((d) => d.id)).toContain("ser_9");
  });

  it("loads the Leitner table, and says when it can't", async () => {
    state.configured = true;
    expect(await server.loadProgress!()).toEqual({ leitner: {}, persisted: false });
    state.tables = {
      past_progress: {
        data: [{ infinitive: "ser", current_box: 2, next_review_date: "2026-10-02T00:00:00Z", times_correct: 1, times_incorrect: 0 }],
        error: null,
      },
    };
    expect(await server.loadProgress!()).toEqual({
      leitner: { ser: { box: 2, next: "2026-10-02T00:00:00.000Z", right: 1, wrong: 0 } },
      persisted: true,
    });
  });
});

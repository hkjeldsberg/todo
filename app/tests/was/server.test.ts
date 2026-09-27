import { beforeEach, describe, expect, it, vi } from "vitest";
import raw from "@/content/was.json";

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

const { default: server } = await import("@/features/games/was/server");

describe("was server", () => {
  beforeEach(() => {
    state.configured = false;
    state.tables = {};
  });

  it("uses the bundled JSON without a database", async () => {
    const { content, source } = await server.loadContent();
    expect(source).toBe("bundled");
    expect(content.pages[0].panels).toHaveLength(raw.panels.length);
  });

  it("falls back to bundled when the table is missing, empty or malformed", async () => {
    state.configured = true;
    expect((await server.loadContent()).source).toBe("bundled");
    state.tables = { was_panels: { data: [], error: null } };
    expect((await server.loadContent()).source).toBe("bundled");
    state.tables = { was_panels: { data: [{ id: "x" }], error: null } };
    expect((await server.loadContent()).source).toBe("bundled");
  });

  it("reads Supabase rows when they are there, including pages not in the JSON", async () => {
    state.configured = true;
    const extra = raw.panels.map((p, i) => ({ ...p, id: `zoo_${i + 1}`, page_id: "el_zoo_02" }));
    state.tables = { was_panels: { data: [...raw.panels, ...extra], error: null } };
    const { content, source } = await server.loadContent();
    expect(source).toBe("supabase");
    expect(content.pages.map((p) => p.id)).toEqual(["el_robo_01", "el_zoo_02"]);
  });

  it("turns panel ids into review cards", async () => {
    const { content } = await server.loadContent();
    expect(server.toReviewCard("robo_2", content)?.options.find((o) => o.correct)?.text).toBe("estaba");
    expect(server.toReviewCard("nope", content)).toBeNull();
  });
});

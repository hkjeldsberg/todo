import { describe, expect, it } from "vitest";
import { bundledContent } from "@/features/games/posiciones/model/content";
import { LAYOUTS } from "@/features/games/posiciones/model/layouts";
import { basis, buildWorld, holds, ROTATIONS, trueExpressionIds, trueFacts, type Rotation } from "@/features/games/posiciones/model/relations";

const content = bundledContent();
const world = (id: string) => buildWorld(content, id);
const is = (scene: string, spot: string, expression: string, refs: string[], rot: Rotation) => holds(world(scene), spot, { expression, refs }, rot);

describe("camera basis", () => {
  it("turns right and toward-the-viewer together in 90° steps", () => {
    expect(basis(0)).toEqual({ right: [1, 0], toward: [0, 1] });
    expect(basis(1)).toEqual({ right: [0, -1], toward: [1, 0] });
    expect(basis(2)).toEqual({ right: [-1, 0], toward: [0, -1] });
    expect(basis(3)).toEqual({ right: [0, 1], toward: [-1, 0] });
    expect(basis(4)).toEqual(basis(0));
    expect(basis(-1)).toEqual(basis(3));
  });
});

describe("directional words follow the camera (all 4 rotations)", () => {
  // j_seto: the gnome is just north of the hedge.
  const table: [Rotation, string][] = [
    [0, "detras_de"],
    [1, "a_la_derecha_de"],
    [2, "delante_de"],
    [3, "a_la_izquierda_de"],
  ];
  it.each(table)("rotation %i: the gnome north of the hedge is %s el seto", (rot, expression) => {
    expect(is("jardin", "j_seto", expression, ["seto"], rot)).toBe(true);
    for (const [, other] of table.filter(([r]) => r !== rot)) expect(is("jardin", "j_seto", other, ["seto"], rot)).toBe(false);
  });

  it("left and right swap when the camera turns 180°", () => {
    expect(is("jardin", "j_seto", "a_la_izquierda_de", ["arbol"], 0)).toBe(true);
    expect(is("jardin", "j_seto", "a_la_derecha_de", ["arbol"], 0)).toBe(false);
    expect(is("jardin", "j_seto", "a_la_derecha_de", ["arbol"], 2)).toBe(true);
    expect(is("jardin", "j_seto", "a_la_izquierda_de", ["arbol"], 2)).toBe(false);
  });

  it("al fondo is the far end from the viewer", () => {
    const hits = ROTATIONS.filter((r) => is("cementerio", "c_rincon", "al_fondo_de", ["cementerio"], r));
    // The north-east corner is at the back when looking from the south (0) or the west (3).
    expect(hits).toEqual([0, 3]);
  });

  it("al otro lado de la valla needs the fence across the view", () => {
    expect(is("cementerio", "c_valla", "al_otro_lado_de", ["valla"], 0)).toBe(true);
    expect(is("cementerio", "c_valla", "al_otro_lado_de", ["valla"], 1)).toBe(false);
    expect(is("cementerio", "c_valla", "al_otro_lado_de", ["valla"], 2)).toBe(false);
    expect(is("cementerio", "c_valla", "al_otro_lado_de", ["valla"], 3)).toBe(false);
  });

  it("más allá de la reja only from the side you look through it", () => {
    expect(is("laberinto", "l_mas_alla", "mas_alla_de", ["reja"], 0)).toBe(true);
    expect(is("laberinto", "l_mas_alla", "mas_alla_de", ["reja"], 2)).toBe(false);
  });

  it("the garden gate: outside from every side, the other side only from the west", () => {
    for (const r of ROTATIONS) expect(is("jardin", "j_fuera", "fuera_de", ["jardin"], r)).toBe(true);
    expect(ROTATIONS.filter((r) => is("jardin", "j_fuera", "al_otro_lado_de", ["verja"], r))).toEqual([3]);
  });

  it("a mano derecha / izquierda (no reference) are relative to the scene centre", () => {
    expect(is("jardin", "j_banco", "a_mano_derecha", [], 0)).toBe(true);
    expect(is("jardin", "j_banco", "a_mano_izquierda", [], 2)).toBe(true);
  });
});

describe("rotation-independent relations hold from every side", () => {
  const cases: [string, string, string, string[]][] = [
    ["jardin", "j_jarron", "dentro_de", ["jarron"]],
    ["jardin", "j_banco", "debajo_de", ["banco"]],
    ["jardin", "j_estatua", "encima_de", ["estatua"]],
    ["jardin", "j_estatua", "en_lo_alto_de", ["estatua"]],
    ["jardin", "j_entre", "entre", ["seto", "jarron"]],
    ["jardin", "j_entre", "a_medio_camino_entre", ["seto", "jarron"]],
    ["jardin", "j_arbol", "colgado_de", ["arbol"]],
    ["jardin", "j_arbol", "en_la_parte_de_arriba_de", ["arbol"]],
    ["jardin", "j_seto", "cerca_de", ["seto"]],
    ["mercado", "m_pozo", "al_fondo_de", ["pozo"]],
    ["mercado", "m_enfrente", "enfrente_de", ["puesto"]],
    ["mercado", "m_farola", "por_encima_de", ["puesto"]],
    ["mercado", "m_entre", "entre", ["caja", "carro"]],
    ["cementerio", "c_apoyado", "apoyado_en", ["lapida_grande"]],
    ["cementerio", "c_apoyado", "pegado_a", ["lapida_grande"]],
    ["cementerio", "c_rincon", "en_el_rincon_de", ["cementerio"]],
    ["cementerio", "c_rincon", "al_pie_de", ["arbol_seco"]],
    ["cementerio", "c_entre", "entre", ["lapidas"]],
    ["cementerio", "c_entre", "entre_medias_de", ["lapidas"]],
    ["laberinto", "l_reja", "a_traves_de", ["reja"]],
    ["laberinto", "l_colina", "en_la_cima_de", ["colina"]],
    ["laberinto", "l_torre_pie", "al_pie_de", ["torre"]],
    ["laberinto", "l_orilla", "a_orillas_de", ["estanque"]],
    ["laberinto", "l_camino", "al_final_de", ["camino"]],
  ];
  it.each(cases)("%s/%s: %s %j", (scene, spot, expression, refs) => {
    for (const r of ROTATIONS) expect(is(scene, spot, expression, refs, r)).toBe(true);
  });

  it("regional forms are judged as their standard", () => {
    for (const r of ROTATIONS) {
      expect(is("jardin", "j_jarron", "adentro_de", ["jarron"], r)).toBe(true);
      expect(is("jardin", "j_banco", "abajo_de", ["banco"], r)).toBe(true);
      expect(is("jardin", "j_estatua", "arriba_de", ["estatua"], r)).toBe(true);
    }
    expect(is("jardin", "j_seto", "atras_de", ["seto"], 0)).toBe(true);
  });
});

describe("false things stay false", () => {
  it.each([
    ["jardin", "j_jarron", "encima_de", ["jarron"]],
    ["jardin", "j_banco", "encima_de", ["banco"]],
    ["jardin", "j_estatua", "debajo_de", ["estatua"]],
    ["jardin", "j_seto", "dentro_de", ["jarron"]],
    ["jardin", "j_entre", "entre", ["estatua", "banco"]],
    ["laberinto", "l_colina", "al_pie_de", ["colina"]],
    ["laberinto", "l_torre_alto", "al_pie_de", ["torre"]],
    ["cementerio", "c_ataud", "fuera_de", ["ataud"]],
    ["jardin", "j_seto", "en_la_cima_de", ["seto"]],
  ] as [string, string, string, string[]][])("%s/%s: not %s %j", (scene, spot, expression, refs) => {
    for (const r of ROTATIONS) expect(is(scene, spot, expression, refs, r)).toBe(false);
  });
});

describe("authored facts", () => {
  it("override geometry (the gnome circling the fountain)", () => {
    for (const r of ROTATIONS) {
      expect(is("mercado", "m_centro", "alrededor_de", ["fuente"], r)).toBe(true);
      expect(is("mercado", "m_centro", "en_torno_a", ["fuente"], r)).toBe(true);
      // factsOnly: geometry alone (delante de la fuente) doesn't count while he runs.
      expect(is("mercado", "m_centro", "delante_de", ["fuente"], r)).toBe(false);
    }
  });

  it("carry things geometry can't see (the crypt's basement, the street corner)", () => {
    expect(is("cementerio", "c_mausoleo", "en_el_sotano", [], 0)).toBe(true);
    expect(is("mercado", "m_esquina", "en_la_esquina_con", ["calle_mayor", "calle_pozo"], 2)).toBe(true);
    expect(is("mercado", "m_esquina", "en_la_esquina_con", ["calle_pozo", "calle_mayor"], 1)).toBe(true);
  });

  it("a denial beats geometry", () => {
    const c = structuredClone(content);
    c.scenes.find((s) => s.id === "jardin")!.facts.push({ target: "j_seto", expression: "cerca_de", refs: ["seto"], truth: false });
    expect(holds(buildWorld(c, "jardin"), "j_seto", { expression: "cerca_de", refs: ["seto"] }, 0)).toBe(false);
  });

  it("respect rotation limits", () => {
    const c = structuredClone(content);
    c.scenes.find((s) => s.id === "jardin")!.facts.push({ target: "j_seto", expression: "todo_recto", refs: [], rotations: [2] });
    const w = buildWorld(c, "jardin");
    expect(holds(w, "j_seto", { expression: "todo_recto", refs: [] }, 2)).toBe(true);
  });
});

describe("hiding spots teach alternatives", () => {
  /** True, but they don't pin him down: not counted. */
  const LOOSE = new Set(["lejos_de", "a_distancia_de", "a_mano_derecha", "a_mano_izquierda", "todo_recto", "de_cara_a", "mas_alla_de", "al_final_de", "en_diagonal_a"]);
  const spots = content.scenes.flatMap((s) => s.targets.map((t) => [s.id, t] as [string, string]));

  it("every dungeon has 5–7 hiding spots, all with geometry", () => {
    for (const s of content.scenes) {
      expect(s.targets.length).toBeGreaterThanOrEqual(5);
      expect(s.targets.length).toBeLessThanOrEqual(7);
      for (const t of s.targets) expect(LAYOUTS[s.visual_layer].spots[t]).toBeDefined();
    }
  });

  it.each(spots)("%s/%s: ≥ 3 true expressions from every side, ≥ 5 from the default view", (scene, spot) => {
    const w = world(scene);
    for (const r of ROTATIONS) {
      const ids = trueExpressionIds(w, spot, r).filter((id) => !LOOSE.has(id));
      expect(ids.length, `${spot} r${r}: ${ids.join(", ")}`).toBeGreaterThanOrEqual(3);
      if (r === 0) expect(ids.length, `${spot}: ${ids.join(", ")}`).toBeGreaterThanOrEqual(5);
    }
  });

  it("each dungeon's showcase words are true somewhere in it", () => {
    for (const s of content.scenes) {
      const w = world(s.id);
      const seen = new Set(s.targets.flatMap((t) => ROTATIONS.flatMap((r) => trueExpressionIds(w, t, r))));
      for (const id of LAYOUTS[s.visual_layer].showcase) expect(seen.has(id), `${s.id}: ${id}`).toBe(true);
    }
  });

  it("the four dungeons use a good share of the inventory, including the PRD's B1 list", () => {
    const seen = new Set<string>();
    for (const s of content.scenes) {
      const w = world(s.id);
      for (const t of s.targets) for (const r of ROTATIONS) for (const f of trueFacts(w, t, r)) seen.add(f.expression);
    }
    expect(seen.size).toBeGreaterThanOrEqual(60);
    for (const id of ["a_traves_de", "al_pie_de", "en_lo_alto_de", "mas_alla_de", "al_otro_lado_de", "apoyado_en", "en_el_rincon_de", "en_la_cima_de", "a_orillas_de"]) {
      expect(seen.has(id), id).toBe(true);
    }
  });
});

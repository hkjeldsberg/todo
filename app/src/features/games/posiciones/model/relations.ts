import { Inventory } from "./inventory";
import { layoutFor, type Body, type Dir, type Layout, type SpotGeo } from "./layouts";
import type { Content, Fact, Scene, SceneObject, Subject } from "./types";

/**
 * Grid truth: is "el gnomo está <expression> <refs>" true for a hiding spot,
 * seen from camera rotation `rot`? Directional words (derecha/izquierda,
 * delante/detrás, al fondo, más allá, al otro lado) follow the camera: after a
 * 90° turn they describe the new view. Authored facts override geometry.
 */

export type Rotation = 0 | 1 | 2 | 3;
export const ROTATIONS: Rotation[] = [0, 1, 2, 3];

export interface World {
  scene: Scene;
  layout: Layout;
  inv: Inventory;
  objects: SceneObject[];
  bodies: Map<string, Body>;
  room: string;
  subject: Subject;
}

export function buildWorld(content: Content, sceneId: string): World {
  const scene = content.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error(`unknown scene ${sceneId}`);
  const layout = layoutFor(scene.visual_layer);
  const bodies = new Map<string, Body>();
  for (const o of scene.objects) {
    const b = layout.objects[o.id];
    if (!b) throw new Error(`${scene.id}: object ${o.id} has no geometry`);
    bodies.set(o.id, b);
  }
  return { scene, layout, inv: new Inventory(content.expressions), objects: scene.objects, bodies, room: layout.room, subject: content.subject };
}

export function spotOf(world: World, spotId: string): SpotGeo {
  const s = world.layout.spots[spotId];
  if (!s) throw new Error(`${world.scene.id}: spot ${spotId} has no geometry`);
  return s;
}

// ─────────────────────────────────────────────────────────────── camera frame

/** Camera basis on the ground: `right` points screen-right, `toward` points at the viewer. */
export function basis(rot: number): { right: [number, number]; toward: [number, number] } {
  const k = ((rot % 4) + 4) % 4;
  const toward: [number, number][] = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];
  const right: [number, number][] = [
    [1, 0],
    [0, -1],
    [-1, 0],
    [0, 1],
  ];
  return { right: right[k], toward: toward[k] };
}

interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

const rectOf = (b: Body): Rect => ({
  x0: b.at[0] - b.size[0] / 2,
  x1: b.at[0] + b.size[0] / 2,
  z0: b.at[1] - b.size[1] / 2,
  z1: b.at[1] + b.size[1] / 2,
});

/** Rect in view coords: u to the right, v towards the camera. */
function viewRect(r: Rect, rot: number): { u0: number; u1: number; v0: number; v1: number } {
  const { right, toward } = basis(rot);
  const xs = [r.x0, r.x1];
  const zs = [r.z0, r.z1];
  const us: number[] = [];
  const vs: number[] = [];
  for (const x of xs)
    for (const z of zs) {
      us.push(x * right[0] + z * right[1]);
      vs.push(x * toward[0] + z * toward[1]);
    }
  return { u0: Math.min(...us), u1: Math.max(...us), v0: Math.min(...vs), v1: Math.max(...vs) };
}

function viewPoint(p: [number, number], rot: number): { u: number; v: number } {
  const { right, toward } = basis(rot);
  return { u: p[0] * right[0] + p[1] * right[1], v: p[0] * toward[0] + p[1] * toward[1] };
}

const DIRS: Record<Dir, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

// ─────────────────────────────────────────────────────────────── geometry helpers

const EPS = 0.02;
const inside = (p: [number, number], r: Rect) => p[0] >= r.x0 - EPS && p[0] <= r.x1 + EPS && p[1] >= r.z0 - EPS && p[1] <= r.z1 + EPS;

/** Edge distance from a point to a rect (0 inside). */
function gapTo(p: [number, number], r: Rect): number {
  const dx = Math.max(r.x0 - p[0], 0, p[0] - r.x1);
  const dz = Math.max(r.z0 - p[1], 0, p[1] - r.z1);
  return Math.hypot(dx, dz);
}

/** Distance from an inside point to the rect's boundary. */
const edgeDist = (p: [number, number], r: Rect) => Math.min(p[0] - r.x0, r.x1 - p[0], p[1] - r.z0, r.z1 - p[1]);

/** How far a rect extends from its centre along a unit direction. */
const extentAlong = (b: Body, d: [number, number]) => (Math.abs(d[0]) * b.size[0] + Math.abs(d[1]) * b.size[1]) / 2;

const has = (b: Body, t: NonNullable<Body["traits"]>[number]) => b.traits?.includes(t) ?? false;

/** Union footprint of a plural group. */
function groupRect(world: World, b: Body): Rect {
  const rs = (b.members ?? []).map((m) => rectOf(world.bodies.get(m)!));
  return { x0: Math.min(...rs.map((r) => r.x0)), x1: Math.max(...rs.map((r) => r.x1)), z0: Math.min(...rs.map((r) => r.z0)), z1: Math.max(...rs.map((r) => r.z1)) };
}

function rectFor(world: World, id: string): Rect {
  const b = world.bodies.get(id)!;
  return b.members ? groupRect(world, b) : rectOf(b);
}

/** Is p between A and B (outside both, near the line joining them, between their facing edges)? Returns the position 0..1 on the gap. */
function betweenness(p: [number, number], a: Body, b: Body): number | null {
  const ax = a.at[0];
  const az = a.at[1];
  const dx = b.at[0] - ax;
  const dz = b.at[1] - az;
  const len = Math.hypot(dx, dz);
  if (len < 0.5) return null;
  const d: [number, number] = [dx / len, dz / len];
  const along = (p[0] - ax) * d[0] + (p[1] - az) * d[1];
  const perp = Math.abs(-(p[0] - ax) * d[1] + (p[1] - az) * d[0]);
  const ea = extentAlong(a, d);
  const eb = extentAlong(b, d);
  const gapStart = ea;
  const gapEnd = len - eb;
  if (gapEnd - gapStart < 0.4) return null;
  const t = (along - gapStart) / (gapEnd - gapStart);
  if (t < 0.12 || t > 0.88) return null;
  const halfWidth = Math.max(1.0, Math.min(extentAlong(a, [-d[1], d[0]]), extentAlong(b, [-d[1], d[0]])));
  if (perp > halfWidth) return null;
  return t;
}

// ─────────────────────────────────────────────────────────────── predicates

export interface Query {
  /** Expression id (regional ids are mapped to their standard). */
  expression: string;
  refs: string[];
  /** For "a dos metros de": the distance said, in metres (a range for "unos pasos"). */
  distance?: { min: number; max: number };
}

interface Ctx {
  world: World;
  spot: SpotGeo;
  rot: Rotation;
  p: [number, number];
  gy: number;
}

/** Room-relative checks for bare words ("está a la derecha", "al fondo"). */
function roomView(c: Ctx) {
  const r = rectOf(c.world.bodies.get(c.world.room)!);
  const vr = viewRect(r, c.rot);
  const g = viewPoint(c.p, c.rot);
  return { r, vr, g, cu: (vr.u0 + vr.u1) / 2, cv: (vr.v0 + vr.v1) / 2 };
}

function nearTwoWalls(p: [number, number], r: Rect, within = 1.6): boolean {
  const nearX = p[0] - r.x0 <= within || r.x1 - p[0] <= within;
  const nearZ = p[1] - r.z0 <= within || r.z1 - p[1] <= within;
  return nearX && nearZ;
}

/** One-reference geometric predicate. */
function holds1(c: Ctx, meaning: string, id: string, q: Query): boolean {
  const { world, spot, rot, p, gy } = c;
  const b = world.bodies.get(id)!;
  const r = rectFor(world, id);
  const isRoom = has(b, "room");
  const isGroup = !!b.members;
  const in2 = !isGroup && inside(p, r);
  const gap = gapTo(p, r);
  const top = b.h;
  const clear = b.clear ?? 0;
  const onTop = in2 && Math.abs(gy - top) <= 0.12 && !has(b, "area");
  // Only hollow things hold him: containers, and things with room underneath a body (tree crown, stall shelves).
  const hosted = in2 && (has(b, "container") || clear > 0) && gy >= clear - 0.01 && gy < top - 0.05 && !has(b, "area");
  const under = in2 && clear > 0.3 && gy < clear - 0.2;
  const ground = gy <= 0.15;
  const areaIn = has(b, "area") && in2 && gy <= 0.3;
  const vr = viewRect(r, rot);
  const g = viewPoint(p, rot);
  const overlapU = g.u >= vr.u0 - 0.35 && g.u <= vr.u1 + 0.35;
  const overlapV = g.v >= vr.v0 - 0.35 && g.v <= vr.v1 + 0.35;
  const tall = has(b, "tall") || top >= 1.8;
  const thing = !isRoom; // most relations need a thing, not the whole garden
  // Streets and paths have no front or back: "detrás de la calle" says nothing.
  const oriented = thing && !has(b, "linear");
  const above = in2 && gy >= top + 0.3;

  switch (meaning) {
    case "en":
      return !isRoom && (onTop || hosted || areaIn || (has(b, "opening") && in2));
    case "sobre":
      // sobre = encima de, and also por encima de (not touching).
      return !isRoom && (onTop || areaIn || above);
    case "encima_de":
      return onTop;
    case "por_encima_de":
      return thing && above;
    case "debajo_de":
    case "bajo":
    case "por_debajo_de":
      return under;
    case "dentro_de":
    case "en_el_interior_de":
      return has(b, "container") && hosted;
    case "fuera_de":
    case "en_el_exterior_de":
      if (isRoom) return !in2;
      return (has(b, "container") || has(b, "walled")) && !in2 && gap <= 0.6;
    case "delante_de":
    case "por_delante_de":
      return oriented && !in2 && overlapU && g.v > vr.v1 && g.v - vr.v1 <= 2.0;
    case "detras_de":
    case "tras":
    case "por_detras_de":
      return oriented && !in2 && overlapU && g.v < vr.v0 && vr.v0 - g.v <= 2.0;
    case "a_la_derecha_de":
      return oriented && !in2 && overlapV && g.u > vr.u1 && g.u - vr.u1 <= 2.5;
    case "a_la_izquierda_de":
      return oriented && !in2 && overlapV && g.u < vr.u0 && vr.u0 - g.u <= 2.5;
    case "al_lado_de":
    case "junto_a":
      return thing && !in2 && gap <= 1.0;
    case "pegado_a":
      return thing && !in2 && !has(b, "area") && gap <= 0.35;
    case "apoyado_en":
      return spot.lean === id;
    case "colgado_de":
      return (spot.pose === "hang" || spot.pose === "upside") && spot.host === id;
    case "cerca_de":
      return thing && !in2 && gap <= 2.0;
    case "lejos_de":
      return thing && gap >= 4.5;
    case "a_distancia_de": {
      if (!thing || in2 || !q.distance) return false;
      return gap >= q.distance.min && gap <= q.distance.max;
    }
    case "en_medio_de":
    case "en_el_centro_de": {
      if (isGroup) return meaning === "en_medio_de" && groupBetween(c, b) !== null;
      if (!(isRoom || has(b, "area") || has(b, "water"))) return false;
      if (!in2) return false;
      if (has(b, "linear")) {
        const t = alongLinear(p, b);
        return meaning === "en_medio_de" && t >= 0.3 && t <= 0.7;
      }
      const cx = (r.x0 + r.x1) / 2;
      const cz = (r.z0 + r.z1) / 2;
      const lim = (w: number) => Math.max(1.2, w * 0.15);
      return Math.abs(p[0] - cx) <= lim(r.x1 - r.x0) && Math.abs(p[1] - cz) <= lim(r.z1 - r.z0);
    }
    case "entre":
    case "entre_medias_de":
      return isGroup && groupBetween(c, b) !== null;
    case "al_fondo_de": {
      // Of a container: at the bottom of it. Of a room, area or path: the far end from the viewer.
      if (has(b, "container") && hosted && gy <= 0.2) return true;
      if (!(isRoom || has(b, "area")) || !in2) return false;
      return (g.v - vr.v0) / Math.max(0.01, vr.v1 - vr.v0) <= 0.3;
    }
    case "al_final_de":
    case "al_principio_de": {
      if (has(b, "linear") && b.start) {
        if (!(in2 || gap <= 1.0)) return false;
        const t = alongLinear(p, b);
        return meaning === "al_final_de" ? t >= 0.75 : t <= 0.25;
      }
      if (meaning === "al_final_de" && (isRoom || has(b, "area")) && in2) return (g.v - vr.v0) / Math.max(0.01, vr.v1 - vr.v0) <= 0.3;
      return false;
    }
    case "en_la_esquina_de": {
      if (isRoom || has(b, "walled")) return in2 && nearTwoWalls(p, r);
      // Outside corner of something big enough to have corners (stall, crypt, tower).
      if (has(b, "area") || has(b, "water") || isGroup || Math.min(b.size[0], b.size[1]) < 1.5) return false;
      const du = g.u < vr.u0 ? vr.u0 - g.u : g.u > vr.u1 ? g.u - vr.u1 : 0;
      const dv = g.v < vr.v0 ? vr.v0 - g.v : g.v > vr.v1 ? g.v - vr.v1 : 0;
      return du > 0.05 && dv > 0.05 && gap <= 1.0;
    }
    case "en_el_rincon_de":
      return (isRoom || has(b, "walled")) && in2 && nearTwoWalls(p, r);
    case "en_el_borde_de":
      if (onTop && edgeDist(p, r) <= 0.4) return true;
      if (has(b, "water") && !in2 && gap <= 0.5 && ground) return true;
      if (!has(b, "area") || isRoom || !in2) return false;
      // A path's edge is along its sides, not across its ends.
      if (has(b, "linear")) return (b.size[0] < b.size[1] ? Math.min(p[0] - r.x0, r.x1 - p[0]) : Math.min(p[1] - r.z0, r.z1 - p[1])) <= 0.25;
      return edgeDist(p, r) <= 0.5;
    case "en_la_orilla_de":
    case "a_orillas_de":
      return has(b, "water") && !in2 && gap <= 1.0 && ground;
    case "al_pie_de":
      return (tall || has(b, "hill")) && !in2 && gap <= 0.9 && ground;
    case "en_lo_alto_de":
      return (onTop || hosted) && top >= 1.2 && gy >= 0.6 * top;
    case "en_la_cima_de":
      return has(b, "hill") && (onTop || (in2 && gy >= 0.8 * top));
    case "en_la_parte_de_arriba_de":
      return hosted && top >= 1.2 && gy >= top / 2;
    case "en_la_parte_de_abajo_de":
      return hosted && top >= 1.2 && gy < top / 2;
    case "a_traves_de":
      return has(b, "opening") && in2;
    case "mas_alla_de":
      return oriented && !in2 && vr.v0 - g.v >= 1.5 && vr.v0 - g.v <= 7 && g.u >= vr.u0 - 1.5 && g.u <= vr.u1 + 1.5;
    case "al_otro_lado_de": {
      if (!thing || in2 || has(b, "area")) return false;
      const wide = vr.u1 - vr.u0;
      const deep = vr.v1 - vr.v0;
      if (has(b, "divider") || has(b, "opening")) {
        // A line across the view: the far side. A line pointing at the viewer has no "other side".
        if (wide < 2 * deep) return false;
        return g.v < vr.v0 && vr.v0 - g.v <= 5 && g.u >= vr.u0 - 0.5 && g.u <= vr.u1 + 0.5;
      }
      // A bulky thing (fuente, estanque, colina): across it, from the viewer.
      if (Math.min(b.size[0], b.size[1]) < 1.5 || isGroup) return false;
      return g.u >= vr.u0 && g.u <= vr.u1 && g.v < vr.v0 && vr.v0 - g.v <= 2.5;
    }
    case "enfrente_de":
    case "frente_a": {
      if (!thing || in2 || has(b, "area")) return false;
      if (b.front) {
        const n = DIRS[b.front];
        const rel: [number, number] = [p[0] - b.at[0], p[1] - b.at[1]];
        const s = rel[0] * n[0] + rel[1] * n[1] - extentAlong(b, n);
        const side: [number, number] = [-n[1], n[0]];
        const lateral = Math.abs(rel[0] * side[0] + rel[1] * side[1]);
        return s >= 1.0 && s <= 4 && lateral <= extentAlong(b, side) + 0.5;
      }
      // No front of its own: across from it, seen from the viewer.
      return oriented && overlapU && g.v - vr.v1 >= 1.0 && g.v - vr.v1 <= 3;
    }
    case "de_cara_a": {
      if (!oriented || in2 || !spot.face || gap > 3) return false;
      const f = DIRS[spot.face];
      const cx = (r.x0 + r.x1) / 2 - p[0];
      const cz = (r.z0 + r.z1) / 2 - p[1];
      const len = Math.hypot(cx, cz) || 1;
      return (cx * f[0] + cz * f[1]) / len >= 0.75;
    }
    case "en_diagonal_a": {
      if (!thing || in2 || has(b, "area")) return false;
      const du = g.u < vr.u0 ? vr.u0 - g.u : g.u > vr.u1 ? g.u - vr.u1 : 0;
      const dv = g.v < vr.v0 ? vr.v0 - g.v : g.v > vr.v1 ? g.v - vr.v1 : 0;
      return du >= 0.4 && dv >= 0.4 && gap <= 3;
    }
    default:
      // alrededor_de, en_torno_a, a_lo_largo_de, en_la_punta_de, a_manzanas_de: authored facts only.
      return false;
  }
}

/** Position 0 (start) … 1 (end) along a linear thing. */
function alongLinear(p: [number, number], b: Body): number {
  const r = rectOf(b);
  switch (b.start) {
    case "s":
      return (r.z1 - p[1]) / (r.z1 - r.z0);
    case "n":
      return (p[1] - r.z0) / (r.z1 - r.z0);
    case "w":
      return (p[0] - r.x0) / (r.x1 - r.x0);
    case "e":
      return (r.x1 - p[0]) / (r.x1 - r.x0);
    default:
      return 0.5;
  }
}

/** Between any two members of a plural group. */
function groupBetween(c: Ctx, group: Body): number | null {
  const ms = (group.members ?? []).map((m) => c.world.bodies.get(m)!);
  for (let i = 0; i < ms.length; i++)
    for (let j = i + 1; j < ms.length; j++) {
      const t = betweenness(c.p, ms[i], ms[j]);
      if (t !== null) return t;
    }
  return null;
}

function holds2(c: Ctx, meaning: string, a: string, b: string): boolean {
  if (a === b) return false;
  const A = c.world.bodies.get(a)!;
  const B = c.world.bodies.get(b)!;
  // Between two things: not the room, a street or a long fence.
  const plain = (x: Body) => !has(x, "room") && !has(x, "linear") && !has(x, "divider") && !x.members;
  if (!plain(A) || !plain(B)) return false;
  if (c.gy > 0.5) return false;
  if (inside(c.p, rectOf(A)) || inside(c.p, rectOf(B))) return false;
  const t = betweenness(c.p, A, B);
  if (t === null) return false;
  if (meaning === "entre") return true;
  if (meaning === "a_medio_camino_entre") return Math.hypot(B.at[0] - A.at[0], B.at[1] - A.at[1]) >= 3 && Math.abs(t - 0.5) <= 0.2;
  return false; // en_la_esquina_con: authored
}

/** Reference-less expressions (and bare forms of room-relative ones). */
function holds0(c: Ctx, meaning: string): boolean {
  const { spot, gy } = c;
  switch (meaning) {
    case "arriba":
      return gy >= 1.2;
    case "boca_abajo":
      return spot.pose === "lie_down" || spot.pose === "upside";
    case "boca_arriba":
      return spot.pose === "lie_up";
    case "al_reves":
      return spot.pose === "upside";
    case "a_mano_derecha":
    case "a_la_derecha_de": {
      const v = roomView(c);
      return v.g.u - v.cu >= 1.5;
    }
    case "a_mano_izquierda":
    case "a_la_izquierda_de": {
      const v = roomView(c);
      return v.g.u - v.cu <= -1.5;
    }
    case "todo_recto": {
      const v = roomView(c);
      return Math.abs(v.g.u - v.cu) <= 1.2 && v.g.v - v.cv <= -1.5;
    }
    default:
      return false;
  }
}

/** Bare forms that mean "… of the room" ("está al fondo", "en el rincón"). */
export const ROOM_BARE = new Set([
  "al_fondo_de",
  "al_final_de",
  "en_medio_de",
  "en_el_centro_de",
  "en_la_esquina_de",
  "en_el_rincon_de",
  "fuera_de",
  "en_el_exterior_de",
]);

/** Bare forms that stand on their own relative to the viewer. */
export const VIEW_BARE = new Set(["a_la_derecha_de", "a_la_izquierda_de"]);

/** Here / there: true but never an answer on their own. */
export const DEICTIC = new Set(["aqui", "ahi", "alli"]);

/** "En el jardín": true of every spot inside, so it doesn't locate him. */
export const ROOM_VAGUE = new Set(["en", "dentro_de", "en_el_interior_de", "sobre"]);

function factMatches(f: Fact, meaningOf: (id: string) => string, meaning: string, refs: string[], rot: Rotation): boolean {
  if (meaningOf(f.expression) !== meaning) return false;
  if (f.rotations && !f.rotations.includes(rot)) return false;
  if (f.refs.length !== refs.length) return false;
  const a = [...f.refs].sort();
  const b = [...refs].sort();
  return a.every((x, i) => x === b[i]);
}

/**
 * The truth of one located phrase. Regional forms are judged as their standard;
 * facts first, then geometry (unless the spot only has facts).
 */
export function holds(world: World, spotId: string, q: Query, rot: Rotation): boolean {
  const spot = spotOf(world, spotId);
  const meaning = world.inv.meaning(q.expression);
  const facts = world.scene.facts.filter((f) => f.target === spotId);
  const fact = facts.find((f) => factMatches(f, (id) => world.inv.meaning(id), meaning, q.refs, rot));
  if (fact) return fact.truth !== false;
  if (spot.factsOnly) return false;
  for (const r of q.refs) if (!world.bodies.has(r)) return false;
  const c: Ctx = { world, spot, rot, p: spot.at, gy: spot.y };
  if (q.refs.length === 0) {
    if (ROOM_BARE.has(meaning)) return holds1(c, meaning, world.room, q);
    return holds0(c, meaning);
  }
  if (q.refs.length === 1) return holds1(c, meaning, q.refs[0], q);
  if (q.refs.length === 2) return holds2(c, meaning, q.refs[0], q.refs[1]);
  return false;
}

/** Does a bare "está encima" hold for anything at all? (Then it's vague, not false.) */
export function holdsForSomething(world: World, spotId: string, expression: string, rot: Rotation): boolean {
  return world.objects.some((o) => o.id !== world.room && holds(world, spotId, { expression, refs: [o.id] }, rot));
}

// ─────────────────────────────────────────────────────────────── enumeration

export interface Truth {
  expression: string;
  refs: string[];
  /** Metres, for "a dos metros de". */
  metres?: number;
}

/** Distance (in whole metres) from the spot to an object, when it's close to a round number. */
export function roundMetres(world: World, spotId: string, id: string): number | null {
  const spot = spotOf(world, spotId);
  const r = rectFor(world, id);
  if (inside(spot.at, r)) return null;
  const gap = gapTo(spot.at, r);
  const n = Math.round(gap);
  return n >= 1 && n <= 6 && Math.abs(gap - n) <= 0.35 ? n : null;
}

/**
 * Every true (expression, refs) pair for a spot at a rotation — excluding the
 * regional duplicates of a standard form, vague answers, and ones that would
 * need a number. Ordered by inventory sort.
 */
export function trueFacts(world: World, spotId: string, rot: Rotation, opts: { regional?: boolean } = {}): Truth[] {
  const out: Truth[] = [];
  const things = world.objects.filter((o) => o.id !== world.room);
  const spot = spotOf(world, spotId);
  for (const e of world.inv.list) {
    if (!opts.regional && e.standard) continue;
    if (DEICTIC.has(e.id)) continue;
    if (e.id === "a_distancia_de") {
      for (const o of things) {
        const n = spot.factsOnly ? null : roundMetres(world, spotId, o.id);
        if (n !== null) out.push({ expression: e.id, refs: [o.id], metres: n });
      }
      continue;
    }
    if (e.ref_count === 0) {
      if (holds(world, spotId, { expression: e.id, refs: [] }, rot)) out.push({ expression: e.id, refs: [] });
      continue;
    }
    if (e.ref_count === 1) {
      for (const o of world.objects) {
        if (o.id === world.room && ROOM_VAGUE.has(e.id)) continue;
        if (holds(world, spotId, { expression: e.id, refs: [o.id] }, rot)) out.push({ expression: e.id, refs: [o.id] });
      }
      continue;
    }
    for (let i = 0; i < things.length; i++)
      for (let j = i + 1; j < things.length; j++) {
        const refs = [things[i].id, things[j].id];
        if (holds(world, spotId, { expression: e.id, refs }, rot)) out.push({ expression: e.id, refs });
      }
  }
  return out;
}

/** Distinct expression ids among the truths. */
export function trueExpressionIds(world: World, spotId: string, rot: Rotation): string[] {
  return [...new Set(trueFacts(world, spotId, rot).map((t) => t.expression))];
}

/** Throws unless every scene, object and hiding spot has geometry (DB rows ↔ layouts contract). */
export function checkGeometry(content: Content): void {
  for (const s of content.scenes) {
    const w = buildWorld(content, s.id);
    for (const t of s.targets) spotOf(w, t);
    if (!w.bodies.has(w.room)) throw new Error(`${s.id}: room object ${w.room} missing`);
  }
}

import type { RapierContext } from "@react-three/rapier";
import type { EngineTarget, Layout, LayoutObject, Level, ObjectKind, Rect, Word } from "./types";

/**
 * The physics room: builds a level's bodies inside a Rapier world and turns
 * words into physics. Pure TypeScript, no React, so the very same code runs in
 * the game (inside @react-three/rapier's <Physics>, via its before/after-step
 * hooks) and headless in the tests (scripts/tests step a bare World).
 *
 * The room is a slab: everything moves in the x/y plane (z locked) and spins
 * only around z, so every puzzle stays readable from the front.
 */

export type Rapier = RapierContext["rapier"];
export type PhysicsWorld = RapierContext["world"];
type Body = ReturnType<PhysicsWorld["createRigidBody"]>;
type Collider = ReturnType<PhysicsWorld["createCollider"]>;
type ColliderDesc = InstanceType<Rapier["ColliderDesc"]>;

export const STEP = 1 / 60;
/** Room depth for static geometry; dynamic objects are thinner. */
const DEPTH = 2;
const WATER_DENSITY = 2;
const GRAVITY = 9.81;
/** Momentum × hardness above strength × this breaks glass on impact. */
const IMPACT_K = 3;
const FAN_DAMPING = 3;
/** rápido: extra push along the direction of travel, up to a top speed. */
const MOTOR_ACCEL = 6;
const MOTOR_TOP = 11;
const WATER_DRAG = 2;
const LIFT_SPEED = 2;
/** Goal: the object must stay in the zone this long (steps). */
const DWELL = 30;
/** Stuck: slower than STUCK_SPEED for this long after Soltar. */
const STUCK_STEPS = 150;
const STUCK_SPEED = 0.06;
const BASE_FRICTION = 0.7;
const SLIPPERY = 0.02;

export const DYNAMIC_KINDS: ReadonlySet<ObjectKind> = new Set(["ball", "box", "bucket"]);

/** Which engine targets change something on each kind. */
const RESPONDS: Record<ObjectKind, readonly EngineTarget[]> = {
  ground: [],
  ramp: ["friction"],
  plank: ["scale_x", "friction", "strength"],
  wall: ["scale_y", "friction"],
  glass: ["strength"],
  ice: ["temperature"],
  water: ["temperature"],
  door: ["open"],
  plate: [],
  fan: ["power", "speed"],
  lift: ["lift", "speed"],
  pipe: ["scale"],
  ball: ["scale", "mass", "friction", "restitution", "hardness", "temperature", "speed"],
  box: ["scale", "scale_x", "scale_y", "mass", "fill", "friction", "restitution", "hardness", "temperature", "speed"],
  bucket: ["scale", "mass", "fill", "friction", "restitution", "hardness", "temperature", "speed"],
};

const DEFAULT_ANCHOR: Partial<Record<ObjectKind, LayoutObject["anchor"]>> = {
  ball: "bottom",
  box: "bottom",
  bucket: "bottom",
  wall: "bottom",
  plank: "left",
  ice: "bottom",
  door: "bottom",
};

/** Objects a player can aim the ray at. */
export function isTarget(o: LayoutObject): boolean {
  if (o.target !== undefined) return o.target;
  return RESPONDS[o.kind].length > 0;
}

export type RoomEvent =
  | { type: "break"; object: string; by: string }
  | { type: "melt" | "freeze" | "thaw"; object: string; by: string | null }
  | { type: "press" | "release-plate"; object: string }
  | { type: "won" | "lost" | "stuck" | "moving"; object: string };

export type ApplyResult = { ok: true } | { ok: false; reason: "no-effect" | "same" | "gone" };

export interface SimObject {
  spec: LayoutObject;
  body: Body;
  colliders: Collider[];
  /** The word currently driving each engine target. */
  slots: Partial<Record<EngineTarget, Word>>;
  /** Current size (after size words). Balls: diameter. Pipes: [length, opening]. */
  w: number;
  h: number;
  /** Fixed point for resizing statics (world coords). */
  anchorAt: [number, number];
  held: boolean;
  broken: boolean;
  /** Ice melted by a hot object (stays melted even if the word is undone). */
  meltedByTouch: boolean;
  melted: boolean;
  frozen: boolean;
  open: boolean;
  on: boolean;
  pressed: boolean;
  liftY: number;
  /** Colliders are rebuilt only when this changes. */
  key: string;
  /** Speed word waiting for Soltar. */
  pendingKick: number | null;
}

interface HistoryEntry {
  object: string;
  target: EngineTarget;
  prev: Word | undefined;
  word: Word;
}

const mul = (w: Word | undefined) => (w ? w.value_modifier : 1);
const inRect = (x: number, y: number, [x0, y0, x1, y1]: Rect) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

/** Camera frame: the layout's view, or the bounds of every object plus a margin. */
export function viewOf(layout: Layout): Rect {
  if (layout.view) return layout.view;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const add = (x: number, y: number) => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  };
  for (const o of layout.objects) {
    if (o.zone) {
      add(o.zone[0], o.zone[1]);
      add(o.zone[2], o.zone[3]);
    }
    const [w, h] = o.size ?? [0, 0];
    const top = o.kind === "pipe" ? (o.opening ?? 0) + h : h / 2;
    add(o.pos[0] - w / 2, o.pos[1] - (o.kind === "pipe" ? h : h / 2));
    add(o.pos[0] + w / 2, o.pos[1] + top);
    if (o.kind === "lift" && o.travel) add(o.pos[0], o.travel[1] + h / 2);
  }
  const [gx0, gy0, gx1, gy1] = layout.goal.zone;
  add(gx0, gy0);
  add(gx1, gy1);
  return [x0 - 0.4, y0 - 0.2, x1 + 0.4, y1 + 0.6];
}

export class Room {
  readonly objects = new Map<string, SimObject>();
  readonly order: SimObject[] = [];
  readonly level: Level;
  readonly view: Rect;
  /** Words fired this run, in order (undo removes the last). */
  readonly applied: { object: string; word: string }[] = [];
  started: boolean;
  status: "playing" | "won" | "lost" = "playing";
  stuck = false;
  /** Fixed steps since Soltar. */
  steps = 0;
  lastBreak: { object: string; by: string } | null = null;

  private events: RoomEvent[] = [];
  private history: HistoryEntry[] = [];
  private preVel = new Map<string, { x: number; y: number }>();
  private readonly armedAtStart: boolean;
  private dwell = 0;
  private still = 0;
  private disposed = false;
  private floorY: number;
  /** The world's body set when the room was built (see dispose). */
  private readonly bodySet: PhysicsWorld["bodies"];

  constructor(
    private readonly R: Rapier,
    private readonly world: PhysicsWorld,
    level: Level,
  ) {
    this.level = level;
    this.view = viewOf(level.layout);
    this.floorY = this.view[1];
    this.bodySet = world.bodies;
    for (const spec of level.layout.objects) {
      const obj = this.create(spec);
      this.objects.set(spec.id, obj);
      this.order.push(obj);
    }
    this.started = !this.order.some((o) => o.held);
    this.armedAtStart = !this.started;
  }

  get goal(): SimObject {
    return this.objects.get(this.level.layout.goal.object)!;
  }

  get hasHeld(): boolean {
    return this.order.some((o) => o.held);
  }

  /** Drains the events since the last call (breaks, melts, win…). */
  drain(): RoomEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** Can this word change this object right now? */
  responds(id: string, word: Word): boolean {
    const obj = this.objects.get(id);
    if (!obj || obj.broken || obj.melted) return false;
    if (!RESPONDS[obj.spec.kind].includes(word.engine_target)) return false;
    if (obj.spec.kind === "plank" && word.engine_target === "strength" && obj.spec.strength === undefined) return false;
    if (obj.spec.kind === "ice") return word.value_modifier > 0;
    if (obj.spec.kind === "water") return word.value_modifier < 0 ? !obj.frozen : obj.frozen;
    return true;
  }

  /** Fire the ray: `word` now drives its engine target on `id`. */
  apply(id: string, word: Word): ApplyResult {
    const obj = this.objects.get(id);
    if (!obj || obj.broken || obj.melted) return { ok: false, reason: "gone" };
    if (obj.slots[word.engine_target]?.id === word.id) return { ok: false, reason: "same" };
    if (!this.responds(id, word)) return { ok: false, reason: "no-effect" };
    const target = word.engine_target;
    this.history.push({ object: id, target, prev: obj.slots[target], word });
    this.applied.push({ object: id, word: word.id });
    obj.slots[target] = word;
    if (target === "temperature") this.temperatureChanged(obj, word, null);
    if (target === "speed" && DYNAMIC_KINDS.has(obj.spec.kind)) {
      if (obj.held) obj.pendingKick = word.value_modifier;
      else this.kick(obj, word.value_modifier);
    }
    this.sync(obj);
    this.wakeAll();
    return { ok: true };
  }

  /** Undo the last word. Broken glass stays broken; a kick stays kicked. */
  undo(): { object: string; word: string } | null {
    const last = this.history.pop();
    if (!last) return null;
    this.applied.pop();
    const obj = this.objects.get(last.object)!;
    if (last.prev) obj.slots[last.target] = last.prev;
    else delete obj.slots[last.target];
    if (last.target === "speed") obj.pendingKick = last.prev && obj.held ? last.prev.value_modifier : null;
    if (last.target === "temperature" && obj.spec.kind === "water") {
      obj.frozen = last.prev ? last.prev.value_modifier < 0 : !!obj.spec.frozen;
    }
    this.sync(obj);
    this.wakeAll();
    return { object: last.object, word: last.word.id };
  }

  /** Soltar: held objects start falling / rolling. */
  release() {
    if (this.started) return;
    this.started = true;
    for (const obj of this.order) {
      if (!obj.held) continue;
      obj.held = false;
      obj.body.setBodyType(this.R.RigidBodyType.Dynamic, true);
      if (obj.pendingKick !== null) this.kick(obj, obj.pendingKick);
      obj.pendingKick = null;
    }
  }

  /** Before each fixed step: fans, water, lifts. */
  beforeStep() {
    if (this.disposed) return;
    for (const obj of this.order) {
      if (!DYNAMIC_KINDS.has(obj.spec.kind) || obj.held) continue;
      const v = obj.body.linvel();
      this.preVel.set(obj.spec.id, { x: v.x, y: v.y });
      const speed = obj.slots.speed;
      if (speed && speed.value_modifier > 1) this.motor(obj);
    }
    for (const obj of this.order) {
      const kind = obj.spec.kind;
      if (kind === "fan" && obj.on) this.blow(obj);
      else if (kind === "water" && !obj.frozen) this.buoy(obj);
      else if (kind === "lift") this.moveLift(obj);
    }
  }

  /** After each fixed step: breaking, melting, plates, goal. */
  afterStep() {
    if (this.disposed) return;
    for (const obj of this.order) {
      const kind = obj.spec.kind;
      if ((kind === "glass" || (kind === "plank" && obj.spec.strength !== undefined)) && !obj.broken) this.checkBreak(obj);
      else if (kind === "plate") this.checkPlate(obj);
      else if (DYNAMIC_KINDS.has(kind) && obj.slots.temperature) this.checkTouchTemperature(obj);
    }
    // Things that fell out of the room stop costing anything.
    for (const obj of this.order) {
      if (DYNAMIC_KINDS.has(obj.spec.kind) && obj !== this.goal && obj.body.isEnabled()) {
        if (obj.body.translation().y < this.floorY - 12) obj.body.setEnabled(false);
      }
    }
    if (this.started) this.steps++;
    this.checkGoal();
  }

  /** Remove every body this room created. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    // <Physics> frees its world before its children's cleanups run (unmount, React
    // strict mode): the bodies went with it, and touching them would panic in WASM.
    if (this.world.bodies === this.bodySet) for (const obj of this.order) this.world.removeRigidBody(obj.body);
    this.objects.clear();
  }

  // ─── building ──────────────────────────────────────────────────────────

  private create(spec: LayoutObject): SimObject {
    const R = this.R;
    const kind = spec.kind;
    const [w, h] = spec.size ?? (kind === "fan" ? [1, 0.35] : [0, 0]);
    const held = !!spec.held && DYNAMIC_KINDS.has(kind);
    let desc;
    if (kind === "lift" || held) desc = R.RigidBodyDesc.kinematicPositionBased();
    else if (DYNAMIC_KINDS.has(kind)) desc = R.RigidBodyDesc.dynamic();
    else desc = R.RigidBodyDesc.fixed();
    const liftY = kind === "lift" && spec.travel ? spec.travel[spec.start === "up" ? 1 : 0] : spec.pos[1];
    // Water colliders are placed in world coordinates on a body at the origin.
    const [bx, by] = kind === "water" ? [0, 0] : [spec.pos[0], kind === "lift" ? liftY : spec.pos[1]];
    desc.setTranslation(bx, by, 0);
    if (spec.angle) {
      const a = (spec.angle * Math.PI) / 180;
      desc.setRotation({ x: 0, y: 0, z: Math.sin(a / 2), w: Math.cos(a / 2) });
    }
    if (DYNAMIC_KINDS.has(kind)) {
      desc.enabledTranslations(true, true, false).enabledRotations(false, false, true).setCcdEnabled(true);
      desc.setCanSleep(true);
    }
    const body = this.world.createRigidBody(desc);
    const anchor = spec.anchor ?? DEFAULT_ANCHOR[kind] ?? "center";
    const anchorAt: [number, number] = [
      anchor === "left" ? spec.pos[0] - w / 2 : anchor === "right" ? spec.pos[0] + w / 2 : spec.pos[0],
      anchor === "bottom" ? spec.pos[1] - h / 2 : spec.pos[1],
    ];
    const obj: SimObject = {
      spec,
      body,
      colliders: [],
      slots: {},
      w,
      h: kind === "pipe" ? (spec.opening ?? 1) : h,
      anchorAt,
      held,
      broken: false,
      meltedByTouch: false,
      melted: false,
      frozen: !!spec.frozen,
      open: !!spec.open,
      on: !!spec.on,
      pressed: false,
      liftY,
      key: "",
      pendingKick: null,
    };
    this.sync(obj);
    return obj;
  }

  /** Derive size, material and device state from the slots, and rebuild colliders if needed. */
  private sync(obj: SimObject) {
    const { spec, slots } = obj;
    const kind = spec.kind;
    const [bw, bh] = spec.size ?? (kind === "fan" ? [1, 0.35] : [0, 0]);
    const s = mul(slots.scale);
    let w = bw * s;
    let h = bh * s;
    if (kind === "pipe") {
      w = bw;
      h = (spec.opening ?? 1) * s;
    } else if (kind !== "ball") {
      w *= mul(slots.scale_x);
      h *= mul(slots.scale_y);
    }

    // Device states.
    if (kind === "door") {
      const word = slots.open;
      obj.open = word ? word.value_modifier > 0 : !!spec.open || obj.pressed;
    }
    if (kind === "fan") obj.on = slots.power ? slots.power.value_modifier > 0 : !!spec.on;
    if (kind === "ice") obj.melted = obj.meltedByTouch || (slots.temperature?.value_modifier ?? 0) > 0;
    if (DYNAMIC_KINDS.has(kind)) {
      const slow = slots.speed && slots.speed.value_modifier < 1;
      obj.body.setGravityScale(slow ? slots.speed!.value_modifier : 1, true);
      obj.body.setLinearDamping(slow ? 1.2 : 0);
    }

    const friction = this.frictionOf(obj);
    const restitution = this.restitutionOf(obj);
    const density = DYNAMIC_KINDS.has(kind) ? (spec.density ?? 1) * mul(slots.mass) * mul(slots.fill) : 1;
    const solid = !obj.broken && !obj.melted && !(kind === "door" && obj.open) && !(kind === "water" && !obj.frozen);
    const key = [w, h, friction.join(), restitution.join(), density, solid].join("|");
    if (key === obj.key) return;

    // Resize around the anchor.
    if (w !== obj.w || h !== obj.h) this.reanchor(obj, w, h);
    obj.w = w;
    obj.h = h;
    obj.key = key;
    for (const c of obj.colliders) this.world.removeCollider(c, true);
    obj.colliders = [];
    for (const d of this.shapes(obj, w, h)) {
      d.setFriction(friction[0])
        .setFrictionCombineRule(friction[1])
        .setRestitution(restitution[0])
        .setRestitutionCombineRule(restitution[1])
        .setDensity(density)
        .setEnabled(solid);
      obj.colliders.push(this.world.createCollider(d, obj.body));
    }
  }

  private reanchor(obj: SimObject, w: number, h: number) {
    const kind = obj.spec.kind;
    const anchor = obj.spec.anchor ?? DEFAULT_ANCHOR[kind] ?? "center";
    if (kind === "pipe" || kind === "water" || anchor === "center") return;
    const t = obj.body.translation();
    if (DYNAMIC_KINDS.has(kind)) {
      // Grow from the bottom so a resized ball doesn't sink through its ledge.
      if (anchor === "bottom") obj.body.setTranslation({ x: t.x, y: t.y + (h - obj.h) / 2, z: 0 }, true);
      return;
    }
    const [ax, ay] = obj.anchorAt;
    const x = anchor === "left" ? ax + w / 2 : anchor === "right" ? ax - w / 2 : t.x;
    const y = anchor === "bottom" ? ay + h / 2 : t.y;
    obj.body.setTranslation({ x, y, z: 0 }, true);
  }

  private shapes(obj: SimObject, w: number, h: number): ColliderDesc[] {
    const C = this.R.ColliderDesc;
    const spec = obj.spec;
    switch (spec.kind) {
      case "ball":
        return [C.ball(w / 2)];
      case "box":
      case "bucket": {
        const depth = (spec.size?.[0] ?? 1) * mul(obj.slots.scale);
        return [C.cuboid(w / 2, h / 2, depth / 2)];
      }
      case "pipe": {
        // Pipe length w, wall thickness spec.size[1]; body sits on the inner floor.
        const t = spec.size?.[1] ?? 0.25;
        return [
          C.cuboid(w / 2, t / 2, DEPTH / 2).setTranslation(0, -t / 2, 0),
          C.cuboid(w / 2, t / 2, DEPTH / 2).setTranslation(0, h + t / 2, 0),
        ];
      }
      case "water": {
        const [x0, , x1, y1] = spec.zone!;
        // Frozen water is a slab of ice at the surface.
        return [C.cuboid((x1 - x0) / 2, 0.2, DEPTH / 2).setTranslation((x0 + x1) / 2, y1 - 0.2, 0)];
      }
      default:
        return [C.cuboid(w / 2, h / 2, DEPTH / 2)];
    }
  }

  private frictionOf(obj: SimObject): [number, number] {
    const rules = this.R.CoefficientCombineRule;
    const word = obj.slots.friction;
    const f = word
      ? word.value_modifier
      : obj.spec.kind === "ice" || (obj.spec.kind === "water" && obj.frozen)
        ? SLIPPERY
        : obj.spec.kind === "glass"
          ? 0.5
          : BASE_FRICTION;
    // Rough grips anything, slippery slides on anything (Max beats Min beats Average).
    return [f, f >= 1 ? rules.Max : f <= 0.1 ? rules.Min : rules.Average];
  }

  private restitutionOf(obj: SimObject): [number, number] {
    const rules = this.R.CoefficientCombineRule;
    const word = obj.slots.restitution;
    if (word) return [word.value_modifier, word.value_modifier >= 0.5 ? rules.Max : rules.Min];
    const hard = obj.slots.hardness;
    if (hard) return hard.value_modifier > 1 ? [0.5, rules.Max] : [0, rules.Min];
    return [obj.spec.kind === "ball" ? 0.25 : 0.05, rules.Average];
  }

  // ─── rules ─────────────────────────────────────────────────────────────

  private kick(obj: SimObject, factor: number) {
    const v = obj.body.linvel();
    const speed = Math.hypot(v.x, v.y);
    if (factor > 1 && speed < 0.5) {
      const [px, py] = obj.spec.push ?? [1, 0];
      const n = Math.hypot(px, py) || 1;
      obj.body.setLinvel({ x: (px / n) * 3, y: (py / n) * 3, z: 0 }, true);
    } else {
      obj.body.setLinvel({ x: v.x * factor, y: v.y * factor, z: 0 }, true);
    }
  }

  /** rápido keeps pushing along the direction of travel (or `push` from rest). */
  private motor(obj: SimObject) {
    const v = obj.body.linvel();
    if (Math.abs(v.x) >= MOTOR_TOP) return;
    const dir = Math.abs(v.x) > 0.1 ? Math.sign(v.x) : Math.sign(obj.spec.push?.[0] ?? 1);
    obj.body.applyImpulse({ x: dir * obj.body.mass() * MOTOR_ACCEL * STEP, y: 0, z: 0 }, true);
  }

  private dynamics(): SimObject[] {
    return this.order.filter((o) => DYNAMIC_KINDS.has(o.spec.kind) && !o.held && o.body.isEnabled());
  }

  private blow(fan: SimObject) {
    const [dx, dy] = fan.spec.dir!;
    const n = Math.hypot(dx, dy) || 1;
    const force = (fan.spec.force ?? 1) * mul(fan.slots.speed);
    for (const obj of this.dynamics()) {
      const t = obj.body.translation();
      if (!inRect(t.x, t.y, fan.spec.zone!)) continue;
      const m = obj.body.mass();
      const v = obj.body.linvel();
      obj.body.applyImpulse(
        {
          x: ((dx / n) * force - m * v.x * FAN_DAMPING) * STEP,
          y: ((dy / n) * force - m * v.y * FAN_DAMPING) * STEP,
          z: 0,
        },
        true,
      );
    }
  }

  private buoy(water: SimObject) {
    const [x0, y0, x1, surface] = water.spec.zone!;
    for (const obj of this.dynamics()) {
      const t = obj.body.translation();
      if (t.x < x0 || t.x > x1) continue;
      const bottom = t.y - obj.h / 2;
      const top = t.y + obj.h / 2;
      if (bottom > surface || top < y0) continue;
      const f = Math.min(1, Math.max(0, (surface - bottom) / obj.h));
      const m = obj.body.mass();
      const density = (obj.spec.density ?? 1) * mul(obj.slots.mass) * mul(obj.slots.fill);
      const volume = m / density;
      const v = obj.body.linvel();
      obj.body.applyImpulse(
        {
          x: -m * v.x * WATER_DRAG * f * STEP,
          y: (WATER_DENSITY * volume * f * GRAVITY - m * v.y * WATER_DRAG * f) * STEP,
          z: 0,
        },
        true,
      );
    }
  }

  private moveLift(lift: SimObject) {
    const [down, up] = lift.spec.travel!;
    const word = lift.slots.lift;
    const target = word ? (word.value_modifier > 0 ? up : down) : lift.spec.start === "up" ? up : down;
    if (Math.abs(target - lift.liftY) < 1e-4) return;
    const step = LIFT_SPEED * mul(lift.slots.speed) * STEP;
    lift.liftY += Math.max(-step, Math.min(step, target - lift.liftY));
    lift.body.setNextKinematicTranslation({ x: lift.spec.pos[0], y: lift.liftY, z: 0 });
  }

  /** Dynamic objects touching any collider of `obj`. */
  private touching(obj: SimObject): SimObject[] {
    const out: SimObject[] = [];
    for (const other of this.dynamics()) {
      let hit = false;
      for (const c of obj.colliders) {
        for (const oc of other.colliders) {
          this.world.contactPair(c, oc, (m) => {
            for (let i = 0; i < m.numContacts(); i++) if (m.contactDist(i) < 0.03) hit = true;
          });
          if (hit) break;
        }
        if (hit) break;
      }
      if (hit) out.push(other);
    }
    return out;
  }

  private checkBreak(pane: SimObject) {
    const strength = (pane.spec.strength ?? 2) * mul(pane.slots.strength);
    for (const other of this.touching(pane)) {
      const m = other.body.mass();
      const hardness = mul(other.slots.hardness);
      const pre = this.preVel.get(other.spec.id) ?? { x: 0, y: 0 };
      const impact = m * Math.hypot(pre.x, pre.y) * hardness;
      if (m > strength || impact > strength * IMPACT_K) {
        pane.broken = true;
        this.sync(pane);
        // The glass gives way: whatever broke it carries on instead of bouncing back.
        other.body.setLinvel({ x: pre.x * 0.8, y: pre.y * 0.8, z: 0 }, true);
        this.lastBreak = { object: pane.spec.id, by: other.spec.id };
        this.events.push({ type: "break", object: pane.spec.id, by: other.spec.id });
        this.wakeAll();
        return;
      }
    }
  }

  private checkPlate(plate: SimObject) {
    const load = this.touching(plate).reduce((sum, o) => sum + o.body.mass(), 0);
    const pressed = load >= (plate.spec.threshold ?? 2);
    if (pressed === plate.pressed) return;
    plate.pressed = pressed;
    this.events.push({ type: pressed ? "press" : "release-plate", object: plate.spec.id });
    const door = plate.spec.links ? this.objects.get(plate.spec.links) : undefined;
    if (door) {
      door.pressed = pressed;
      this.sync(door);
      this.wakeAll();
    }
  }

  private checkTouchTemperature(obj: SimObject) {
    const temp = obj.slots.temperature!.value_modifier;
    const t = obj.body.translation();
    for (const other of this.order) {
      const kind = other.spec.kind;
      if (kind === "ice" && temp > 0 && !other.melted && this.touching(other).includes(obj)) {
        other.meltedByTouch = true;
        this.temperatureChanged(other, obj.slots.temperature!, obj.spec.id);
        this.sync(other);
      } else if (kind === "water") {
        const [x0, y0, x1, surface] = other.spec.zone!;
        const wet = t.x >= x0 && t.x <= x1 && t.y - obj.h / 2 <= surface + 0.05 && t.y >= y0;
        if (!wet) continue;
        if (temp < 0 && !other.frozen) {
          other.frozen = true;
          this.events.push({ type: "freeze", object: other.spec.id, by: obj.spec.id });
          // Pop the cold object onto the new ice instead of trapping it inside.
          obj.body.setTranslation({ x: t.x, y: Math.max(t.y, surface + obj.h / 2 + 0.01), z: 0 }, true);
          obj.body.setLinvel({ x: obj.body.linvel().x, y: 0, z: 0 }, true);
          this.sync(other);
        }
      }
    }
  }

  private temperatureChanged(obj: SimObject, word: Word, by: string | null) {
    const kind = obj.spec.kind;
    if (kind === "ice" && word.value_modifier > 0) this.events.push({ type: "melt", object: obj.spec.id, by });
    if (kind === "water") {
      const freeze = word.value_modifier < 0;
      if (freeze !== obj.frozen) {
        obj.frozen = freeze;
        this.events.push({ type: freeze ? "freeze" : "thaw", object: obj.spec.id, by });
      }
    }
  }

  private checkGoal() {
    if (this.status !== "playing" || !this.started) return;
    const goal = this.goal;
    const t = goal.body.translation();
    if (inRect(t.x, t.y, this.level.layout.goal.zone)) {
      if (++this.dwell >= DWELL) {
        this.status = "won";
        this.events.push({ type: "won", object: goal.spec.id });
      }
    } else this.dwell = 0;
    const [vx0, , vx1] = this.view;
    if (t.y < this.floorY - 1.5 || t.x < vx0 - 3 || t.x > vx1 + 3) {
      this.status = "lost";
      this.events.push({ type: "lost", object: goal.spec.id });
      return;
    }
    const v = goal.body.linvel();
    const armed = this.armedAtStart || this.applied.length > 0;
    if (armed && Math.hypot(v.x, v.y) < STUCK_SPEED) {
      if (++this.still === STUCK_STEPS && this.status === "playing") {
        this.stuck = true;
        this.events.push({ type: "stuck", object: goal.spec.id });
      }
    } else {
      if (this.stuck) this.events.push({ type: "moving", object: goal.spec.id });
      this.still = 0;
      this.stuck = false;
    }
  }

  private wakeAll() {
    for (const o of this.order) if (DYNAMIC_KINDS.has(o.spec.kind) && !o.held) o.body.wakeUp();
  }
}

/** Screen-independent summary of what one object looks like right now (for the renderer). */
export function angleOf(body: Body): number {
  const q = body.rotation();
  return 2 * Math.atan2(q.z, q.w);
}

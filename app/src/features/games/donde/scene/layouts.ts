import type { VisualLayer } from "../model/schema";

/**
 * 3D scene data for each visual layer. Pure data (no three.js), so the curriculum ↔ scene
 * contract test can import it. Units ≈ 10 cm of cardboard; y is up; the default camera looks
 * from the +x/+z corner, so the walls at -x and -z are the "back" walls.
 *
 * Positions are floor-local: `floor` picks the storey, its y offset is `floors[floor]`.
 */

export type V3 = [number, number, number];

export interface HitBox {
  pos: V3;
  size: V3;
}

export interface ZoneDef {
  id: string;
  /** Plain description for the button alternative. English on purpose: the Spanish is the puzzle. */
  label_en: string;
  floor: number;
  /** Invisible volumes that take taps and drag-and-drop raycasts. */
  hit: HitBox[];
  /** Drop zones: one piece per slot, with an optional facing (radians around y). */
  slots?: { pos: V3; rot?: number }[];
  /** Where a found marker (pin / ring) or a note sits. */
  mark: V3;
  /** Pins go into map buildings; rings circle found objects. */
  marker?: "pin" | "ring";
  /** Dymo label stuck on once the learner finds this zone. */
  foundLabel?: string;
}

export type PieceKind = "teddy" | "ball" | "yoyo" | "backpack" | "fountain" | "chair" | "kiosk" | "bike";

export interface PieceDef {
  id: string;
  /** Matches a task's draggable_id. */
  group: string;
  kind: PieceKind;
  floor: number;
  home: V3;
  rot?: number;
  label_en: string;
}

export interface LabelDef {
  text: string;
  floor: number;
  pos: V3;
}

export interface SceneLayout {
  id: VisualLayer;
  /** Footprint of the diorama base (x, z). */
  size: [number, number];
  /** y offset of each storey. */
  floors: number[];
  /** Height of the tallest thing per floor, for camera framing. */
  height: number;
  zones: ZoneDef[];
  pieces: PieceDef[];
  labels: LabelDef[];
  /** Where the Dymo sentence lands once a build task is solved, keyed by its target_zone. */
  anchors: Record<string, { floor: number; pos: V3 }>;
}

/** Thickness of the cardboard base every diorama stands on (the table is at y = -PLINTH). */
export const PLINTH = 0.45;

// ───────────────────────────────────────────────────────────────── apartment

export const APT = {
  size: 10,
  wallH: [4.4, 3.9],
  wallT: 0.38,
  /** Upper storey sits on the ground-floor walls plus a slab. */
  upperY: 4.8,
  sofa: { pos: [-3.75, 0, -0.4] as V3, len: 4.4, depth: 1.9 },
  table: [0.3, 0, 0.5] as V3,
  box: { pos: [3.3, 0, -3.4] as V3, size: [1.9, 0.95, 1.7] as V3 },
  chair: [3.2, 0, 2.3] as V3,
  plant: [-4.1, 0, -4.1] as V3,
  lamp: [-4.3, 0, 2.7] as V3,
  laundry: [-2.4, 0, 3.9] as V3,
  window: { x: 0.8, y: 2.4, w: 2.4, h: 2.0 },
  curtainL: -0.85,
  curtainR: 2.45,
  bed: { pos: [-3.2, 0, -2.4] as V3, size: [3.0, 1.15, 4.6] as V3, legH: 0.62 },
  desk: [1.7, 0, -4.2] as V3,
  rack: [3.9, 0, -1.3] as V3,
  bedWindow: { z: 1.8, y: 2.2, w: 2.0, h: 1.7 },
};

const box = APT.box;
const boxTop = box.size[1];

const apartment: SceneLayout = {
  id: "pop_up_apartment",
  size: [APT.size, APT.size],
  floors: [0, APT.upperY],
  height: 4.6,
  zones: [
    {
      id: "zone_inside_box",
      label_en: "Inside the cardboard box (the open half)",
      floor: 0,
      hit: [{ pos: [box.pos[0], 0.45, box.pos[2] + 0.45], size: [1.8, 0.9, 0.85] }],
      slots: [
        { pos: [box.pos[0] - 0.55, 0.06, box.pos[2] + 0.45] },
        { pos: [box.pos[0], 0.06, box.pos[2] + 0.45] },
        { pos: [box.pos[0] + 0.55, 0.06, box.pos[2] + 0.45] },
      ],
      mark: [box.pos[0], boxTop + 0.6, box.pos[2] + 0.45],
    },
    {
      id: "zone_on_box",
      label_en: "On top of the box (the closed lid)",
      floor: 0,
      hit: [{ pos: [box.pos[0], boxTop + 0.1, box.pos[2] - 0.43], size: [1.9, 0.2, 0.85] }],
      slots: [
        { pos: [box.pos[0] - 0.55, boxTop + 0.02, box.pos[2] - 0.43] },
        { pos: [box.pos[0], boxTop + 0.02, box.pos[2] - 0.43] },
        { pos: [box.pos[0] + 0.55, boxTop + 0.02, box.pos[2] - 0.43] },
      ],
      mark: [box.pos[0], boxTop + 0.8, box.pos[2] - 0.43],
    },
    {
      id: "flap_under_sofa",
      label_en: "The fabric skirt under the sofa",
      floor: 0,
      hit: [{ pos: [APT.sofa.pos[0] + 1.0, 0.25, APT.sofa.pos[2]], size: [0.5, 0.55, 4.0] }],
      mark: [APT.sofa.pos[0] + 1.3, 0.5, APT.sofa.pos[2]],
    },
    {
      id: "flap_on_sofa",
      label_en: "The cushion on the sofa",
      floor: 0,
      hit: [{ pos: [APT.sofa.pos[0] + 0.2, 1.05, APT.sofa.pos[2] + 1.2], size: [1.0, 0.8, 1.0] }],
      mark: [APT.sofa.pos[0] + 0.2, 1.8, APT.sofa.pos[2] + 1.2],
    },
    {
      id: "flap_behind_curtain",
      label_en: "The curtain by the window",
      floor: 0,
      hit: [{ pos: [APT.curtainL, 2.3, -APT.size / 2 + 0.45], size: [1.0, 3.6, 0.6] }],
      mark: [APT.curtainL, 3.9, -APT.size / 2 + 0.6],
    },
    {
      id: "pick_laundry_downstairs",
      label_en: "The laundry basket downstairs",
      floor: 0,
      hit: [{ pos: [APT.laundry[0], 0.45, APT.laundry[2]], size: [1.3, 0.95, 1.1] }],
      mark: [APT.laundry[0], 1.2, APT.laundry[2]],
      marker: "ring",
    },
    {
      id: "pick_clothes_upstairs",
      label_en: "The dress on the clothes rail upstairs",
      floor: 1,
      hit: [{ pos: [APT.rack[0], 1.3, APT.rack[2]], size: [1.0, 2.7, 2.4] }],
      mark: [APT.rack[0], 2.9, APT.rack[2]],
      marker: "ring",
    },
    {
      id: "zone_on_bed",
      label_en: "On top of the bed",
      floor: 1,
      hit: [{ pos: [APT.bed.pos[0], APT.bed.size[1] + 0.12, APT.bed.pos[2] + 0.4], size: [2.8, 0.26, 3.6] }],
      slots: [{ pos: [APT.bed.pos[0] + 0.2, APT.bed.size[1] + 0.02, APT.bed.pos[2] + 0.6] }],
      mark: [APT.bed.pos[0], APT.bed.size[1] + 1.2, APT.bed.pos[2] + 0.6],
    },
    {
      id: "zone_under_bed",
      label_en: "Under the bed",
      floor: 1,
      hit: [{ pos: [APT.bed.pos[0], 0.3, APT.bed.pos[2]], size: [3.3, 0.58, 4.9] }],
      slots: [{ pos: [APT.bed.pos[0] + 0.3, 0.02, APT.bed.pos[2] + 1.3] }],
      mark: [APT.bed.pos[0] + 1.9, 0.6, APT.bed.pos[2] + 1.3],
    },
  ],
  pieces: [
    { id: "toy_bear", group: "paper_toys", kind: "teddy", floor: 0, home: [0.4, 0, 3.7], rot: 0.5, label_en: "teddy bear" },
    { id: "toy_ball", group: "paper_toys", kind: "ball", floor: 0, home: [1.5, 0, 4.1], label_en: "ball" },
    { id: "toy_yoyo", group: "paper_toys", kind: "yoyo", floor: 0, home: [2.3, 0, 3.6], label_en: "yo-yo" },
    { id: "backpack", group: "paper_backpack", kind: "backpack", floor: 1, home: [1.6, 0, 2.9], rot: 0.4, label_en: "backpack" },
  ],
  labels: [
    { text: "el sofá", floor: 0, pos: [APT.sofa.pos[0], 2.1, APT.sofa.pos[2] - 1.2] },
    { text: "la caja", floor: 0, pos: [box.pos[0] + 0.9, 1.5, box.pos[2]] },
    { text: "la ventana", floor: 0, pos: [APT.window.x, APT.window.y + 1.35, -APT.size / 2 + 0.3] },
    { text: "la cama", floor: 1, pos: [APT.bed.pos[0], 2.3, APT.bed.pos[2] - 1.6] },
  ],
  anchors: { label_under_sofa: { floor: 0, pos: [APT.sofa.pos[0] + 1.6, 0.9, APT.sofa.pos[2] + 1.6] } },
};

// ───────────────────────────────────────────────────────────────── plaza

export const PLAZA = {
  size: 12,
  wallH: 3.4,
  bank: { pos: [-3.3, 0, -3.6] as V3, size: [2.6, 2.5, 2.0] as V3 },
  bakery: { pos: [1.2, 0, -3.6] as V3, size: [2.6, 2.2, 2.0] as V3 },
  terrace: [3.2, 0, 2.5] as V3,
};

const T = PLAZA.terrace;
const chairSlot = (dx: number, dz: number) => ({ pos: [T[0] + dx, 0, T[2] + dz] as V3, rot: Math.atan2(-dx, -dz) });
const chairSlots = [chairSlot(0, -1.0), chairSlot(0, 1.0), chairSlot(-1.0, 0), chairSlot(1.0, 0)];
const flat = (x: number, z: number, w: number, d: number): HitBox => ({ pos: [x, 0.15, z], size: [w, 0.3, d] });

const plaza: SceneLayout = {
  id: "polaroid_plaza",
  size: [PLAZA.size, PLAZA.size],
  floors: [0],
  height: 3.4,
  zones: [
    { id: "zone_plaza_center", label_en: "The middle of the square", floor: 0, hit: [flat(0, 0, 2.4, 2.4)], slots: [{ pos: [0, 0, 0] }], mark: [0, 2.2, 0] },
    { id: "zone_plaza_corner", label_en: "The front-left corner of the square", floor: 0, hit: [flat(-4.7, 4.7, 2.2, 2.2)], slots: [{ pos: [-4.7, 0, 4.7] }], mark: [-4.7, 2.2, 4.7] },
    {
      id: "zone_around_table",
      label_en: "Around the café table (one chair per side)",
      floor: 0,
      hit: chairSlots.map((s) => flat(s.pos[0], s.pos[2], 0.95, 0.95)),
      slots: chairSlots,
      mark: [T[0], 2.0, T[2]],
    },
    {
      id: "zone_between_bank_bakery",
      label_en: "The gap between the two buildings",
      floor: 0,
      hit: [flat(-1.05, -3.6, 1.7, 1.9)],
      slots: [{ pos: [-1.05, 0, -3.6] }],
      mark: [-1.05, 2.6, -3.6],
    },
    { id: "zone_next_to_bakery", label_en: "The spot right of the bakery", floor: 0, hit: [flat(3.55, -3.6, 1.8, 1.9)], slots: [{ pos: [3.55, 0, -3.6] }], mark: [3.55, 2.6, -3.6] },
    { id: "zone_behind_bank", label_en: "The strip behind the bank", floor: 0, hit: [flat(-3.3, -5.3, 2.4, 1.2)], slots: [{ pos: [-3.3, 0, -5.3] }], mark: [-3.3, 2.8, -5.3] },
    {
      id: "zone_next_to_fountain",
      label_en: "Right beside the fountain",
      floor: 0,
      hit: [flat(-1.8, 0.4, 1.2, 1.2), flat(1.8, -0.4, 1.2, 1.2)],
      slots: [{ pos: [-1.8, 0, 0.4], rot: 0.3 }, { pos: [1.8, 0, -0.4], rot: 0.3 }],
      mark: [0, 2.4, 0],
    },
    { id: "zone_far_from_fountain", label_en: "The far left edge of the square", floor: 0, hit: [flat(-4.8, -0.4, 1.8, 1.8)], slots: [{ pos: [-4.8, 0, -0.4], rot: 0.3 }], mark: [-4.8, 2.0, -0.4] },
  ],
  pieces: [
    { id: "fountain", group: "paper_fountain", kind: "fountain", floor: 0, home: [-3.2, -PLINTH, 7.8], label_en: "fountain" },
    { id: "chair_1", group: "paper_chairs", kind: "chair", floor: 0, home: [-5.0, -PLINTH, 7.3], rot: 0.3, label_en: "chair 1" },
    { id: "chair_2", group: "paper_chairs", kind: "chair", floor: 0, home: [-3.7, -PLINTH, 8.1], rot: -0.2, label_en: "chair 2" },
    { id: "chair_3", group: "paper_chairs", kind: "chair", floor: 0, home: [-2.4, -PLINTH, 7.3], rot: 0.5, label_en: "chair 3" },
    { id: "chair_4", group: "paper_chairs", kind: "chair", floor: 0, home: [-1.1, -PLINTH, 8.1], rot: -0.4, label_en: "chair 4" },
    { id: "kiosk", group: "paper_kiosk", kind: "kiosk", floor: 0, home: [-3.0, -PLINTH, 7.7], rot: 0.2, label_en: "kiosk" },
    { id: "bike", group: "paper_bike", kind: "bike", floor: 0, home: [-3.0, -PLINTH, 7.7], rot: 0.2, label_en: "bicycle" },
  ],
  labels: [
    { text: "el banco", floor: 0, pos: [PLAZA.bank.pos[0], 3.2, PLAZA.bank.pos[2]] },
    { text: "la panadería", floor: 0, pos: [PLAZA.bakery.pos[0], 2.9, PLAZA.bakery.pos[2]] },
    { text: "la mesa", floor: 0, pos: [T[0] + 0.9, 1.9, T[2] + 0.9] },
  ],
  anchors: { label_table: { floor: 0, pos: [T[0], 2.6, T[2]] } },
};

// ───────────────────────────────────────────────────────────────── map

export const MAP = {
  size: [14, 13] as [number, number],
  highway: { x: -6.3, w: 1.2 },
  mainStreet: { z: 0, w: 1.2, x0: -5.7, x1: 5.65 },
  southStreet: { z: 2.85, w: 0.9, x0: -5.7, x1: 7 },
  alley: { z: -3.35, w: 0.7, x0: 1.0, x1: 7 },
  park: { pos: [-3.6, 0, -2.8] as V3, size: [3.2, 3.6] as [number, number] },
  house: { pos: [3.4, 0, -1.75] as V3, size: [1.6, 1.5, 1.6] as V3 },
  church: [-2.6, 0, 4.7] as V3,
};

/** A building block on the map: footprint + height. */
export interface MapBuilding {
  zone?: string;
  pos: V3;
  size: V3;
  color: string;
  roof: "flat" | "gable";
  sign?: string;
}

export const MAP_BUILDINGS: MapBuilding[] = [
  { zone: "pin_across_park", pos: [-3.6, 0, 1.55], size: [2.2, 1.1, 1.3], color: "#9fd3c7", roof: "flat", sign: "+" },
  { zone: "pin_next_to_park", pos: [-1.15, 0, -2.8], size: [1.4, 1.3, 2.4], color: "#f4b183", roof: "flat" },
  { zone: "pin_behind_park", pos: [-3.6, 0, -5.55], size: [2.6, 1.0, 1.2], color: "#e8a0a8", roof: "gable" },
  { zone: "pin_block_a", pos: [-4.75, 0, 4.7], size: [1.5, 0.9, 1.5], color: "#b9d7ea", roof: "gable" },
  { zone: "pin_block_b", pos: [-0.3, 0, 4.7], size: [1.5, 0.9, 1.5], color: "#b9d7ea", roof: "gable" },
  { zone: "pin_block_c", pos: [5.4, 0, 4.7], size: [1.5, 0.9, 1.5], color: "#b9d7ea", roof: "gable" },
  { zone: "pick_hotel_middle", pos: [0.2, 0, 1.55], size: [1.4, 1.8, 1.3], color: "#f6d27a", roof: "flat", sign: "HOTEL" },
  { zone: "pick_hotel_end", pos: [6.35, 0, 0], size: [1.2, 1.9, 1.9], color: "#f6d27a", roof: "flat", sign: "HOTEL" },
  { pos: [2.5, 0, 4.7], size: [1.6, 1.0, 1.4], color: "#e9d7b5", roof: "flat" },
  { pos: [2.6, 0, 1.55], size: [1.8, 1.0, 1.2], color: "#cfe3b5", roof: "gable" },
  { pos: [0.9, 0, -1.9], size: [1.4, 1.1, 1.5], color: "#d9e6f2", roof: "flat" },
  { pos: [3.4, 0, -5.2], size: [2.4, 0.9, 1.4], color: "#e8c8d8", roof: "gable" },
];

/** Stationary taxis the learner taps (traffic drives past them). */
export const MAP_TAXIS: { zone: string; pos: V3; rot: number }[] = [
  { zone: "pick_taxi_ahead", pos: [MAP.house.pos[0], 0, -0.3], rot: 0 },
  { zone: "pick_taxi_behind", pos: [MAP.house.pos[0], 0, MAP.alley.z], rot: 0 },
];

const buildingZone = (b: MapBuilding, label_en: string, extra: Partial<ZoneDef> = {}): ZoneDef => ({
  id: b.zone!,
  label_en,
  floor: 0,
  hit: [{ pos: [b.pos[0], b.size[1] / 2, b.pos[2]], size: [b.size[0] + 0.1, b.size[1] + 0.3, b.size[2] + 0.1] }],
  mark: [b.pos[0], b.size[1] + 0.05, b.pos[2]],
  marker: "pin",
  ...extra,
});
const bz = (id: string) => MAP_BUILDINGS.find((b) => b.zone === id)!;
const taxiZone = (t: (typeof MAP_TAXIS)[number], label_en: string): ZoneDef => ({
  id: t.zone,
  label_en,
  floor: 0,
  hit: [{ pos: [t.pos[0], 0.35, t.pos[2]], size: [1.3, 0.8, 0.9] }],
  mark: [t.pos[0], 0.75, t.pos[2]],
  marker: "ring",
});

const map: SceneLayout = {
  id: "botanico_map",
  size: MAP.size,
  floors: [0],
  height: 2.0,
  zones: [
    buildingZone(bz("pin_across_park"), "The building across the street from the park", { foundLabel: "la farmacia" }),
    buildingZone(bz("pin_next_to_park"), "The building beside the park, same side"),
    buildingZone(bz("pin_behind_park"), "The building behind the park"),
    buildingZone(bz("pin_block_a"), "The block by the highway"),
    buildingZone(bz("pin_block_b"), "The block beside the church, away from the highway", { foundLabel: "mi casa" }),
    buildingZone(bz("pin_block_c"), "The block at the far right"),
    { ...buildingZone(bz("pick_hotel_middle"), "The hotel halfway along the street"), marker: "ring" },
    { ...buildingZone(bz("pick_hotel_end"), "The hotel where the street ends"), marker: "ring" },
    taxiZone(MAP_TAXIS[0], "The taxi on the street, by the front door"),
    taxiZone(MAP_TAXIS[1], "The taxi in the lane behind the house"),
  ],
  pieces: [],
  labels: [
    { text: "el parque", floor: 0, pos: [MAP.park.pos[0], 1.9, MAP.park.pos[2]] },
    { text: "la casa", floor: 0, pos: [MAP.house.pos[0], 2.2, MAP.house.pos[2]] },
    { text: "el centro", floor: 0, pos: [MAP.church[0], 3.2, MAP.church[2]] },
    { text: "la autopista", floor: 0, pos: [MAP.highway.x, 0.8, 3.8] },
    { text: "la calle", floor: 0, pos: [-1.2, 0.5, 0] },
  ],
  anchors: { label_pharmacy: { floor: 0, pos: [-3.6, 2.2, 1.55] } },
};

export const layouts: Record<VisualLayer, SceneLayout> = {
  pop_up_apartment: apartment,
  polaroid_plaza: plaza,
  botanico_map: map,
};

export function zoneById(layout: SceneLayout, id: string): ZoneDef | undefined {
  return layout.zones.find((z) => z.id === id);
}

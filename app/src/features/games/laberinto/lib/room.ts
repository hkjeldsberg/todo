/** Hub room layout in world units. The player faces -z; doors are in the north wall. */
export const ROOM = {
  halfW: 7,
  halfD: 6,
  northH: 8,
  sideH: 3,
  doorW: 2,
  doorH: 3.2,
  doorXs: [-4.5, 0, 4.5] as const,
  corridorLen: 34,
};

export const EYE = 1.6;
/** Spawn near the back wall so all three doors fit even a portrait phone's view. */
export const SPAWN_Z = 5;
export const PLAYER_RADIUS = 0.35;

type Vec3 = { x: number; y: number; z: number };

/**
 * Which door (0-2) a ray hits, or -1. The hit area is the doorway plus its
 * label sign above it, slightly padded so a tap on a phone lands easily.
 * Pure maths on the north wall plane: nothing sits between it and the player.
 */
export function doorAtRay(origin: Vec3, dir: Vec3): number {
  const wallZ = -ROOM.halfD;
  if (dir.z >= -1e-6 || origin.z <= wallZ) return -1;
  const t = (wallZ - origin.z) / dir.z;
  const x = origin.x + dir.x * t;
  const y = origin.y + dir.y * t;
  if (y < 0 || y > ROOM.doorH + 1.7) return -1;
  const pad = 0.7;
  return ROOM.doorXs.findIndex((dx) => Math.abs(x - dx) < ROOM.doorW / 2 + pad);
}

import { ANKLE_Y, armPoint, WAIST_Y } from "./geometry";

/** Shared SVG building blocks for the clothes. */

const OUTLINE = { stroke: "#2a1a2e", strokeOpacity: 0.18, strokeWidth: 1.2, strokeLinejoin: "round" as const };

/** Upper-body block from the shoulders down to `hem`. */
export function Torso({ fill, hem = 162, inset = 0 }: { fill: string; hem?: number; inset?: number }) {
  const l = 68 + inset;
  const r = 132 - inset;
  return <path d={`M${l} 86 Q100 78 ${r} 86 L${r - 4} ${hem} L${l + 4} ${hem} Z`} fill={fill} {...OUTLINE} />;
}

/** Both sleeves, from the shoulder to `to` (0–1 along the arm). */
export function Sleeves({ fill, to, width = 16 }: { fill: string; to: number; width?: number }) {
  return (
    <g strokeLinecap="round">
      {(["l", "r"] as const).map((side) => {
        const [x0, y0] = armPoint(side, 0);
        const [x1, y1] = armPoint(side, to);
        return <line key={side} x1={x0} y1={y0} x2={x1} y2={y1} stroke={fill} strokeWidth={width} />;
      })}
    </g>
  );
}

/** Cuff bands at the end of long sleeves. */
export function Cuffs({ fill, at, width = 16 }: { fill: string; at: number; width?: number }) {
  return (
    <g strokeLinecap="butt">
      {(["l", "r"] as const).map((side) => {
        const [x0, y0] = armPoint(side, at - 0.07);
        const [x1, y1] = armPoint(side, at);
        return <line key={side} x1={x0} y1={y0} x2={x1} y2={y1} stroke={fill} strokeWidth={width + 0.5} />;
      })}
    </g>
  );
}

/** Two trouser legs from the waist to `hem`, `flare` px wider at the bottom. */
export function Trousers({ fill, hem = ANKLE_Y + 2, flare = 0, slim = 0 }: { fill: string; hem?: number; flare?: number; slim?: number }) {
  const w = WAIST_Y;
  return (
    <g fill={fill} {...OUTLINE}>
      <path d={`M${74 + slim} ${w} L100 ${w} L100 ${w + 16} L${99 - slim} ${hem} L${77 + slim - flare} ${hem} Z`} />
      <path d={`M100 ${w} L${126 - slim} ${w} L${123 - slim + flare} ${hem} L${101 + slim} ${hem} L100 ${w + 16} Z`} />
    </g>
  );
}

export function Skirt({ fill, hem, flare }: { fill: string; hem: number; flare: number }) {
  return <path d={`M74 ${WAIST_Y} L126 ${WAIST_Y} L${126 + flare} ${hem} L${74 - flare} ${hem} Z`} fill={fill} {...OUTLINE} />;
}

export function Waistband({ fill }: { fill: string }) {
  return <rect x={73} y={WAIST_Y - 1} width={54} height={7} rx={2} fill={fill} />;
}

/** A V-neck opening showing a shirt underneath. */
export function VNeck({ fill, depth = 122 }: { fill: string; depth?: number }) {
  return <path d={`M88 83 L112 83 L100 ${depth} Z`} fill={fill} />;
}

export const outline = OUTLINE;

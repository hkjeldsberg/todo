import type { Avatar as AvatarLook, Layer } from "../lib/types";
import { ITEMS, KIND_ORDER } from "./catalog";
import { ANKLE_Y, fitTransform, shade, WAIST_Y } from "./geometry";
import { ITEM_ART } from "./items";

const INK = "#2a1a22";

function BackHair({ hair, color }: { hair: AvatarLook["hair"]; color: string }) {
  if (hair === "long") return <path d="M76 42 Q74 14 100 14 Q126 14 124 42 L130 104 Q100 112 70 104 Z" fill={color} />;
  if (hair === "curly")
    return (
      <g fill={color}>
        {[[78, 34], [84, 20], [100, 14], [116, 20], [122, 34], [124, 50], [76, 50], [80, 62], [120, 62]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={12} />
        ))}
      </g>
    );
  if (hair === "bun") return <circle cx={100} cy={16} r={11} fill={color} />;
  return null;
}

function FrontHair({ hair, color }: { hair: AvatarLook["hair"]; color: string }) {
  if (hair === "curly")
    return (
      <g fill={color}>
        {[[84, 28], [96, 24], [108, 25], [118, 31]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={8} />
        ))}
      </g>
    );
  const cap = "M78 44 Q76 18 100 20 Q124 18 122 44 Q116 30 100 31 Q86 30 78 44 Z";
  return (
    <g fill={color}>
      <path d={cap} />
      {hair === "long" && <path d="M78 40 Q86 30 98 30 Q90 36 86 48 Z" />}
      {hair === "short" && <path d="M100 31 Q112 26 120 36 Q110 32 100 31 Z" fill={shade(color, 0.15)} />}
    </g>
  );
}

function Body({ look }: { look: AvatarLook }) {
  const skin = look.skin;
  return (
    <g>
      <rect x={78} y={WAIST_Y} width={20} height={ANKLE_Y - WAIST_Y} rx={6} fill={skin} />
      <rect x={102} y={WAIST_Y} width={20} height={ANKLE_Y - WAIST_Y} rx={6} fill={skin} />
      <path d="M70 86 Q100 80 130 86 L126 162 L74 162 Z" fill={skin} />
      <g stroke={skin} strokeWidth={12} strokeLinecap="round">
        <line x1={72} y1={90} x2={60} y2={164} />
        <line x1={128} y1={90} x2={140} y2={164} />
      </g>
      <circle cx={59} cy={168} r={7} fill={skin} />
      <circle cx={141} cy={168} r={7} fill={skin} />
      <rect x={93} y={64} width={14} height={22} rx={4} fill={shade(skin, -0.08)} />
      <circle cx={79} cy={49} r={5} fill={shade(skin, -0.05)} />
      <circle cx={121} cy={49} r={5} fill={shade(skin, -0.05)} />
      <ellipse cx={100} cy={46} rx={21} ry={24} fill={skin} />
      <ellipse cx={92} cy={48} rx={2.4} ry={3.1} fill={INK} />
      <ellipse cx={108} cy={48} rx={2.4} ry={3.1} fill={INK} />
      <circle cx={87} cy={56} r={3.6} fill="#ff7aa8" opacity={0.35} />
      <circle cx={113} cy={56} r={3.6} fill="#ff7aa8" opacity={0.35} />
      <path d="M94 59 Q100 64 106 59" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

function Shoes() {
  return (
    <g fill="#3a2a30">
      <rect x={72} y={ANKLE_Y - 2} width={27} height={12} rx={6} />
      <rect x={101} y={ANKLE_Y - 2} width={27} height={12} rx={6} />
    </g>
  );
}

/**
 * The dressed avatar: layered inline SVG (PRD §3). Body, then each outfit layer
 * in KIND_ORDER (bottoms under tops under full-body pieces under accessories),
 * each scaled by its fit.
 */
export function Avatar({ look, layers, className }: { look: AvatarLook; layers: Layer[]; className?: string }) {
  const ordered = [...layers].sort(
    (a, b) => KIND_ORDER.indexOf(ITEMS[a.item as keyof typeof ITEMS]) - KIND_ORDER.indexOf(ITEMS[b.item as keyof typeof ITEMS]),
  );
  const piece = (layer: Layer, part: "back" | "front") => {
    const name = layer.item as keyof typeof ITEMS;
    const draw = ITEM_ART[name][part];
    if (!draw) return null;
    return (
      <g key={`${layer.item}-${part}`} transform={fitTransform(ITEMS[name], layer.fit, layer.item)}>
        {draw(layer.color)}
      </g>
    );
  };
  return (
    <svg viewBox="0 -24 200 324" className={className} role="img" aria-label="Avatar in the fitting room">
      <ellipse cx={100} cy={ANKLE_Y + 14} rx={46} ry={7} fill="#2a1a22" opacity={0.12} />
      <BackHair hair={look.hair} color={look.hairColor} />
      {ordered.map((layer) => piece(layer, "back"))}
      <Body look={look} />
      <Shoes />
      <FrontHair hair={look.hair} color={look.hairColor} />
      {ordered.map((layer) => piece(layer, "front"))}
    </svg>
  );
}

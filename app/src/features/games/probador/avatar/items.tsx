import { useId, type ReactNode } from "react";
import type { ItemName } from "./catalog";
import { ANKLE_Y, armPoint, isLight, shade, WAIST_Y } from "./geometry";
import { Cuffs, outline, Skirt, Sleeves, Torso, Trousers, VNeck, Waistband } from "./parts";

/** An item draws `front` over the body; `back` (capes, hoods) goes behind it. */
export type ItemArt = { back?: (color: string) => ReactNode; front: (color: string) => ReactNode };

/** useId gives ids with characters that break url(#…). */
function usePatternId(prefix: string): string {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

function Striped({ color }: { color: string }) {
  const id = usePatternId("stripe");
  const band = isLight(color) ? "#1f3a68" : "#f4f1ea";
  return (
    <>
      <defs>
        <pattern id={id} width={10} height={9} patternUnits="userSpaceOnUse">
          <rect width={10} height={9} fill={color} />
          <rect width={10} height={4} y={5} fill={band} />
        </pattern>
      </defs>
      <Sleeves fill={`url(#${id})`} to={0.9} width={16} />
      <Torso fill={`url(#${id})`} hem={160} />
      <path d="M90 84 Q100 92 110 84" fill="none" stroke={band} strokeWidth={3} />
    </>
  );
}

function Hawaiian({ color }: { color: string }) {
  const id = usePatternId("flower");
  const petal = isLight(color) ? "#e8467c" : "#fff6d5";
  return (
    <>
      <defs>
        <pattern id={id} width={20} height={20} patternUnits="userSpaceOnUse">
          <rect width={20} height={20} fill={color} />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={6 + 3 * Math.cos((a * Math.PI) / 180)} cy={6 + 3 * Math.sin((a * Math.PI) / 180)} r={2.2} fill={petal} />
          ))}
          <circle cx={6} cy={6} r={1.5} fill="#ffd23f" />
          <ellipse cx={15} cy={15} rx={3.5} ry={1.6} fill={shade(color, -0.35)} transform="rotate(-35 15 15)" />
        </pattern>
      </defs>
      <Sleeves fill={`url(#${id})`} to={0.38} width={18} />
      <Torso fill={`url(#${id})`} hem={164} />
      <path d="M88 84 L100 98 L112 84 L106 82 L100 90 L94 82 Z" fill={shade(color, -0.2)} />
    </>
  );
}

function Tartan({ color }: { color: string }) {
  const id = usePatternId("tartan");
  return (
    <>
      <defs>
        <pattern id={id} width={16} height={16} patternUnits="userSpaceOnUse">
          <rect width={16} height={16} fill={color} />
          <rect width={16} height={4} y={6} fill="#2f7d4a" opacity={0.7} />
          <rect width={4} height={16} x={6} fill="#2f7d4a" opacity={0.7} />
          <rect width={16} height={1} y={2} fill="#ffd23f" opacity={0.8} />
          <rect width={1} height={16} x={2} fill="#ffd23f" opacity={0.8} />
        </pattern>
      </defs>
      <Skirt fill={`url(#${id})`} hem={222} flare={10} />
      <Waistband fill={shade(color, -0.3)} />
    </>
  );
}

function Wizard({ color }: { color: string }) {
  const id = usePatternId("stars");
  return (
    <>
      <defs>
        <pattern id={id} width={26} height={26} patternUnits="userSpaceOnUse">
          <rect width={26} height={26} fill={color} />
          <path d="M7 3 L8.5 7 L12.5 7 L9.3 9.4 L10.5 13.4 L7 11 L3.5 13.4 L4.7 9.4 L1.5 7 L5.5 7 Z" fill="#ffd23f" />
          <circle cx={20} cy={19} r={1.4} fill="#fff6d5" />
        </pattern>
      </defs>
      <path d="M58 92 L72 86 L58 176 L40 170 Z" fill={`url(#${id})`} {...outline} />
      <path d="M142 92 L128 86 L142 176 L160 170 Z" fill={`url(#${id})`} {...outline} />
      <path d="M66 86 Q100 78 134 86 L148 280 L52 280 Z" fill={`url(#${id})`} {...outline} />
      <path d="M100 84 L100 280" stroke={shade(color, -0.35)} strokeWidth={2} />
      {/* hat */}
      <ellipse cx={100} cy={28} rx={34} ry={7} fill={shade(color, -0.2)} />
      <path d="M74 28 Q96 22 126 28 L112 -18 Q108 -22 104 -16 Z" fill={`url(#${id})`} {...outline} />
    </>
  );
}

export const ITEM_ART: Record<ItemName, ItemArt> = {
  // ---- tops ----
  camiseta: {
    front: (c) => (
      <>
        <Sleeves fill={c} to={0.36} width={18} />
        <Torso fill={c} hem={162} />
        <path d="M89 84 Q100 94 111 84" fill="none" stroke={shade(c, -0.25)} strokeWidth={3} />
      </>
    ),
  },
  camisa: {
    front: (c) => (
      <>
        <Sleeves fill={c} to={0.95} width={16} />
        <Cuffs fill={shade(c, -0.12)} at={0.95} />
        <Torso fill={c} hem={162} />
        <path d="M88 82 L100 96 L96 84 Z M112 82 L100 96 L104 84 Z" fill={shade(c, -0.15)} />
        <path d="M100 96 L100 160" stroke={shade(c, -0.18)} strokeWidth={1.2} />
        {[106, 120, 134, 148].map((y) => (
          <circle key={y} cx={102.5} cy={y} r={1.4} fill={shade(c, -0.35)} />
        ))}
      </>
    ),
  },
  jersey: {
    front: (c) => (
      <>
        <Sleeves fill={c} to={0.97} width={18} />
        <Cuffs fill={shade(c, -0.18)} at={0.97} width={18} />
        <Torso fill={c} hem={164} />
        <rect x={72} y={155} width={56} height={9} rx={2} fill={shade(c, -0.18)} />
        <path d="M88 84 Q100 95 112 84" fill="none" stroke={shade(c, -0.2)} strokeWidth={5} />
      </>
    ),
  },
  sudadera: {
    back: (c) => <ellipse cx={100} cy={80} rx={24} ry={11} fill={shade(c, -0.22)} />,
    front: (c) => (
      <>
        <Sleeves fill={c} to={0.98} width={19} />
        <Cuffs fill={shade(c, -0.15)} at={0.98} width={19} />
        <Torso fill={c} hem={166} />
        <path d="M84 132 L116 132 L120 156 L80 156 Z" fill={shade(c, -0.12)} />
        <path d="M94 86 L93 108 M106 86 L107 108" stroke={shade(c, 0.6)} strokeWidth={1.8} strokeLinecap="round" />
        <rect x={72} y={158} width={56} height={8} rx={2} fill={shade(c, -0.15)} />
      </>
    ),
  },
  chaqueta: {
    front: (c) => (
      <>
        <VNeck fill="#f6f3ee" depth={128} />
        <Sleeves fill={c} to={0.95} width={17} />
        <path d="M68 86 Q82 80 90 82 L100 130 L100 164 L72 164 Z" fill={c} {...outline} />
        <path d="M132 86 Q118 80 110 82 L100 130 L100 164 L128 164 Z" fill={c} {...outline} />
        <path d="M90 82 L84 104 L96 112 Z M110 82 L116 104 L104 112 Z" fill={shade(c, -0.18)} />
        <circle cx={104} cy={140} r={2} fill={shade(c, -0.45)} />
        <circle cx={104} cy={152} r={2} fill={shade(c, -0.45)} />
      </>
    ),
  },
  cazadora: {
    front: (c) => (
      <>
        <Sleeves fill={c} to={0.95} width={17} />
        <Torso fill={c} hem={158} />
        <path d="M100 86 L100 158" stroke="#c9c9c9" strokeWidth={1.6} strokeDasharray="2 2" />
        <path d="M84 82 L100 92 L92 108 Z M116 82 L100 92 L108 108 Z" fill={shade(c, 0.12)} />
        <rect x={72} y={150} width={56} height={8} rx={2} fill={shade(c, 0.08)} />
        <path d="M78 104 Q84 102 90 104" stroke={shade(c, 0.25)} strokeWidth={1.4} fill="none" />
      </>
    ),
  },
  tirantes: {
    front: (c) => (
      <>
        <path d="M83 94 L87 82 M117 94 L113 82" stroke={c} strokeWidth={5} strokeLinecap="round" />
        <path d="M78 94 Q100 104 122 94 L126 162 L74 162 Z" fill={c} {...outline} />
      </>
    ),
  },
  rayas: { front: (c) => <Striped color={c} /> },
  esmoquin: {
    front: (c) => (
      <>
        <VNeck fill="#fbfaf7" depth={132} />
        <path d="M94 88 L100 91 L94 94 Z M106 88 L100 91 L106 94 Z" fill="#111" />
        <circle cx={100} cy={91} r={1.8} fill="#111" />
        {[104, 114, 124].map((y) => (
          <circle key={y} cx={100} cy={y} r={1.1} fill="#222" />
        ))}
        <Sleeves fill={c} to={0.95} width={17} />
        <Cuffs fill="#fbfaf7" at={0.99} width={14} />
        <path d="M68 86 Q82 80 90 82 L100 134 L100 164 L72 164 Z" fill={c} {...outline} />
        <path d="M132 86 Q118 80 110 82 L100 134 L100 164 L128 164 Z" fill={c} {...outline} />
        <path d="M90 82 L86 112 L99 130 Z M110 82 L114 112 L101 130 Z" fill={shade(c, 0.22)} />
      </>
    ),
  },
  hawaiana: { front: (c) => <Hawaiian color={c} /> },

  // ---- bottoms ----
  vaqueros: {
    front: (c) => (
      <>
        <Trousers fill={c} />
        <Waistband fill={shade(c, -0.2)} />
        <path d={`M88 170 L88 ${ANKLE_Y} M112 170 L112 ${ANKLE_Y}`} stroke={shade(c, 0.25)} strokeWidth={1} strokeDasharray="3 2" />
        <path d="M78 166 Q84 172 90 166 M110 166 Q116 172 122 166" stroke="#e0b25a" strokeWidth={1.2} fill="none" />
      </>
    ),
  },
  pantalon_corto: {
    front: (c) => (
      <>
        <Trousers fill={c} hem={204} flare={3} />
        <Waistband fill={shade(c, -0.2)} />
        <path d="M74 200 L100 200 M101 200 L127 200" stroke={shade(c, -0.15)} strokeWidth={3} />
      </>
    ),
  },
  falda: {
    front: (c) => (
      <>
        <Skirt fill={c} hem={226} flare={12} />
        <path d="M88 162 L84 226 M100 162 L100 226 M112 162 L116 226" stroke={shade(c, -0.15)} strokeWidth={1.4} />
        <Waistband fill={shade(c, -0.2)} />
      </>
    ),
  },
  minifalda: {
    front: (c) => (
      <>
        <Skirt fill={c} hem={190} flare={6} />
        <Waistband fill={shade(c, 0.2)} />
      </>
    ),
  },
  pantalon_traje: {
    front: (c) => (
      <>
        <Trousers fill={c} />
        <Waistband fill={shade(c, -0.25)} />
        <path d={`M88 172 L88 ${ANKLE_Y} M112 172 L112 ${ANKLE_Y}`} stroke={shade(c, 0.18)} strokeWidth={1.2} />
      </>
    ),
  },
  chandal: {
    front: (c) => (
      <>
        <Trousers fill={c} />
        <path d={`M76 ${WAIST_Y + 4} L79 ${ANKLE_Y - 6} M124 ${WAIST_Y + 4} L121 ${ANKLE_Y - 6}`} stroke="#ffffff" strokeWidth={3} />
        <path d={`M77 ${ANKLE_Y - 4} L99 ${ANKLE_Y - 4} M101 ${ANKLE_Y - 4} L123 ${ANKLE_Y - 4}`} stroke={shade(c, -0.25)} strokeWidth={6} />
        <Waistband fill={shade(c, -0.25)} />
      </>
    ),
  },
  cargo: {
    front: (c) => (
      <>
        <Trousers fill={c} flare={2} />
        <Waistband fill={shade(c, -0.25)} />
        <rect x={74} y={200} width={13} height={18} rx={2} fill={shade(c, -0.15)} />
        <rect x={113} y={200} width={13} height={18} rx={2} fill={shade(c, -0.15)} />
      </>
    ),
  },
  campana: {
    front: (c) => (
      <>
        <Trousers fill={c} flare={12} slim={2} />
        <Waistband fill={shade(c, -0.3)} />
        <rect x={93} y={WAIST_Y} width={14} height={7} rx={2} fill="#e0b25a" />
      </>
    ),
  },
  mallas: {
    front: (c) => (
      <>
        <Trousers fill={c} hem={ANKLE_Y - 4} slim={3} />
        <Waistband fill={shade(c, 0.12)} />
      </>
    ),
  },
  escocesa: { front: (c) => <Tartan color={c} /> },

  // ---- accessories ----
  sombrero: {
    front: (c) => (
      <>
        <path d="M78 30 Q80 6 100 8 Q120 6 122 30 Z" fill={c} {...outline} />
        <rect x={79} y={22} width={42} height={6} fill={shade(c, -0.35)} />
        <ellipse cx={100} cy={30} rx={38} ry={8} fill={shade(c, -0.08)} {...outline} />
      </>
    ),
  },
  corona: {
    front: (c) => (
      <>
        <path d="M78 30 L76 8 L87 18 L94 2 L100 15 L106 2 L113 18 L124 8 L122 30 Z" fill={c} stroke={shade(c, -0.35)} strokeWidth={1.5} />
        <circle cx={100} cy={24} r={3} fill="#e8467c" />
        <circle cx={87} cy={25} r={2.2} fill="#3fa7e8" />
        <circle cx={113} cy={25} r={2.2} fill="#3fa7e8" />
      </>
    ),
  },
  gafas: {
    front: (c) => (
      <>
        <rect x={81} y={42} width={17} height={11} rx={4} fill={c} />
        <rect x={102} y={42} width={17} height={11} rx={4} fill={c} />
        <path d="M98 46 L102 46 M81 45 L77 43 M119 45 L123 43" stroke={c} strokeWidth={2} />
        <path d="M84 45 L88 44" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={1.5} strokeLinecap="round" />
      </>
    ),
  },
  bufanda: {
    front: (c) => (
      <>
        <rect x={84} y={70} width={32} height={14} rx={7} fill={c} {...outline} />
        <rect x={104} y={78} width={12} height={66} rx={3} fill={c} {...outline} />
        {[92, 104, 116, 128].map((y) => (
          <rect key={y} x={104} y={y} width={12} height={4} fill={shade(c, 0.35)} />
        ))}
        <path d="M105 144 L105 151 M108 144 L108 151 M111 144 L111 151 M114 144 L114 151" stroke={c} strokeWidth={1.6} />
      </>
    ),
  },
  parche: {
    front: (c) => (
      <>
        <path d="M78 40 Q78 18 100 18 Q122 18 122 40 Q100 32 78 40 Z" fill={c} {...outline} />
        {[[88, 28], [100, 24], [112, 28], [94, 34], [106, 33]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} fill="#ffffff" />
        ))}
        <path d="M78 36 L68 46 L72 30 Z" fill={c} />
        <path d="M80 38 L118 52" stroke="#111" strokeWidth={1.5} />
        <ellipse cx={108} cy={48} rx={6.5} ry={5.5} fill="#111" />
      </>
    ),
  },

  // ---- full body ----
  vestido: {
    front: (c) => (
      <>
        <Sleeves fill={c} to={0.24} width={18} />
        <path d="M70 86 Q100 79 130 86 L124 152 L76 152 Z" fill={c} {...outline} />
        <path d="M76 150 L124 150 L142 238 L58 238 Z" fill={c} {...outline} />
        <path d="M88 84 Q100 98 112 84" fill="none" stroke={shade(c, -0.25)} strokeWidth={2} />
        <rect x={75} y={146} width={50} height={7} rx={3} fill={shade(c, -0.22)} />
        <path d="M86 156 L78 236 M100 156 L100 236 M114 156 L122 236" stroke={shade(c, -0.12)} strokeWidth={1.2} />
      </>
    ),
  },
  astronauta: {
    front: (c) => (
      <>
        <rect x={64} y={88} width={72} height={60} rx={12} fill="#c9ccd3" />
        <Sleeves fill={c} to={1} width={24} />
        {(["l", "r"] as const).map((side) => {
          const [x, y] = armPoint(side, 1);
          return <circle key={side} cx={x} cy={y + 3} r={10} fill="#b8bcc6" />;
        })}
        <path d={`M70 ${WAIST_Y} L130 ${WAIST_Y} L128 ${ANKLE_Y} L102 ${ANKLE_Y} L100 172 L98 ${ANKLE_Y} L72 ${ANKLE_Y} Z`} fill={c} {...outline} />
        <Torso fill={c} hem={164} inset={-4} />
        <rect x={86} y={104} width={28} height={22} rx={4} fill="#d9dde5" stroke="#9aa0ab" />
        <circle cx={93} cy={115} r={3} fill="#e8467c" />
        <circle cx={101} cy={115} r={3} fill="#3fa7e8" />
        <circle cx={109} cy={115} r={3} fill="#ffd23f" />
        <rect x={70} y={ANKLE_Y - 4} width={28} height={14} rx={5} fill="#9aa0ab" />
        <rect x={102} y={ANKLE_Y - 4} width={28} height={14} rx={5} fill="#9aa0ab" />
        <circle cx={100} cy={46} r={36} fill="#bfe3ff" fillOpacity={0.3} stroke="#ffffff" strokeWidth={5} />
        <path d="M76 30 Q84 18 96 14" stroke="#ffffff" strokeOpacity={0.8} strokeWidth={4} strokeLinecap="round" fill="none" />
      </>
    ),
  },
  tunica_mago: { front: (c) => <Wizard color={c} /> },
  gabardina: {
    front: (c) => (
      <>
        <Sleeves fill={c} to={0.97} width={19} />
        <Cuffs fill={shade(c, -0.2)} at={0.9} width={19} />
        <path d="M66 84 Q100 77 134 84 L140 240 L60 240 Z" fill={c} {...outline} />
        <path d="M100 96 L100 240" stroke={shade(c, -0.25)} strokeWidth={1.5} />
        <path d="M86 82 L100 104 L90 118 L78 92 Z M114 82 L100 104 L110 118 L122 92 Z" fill={shade(c, -0.12)} {...outline} />
        <rect x={64} y={150} width={72} height={8} fill={shade(c, -0.22)} />
        <rect x={95} y={149} width={10} height={10} rx={1} fill="none" stroke="#3b2a20" strokeWidth={2} />
        {[124, 136, 170, 184].map((y) => (
          <g key={y} fill={shade(c, -0.45)}>
            <circle cx={92} cy={y} r={1.8} />
            <circle cx={108} cy={y} r={1.8} />
          </g>
        ))}
      </>
    ),
  },
  superheroe: {
    back: () => <path d="M70 86 L130 86 L150 252 Q100 262 50 252 Z" fill="#d7263d" />,
    front: (c) => (
      <>
        <Trousers fill={c} slim={2} />
        <Sleeves fill={c} to={0.98} width={15} />
        <Cuffs fill="#d7263d" at={0.98} width={16} />
        <Torso fill={c} hem={160} inset={2} />
        <path d="M100 100 L114 112 L100 130 L86 112 Z" fill="#ffd23f" stroke="#d7263d" strokeWidth={2} />
        <rect x={74} y={154} width={52} height={7} rx={2} fill="#ffd23f" />
        <rect x={76} y={ANKLE_Y - 22} width={23} height={26} rx={3} fill="#d7263d" />
        <rect x={101} y={ANKLE_Y - 22} width={23} height={26} rx={3} fill="#d7263d" />
        <path d="M78 42 Q100 36 122 42 L120 54 Q100 50 80 54 Z" fill="#d7263d" />
        <circle cx={92} cy={48} r={3.6} fill="#ffffff" />
        <circle cx={108} cy={48} r={3.6} fill="#ffffff" />
        <circle cx={92} cy={48} r={2} fill="#2a1a22" />
        <circle cx={108} cy={48} r={2} fill="#2a1a22" />
      </>
    ),
  },
};

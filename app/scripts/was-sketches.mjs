// El Cómic Dinámico: derives grayscale pencil "sketch" SVGs from the cel-shaded color panels.
// Usage: npm run was:sketches  (or: node scripts/was-sketches.mjs [dir], default public/games/was)
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FILTER = `<filter id="sketch" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" result="wobble"/>
    <feColorMatrix in="wobble" type="saturate" values="0"/>
    <feComponentTransfer>
      <feFuncR type="linear" slope="0.6" intercept="0.4"/>
      <feFuncG type="linear" slope="0.6" intercept="0.4"/>
      <feFuncB type="linear" slope="0.6" intercept="0.38"/>
    </feComponentTransfer>
  </filter>`;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const root = process.argv[2] ?? "public/games/was";
for (const file of walk(root).filter((f) => f.endsWith("_color.svg"))) {
  const src = readFileSync(file, "utf8");
  const open = src.match(/<svg[^>]*>/)[0];
  const body = src.slice(src.indexOf(open) + open.length, src.lastIndexOf("</svg>"));
  const out = `${open}
  <defs>
  ${FILTER}
  </defs>
  <rect width="100%" height="100%" fill="#f4f1ea"/>
  <g filter="url(#sketch)">${body}</g>
</svg>
`;
  const target = file.replace(/_color\.svg$/, "_sketch.svg");
  writeFileSync(target, out);
  console.log(`wrote ${target}`);
}

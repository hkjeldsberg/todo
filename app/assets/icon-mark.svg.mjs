// The todo mark: four sticker tiles making one whole ("todo" = everything),
// memo's palette, hard offset shadows, a slight alternating tilt. The pink tile
// carries a tilde — the ñ mark — drawn as a stroke, so no font is involved.
const TILE = 22;
const tiles = [
  { x: 7.5, y: 6.5, fill: "#FF5FA2", shadow: "#E04A8B", rot: -4, tilde: true },
  { x: 34.5, y: 6.5, fill: "#E6C583", shadow: "#C9A45F", rot: 3 },
  { x: 7.5, y: 33.5, fill: "#FFFFFF", shadow: "#E8D3A6", rot: 3 },
  { x: 34.5, y: 33.5, fill: "#3D2140", shadow: "#24132A", rot: -3 },
];

export function mark() {
  return tiles
    .map(({ x, y, fill, shadow, rot, tilde }) => {
      const cx = x + TILE / 2;
      const cy = y + TILE / 2;
      const wave = tilde
        ? `<path d="M${cx - 7} ${cy + 2.2} C${cx - 4.5} ${cy - 4.2} ${cx - 1.2} ${cy - 1.4} ${cx} ${cy} S${cx + 4.5} ${cy + 4.2} ${cx + 7} ${cy - 2.2}" fill="none" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round"/>`
        : "";
      return `<g transform="rotate(${rot} ${cx} ${cy})"><rect x="${x}" y="${y + 3}" width="${TILE}" height="${TILE}" rx="6" fill="${shadow}"/><rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" rx="6" fill="${fill}"/>${wave}</g>`;
    })
    .join("");
}

/** Browser-tab icon: rounded shell badge so it reads on light and dark tab bars. */
export const iconSvg = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#FFE9B8"/>${mark()}</svg>`;

/** Home-screen icon: opaque, full-bleed (iOS rounds the corners itself), mark inset. */
export const appleSvg = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-7 -6 78 78"><rect x="-7" y="-6" width="78" height="78" fill="#FFE9B8"/>${mark()}</svg>`;

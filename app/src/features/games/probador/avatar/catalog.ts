/** Every SVG piece, by kind (PRD §5: 10 tops, 10 bottoms, 5 accessories, 5 full-body). Plain data for the content validator. */
export const ITEMS = {
  camiseta: "top",
  camisa: "top",
  jersey: "top",
  sudadera: "top",
  chaqueta: "top",
  cazadora: "top",
  tirantes: "top",
  rayas: "top",
  esmoquin: "top",
  hawaiana: "top",
  vaqueros: "bottom",
  pantalon_corto: "bottom",
  falda: "bottom",
  minifalda: "bottom",
  pantalon_traje: "bottom",
  chandal: "bottom",
  cargo: "bottom",
  campana: "bottom",
  mallas: "bottom",
  escocesa: "bottom",
  sombrero: "accessory",
  corona: "accessory",
  gafas: "accessory",
  bufanda: "accessory",
  parche: "accessory",
  vestido: "full",
  astronauta: "full",
  tunica_mago: "full",
  gabardina: "full",
  superheroe: "full",
} as const;

export type ItemKind = (typeof ITEMS)[keyof typeof ITEMS];
export type ItemName = keyof typeof ITEMS;

/** Paint order, back to front. */
export const KIND_ORDER: ItemKind[] = ["bottom", "top", "full", "accessory"];

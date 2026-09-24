import { Bangers, Cinzel, Permanent_Marker } from "next/font/google";

// Diegetic typography only (graffiti, posters, neon, carved stone painted into the
// 3D world). All HUD / menu text uses the app's Baloo 2. Not preloaded: the route is
// shared by every game, and signTexture waits on document.fonts.load() anyway.
const comic = Bangers({ weight: "400", subsets: ["latin"], display: "block", preload: false });
const marker = Permanent_Marker({ weight: "400", subsets: ["latin"], display: "block", preload: false });
const carved = Cinzel({ weight: "700", subsets: ["latin"], display: "block", preload: false });

export const SIGN_FONTS = {
  comic: comic.style.fontFamily,
  marker: marker.style.fontFamily,
  carved: carved.style.fontFamily,
} as const;

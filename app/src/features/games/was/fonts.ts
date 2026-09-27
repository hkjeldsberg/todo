import { Bangers, Comic_Neue } from "next/font/google";

// The comic keeps its own lettering (user decision): Bangers for titles and verb
// chips, Comic Neue for captions. Not preloaded: the route is shared by every game.
const display = Bangers({ weight: "400", subsets: ["latin"], display: "swap", preload: false, variable: "--was-display" });
const body = Comic_Neue({ weight: ["400", "700"], subsets: ["latin"], display: "swap", preload: false, variable: "--was-body" });

export const FONT_VARS = `${display.variable} ${body.variable}`;

// Judges answers from the command line against a hiding spot (parser/relation debugging aid).
//   npx tsx scripts/posiciones-judge.mts jardin j_seto 0 "el gnomo esta detras del seto" "..."
import { bundledContent } from "../src/features/games/posiciones/model/content";
import { judgeText } from "../src/features/games/posiciones/model/judge";
import { buildWorld, type Rotation } from "../src/features/games/posiciones/model/relations";

const [scene, spot, rot, ...answers] = process.argv.slice(2);
const world = buildWorld(bundledContent(), scene);
for (const a of answers) {
  const t0 = performance.now();
  const v = judgeText(world, spot, Number(rot) as Rotation, a);
  console.log(`${a}\n  → ${JSON.stringify(v)}  (${(performance.now() - t0).toFixed(1)} ms)`);
}

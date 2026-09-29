// Prints every true position per hiding spot and camera rotation (content tuning aid).
//   npx tsx scripts/posiciones-truths.mts
import { bundledContent } from "../src/features/games/posiciones/model/content";
import { buildWorld, trueFacts, ROTATIONS } from "../src/features/games/posiciones/model/relations";
const c = bundledContent();
const used = new Set<string>();
for (const s of c.scenes) {
  const w = buildWorld(c, s.id);
  console.log(`\n== ${s.id}`);
  for (const spot of s.targets) {
    for (const r of ROTATIONS) {
      const t = trueFacts(w, spot, r);
      t.forEach((x) => used.add(x.expression));
      const ids = [...new Set(t.map((x) => x.expression))];
      console.log(`${spot} r${r} [${ids.length}] ` + t.map((x) => `${x.expression}(${x.refs.join("+")}${x.metres ? " " + x.metres + "m" : ""})`).join(", "));
    }
  }
}
console.log("\nreachable", used.size, "of", c.expressions.length);
console.log("unreached:", c.expressions.filter((e) => !used.has(e.id) && !e.standard).map((e) => e.id).join(" "));

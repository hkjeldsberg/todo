// Headless play-through of /juegos/posiciones (El Laberinto del Gnomo) at phone and
// desktop sizes: all four dungeons with typed answers (suggestions off), chip + tap on
// the map (suggestions on), a false answer, a grammar block, a camera turn that changes
// left/right, the summary and the album. Never calls Claude. Screenshots go to
// .playtest/posiciones/. Server-action writes (progress, attempts) are blocked unless
// ALLOW_WRITES=1, so playtests never touch the review queue.
//
//   NEXT_DIST_DIR=.playtest/next-posiciones AUTH_DISABLED=1 npx next dev -p 3106   # other terminal
//   node scripts/posiciones-playtest.mjs
//   URL=http://localhost:3106 SIZES=phone node scripts/posiciones-playtest.mjs
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.URL ?? "http://localhost:3106";
const OUT = ".playtest/posiciones/";
mkdirSync(OUT, { recursive: true });

const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const want = (process.env.SIZES ?? "phone,desktop").split(",");
const DUNGEONS = ["El Jardín", "El Mercado", "El Cementerio", "El Laberinto"];

// Progress/attempt server actions are blocked below; their logged failures are expected.
const IGNORED = [/\[games\] (save|attempt) posiciones failed/, /ERR_FAILED/, /Failed to load resource/, /Failed to fetch/];
/** Loose truths a player wouldn't pick first. */
const LOOSE = new Set(["lejos_de", "a_distancia_de", "a_mano_derecha", "a_mano_izquierda", "todo_recto", "de_cara_a", "mas_alla_de", "en_diagonal_a", "al_final_de"]);

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(cache)) return undefined;
  const dir = readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
  const app = dir && join(cache, dir, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
  return app && existsSync(app) ? app : undefined;
}

const browser = await chromium.launch({
  executablePath: chromiumPath(),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const failures = [];
const ignored = new Set();
const check = (cond, msg) => {
  if (!cond) failures.push(msg);
  console.log(`${cond ? "  ok " : "  FAIL"} ${msg}`);
};
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[.]/g, "");

async function run(name) {
  console.log(`\n[${name}]`);
  const ctx = await browser.newContext(SIZES[name]);
  const page = await ctx.newPage();
  const touch = !!SIZES[name].hasTouch;
  page.on("pageerror", (e) => failures.push(`${name}: pageerror ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (IGNORED.some((r) => r.test(m.text()))) ignored.add(m.text().split("\n")[0].slice(0, 120));
    else failures.push(`${name}: console ${m.text().slice(0, 300)}`);
  });
  // Server actions are POSTs to the page route: keep test answers out of the database.
  if (!process.env.ALLOW_WRITES) await page.route(/\/juegos\/posiciones$/, (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));

  const hook = (fn, arg) => page.evaluate(fn, arg);
  const state = () => hook(() => window.__posiciones.state());
  const truths = () => hook(() => window.__posiciones.truths());
  const shot = async (tag) => {
    await page.waitForTimeout(450); // let dialog springs settle
    await page.screenshot({ path: `${OUT}${name}-${tag}.png` });
  };
  const until = (fn, arg, ms = 20000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 100 });
  const tap = async (loc) => (touch ? loc.tap() : loc.click());

  await page.goto(`${BASE}/juegos/posiciones`);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.getByRole("button", { name: /El Jardín/ }).waitFor({ timeout: 120000 });
  await until(() => !!window.__posiciones);
  await hook(() => window.__posiciones.noClaude());
  await page.waitForTimeout(1200);
  await shot("01-menu");

  async function waitReady() {
    await until(() => window.__posiciones.state().ready && !window.__posiciones.state().cleared);
    await page.waitForTimeout(250);
  }

  async function typeAnswer(text) {
    const input = page.locator("#posiciones-answer");
    await input.fill("");
    await input.fill(text);
    await tap(page.getByRole("button", { name: "Decir" }));
    await until(() => window.__posiciones.state().verdict !== null && window.__posiciones.state().verdict !== "pending");
    return state();
  }

  function pick(ts, used, prefer = []) {
    const good = ts.filter((t) => t.refs.length > 0 && !LOOSE.has(t.expression));
    return good.find((t) => prefer.includes(t.expression) && !used.has(t.expression)) ?? good.find((t) => !used.has(t.expression)) ?? good[0] ?? ts[0];
  }

  async function nextRoom() {
    const btn = page.getByRole("button", { name: /Siguiente sala|Ver resumen/ });
    await tap(btn);
  }

  async function setSuggestions(on) {
    const s = await state();
    if (s.suggestions !== on) await tap(page.getByRole("switch", { name: /Mostrar sugerencias/ }));
    await until((v) => window.__posiciones.state().suggestions === v, on);
  }

  /** Suggestions on: pick the tray's true chip, then tap its reference on the map (pill list if the tap misses). */
  async function chipAndTap(tag) {
    const tray = (await state()).tray;
    const chips = page.getByRole("group", { name: "Posiciones" }).getByRole("button");
    const count = await chips.count();
    check(count >= 3 && count <= 4, `${tag}: ${count} suggestion chips`);
    await tap(chips.nth(tray.chips.indexOf(tray.target.expression)));
    await page.waitForTimeout(300);
    for (const ref of tray.target.refs) {
      const pt = await hook((id) => window.__posicionesScene.object(id), ref);
      if (touch) await page.touchscreen.tap(pt[0], pt[1]);
      else await page.mouse.click(pt[0], pt[1]);
      await page.waitForTimeout(300);
    }
    let v = await state();
    if (!v.cleared) {
      console.log(`    (map tap missed: ${v.verdict ?? "no verdict"}; using the object pills)`);
      const t2 = (await state()).tray;
      await tap(page.getByRole("group", { name: "Posiciones" }).getByRole("button").nth(t2.chips.indexOf(t2.target.expression)));
      const names = await hook(() => window.__posiciones.names());
      for (const ref of t2.target.refs) await tap(page.getByRole("button", { name: names[ref], exact: true }));
      await page.waitForTimeout(300);
      v = await state();
    }
    return v;
  }

  const used = new Set();
  for (let d = 0; d < DUNGEONS.length; d++) {
    const title = DUNGEONS[d];
    console.log(` ${title}`);
    await tap(page.getByRole("button", { name: new RegExp(title) }).first());
    await until(() => window.__posiciones.state().screen === "play");
    const rooms = (await state()).rooms;
    for (let i = 0; i < rooms; i++) {
      await waitReady();
      const tag = `${d + 1}${title.split(" ")[1].toLowerCase()}-${i + 1}`;
      // Mercado: suggestions on for the first three rooms (chip + tap).
      const chipMode = d === 1 && i < 3;
      await setSuggestions(chipMode);
      if (i === 0) await shot(`${tag}-room`);

      if (chipMode) {
        const v = await chipAndTap(tag);
        if (i === 0) await shot(`${tag}-chip`);
        check(v.cleared, `${tag}: chip + tap clears the room (${v.verdict}${v.message ? `: ${v.message}` : ""})`);
      } else {
        if (d === 0 && i === 0) {
          // A false answer: something true at another spot but not here.
          const ts = await truths();
          const cands = ["El gnomo está dentro del cofre.", "El gnomo está encima del banco.", "El gnomo está debajo de la estatua."];
          const wrong = cands.find((c) => !ts.some((t) => t.sentence === c));
          const v = await typeAnswer(wrong);
          check(v.verdict === "false" && /No está .* — está /.test(v.message ?? ""), `${tag}: false answer explains what is true (${v.message})`);
          await shot(`${tag}-false`);
        }
        if (d === 0 && i === 1) {
          const ts = await truths();
          const t = pick(ts, used);
          const v = await typeAnswer(`Hay el gnomo ${t.sentence.replace(/^El gnomo (está|mira|da vueltas) /, "")}`);
          check(v.verdict === "grammar", `${tag}: "hay el gnomo…" is a grammar block (${v.message})`);
          await shot(`${tag}-grammar`);
        }
        if (d === 0 && i === 2) {
          // A turn that changes left/right: find a spot/rotation pair with a derecha/izquierda truth.
          const before = await truths();
          const lr0 = before.find((t) => /^a_la_(derecha|izquierda)_de$/.test(t.expression));
          await tap(page.getByRole("button", { name: "Girar a la derecha" }));
          await tap(page.getByRole("button", { name: "Girar a la derecha" }));
          await page.waitForTimeout(900);
          const s = await state();
          check(s.rot === 2, `${tag}: camera turned 180° (rot ${s.rot})`);
          const after = await truths();
          if (lr0) {
            const flipped = lr0.expression.includes("derecha") ? "a_la_izquierda_de" : "a_la_derecha_de";
            check(after.some((t) => t.expression === flipped && t.refs.join() === lr0.refs.join()), `${tag}: ${lr0.sentence} became ${flipped} after the turn`);
            const v = await typeAnswer(lr0.sentence);
            check(v.verdict === "false", `${tag}: the old left/right answer is false after turning (${v.message})`);
          }
          await shot(`${tag}-rotated`);
          const lr = after.find((t) => /^a_la_(derecha|izquierda)_de$/.test(t.expression));
          const t = lr ?? pick(after, used);
          const v = await typeAnswer(fold(t.sentence));
          check(v.cleared, `${tag}: typed after the turn, voice-style "${fold(t.sentence)}" → ${v.verdict}`);
          used.add(t.expression);
          await shot(`${tag}-true`);
          await nextRoom();
          continue;
        }
        const ts = await truths();
        const t = pick(ts, used, ["a_traves_de", "en_lo_alto_de", "mas_alla_de", "al_pie_de", "apoyado_en", "en_el_rincon_de", "al_otro_lado_de", "en_la_cima_de", "a_orillas_de"]);
        const text = i % 2 ? fold(t.sentence) : t.sentence;
        const v = await typeAnswer(text);
        check(v.cleared, `${tag}: "${text}" → ${v.verdict}${v.message ? `: ${v.message}` : ""}`);
        used.add(t.expression);
        if (i === 0 || (d === 0 && i === 1)) await shot(`${tag}-true`);
      }
      await nextRoom();
    }
    await until(() => window.__posiciones.state().screen === "summary");
    await page.waitForTimeout(900);
    const s = await state();
    check(s.done && s.done.stars >= 1, `${title}: summary with ${s.done?.stars} stars, ${s.done?.misses.length} misses for Repaso, score ${s.score}`);
    await shot(`${d + 1}summary`);
    if (d === 0) {
      await tap(page.getByRole("button", { name: /Sala 2/ }));
      await page.waitForTimeout(700);
      await shot(`${d + 1}summary-room2`);
    }
    await tap(page.getByRole("button", { name: "Mazmorras", exact: true }));
    await until(() => window.__posiciones.state().screen === "menu");
  }

  await page.waitForTimeout(600);
  await shot("90-menu-after");
  await tap(page.getByRole("button", { name: /Álbum/ }).first());
  await page.getByRole("dialog", { name: "Álbum" }).waitFor();
  const a = await state();
  check(a.album >= 20, `album has ${a.album} stickers`);
  await shot("91-album");
  const firstHave = page.getByRole("dialog", { name: "Álbum" }).locator("li button").first();
  await tap(firstHave);
  await page.waitForTimeout(300);
  await shot("92-album-detail");
  await tap(page.getByRole("button", { name: "Cerrar álbum" }));
  await ctx.close();
}

for (const name of want) {
  try {
    await run(name);
  } catch (e) {
    failures.push(`${name}: ${e.message.split("\n")[0]}`);
    console.log(`  FAIL ${name}: ${e.message.split("\n")[0]}`);
  }
}
await browser.close();
if (ignored.size) console.log(`\nignored (blocked writes): ${[...ignored].slice(0, 3).join(" | ")}`);
console.log(failures.length ? `\n${failures.length} failure(s):\n${failures.join("\n")}` : "\nall good");
process.exit(failures.length ? 1 : 0);

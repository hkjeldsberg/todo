// Headless play-through of /juegos/opuestos at phone and desktop sizes:
// level select → level 1 failure (pesado shatters the bridge) → reset → level 1,
// 2 and 3 solved with real taps/clicks on objects and the radial menu → undo →
// every other level solved through the dev hook (window.__opuestos) → pause → exit.
// Screenshots go to .playtest/opuestos/. Server-action writes (progress, attempts)
// are blocked unless ALLOW_WRITES=1, so playtests never touch the review queue.
//
//   NEXT_DIST_DIR=.playtest/opuestos/next AUTH_DISABLED=1 npx next dev -p 3104   # other terminal
//   node scripts/opuestos-playtest.mjs
//   URL=http://localhost:3104 SIZES=phone node scripts/opuestos-playtest.mjs
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.URL ?? "http://localhost:3104";
const OUT = ".playtest/opuestos/";
mkdirSync(OUT, { recursive: true });

const { levels } = JSON.parse(readFileSync(new URL("../src/content/opuestos.json", import.meta.url), "utf8"));

const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const want = (process.env.SIZES ?? "phone,desktop").split(",");

// Progress/attempt server actions are blocked below; their logged failures are expected.
const IGNORED = [/\[games\] (save|attempt) opuestos failed/, /ERR_FAILED/, /Failed to load resource/, /Failed to fetch/];

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(cache)) return undefined;
  const dir = readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
  const app =
    dir && join(cache, dir, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
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
  if (!process.env.ALLOW_WRITES)
    await page.route(/\/juegos\/opuestos$/, (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));

  const hook = (fn, arg) => page.evaluate(fn, arg);
  const state = () => hook(() => window.__opuestos.state());
  const shot = (tag) => page.screenshot({ path: `${OUT}${name}-${tag}.png` });
  const until = (fn, arg, ms = 25000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 100 });
  const attempts = () => hook(() => window.__opuestos.attempts.slice());

  /** Tap (phone) or click (desktop) an object in the 3D room. */
  async function tapObject(id) {
    const box = await hook((o) => window.__opuestos.box(o), id);
    if (!box) throw new Error(`${id} not on screen`);
    const x = box.x + box.w / 2;
    const y = box.y + box.h / 2;
    if (touch) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    await until((o) => window.__opuestos.state().menu === o, id, 5000);
  }

  /** Pick a word in the open radial menu (a real tap/click on its pill). */
  async function pickWord(word) {
    const btn = page.getByRole("dialog", { name: /El rayo/ }).getByRole("button", { name: new RegExp(`^${word}:`) });
    if (touch) await btn.tap();
    else await btn.click();
    await until(() => window.__opuestos.state().menu === null, null, 5000);
  }

  async function play(levelId) {
    await hook((id) => window.__opuestos.start(id), levelId);
    await page.getByRole("button", { name: /A jugar/ }).click();
    await until((id) => window.__opuestos.state().phase === "playing" && window.__opuestos.state().level === id, levelId);
    await page.waitForTimeout(600);
  }

  async function soltar() {
    await page.getByRole("button", { name: /^Soltar/ }).click();
    await until(() => window.__opuestos.state().released);
  }

  const won = () => until(() => window.__opuestos.state().phase === "won");

  // ── Level select ────────────────────────────────────────────────────────
  await page.goto(`${BASE}/juegos/opuestos`);
  // Next's dev-only issue badge sits over the bottom-left of the screen (and the blocked
  // writes above always trip it); it isn't part of the game.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.getByRole("button", { name: /^(Empezar|Seguir jugando)/ }).waitFor({ timeout: 90000 });
  await shot("01-select");
  await hook(() => window.__opuestos.start("puente"));
  await page.getByRole("button", { name: /A jugar/ }).waitFor();
  await page.waitForTimeout(800);
  await shot("02-clue");
  await page.getByRole("button", { name: /A jugar/ }).click();
  await page.waitForTimeout(800);
  await shot("03-room");

  // ── Level 1: a failing run (pesado shatters the bridge), then reset ─────
  await tapObject("bola");
  await page.waitForTimeout(300);
  await shot("04-radial-menu");
  await pickWord("pesado");
  check((await state()).applied.some((a) => a.word === "pesado"), "tap + radial menu fired pesado at la bola");
  await page.waitForTimeout(400);
  await shot("05-label");
  await soltar();
  await until(() => window.__opuestos.state().phase === "lost");
  await page.waitForTimeout(600);
  await shot("06-fail");
  let a = await attempts();
  check(a.some((x) => x.itemRef === "pesado" && x.correct === false), "failed run records pesado as wrong");
  await page.getByRole("dialog", { name: "Try again" }).getByRole("button", { name: "Reiniciar" }).click();
  let s = await state();
  check(s.phase === "playing" && s.applied.length === 0 && !s.released, "Reiniciar restores the room");

  // ── Level 1 solved by tapping ───────────────────────────────────────────
  await tapObject("bola");
  await pickWord("ligero");
  await soltar();
  await won();
  await page.waitForTimeout(500);
  await shot("07-solved");
  a = await attempts();
  check(a.some((x) => x.itemRef === "ligero" && x.correct === true), "win records ligero as right");
  await page.getByRole("button", { name: /Siguiente/ }).click();

  // ── Level 2: the box slides, no Soltar needed; undo on the way ──────────
  await page.getByRole("button", { name: /A jugar/ }).click();
  await until(() => window.__opuestos.state().level === "rampa" && window.__opuestos.state().phase === "playing");
  await page.waitForTimeout(500);
  await tapObject("rampa");
  await pickWord("áspero");
  check((await state()).applied.length === 1, "áspero fired at la rampa");
  await page.getByRole("button", { name: "Deshacer" }).click();
  check((await state()).applied.length === 0, "Deshacer takes the word back");
  await tapObject("caja");
  await pickWord("mojado");
  await won();
  await page.waitForTimeout(400);
  await shot("08-rampa-solved");
  await page.getByRole("button", { name: /Siguiente/ }).click();

  // ── Level 3: the second solution (grande on the pipe), with the tray chip or keyboard ──
  await page.getByRole("button", { name: /A jugar/ }).click();
  await page.waitForTimeout(500);
  if (touch) {
    await page.getByRole("button", { name: /^el tubo/ }).tap();
    await until(() => window.__opuestos.state().menu === "tubo", null, 5000);
    await pickWord("grande");
  } else {
    // Keyboard only: focus the tray chip, Enter opens the ray, digit 1 fires the first word.
    await page.getByRole("button", { name: /^el tubo/ }).focus();
    await page.keyboard.press("Enter");
    await until(() => window.__opuestos.state().menu === "tubo", null, 5000);
    await page.keyboard.press("1");
    await until(() => window.__opuestos.state().menu === null, null, 5000);
  }
  await page.waitForTimeout(700);
  await shot("09-tubo-grande");
  if (touch) await soltar();
  else {
    await page.keyboard.press("Space");
    await until(() => window.__opuestos.state().released);
  }
  await won();
  s = await state();
  check(s.progress.found.tubo?.includes(1), "second solution of El tubo counted");

  // ── Every remaining level through the hook, released with the real button ──
  for (const level of levels.slice(3)) {
    await play(level.id);
    await shot(`10-${level.sort}-${level.id}`);
    const pick = level.layout.solutions[(level.sort + (touch ? 0 : 1)) % level.layout.solutions.length];
    for (const st of pick.steps.filter((x) => x.after === undefined)) {
      const okFire = await hook(([o, w]) => window.__opuestos.apply(o, w), [st.object, st.word]);
      if (!okFire) throw new Error(`${level.id}: ${st.word} → ${st.object} refused`);
    }
    await page.waitForTimeout(700);
    await shot(`10-${level.sort}-${level.id}-words`);
    if (level.layout.objects.some((o) => o.held)) await soltar();
    try {
      await won();
      check(true, `${level.id} solved (${pick.note})`);
    } catch {
      check(false, `${level.id} solved (${pick.note}), status ${JSON.stringify(await state()).slice(0, 200)}`);
    }
    await page.waitForTimeout(300);
    if (level.id === "cadena") await shot("11-final-solved");
  }
  s = await state();
  check(s.progress.solved.length === levels.length, `all ${levels.length} levels solved (${s.progress.solved.length})`);

  // ── Pause menu and exit ─────────────────────────────────────────────────
  await page.getByRole("button", { name: "Niveles" }).click();
  await page.getByRole("button", { name: /Seguir jugando/ }).waitFor();
  await page.waitForTimeout(400);
  await shot("12-select-done");
  await hook(() => window.__opuestos.start("hielo"));
  await page.getByRole("button", { name: /A jugar/ }).click();
  await page.getByRole("button", { name: "Pause and open menu" }).click();
  await page.getByRole("dialog", { name: "Paused" }).waitFor();
  await shot("13-pause");
  a = await attempts();
  check(a.every((x) => typeof x.itemRef === "string" && x.itemRef.length > 0), "attempts carry word ids");
  await page.getByRole("dialog", { name: "Paused" }).getByRole("button", { name: /Leave game/ }).click();
  await page.waitForURL(/\/juegos$/, { timeout: 30000 });
  check(true, "exit returns to /juegos");
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

if (ignored.size) console.log(`\nExpected (ignored) console errors:\n- ${[...ignored].join("\n- ")}`);
console.log(failures.length ? `\n${failures.length} problem(s):\n- ${failures.join("\n- ")}` : "\nAll good.");
process.exit(failures.length ? 1 : 0);

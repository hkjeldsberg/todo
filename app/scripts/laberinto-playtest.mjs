// Headless play-through of /juegos/laberinto at phone and desktop sizes:
// title → Tenerife (wrong door loop, then all three rooms by tapping/clicking
// doors) → island change → pause menu → El Hierro gauntlet start → exit.
// Screenshots go to .playtest/laberinto/. Uses the dev-only window.__laberinto hook.
//
//   NEXT_DIST_DIR=.next-laberinto AUTH_DISABLED=1 npx next dev -p 3102   # in another terminal
//   node scripts/laberinto-playtest.mjs
//   URL=http://localhost:3102 SIZES=phone node scripts/laberinto-playtest.mjs
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.URL ?? "http://localhost:3102";
const OUT = ".playtest/laberinto/";
mkdirSync(OUT, { recursive: true });

const nodes = JSON.parse(readFileSync(new URL("../src/content/laberinto.json", import.meta.url), "utf8"));
const byId = new Map(nodes.map((n) => [n.node_id, n]));
const correctOf = (id) => byId.get(id).doors.findIndex((d) => d.correct);
const wrongOf = (id) => byId.get(id).doors.findIndex((d) => !d.correct);

const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const want = (process.env.SIZES ?? "phone,desktop").split(",");

// Progress/attempt server actions are blocked below (so playtests never touch the real
// review queue); their logged failures are expected. Everything else is a bug.
const IGNORED = [/\[games\] (save|attempt) laberinto failed/, /ERR_FAILED/, /Failed to load resource/];

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
    else failures.push(`${name}: console ${m.text()}`);
  });

  // Server actions are POSTs to the page route: keep test answers out of the database.
  if (!process.env.ALLOW_WRITES)
    await page.route(/\/juegos\/laberinto$/, (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));

  const hook = (fn, arg) => page.evaluate(fn, arg);
  const state = () => hook(() => window.__laberinto.state());
  const shot = (tag) => page.screenshot({ path: `${OUT}${name}-${tag}.png` });
  const until = async (fn, arg, ms = 12000) => {
    await page.waitForFunction(fn, arg, { timeout: ms, polling: 100 });
  };

  /** Tap (phone) or click (desktop) the door on screen; falls back to the hook while the mouse is locked. */
  async function pressDoor(i) {
    const locked = await hook(() => !!document.pointerLockElement);
    const at = await hook((d) => window.__laberinto.doorScreen(d), i);
    if (!at) throw new Error(`door ${i} not on screen`);
    if (touch) await page.touchscreen.tap(at.x, at.y);
    else if (!locked) await page.mouse.click(at.x, at.y);
    else await hook((d) => window.__laberinto.walkTo(d), i);
  }

  async function walkThrough(i) {
    const before = (await state()).spawn;
    await pressDoor(i);
    await until((s) => window.__laberinto.state().spawn > s, before);
  }

  async function continueBanner() {
    await page.getByRole("button", { name: /Continue/ }).click();
    await until(() => !window.__laberinto.state().banner);
  }

  await page.goto(`${BASE}/juegos/laberinto`);
  await page.getByRole("button", { name: /^(Start|Continue)/ }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(500);
  await shot("01-title");

  // Level select: Tenerife is always open, whatever progress is saved.
  await page.getByRole("button", { name: /^Tenerife/ }).click();
  await until(() => window.__laberinto?.state().screen === "playing");
  await page.waitForTimeout(2500); // sign textures wait for the fonts
  await shot("02-room");
  let s = await state();
  check(s.nodeId === "tf_botanico_01", `starts in tf_botanico_01 (got ${s.nodeId})`);

  // Wrong door: loop back into the same room with the rule painted on it.
  const m0 = s.mistakes;
  const w = wrongOf(s.nodeId);
  await walkThrough(w);
  await page.waitForTimeout(600);
  await shot("04-paradox");
  s = await state();
  check(s.nodeId === "tf_botanico_01" && s.failed.includes(w), "wrong door loops back and marks the door");
  check(s.banner?.kind === "paradox" && s.mistakes === m0 + 1, "paradox bubble shown, one mistake");
  // Tap the bubble away; with the mouse locked it auto-dismisses instead.
  if (touch || !(await hook(() => !!document.pointerLockElement)))
    await page.getByRole("alert").filter({ hasText: "Paradoja" }).click();
  await until(() => !window.__laberinto.state().banner);

  // Movement (after the loop respawned us): joystick (phone) or W (desktop) walks forward.
  // The correct door here is the middle one, so it stays on screen afterwards.
  const z0 = (await hook(() => window.__laberinto.camera()))[2];
  if (touch) {
    const cdp = await ctx.newCDPSession(page);
    const pt = (x, y) => [{ x, y, id: 1 }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(90, 700) });
    for (let k = 1; k <= 6; k++)
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pt(90, 700 - k * 10) });
    await page.waitForTimeout(250);
    await shot("03-joystick");
    await page.waitForTimeout(350);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(600);
    await page.keyboard.up("KeyW");
  }
  const z1 = (await hook(() => window.__laberinto.camera()))[2];
  check(z1 < z0 - 0.3, `${touch ? "joystick" : "W key"} walks forward (z ${z0.toFixed(2)} → ${z1.toFixed(2)})`);

  // Solve Tenerife.
  for (const id of ["tf_botanico_01", "tf_botanico_02", "tf_botanico_03"]) {
    await walkThrough(correctOf(id));
    await page.getByRole("button", { name: /Continue/ }).waitFor();
    await page.waitForTimeout(700);
    if (id === "tf_botanico_01") await shot("05-correct");
    if (id === "tf_botanico_03") await shot("06-island-change");
    await continueBanner();
  }
  s = await state();
  check(s.nodeId === "gc_dunas_01", `Tenerife cleared, now in ${s.nodeId}`);
  check(["tf_botanico_01", "tf_botanico_02", "tf_botanico_03"].every((id) => s.solved.includes(id)), "Tenerife rooms solved");
  await page.waitForTimeout(1500);
  await shot("07-gran-canaria");

  // Pause menu.
  // Esc releases pointer lock natively; headless ignores a synthetic Esc, so release it directly.
  if (!touch && (await hook(() => !!document.pointerLockElement))) await hook(() => document.exitPointerLock());
  else await page.getByRole("button", { name: "Pause" }).click();
  await page.getByRole("dialog", { name: "Paused" }).waitFor();
  await shot("08-pause");
  await page.getByRole("button", { name: "Resume" }).click();
  await page.getByRole("dialog", { name: "Paused" }).waitFor({ state: "detached" });

  // El Hierro gauntlet: from the last La Gomera room.
  await hook(() => window.__laberinto.start("lg_garajonay_03"));
  await until(() => window.__laberinto.state().nodeId === "lg_garajonay_03");
  await page.waitForTimeout(1500);
  await walkThrough(correctOf("lg_garajonay_03"));
  await continueBanner();
  s = await state();
  check(!!s.gauntlet && s.gauntlet.queue.length === 8, "gauntlet started with 8 rooms");
  await page.waitForTimeout(2000);
  const t0 = (await state()).gauntlet.timeLeft;
  check(t0 < 90, `gauntlet clock runs (${t0.toFixed(1)}s left)`);
  await shot("09-gauntlet");
  await walkThrough(wrongOf(s.nodeId));
  const t1 = (await state()).gauntlet.timeLeft;
  check(t0 - t1 >= 8, `wrong door costs 8s (${t0.toFixed(1)} → ${t1.toFixed(1)})`);
  await page.waitForTimeout(600);
  await shot("10-gauntlet-paradox");

  const attempts = await hook(() => window.__laberinto.attempts);
  check(attempts.length === 6, `recordAttempt called for every door (${attempts.length})`);
  check(attempts.filter((a) => !a.correct).length === 2, "two wrong attempts recorded");
  check(attempts.every((a) => byId.has(a.itemRef) && typeof a.answer === "string"), "attempts carry node_id + door text");

  // Exit. Phone: the sticker chip. Desktop: Esc (released lock) opens the pause menu → Exit.
  if (touch) await page.getByRole("button", { name: "Back to games" }).click();
  else {
    await hook(() => document.pointerLockElement && document.exitPointerLock());
    await page.getByRole("button", { name: "Exit to games" }).click();
  }
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

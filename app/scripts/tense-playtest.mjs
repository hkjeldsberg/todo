// Headless play-through of The Memory Diorama (/juegos/tense) against a running dev
// server: for each room and viewport, tap every memory, answer wrong then right, and
// check that the room completes. Screenshots go to $OUT. Needs a Chromium build
// (Playwright's cache is used if present, or set CHROMIUM_PATH).
//
//   NEXT_DIST_DIR=.next-tense AUTH_DISABLED=1 npx next dev -p 3101   # in another terminal
//   node scripts/tense-playtest.mjs
//   ROOMS=aula,fiesta SIZES=390x844 OUT=.playtest/x node scripts/tense-playtest.mjs
//
// Progress is seeded through the dev-only `window.__tenseProgress` hook (Game.tsx) and
// objects are found through `window.__tenseSlots` (slot.tsx), which returns CSS px.
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const URL = process.env.URL ?? "http://localhost:3101/juegos/tense";
const OUT = process.env.OUT ?? ".playtest/tense";
const SIZES = (process.env.SIZES ?? "390x844,1440x900").split(",").map((s) => s.split("x").map(Number));
mkdirSync(OUT, { recursive: true });

const { rooms } = JSON.parse(readFileSync("src/content/tense.json", "utf8"));
const want = (process.env.ROOMS ?? rooms.map((r) => r.id).join(",")).split(",");

// The todo schema may not be applied yet: the host's save/attempt calls then fail. Expected.
const IGNORED = /\[games\] (save|attempt) tense failed|ERR_FAILED|Failed to load resource/;

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
const errors = [];

async function playRoom(id, [W, H]) {
  const idx = rooms.findIndex((r) => r.id === id);
  if (idx < 0) return errors.push(`unknown room ${id}`);
  const room = rooms[idx];
  const mobile = W < 640;
  const tag = `${W}x${H}-${String(room.order_index).padStart(2, "0")}-${id}`;
  const fail = (msg) => errors.push(`${tag}: ${msg}`);

  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: mobile ? 2 : 1,
    hasTouch: mobile,
    isMobile: mobile,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => fail(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !IGNORED.test(m.text())) fail(m.text());
  });
  // Unlock the room by marking all earlier rooms complete.
  await page.addInitScript(
    ([done, last]) => {
      window.__tenseProgress = { solved: [], completedRooms: done, mistakes: {}, lastRoom: last };
    },
    [rooms.slice(0, idx).map((r) => r.id), id],
  );
  await page.goto(URL);
  await page.getByRole("button", { name: /Enter the memory|Keep remembering/ }).click({ timeout: 60000 });
  await page.waitForTimeout(1200);
  if (!(await page.getByRole("heading", { name: room.title }).isVisible())) fail("room card not showing the room title");
  await page.screenshot({ path: join(OUT, `${tag}-a-start.png`) });

  const tap = (x, y) => (mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
  for (const [n, pz] of room.puzzles.entries()) {
    const pos = await page.evaluate((o) => window.__tenseSlots?.[o]?.(), pz.scene_object);
    if (!pos) {
      fail(`no 3D object for scene_object "${pz.scene_object}"`);
      continue;
    }
    const [x, y] = pos;
    if (x < 0 || y < 0 || x > W || y > H) fail(`${pz.scene_object} is off screen at ${x.toFixed(0)},${y.toFixed(0)}`);
    await tap(x, y);
    await page.waitForTimeout(300);
    const dialog = page.getByRole("dialog", { name: "Memory fragment" });
    if (!(await dialog.isVisible())) {
      fail(`tapping ${pz.scene_object} at ${x.toFixed(0)},${y.toFixed(0)} opened no prompt`);
      continue;
    }
    if (!(await dialog.textContent()).includes(pz.verb_base)) fail(`${pz.scene_object} opened the wrong puzzle`);
    const option = (form) => dialog.locator("button").filter({ has: page.locator("[data-form]", { hasText: new RegExp(`^${form}$`) }) });
    await option(pz.options.find((o) => !o.correct).form).click();
    if (!(await dialog.getByRole("alert").isVisible())) fail(`no rule feedback after a wrong answer on ${pz.scene_object}`);
    if (n === 0) await page.screenshot({ path: join(OUT, `${tag}-a-prompt-wrong.png`) });
    await option(pz.options.find((o) => o.correct).form).click();
    if (n === 0) await page.screenshot({ path: join(OUT, `${tag}-a-prompt-right.png`) });
    await dialog.getByRole("button", { name: /Watch it happen/ }).click();
    await page.waitForTimeout(1700);
  }

  await page.waitForTimeout(1500);
  if (await page.getByText("¡Memoria reconstruida!").isVisible()) {
    await page.screenshot({ path: join(OUT, `${tag}-b-complete.png`) });
    await page.getByRole("button", { name: /Stay here|Enjoy the room/ }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, `${tag}-c-done.png`) });
  } else {
    fail("room-complete dialog not shown");
    await page.screenshot({ path: join(OUT, `${tag}-c-incomplete.png`) });
  }

  // Once per viewport: the pause menu, then the back chip leaves the game.
  if (idx === rooms.findIndex((r) => want.includes(r.id))) {
    await page.getByRole("button", { name: "Pause and open menu" }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, `${tag}-d-menu.png`) });
    await page.getByRole("button", { name: "Resume" }).click();
    await page.getByRole("button", { name: "Back to games" }).click();
    await page.waitForURL(/\/juegos\/?$/, { timeout: 30000 }).catch(() => fail("back chip did not return to /juegos"));
  }
  await context.close();
  console.log(`${tag}: done`);
}

for (const size of SIZES) for (const id of want) await playRoom(id, size);

await browser.close();
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`\nAll ${want.length} room(s) played at ${SIZES.map((s) => s.join("x")).join(", ")}. Screenshots in ${OUT}`);

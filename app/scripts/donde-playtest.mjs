// Headless play-through of Dónde against a running dev server, at phone and desktop size.
// Drives real pointer drags/taps for several tasks (via screen positions from the dev-only
// window.__dondeScene hook) and the dev-only window.__donde.solve() for the rest.
// Screenshots go to .playtest/donde/.
//
//   NEXT_DIST_DIR=.next-donde AUTH_DISABLED=1 npx next dev -p 3103   # in another terminal
//   node scripts/donde-playtest.mjs                                    # URL=http://localhost:3103 VIEWPORTS=390x844,1440x900
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const URL = process.env.URL ?? "http://localhost:3103";
const OUT = ".playtest/donde/";
const VIEWPORTS = (process.env.VIEWPORTS ?? "390x844,1440x900").split(",").map((v) => v.split("x").map(Number));
const IGNORE = /\[games\] (save|attempt) donde failed|ERR_FAILED|Download the React DevTools|THREE\.WebGLRenderer: Context Lost/;
mkdirSync(OUT, { recursive: true });

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
const log = (...a) => console.log(...a);

const state = (page) => page.evaluate(() => window.__donde.state());
const wait = (page, ms) => page.waitForTimeout(ms);
const zone = (page, id, i = 0) => page.evaluate(([z, n]) => window.__dondeScene?.zone(z, n) ?? null, [id, i]);
const piece = (page, id) => page.evaluate((p) => window.__dondeScene?.piece(p) ?? null, id);

async function drag(page, from, to, shot) {
  await page.mouse.move(from[0], from[1]);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(from[0] + ((to[0] - from[0]) * i) / 12, from[1] + ((to[1] - from[1]) * i) / 12);
    await wait(page, 16);
  }
  await wait(page, 120);
  if (shot) await page.screenshot({ path: shot });
  await page.mouse.up();
  await wait(page, 500);
}

async function tap(page, at) {
  await page.mouse.click(at[0], at[1]);
  await wait(page, 600);
}

async function solveTask(page, id) {
  for (let i = 0; i < 8; i++) {
    const s = await state(page);
    if (s.task !== id) return true;
    await page.evaluate(() => window.__donde.solve());
    await wait(page, 350);
  }
  return (await state(page)).task !== id;
}

/** Real pointer interactions for a handful of tasks; returns true if the task got solved that way. */
async function playReal(page, s, tag) {
  const id = s.task;
  if (id === "apt_toys") {
    // Wrong drop first: a toy on top of the box snaps back with a red note.
    const bear = await piece(page, "toy_bear");
    const lid = await zone(page, "zone_on_box");
    if (bear && lid) {
      await drag(page, bear, lid);
      const after = await state(page);
      log(`   wrong drop → note: ${after.note ? "yes" : "no"}`);
      if (!after.note) errors.push(`${tag}: wrong drop showed no note`);
      await page.screenshot({ path: `${OUT}${tag}-apt_toys-wrong.png` });
    }
    for (const p of ["toy_bear", "toy_ball", "toy_yoyo"]) {
      const from = await piece(page, p);
      const to = await zone(page, "zone_inside_box");
      if (from && to) await drag(page, from, to);
    }
    return (await state(page)).task !== id;
  }
  if (id === "apt_cat") {
    const wrong = await zone(page, "flap_on_sofa");
    if (wrong) {
      await tap(page, wrong);
      await page.screenshot({ path: `${OUT}${tag}-apt_cat-wrong.png` });
    }
    const right = await zone(page, "flap_under_sofa");
    if (right) await tap(page, right);
    await wait(page, 600);
    return (await state(page)).task !== id;
  }
  if (id === "apt_cat_label") {
    // "Hay" + "el gato" must be physically rejected.
    await page.locator('[data-token="hay"]').click();
    await page.locator('[data-slot="0"]').click();
    await page.locator('[data-token="el gato"]').click();
    await page.locator('[data-slot="1"]').click();
    await wait(page, 300);
    const after = await state(page);
    log(`   "Hay el gato" rejected → note: ${after.note?.slice(0, 40)}`);
    if (!after.note || !/definite/i.test(after.note)) errors.push(`${tag}: "Hay el gato" was not rejected`);
    await page.screenshot({ path: `${OUT}${tag}-apt_cat_label-rejected.png` });
    await page.locator('[data-token="un gato"]').click();
    await page.locator('[data-slot="1"]').click();
    await wait(page, 400);
    return (await state(page)).task !== id;
  }
  if (id === "apt_backpack") {
    const from = await piece(page, "backpack");
    const to = await zone(page, "zone_on_bed");
    if (from && to) await drag(page, from, to, `${OUT}${tag}-apt_backpack-dragging.png`);
    return (await state(page)).task !== id;
  }
  if (id === "plaza_chairs") {
    for (let k = 0; k < 6; k++) {
      const st = await state(page);
      if (st.task !== id) break;
      const loose = [1, 2, 3, 4].map((i) => `chair_${i}`).find((p) => st.placed[p]?.zone !== "zone_around_table");
      const used = new Set(Object.values(st.placed).filter((p) => p.zone === "zone_around_table").map((p) => p.slot));
      const slot = [0, 1, 2, 3].find((i) => !used.has(i));
      const from = await piece(page, loose);
      const to = await zone(page, "zone_around_table", slot);
      if (from && to) await drag(page, from, to, k === 0 ? `${OUT}${tag}-plaza_chairs-dragging.png` : undefined);
    }
    return (await state(page)).task !== id;
  }
  if (id === "map_pharmacy" || id === "map_hotel") {
    const target = id === "map_pharmacy" ? "pin_across_park" : "pick_hotel_end";
    const at = await zone(page, target);
    if (at) await tap(page, at);
    return (await state(page)).task !== id;
  }
  return false;
}

for (const [W, H] of VIEWPORTS) {
  const vp = `${W}x${H}`;
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => errors.push(`${vp}: ${e}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !IGNORE.test(m.text())) errors.push(`${vp}: ${m.text()}`);
  });
  await page.goto(`${URL}/juegos/donde`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__donde && window.__dondeScene, null, { timeout: 90000 });
  await page.evaluate(() => window.__donde.reset());
  await wait(page, 2500);
  await page.screenshot({ path: `${OUT}${vp}-00-start.png` });

  // Camera: rotate once each way and zoom, to exercise the rig and the wall cutaway.
  await page.getByRole("button", { name: "Rotate right" }).click();
  await wait(page, 1200);
  await page.screenshot({ path: `${OUT}${vp}-01-rotated.png` });
  await page.getByRole("button", { name: "Rotate left" }).click();
  await wait(page, 1000);
  // Swipe on empty table space rotates a quarter turn; the wheel zooms.
  const before = await page.evaluate(() => window.__donde.view.step);
  await drag(page, [30, H * 0.45], [30 + Math.min(260, W * 0.6), H * 0.45]);
  const after = await page.evaluate(() => window.__donde.view.step);
  if (after === before) errors.push(`${vp}: swipe did not rotate`);
  await wait(page, 900);
  await page.screenshot({ path: `${OUT}${vp}-02-swiped.png` });
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.wheel(0, -400);
  await wait(page, 300);
  const zoom = await page.evaluate(() => window.__donde.view.zoom);
  if (!(zoom > 1)) errors.push(`${vp}: wheel did not zoom`);
  await page.evaluate(() => {
    window.__donde.view.zoom = 1;
    window.__donde.view.step = 0;
  });
  await wait(page, 900);

  const realSolved = [];
  let guard = 0;
  while (guard++ < 40) {
    const s = await state(page);
    if (!s.task) {
      const next = page.getByRole("button", { name: "Next page ▸" });
      if (await next.count()) {
        await page.screenshot({ path: `${OUT}${vp}-page${s.page + 1}-complete.png` });
        await next.click();
        await wait(page, 2200);
        await page.screenshot({ path: `${OUT}${vp}-page${s.page + 2}-start.png` });
        continue;
      }
      break;
    }
    const tag = `${vp}-p${s.page + 1}`;
    log(`${vp} ${s.task} (${s.mechanic})`);
    if (s.task === "apt_clothes") {
      // Upstairs pick: use the real floor toggle first.
      await page.getByRole("button", { name: "arriba" }).click();
      await wait(page, 1500);
      await page.screenshot({ path: `${OUT}${tag}-upstairs.png` });
      const at = await zone(page, "pick_clothes_upstairs");
      if (at) await tap(page, at);
    }
    let ok = (await state(page)).task !== s.task;
    if (!ok) {
      ok = await playReal(page, s, tag);
      if (ok) realSolved.push(s.task);
    } else realSolved.push(s.task);
    if (!ok) ok = await solveTask(page, s.task);
    if (!ok) {
      errors.push(`${vp}: could not solve ${s.task}`);
      break;
    }
    await wait(page, 500);
    await page.screenshot({ path: `${OUT}${tag}-${s.task}-done.png` });
  }

  const end = await state(page);
  log(`${vp}: done ${end.done.length}/15 · real pointer: ${realSolved.join(", ")}`);
  if (end.done.length !== 15) errors.push(`${vp}: finished with ${end.done.length}/15`);
  await page.screenshot({ path: `${OUT}${vp}-99-end.png` });
  await page.close();
}

await browser.close();
if (errors.length) {
  console.error("\nPLAYTEST ERRORS:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("\nplaytest OK");

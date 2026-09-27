/**
 * Headless check of Cuentos: library → reader → word card (hover on desktop, tap
 * on phone) → reflexive / subjunctive links → Shift sentence → toolbar toggle.
 * Read-only: never generates or saves (no Claude calls, no DB writes).
 *
 *   NEXT_DIST_DIR=.playtest/next AUTH_DISABLED=1 npx next dev -p 3105
 *   URL=http://localhost:3105 node scripts/cuentos-playtest.mjs
 */
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { chromium } from "playwright-core";

const BASE = process.env.URL ?? "http://localhost:3105";
const OUT = new URL("../.playtest/cuentos/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const exe = `${homedir()}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? exe });
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) failures++;
};

for (const [width, height, tag, touch] of [
  [390, 844, "phone", true],
  [1440, 900, "desktop", false],
]) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && !/\[games\]|Failed to load resource/.test(m.text()) && errors.push(m.text()));

  await page.goto(`${BASE}/juegos/cuentos`, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByRole("heading", { name: "Cuentos" }).waitFor();
  await page.screenshot({ path: `${OUT}${tag}-01-library.png` });
  check((await page.getByRole("button", { name: /^Read / }).count()) > 0, `${tag}: library lists stories`);

  await page.getByRole("button", { name: /^Read / }).first().click();
  await page.getByRole("toolbar", { name: "Tense highlights" }).waitFor({ timeout: 30000 });
  await page.screenshot({ path: `${OUT}${tag}-02-reader.png`, fullPage: true });

  // A preterite verb: the first "levantaron"-style reflexive verb, and a subjunctive.
  const word = (text) => page.locator("[data-token]", { hasText: new RegExp(`^${text}$`) }).first();
  const open = async (text) => {
    const el = word(text);
    await el.scrollIntoViewIfNeeded();
    if (touch) await el.tap();
    else await el.hover();
    await page.getByRole("dialog").waitFor({ timeout: 5000 });
  };

  await open("levantaron");
  const card = page.getByRole("dialog");
  check(/got up/.test(await card.innerText()), `${tag}: reflexive verb shows the pair's meaning`);
  check((await page.locator("[data-token].outline-dashed").count()) >= 1, `${tag}: its pronoun lights up with it`);
  await page.screenshot({ path: `${OUT}${tag}-03-reflexive.png` });

  if (touch) {
    await page.getByRole("button", { name: "Close" }).tap();
  } else {
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
  }

  await open("haya");
  check(/because of «Espero»/.test(await page.getByRole("dialog").innerText()), `${tag}: subjunctive names its trigger`);
  check((await page.locator("[data-token].outline-dashed").count()) >= 1, `${tag}: the trigger lights up`);

  if (touch) {
    await page.getByRole("button", { name: "Frase" }).tap();
  } else {
    await page.keyboard.down("Shift");
  }
  await page.waitForTimeout(200);
  check(/I hope there is/.test(await page.getByRole("dialog").innerText()), `${tag}: sentence translation shows`);
  await page.screenshot({ path: `${OUT}${tag}-04-subjunctive-sentence.png` });
  if (!touch) await page.keyboard.up("Shift");

  // Toolbar: turning Pretérito off removes its wash.
  const pret = page.getByRole("button", { name: "Pretérito" });
  const before = await page.locator("[data-token][style*='219, 232, 255'], [data-token][style*='#dbe8ff']").count();
  if (touch) await pret.tap();
  else await pret.click();
  const after = await page.locator("[data-token][style*='219, 232, 255'], [data-token][style*='#dbe8ff']").count();
  check(before > 0 && after === 0, `${tag}: Pretérito toggle (${before} → ${after})`);

  check(errors.length === 0, `${tag}: no console errors${errors.length ? `: ${errors.join(" | ").slice(0, 300)}` : ""}`);
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} failure(s)` : "\nAll good");
process.exit(failures ? 1 : 0);

// Headless play-through of /juegos/probador (El Probador) at phone and desktop sizes:
// a full 30-prompt sprint with one miss (freeze, notes, re-asked ~8 outfits later), one
// 5-second hesitation (the right piece pulses), one undo, then the summary and an empty
// "today" (the intervals themselves are unit-tested). Server-action writes are blocked
// unless ALLOW_WRITES=1. Screenshots go to .playtest/probador/.
//
//   NEXT_DIST_DIR=.playtest/next-probador AUTH_DISABLED=1 npx next dev -p 3109   # other terminal
//   node scripts/probador-playtest.mjs
//   URL=http://localhost:3109 SIZES=phone node scripts/probador-playtest.mjs
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.URL ?? "http://localhost:3109";
const OUT = ".playtest/probador/";
mkdirSync(OUT, { recursive: true });

const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const want = (process.env.SIZES ?? "phone,desktop").split(",");
const IGNORED = [/\[games\] attempt probador failed/, /ERR_FAILED/, /Failed to load resource/, /Failed to fetch/];
const { prompts } = JSON.parse(readFileSync("src/content/probador.json", "utf8"));
const byId = (id) => prompts.find((p) => p.id === id);

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(cache)) return undefined;
  const dir = readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
  const app = dir && join(cache, dir, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
  return app && existsSync(app) ? app : undefined;
}

const browser = await chromium.launch({ executablePath: chromiumPath() });
const failures = [];
const check = (cond, msg) => {
  if (!cond) failures.push(msg);
  console.log(`${cond ? "  ok " : "  FAIL"} ${msg}`);
};

async function run(name) {
  console.log(`\n[${name}]`);
  const ctx = await browser.newContext(SIZES[name]);
  const page = await ctx.newPage();
  const touch = !!SIZES[name].hasTouch;
  const tap = (loc) => (touch ? loc.tap() : loc.click());
  page.on("pageerror", (e) => failures.push(`${name}: pageerror ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !IGNORED.some((re) => re.test(m.text()))) failures.push(`${name}: console ${m.text()}`);
  });
  if (!process.env.ALLOW_WRITES) await page.route(/\/juegos\/probador$/, (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));
  await page.addInitScript(() => {
    new MutationObserver(() => document.querySelector("nextjs-portal")?.remove()).observe(document, { childList: true, subtree: true });
  });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

  await page.goto(`${BASE}/juegos/probador`, { waitUntil: "networkidle" });
  await page.getByTestId("probador-today").waitFor();
  check((await page.getByTestId("probador-today").innerText()) === "30 new", `${name}: home offers 30 new prompts`);
  check(!(await overflow()), `${name}: home has no horizontal scroll`);
  await page.screenshot({ path: `${OUT}${name}-home.png`, fullPage: true });

  await tap(page.getByRole("button", { name: /^Start/ }));
  const options = page.getByTestId("probador-options");
  const pickOption = async (text) => tap(options.getByRole("button", { name: text, exact: true }));
  const progress = () => page.getByTestId("probador-progress").innerText();

  let missedId = null;
  let missedAt = -1;
  let sawRetry = false;
  for (let n = 0; n < 40; n++) {
    if (await page.getByTestId("probador-score").isVisible()) break;
    const root = page.locator("[data-prompt]");
    const id = await root.getAttribute("data-prompt");
    const p = byId(id);
    const { pronoun, verb, complement } = p.answer_parts;
    const before = await progress();
    const retry = id === missedId && n > missedAt;
    if (retry) {
      sawRetry = true;
      check(n - missedAt >= 8, `${name}: ${id} came back ${n - missedAt} outfits later`);
    }

    if (n === 0) {
      // Stage takes ~60% of the screen.
      const stage = await root.locator("> div").first().boundingBox();
      const vh = SIZES[name].viewport.height;
      check(stage.height / vh > 0.5 && stage.height / vh < 0.62, `${name}: stage is ${Math.round((stage.height / vh) * 100)}% of the height`);
      await page.screenshot({ path: `${OUT}${name}-card.png` });
      // A miss: wrong pronoun.
      await pickOption(p.distractor_options.pronoun[0]);
      await pickOption(verb);
      await pickOption(complement);
      await page.getByRole("button", { name: "Got it →" }).waitFor();
      await page.waitForTimeout(600);
      const status = await page.getByRole("status").innerText();
      check(status.includes(`${pronoun} ${verb} ${complement}.`), `${name}: miss shows the right sentence`);
      check((await page.locator("[data-testid=probador-answer] .line-through").count()) === 1, `${name}: only the pronoun is marked wrong`);
      await page.screenshot({ path: `${OUT}${name}-miss.png` });
      await tap(page.getByRole("button", { name: "Got it →" }));
      missedId = id;
      missedAt = n;
    } else {
      if (n === 1) {
        // Hesitate: after 5 s the right pronoun pulses.
        await page.waitForTimeout(5400);
        const hinted = await options.locator("[data-hint]").allInnerTexts();
        check(hinted.length === 1 && hinted[0] === pronoun, `${name}: hesitation pulses "${pronoun}" (${hinted.join(",")})`);
        await page.screenshot({ path: `${OUT}${name}-hint.png` });
      }
      if (n === 2) {
        // Undo: a wrong pronoun, tapped away again.
        await pickOption(p.distractor_options.pronoun[0]);
        await tap(page.getByTestId("probador-answer").getByRole("button", { name: p.distractor_options.pronoun[0], exact: true }));
        check((await options.getByRole("button").count()) === p.distractor_options.pronoun.length + 1, `${name}: undo goes back to the pronoun step`);
      }
      await pickOption(pronoun);
      await pickOption(verb);
      await pickOption(complement);
      if (n === 3) {
        await page.getByRole("status").waitFor();
        check((await page.getByRole("status").innerText()).includes("¡Eso es!"), `${name}: right answer acknowledged`);
        await page.screenshot({ path: `${OUT}${name}-right.png` });
      }
      // Right answers advance on their own.
      await page.waitForFunction(
        (prev) => document.querySelector("[data-testid=probador-score]") || document.querySelector("[data-testid=probador-progress]")?.textContent !== prev,
        before,
        { timeout: 5000 },
      );
    }
  }
  await page.getByTestId("probador-score").waitFor();
  check(sawRetry, `${name}: the missed prompt was re-asked`);
  check((await page.getByTestId("probador-score").innerText()).startsWith("29 / 30"), `${name}: 29 / 30 right first time`);
  check(!(await overflow()), `${name}: summary has no horizontal scroll`);
  await page.screenshot({ path: `${OUT}${name}-summary.png`, fullPage: true });

  await tap(page.getByRole("button", { name: "Fitting room" }).first());
  check((await page.getByTestId("probador-today").innerText()) === "All caught up", `${name}: nothing due right after`);
  await ctx.close();
}

for (const name of want) await run(name);
await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} failure(s):\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("\nall ok");

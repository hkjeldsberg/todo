// Headless play-through of El Cómic Dinámico (/juegos/was) against a running dev server:
// for each page and viewport, drop a wrong verb (tooltip + bounce back), then solve every
// panel — by mouse drag on desktop, by tap-to-place on touch — and check the page
// completes, replays and shows as done on the cover. Screenshots go to $OUT.
//
//   NEXT_DIST_DIR=.next-was AUTH_DISABLED=1 npx next dev -p 3105   # in another terminal
//   node scripts/was-playtest.mjs
//   PAGES=el_robo_01 SIZES=390x844 OUT=.playtest/x node scripts/was-playtest.mjs
//
// With Supabase configured the attempts and progress are written to the DB (see README).
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const URL = process.env.URL ?? "http://localhost:3105/juegos/was";
const OUT = process.env.OUT ?? ".playtest/was";
const SIZES = (process.env.SIZES ?? "390x844,1440x900").split(",").map((s) => s.split("x").map(Number));
mkdirSync(OUT, { recursive: true });

const { panels } = JSON.parse(readFileSync("src/content/was.json", "utf8"));
const pages = Map.groupBy(
  panels.toSorted((a, b) => a.page_id.localeCompare(b.page_id) || a.panel_order - b.panel_order),
  (p) => p.page_id,
);
const want = (process.env.PAGES ?? [...pages.keys()].join(",")).split(",");

// Without the todo schema / DB env the host's save/attempt calls fail. Expected.
const IGNORED = /\[games\] (save|attempt) was failed|ERR_FAILED|Failed to load resource/;

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(cache)) return undefined;
  const dir = readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
  const app = dir && join(cache, dir, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
  return app && existsSync(app) ? app : undefined;
}

const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const title = (id) =>
  id
    .replace(/_\d+$/, "")
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

/** Brings panel `i` just under the top edge, so it and the sticky bank are both on screen. */
async function showPanel(page, i) {
  await page.evaluate((n) => {
    const r = document.querySelectorAll("section[data-drop]")[n].getBoundingClientRect();
    window.scrollBy(0, r.top - 80);
  }, i);
  await page.waitForTimeout(250);
}

async function drag(page, verb, i) {
  await showPanel(page, i);
  const chip = await page.getByRole("button", { name: verb, exact: true }).boundingBox();
  const panel = await page.locator("section[data-drop]").nth(i).boundingBox();
  await page.mouse.move(chip.x + chip.width / 2, chip.y + chip.height / 2);
  await page.mouse.down();
  await page.mouse.move(panel.x + panel.width / 2, panel.y + Math.min(panel.height / 2, 200), { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(900);
}

async function tapPlace(page, verb, i) {
  await showPanel(page, i);
  await page.getByRole("button", { name: verb, exact: true }).tap();
  await page.getByRole("button", { name: `Blank in panel ${i + 1}` }).tap();
  await page.waitForTimeout(900);
}

const counter = async (page) => (await page.getByTestId("was-progress").innerText()).split(/\s/)[0];

async function playPage(id, [W, H]) {
  const rows = pages.get(id);
  if (!rows) return errors.push(`unknown page ${id}`);
  const mobile = W < 640;
  const tag = `${W}x${H}-${id}`;
  const fail = (msg) => errors.push(`${tag}: ${msg}`);

  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: mobile ? 2 : 1,
    hasTouch: mobile,
    isMobile: mobile,
  });
  const page = await context.newPage();
  // Without a DB every save/attempt errors (expected, filtered below); the dev overlay
  // it raises would swallow taps. Real errors still arrive via pageerror / console.
  await page.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.head.append(style);
    });
  });
  page.on("pageerror", (e) => fail(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !IGNORED.test(m.text())) fail(m.text());
  });

  await page.goto(URL);
  const open = page.getByRole("button", { name: new RegExp(`^${title(id)} →`) });
  await open.waitFor({ timeout: 60000 });
  await page.screenshot({ path: join(OUT, `${tag}-a-cover.png`) });
  await open.click();
  await page.getByTestId("was-progress").waitFor();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: join(OUT, `${tag}-b-start.png`) });

  const place = mobile ? tapPlace : drag;

  // Wrong verb on the first panel: tooltip, nothing solved.
  const first = rows[0];
  const wrong = ["era", "estaba", "fue", "estuve"].find((v) => v !== first.correct_verb);
  await place(page, wrong, 0);
  const tip = page.getByRole("status").filter({ hasText: "doesn't fit here" });
  if (!(await tip.isVisible())) fail(`no tooltip after dropping "${wrong}" on panel 1`);
  if ((await counter(page)) !== `0/${rows.length}`) fail("a wrong verb counted as solved");
  await page.screenshot({ path: join(OUT, `${tag}-c-wrong.png`) });
  if (await page.locator('[role="toolbar"] [aria-pressed="true"]').count()) fail("wrong verb still selected");

  for (const [i, p] of rows.entries()) {
    await place(page, p.correct_verb, i);
    const got = await counter(page);
    if (got !== `${i + 1}/${rows.length}`) fail(`after panel ${i + 1} (${p.correct_verb}) counter shows ${got}`);
  }
  const done = page.getByText("¡Caso cerrado!");
  if (!(await done.isVisible())) fail("no completion card");
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, `${tag}-d-done.png`), fullPage: true });

  await page.getByRole("button", { name: "Otra vez" }).click();
  await page.waitForTimeout(400);
  if ((await counter(page)) !== `0/${rows.length}`) fail("Otra vez did not clear the page");

  await page.getByRole("button", { name: "← Cómics" }).click();
  if (!(await page.getByRole("button", { name: new RegExp(`^${title(id)} →.*Caso cerrado`) }).isVisible())) {
    fail("cover does not show the page as completed");
  }
  await context.close();
  console.log(`${tag}: played`);
}

for (const size of SIZES) for (const id of want) await playPage(id, size);
await browser.close();

if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`\nAll good. Screenshots in ${OUT}`);

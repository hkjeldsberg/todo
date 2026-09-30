// Headless play-through of /juegos/pasado (El Candado del Tiempo) at phone and desktop
// sizes. The browser clock is fast-forwarded between sessions so verbs climb the Leitner
// boxes until the Syntax Scrambler (box 4+) shows up. Covers: the drawer (from the nav and
// from "Table"), a wrong tense (retry later in the session), a missing accent, correct
// typed answers, word blocks by tap (phone) and tap + drag-reorder (desktop), the summary.
// Server-action writes are blocked unless ALLOW_WRITES=1. Screenshots go to .playtest/pasado/.
//
//   NEXT_DIST_DIR=.playtest/next-pasado AUTH_DISABLED=1 npx next dev -p 3108   # other terminal
//   node scripts/pasado-playtest.mjs
//   URL=http://localhost:3108 SIZES=phone node scripts/pasado-playtest.mjs
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.URL ?? "http://localhost:3108";
const OUT = ".playtest/pasado/";
mkdirSync(OUT, { recursive: true });

const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const want = (process.env.SIZES ?? "phone,desktop").split(",");
const IGNORED = [/\[games\] attempt pasado failed/, /ERR_FAILED/, /Failed to load resource/, /Failed to fetch/];

const { drills } = JSON.parse(readFileSync("src/content/pasado.json", "utf8"));
const verbs = Object.fromEntries(JSON.parse(readFileSync("src/content/verbs.json", "utf8")).map((v) => [v.infinitive, v]));
const TENSE_KEY = { preterite: "Pretérito", imperfect: "Imperfecto" };
const drillById = (id) => drills.find((d) => d.id === id);
const formOf = (d, tense = d.correct_tense) => verbs[d.infinitive].forms[TENSE_KEY[tense]][d.person];
const other = (t) => (t === "preterite" ? "imperfect" : "preterite");
const answerWords = (d) =>
  d.sentence_template
    .replace("{verb}", formOf(d))
    .replace(/[.,!?;:¡¿"«»]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w[0].toLowerCase() + w.slice(1) : w));

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
  // Server actions are POSTs to the page route: keep test answers out of the database.
  if (!process.env.ALLOW_WRITES) await page.route(/\/juegos\/pasado$/, (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));
  // Hide the dev overlay: blocked actions open it and it swallows taps (lessons.md).
  await page.addInitScript(() => {
    new MutationObserver(() => document.querySelector("nextjs-portal")?.remove()).observe(document, { childList: true, subtree: true });
  });
  // setSystemTime below moves Date only: fastForward would also jump framer-motion's
  // frame clock and leave exiting elements (the drawer backdrop) mounted.
  let now = new Date("2026-10-01T09:00:00").getTime();
  await page.clock.install({ time: now });

  await page.goto(`${BASE}/juegos/pasado`, { waitUntil: "networkidle" });
  await page.getByText("El Candado").waitFor();
  check((await page.getByTestId("pasado-today").innerText()).includes("5 new"), `${name}: home offers 5 new verbs`);
  const overflow = async () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!(await overflow()), `${name}: home has no horizontal scroll`);
  await page.screenshot({ path: `${OUT}${name}-home.png`, fullPage: true });

  // The drawer from the nav.
  await tap(page.getByRole("button", { name: "Irregular verbs table" }));
  const matrix = page.getByTestId("pasado-matrix");
  await matrix.waitFor();
  await page.waitForTimeout(500);
  check((await matrix.locator("li").count()) === 12, `${name}: drawer lists 12 pretérito irregulars`);
  check((await matrix.locator("[data-irregular]").count()) > 40, `${name}: irregular roots glow`);
  await page.screenshot({ path: `${OUT}${name}-drawer.png` });
  await tap(page.getByRole("tab", { name: /Imperfecto/ }));
  check((await matrix.locator("li").count()) === 3, `${name}: imperfecto tab lists ser, ir, ver`);
  await tap(page.getByRole("button", { name: "Close", exact: true }));
  await matrix.waitFor({ state: "detached" });

  let scrambles = 0;
  let dragged = false;

  /** Plays the current card. `how`: "right" | "wrongTense" | "accent". */
  async function playCard(how) {
    const root = page.locator("[data-drill]");
    const id = await root.getAttribute("data-drill");
    const mode = await root.getAttribute("data-mode");
    const d = drillById(id);
    if (mode === "scramble") {
      scrambles++;
      const words = answerWords(d);
      const bank = page.getByTestId("pasado-bank");
      const order = !touch && !dragged ? [...words.slice(1), words[0]] : words;
      for (const w of order) await tap(bank.getByRole("button", { name: w, exact: true }).first());
      if (order !== words) {
        // Drag the last block (the sentence's first word) to the front.
        const chips = page.getByTestId("pasado-tray").locator("span.cursor-grab");
        const from = await chips.last().boundingBox();
        const to = await chips.first().boundingBox();
        await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
        await page.mouse.down();
        await page.mouse.move(to.x + 2, to.y + to.height / 2, { steps: 12 });
        await page.mouse.up();
        await page.waitForTimeout(400);
        const built = (await page.getByTestId("pasado-tray").innerText()).split(/\s+/).filter(Boolean);
        check(built.join(" ") === words.join(" "), `${name}: drag reorders the blocks (${built.join(" ")})`);
        dragged = true;
      }
      if (scrambles === 1) await page.screenshot({ path: `${OUT}${name}-scramble.png`, fullPage: true });
      await tap(page.getByRole("button", { name: "Check", exact: true }));
      await page.getByText("¡Correcto!").waitFor();
      await page.waitForTimeout(700);
      if (scrambles === 1) await page.screenshot({ path: `${OUT}${name}-scramble-done.png`, fullPage: true });
    } else {
      const tense = how === "wrongTense" ? other(d.correct_tense) : d.correct_tense;
      await tap(page.getByRole("radio", { name: new RegExp(TENSE_KEY[tense]) }));
      const typed = how === "accent" ? formOf(d).normalize("NFD").replace(/[̀-ͯ]/g, "") : formOf(d);
      await page.getByRole("textbox").fill(typed);
      await page.keyboard.press("Enter");
      await page.getByRole("status").waitFor();
      const text = await page.getByRole("status").innerText();
      if (how === "right") check(text.includes("¡Correcto!"), `${name}: ${id} right`);
      else {
        check(text.includes("Not quite") && text.includes("back tomorrow"), `${name}: ${id} ${how} → wrong, box 1`);
        if (how === "accent") check(text.includes("check the accent"), `${name}: accent-only miss is explained`);
      }
    }
    return { id, mode };
  }

  async function playSession(label, firstHow = "right") {
    await tap(page.getByRole("button", { name: /^Start/ }));
    const seen = [];
    for (let n = 0; n < 40; n++) {
      if (await page.getByTestId("pasado-score").isVisible()) break;
      const how = n === 0 ? firstHow : "right";
      if (how === "accent") {
        // Only a form with an accent can lose it: skip ahead to one.
        const d = drillById(await page.locator("[data-drill]").getAttribute("data-drill"));
        if (formOf(d) === formOf(d).normalize("NFD").replace(/[\u0300-\u036f]/g, "") || (await page.locator("[data-drill]").getAttribute("data-mode")) === "scramble") {
          seen.push(await playCard("right"));
          await tap(page.getByRole("button", { name: /^Next/ }));
          firstHow = "accent";
          n = -1;
          continue;
        }
      }
      const played = await playCard(how);
      seen.push(played);
      if (n === 0 && firstHow !== "right") {
        await page.waitForTimeout(700);
        await page.screenshot({ path: `${OUT}${name}-${label}-miss.png`, fullPage: true });
        // The "Table" button opens the drawer at this verb, on the drill's tense.
        await tap(page.getByRole("button", { name: "Table", exact: true }));
        const row = page.getByTestId("pasado-matrix").locator("li.ring-accent");
        const d = drillById(played.id);
        const inMatrix = ["ser", "ir", "dar", "ver", "hacer", "tener", "estar", "poder", "poner", "saber", "querer", "venir", "decir"];
        if (inMatrix.includes(d.infinitive) && (d.correct_tense === "preterite" || ["ser", "ir", "ver"].includes(d.infinitive))) {
          check((await row.count()) === 1 && (await row.getAttribute("data-verb")).includes(d.infinitive), `${name}: Table highlights ${d.infinitive}`);
        }
        await page.keyboard.press("Escape");
        await page.getByTestId("pasado-matrix").waitFor({ state: "detached" });
        check(await page.getByRole("status").isVisible(), `${name}: drill state kept after the drawer`);
      }
      if (n === 0) await page.screenshot({ path: `${OUT}${name}-${label}-card.png`, fullPage: true });
      await tap(page.getByRole("button", { name: /^Next/ }));
    }
    await page.getByTestId("pasado-score").waitFor();
    check(!(await overflow()), `${name}: ${label} no horizontal scroll`);
    await page.screenshot({ path: `${OUT}${name}-${label}-summary.png`, fullPage: true });
    return seen;
  }

  // Session 1: a wrong tense first → the verb is re-asked later in the session.
  const s1 = await playSession("s1", "wrongTense");
  const first = drillById(s1[0].id).infinitive;
  const retried = s1.slice(1).find((c) => drillById(c.id).infinitive === first);
  check(s1.length === 6 && !!retried && retried.id !== s1[0].id, `${name}: missed ${first} re-asked with another sentence (${s1.length} cards)`);
  check((await page.getByTestId("pasado-score").innerText()).startsWith("5 / 6"), `${name}: score 5 / 6`);
  await tap(page.getByRole("button", { name: "Boxes", exact: true }));

  // Nothing due until tomorrow, only new verbs.
  check((await page.getByTestId("pasado-today").innerText()) === "5 new", `${name}: right after, only new verbs`);
  // Then climb: 4 days → box 3, 8 more → box 4, 15 more → scrambler.
  const plan = [["s2", 4 * 24, "accent"], ["s3", 8 * 24, "right"], ["s4", 15 * 24, "right"]];
  for (const [label, hours, how] of plan) {
    now += hours * 3600_000;
    await page.clock.setSystemTime(now);
    await tap(page.getByRole("button", { name: "Keep going" }).or(page.getByRole("button", { name: "Boxes", exact: true })).first()).catch(() => {});
    if (await page.getByRole("button", { name: "Boxes", exact: true }).isVisible()) await tap(page.getByRole("button", { name: "Boxes", exact: true }));
    await page.getByTestId("pasado-shelf").waitFor();
    if (label === "s4") await page.screenshot({ path: `${OUT}${name}-shelf.png`, fullPage: true });
    await playSession(label, how);
    await tap(page.getByRole("button", { name: "Boxes", exact: true }));
  }
  check(scrambles > 0, `${name}: box-4 verbs came back as word blocks (${scrambles})`);
  if (!touch) check(dragged, `${name}: dragged a block`);
  await ctx.close();
}

for (const name of want) await run(name);
await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} failure(s):\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("\nall ok");

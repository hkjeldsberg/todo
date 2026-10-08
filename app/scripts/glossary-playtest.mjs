// Headless play-through of /glosario against a dev server using the in-memory store
// (GLOSSARY_STORE=memory, seeded with the 10 starter words), at phone and desktop sizes.
//   GLOSSARY_STORE=memory NEXT_DIST_DIR=.playtest/next-glossary AUTH_DISABLED=1 npx next dev -p 3110
//   node scripts/glossary-playtest.mjs                    # real Claude: add + check, new examples
//   ANTHROPIC_API_KEY= … npx next dev …  then  MODE=offline SIZES=phone node scripts/glossary-playtest.mjs
// MODE=offline expects Claude to be unavailable: the word is saved unchecked.
// Screenshots go to .playtest/glossary/.
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.URL ?? "http://localhost:3110";
const OUT = ".playtest/glossary/";
const MODE = process.env.MODE ?? "ai";
mkdirSync(OUT, { recursive: true });

const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
// Each size adds its own word: the memory store is shared by the dev server.
const NEW_WORD = { phone: ["ventanna", "window"], desktop: ["la sila", "chair"] };
const OFFLINE_WORD = { phone: ["la cortina", "curtain"], desktop: ["la puerta", "door"] };
const want = (process.env.SIZES ?? "phone,desktop").split(",");

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
  console.log(`\n[${name} · ${MODE}]`);
  const ctx = await browser.newContext(SIZES[name]);
  const page = await ctx.newPage();
  const touch = !!SIZES[name].hasTouch;
  const tap = (loc) => (touch ? loc.tap() : loc.click());
  page.on("pageerror", (e) => failures.push(`${name}: pageerror ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") failures.push(`${name}: console ${m.text().slice(0, 200)}`);
  });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const list = page.getByTestId("glossary-list");
  const rowsText = () => list.locator("li button").allInnerTexts();
  const card = page.getByTestId("glossary-card");
  const closeCard = async () => {
    await page.keyboard.press("Escape");
    await card.waitFor({ state: "detached" });
  };
  const openRow = async (spanish) => tap(list.locator("li button", { hasText: spanish }).first());

  await page.goto(`${BASE}/glosario`, { waitUntil: "networkidle" });
  await list.waitFor();
  const nav = page.getByRole("link", { name: "Glosario" }).first();
  check((await nav.getAttribute("aria-current")) === "page", `${name}: Glosario tab is in the nav and active`);

  if (MODE === "offline") {
    const [es, en] = OFFLINE_WORD[name];
    await tap(page.getByRole("button", { name: /Add word/ }).filter({ visible: true }).first());
    await page.getByLabel("Spanish", { exact: true }).fill(es);
    await page.getByLabel("My translation", { exact: true }).fill(en);
    await tap(page.getByRole("button", { name: "Check", exact: true }));
    await card.waitFor();
    check((await card.innerText()).includes("Saved without a check"), `${name}: Claude down → saved as unchecked`);
    check((await card.innerText()).includes("Not checked yet"), `${name}: unchecked card explains itself`);
    await page.screenshot({ path: `${OUT}${name}-offline-card.png` });
    await closeCard();
    check(await page.getByTestId("glossary-filters").getByRole("button", { name: /Unchecked/ }).isVisible(), `${name}: Unchecked filter appears`);
    await ctx.close();
    return;
  }

  check((await page.getByTestId("glossary-count").innerText()).match(/^\d+ words$/) !== null, `${name}: word count shown`);
  const first = (await rowsText())[0];
  check(first.startsWith("el agua"), `${name}: Spanish A–Z ignores articles (first: ${first.split("\n")[0]})`);
  check(!(await overflow()), `${name}: list has no horizontal scroll`);
  await page.screenshot({ path: `${OUT}${name}-list.png` });

  // Search ignores accents.
  await page.getByLabel("Search the glossary").fill("cafe");
  check((await rowsText()).length === 1 && (await rowsText())[0].includes("el café"), `${name}: "cafe" finds el café`);
  await page.getByLabel("Search the glossary").fill("");

  // Group by theme: el café under two themes.
  await page.getByLabel("Group").selectOption("theme");
  const cafeGroups = await list.locator("section", { has: page.locator("li", { hasText: "el café" }) }).count();
  check(cafeGroups === 2, `${name}: grouped by theme, el café shows under 2 themes`);
  // Sticky group headers must sit in the flow at the top (not pushed down over rows).
  const firstHeader = await list.locator("h2").first().boundingBox();
  const columns = await list.locator("> div").first().boundingBox();
  check(Math.abs(firstHeader.y - (columns.y + columns.height)) < 4, `${name}: first group header sits under the column header`);
  await page.screenshot({ path: `${OUT}${name}-themes.png` });
  await page.getByLabel("Group").selectOption("pos");
  check((await list.locator("h2").first().innerText()).startsWith("Nouns"), `${name}: group by type starts with Nouns`);
  await page.reload({ waitUntil: "networkidle" });
  await list.waitFor();
  check((await page.getByLabel("Group").inputValue()) === "pos", `${name}: group choice remembered after reload`);
  await page.getByLabel("Group").selectOption("none");

  // Filter chip.
  await tap(page.getByTestId("glossary-filters").getByRole("button", { name: "Verbs", exact: true }));
  check((await rowsText()).length >= 1 && (await rowsText()).every((t) => !t.startsWith("la ")), `${name}: Verbs filter`);
  await tap(page.getByTestId("glossary-filters").getByRole("button", { name: "Verbs", exact: true }));

  // The card.
  await openRow("la mesa");
  await card.waitFor();
  const text = await card.innerText();
  check(text.includes("table") && text.includes("bord") && text.includes("You guessed"), `${name}: card has English, Norsk and my guess`);
  check((await card.locator("mark").count()) === 2, `${name}: both examples highlight the word`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}${name}-card.png` });
  const box = await card.boundingBox();
  check(box.height <= SIZES[name].viewport.height, `${name}: card fits the screen (${Math.round(box.height)}px)`);

  // Edit.
  await tap(card.getByRole("button", { name: "Edit" }));
  const edit = page.getByTestId("glossary-edit");
  await edit.waitFor();
  await edit.getByLabel("English", { exact: true }).fill(name === "phone" ? "table (furniture)" : "table");
  await tap(edit.getByRole("button", { name: "Save" }));
  const editedTo = name === "phone" ? "table (furniture)" : "table";
  const reopened = await card.filter({ hasText: "Saved" }).filter({ hasText: editedTo }).waitFor({ timeout: 5000 }).then(() => true, () => false);
  check(reopened, `${name}: edit saved and card reopened`);
  await closeCard();
  check((await rowsText()).some((t) => t.includes("la mesa") && t.includes("table")), `${name}: list shows the edit`);

  // Add to Repaso.
  await openRow("barato");
  await card.waitFor();
  // The memory store lives as long as the dev server, so a re-run may find it added already.
  const addButton = card.getByRole("button", { name: "Add to Repaso" });
  if (await addButton.isVisible()) await tap(addButton);
  await card.getByRole("button", { name: "✓ In Repaso" }).waitFor();
  check(true, `${name}: added to Repaso`);
  if (name === "desktop") {
    const before = await card.locator("li").first().innerText();
    await tap(card.getByRole("button", { name: "New examples" }));
    await card.getByRole("button", { name: "New examples" }).waitFor({ timeout: 20000 });
    await page.waitForFunction((prev) => document.querySelector("[data-testid=glossary-card] li")?.textContent !== prev, before, { timeout: 20000 });
    check(true, `${name}: new examples written`);
  }
  await closeCard();

  // Duplicate: adding "Mesa" opens the existing card.
  await tap(page.getByRole("button", { name: /Add word/ }).filter({ visible: true }).first());
  await page.getByLabel("Spanish", { exact: true }).fill("Mesa");
  await page.getByLabel("My translation", { exact: true }).fill("table");
  await tap(page.getByRole("button", { name: "Check", exact: true }));
  await card.waitFor();
  check((await card.innerText()).includes("Already in your glossary"), `${name}: duplicate opens the existing card`);
  await closeCard();

  // Add a misspelled word: Claude suggests the right spelling.
  const [es, en] = NEW_WORD[name];
  await tap(page.getByRole("button", { name: /Add word/ }).filter({ visible: true }).first());
  await page.getByLabel("Spanish", { exact: true }).fill(es);
  await page.getByLabel("My translation", { exact: true }).fill(en);
  await tap(page.getByRole("button", { name: "Check", exact: true }));
  const checked = page.getByTestId("glossary-check");
  await checked.waitFor({ timeout: 20000 });
  const verdict = await checked.innerText();
  check(verdict.includes("Did you mean"), `${name}: spelling fix offered (${verdict.split("\n")[0]})`);
  await page.screenshot({ path: `${OUT}${name}-check.png` });
  await tap(checked.getByRole("button", { name: /^Save “/ }));
  await card.waitFor();
  const saved = await card.innerText();
  check(/ventana|silla/.test(saved) && saved.includes("Norsk") && (await card.locator("li").count()) === 2, `${name}: new word saved with Norsk + 2 examples`);
  await closeCard();

  // Delete it again.
  await openRow(name === "phone" ? "la ventana" : "la silla");
  await card.waitFor();
  const title = await card.locator("h2").innerText();
  await tap(card.getByRole("button", { name: "Delete", exact: true }));
  await tap(card.getByRole("button", { name: "Delete", exact: true }));
  await card.waitFor({ state: "detached" });
  check(!(await rowsText()).some((t) => t.startsWith(title.trim())), `${name}: deleted "${title.trim()}"`);
  await ctx.close();
}

for (const name of want) await run(name);
await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} failure(s):\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("\nall ok");

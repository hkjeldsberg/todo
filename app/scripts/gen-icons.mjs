/**
 * Renders the todo mark (assets/icon-mark.svg.mjs) into the app's icons:
 *   src/app/icon.svg        modern browsers
 *   src/app/favicon.ico     16/32/48 PNG entries, for everything else
 *   src/app/apple-icon.png  180×180 opaque, iOS home screen
 * Rasterises with the headless Chromium that playwright-core uses.
 *   npm run icons
 */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { appleSvg, iconSvg } from "../assets/icon-mark.svg.mjs";

const exe = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const out = (name) => new URL(`../src/app/${name}`, import.meta.url);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? exe });
async function png(svg, size, transparent) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  const buffer = await page.screenshot({ omitBackground: transparent });
  await page.close();
  return buffer;
}

/** ICO container holding PNG images (valid since Vista; all browsers read it). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

writeFileSync(out("icon.svg"), iconSvg());
const sizes = [16, 32, 48];
writeFileSync(
  out("favicon.ico"),
  ico(await Promise.all(sizes.map(async (size) => ({ size, data: await png(iconSvg(), size, true) })))),
);
writeFileSync(out("apple-icon.png"), await png(appleSvg(), 180, false));
// preview sheet for eyeballing (not shipped)
writeFileSync(new URL("../.playtest/icon-512.png", import.meta.url), await png(iconSvg(), 512, true));
for (const size of sizes) writeFileSync(new URL(`../.playtest/icon-${size}.png`, import.meta.url), await png(iconSvg(), size, true));
await browser.close();
console.log("icons: icon.svg, favicon.ico (16/32/48), apple-icon.png (180)");

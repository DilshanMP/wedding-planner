// Renders catalog.html (A4) and leaflet.html (A5) to PDF.
// Usage: node docs/marketing/render.mjs [previewDir]   (CHROMIUM_PATH optional)
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const preview = process.argv[2];
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const [name, width, height] of [["catalog", 794, 1123], ["leaflet", 560, 794]]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto("file://" + path.join(dir, `${name}.html`));
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(dir, `${name}.pdf`), preferCSSPageSize: true, printBackground: true });
  if (preview) {
    const pages = await page.$$(".page");
    for (const [i, p] of pages.entries()) await p.screenshot({ path: path.join(preview, `${name}-${i + 1}.png`) });
  }
  console.log(`${name}.pdf`);
}
await browser.close();

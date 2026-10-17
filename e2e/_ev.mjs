import { chromium } from "playwright-core";
const S = process.argv[2];
const B = "http://localhost:3200";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const errors = [];
const desk = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
desk.on("pageerror", (e) => errors.push(String(e)));
desk.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await new Promise((r) => setTimeout(r, 2500));
await desk.goto(B + "/everafter");
await desk.waitForTimeout(2000);
await desk.screenshot({ path: `${S}/ev-hero.png` });
await desk.locator("#templates").scrollIntoViewIfNeeded();
await desk.waitForTimeout(800);
await desk.screenshot({ path: `${S}/ev-gallery.png` });
// Phone experience: open the envelope and capture each phase.
const ph = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
ph.on("pageerror", (e) => errors.push(String(e)));
await ph.goto(B + "/everafter");
await ph.waitForTimeout(1500);
const screen = ph.locator(".ev-phone-screen");
await screen.scrollIntoViewIfNeeded();
await ph.waitForTimeout(500);
await screen.screenshot({ path: `${S}/ev-p0.png` });
await screen.locator(".ea-hint").click({ force: true });
for (const [i, t] of [[1, 250], [2, 500], [3, 600], [4, 700], [5, 900]]) {
  await ph.waitForTimeout(t);
  await screen.screenshot({ path: `${S}/ev-p${i}.png` });
}
await ph.waitForTimeout(1500);
await screen.screenshot({ path: `${S}/ev-p6.png` });
console.log("errors", errors);
await b.close();

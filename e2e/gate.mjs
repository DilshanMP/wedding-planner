// Garden-gate invitation: create from the Crystal Garden Gate template in the
// wedding colours, add story chapters, publish, then open the guest link on a
// phone — ribbon, doors, card, rings and golden light, the page below, and a
// reply. Run against a started app: node e2e/gate.mjs [baseUrl] [screenshotDir]
import { chromium } from "playwright-core";

const B = process.argv[2] ?? "http://localhost:3200";
const S = process.argv[3] ?? null;
const ok = (cond, msg) => {
  if (!cond) throw new Error(`✗ ${msg}`);
  console.log(`✓ ${msg}`);
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
const errors = [];
const watch = (p) => {
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
};
watch(page);

/** Average brightness (0–255) of a screen area. */
async function brightness(p, clip) {
  const png = await p.screenshot({ clip });
  return p.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3;
    return s / (d.length / 4);
  }, png.toString("base64"));
}

await page.goto(`${B}/onboarding`);
await page.getByRole("button", { name: /Explore Sample Wedding/ }).click();
await page.waitForURL("**/dashboard");

await page.goto(`${B}/invitations/new`);
ok(await page.getByRole("radio").first().getAttribute("aria-checked") === "true" && (await page.getByRole("radio").first().innerText()).includes("Crystal Garden Gate"), "Crystal Garden Gate is the first template");
await page.goto(`${B}/invitations/new?template=crystal-gate`);
await page.getByRole("button", { name: "Next", exact: true }).click();
ok(await page.getByRole("radio", { name: "Our wedding colours" }).getAttribute("aria-checked") === "true", "wedding colours are the default palette");
await page.getByRole("button", { name: "Next", exact: true }).click();
await page.getByRole("button", { name: /Create and open the editor/ }).click();
await page.getByRole("tab", { name: "Details" }).waitFor();

await page.getByRole("tab", { name: "Wording" }).click();
await page.getByRole("button", { name: "Start with 4 chapters" }).click();
await page.getByLabel("What happened").first().fill("A rainy evening at the Galle Fort lighthouse.");
await page.getByRole("tab", { name: "Motion & sound" }).click();
ok(await page.getByRole("radio", { name: "Garden doors, ribbon & rings" }).getAttribute("aria-checked") === "true", "opening is garden doors");
await page.getByRole("tab", { name: "Publish & share" }).click();
await page.getByRole("button", { name: "Publish", exact: true }).click();
const link = await page.getByLabel("Invitation link").inputValue();
ok(/\/i\//.test(link), `published ${link}`);

// Same browser: without a cloud account, a published link opens where it was published.
const g = await ctx.newPage();
await g.setViewportSize({ width: 390, height: 844 });
watch(g);
await g.goto(link);
await g.locator(".mx-hint").waitFor();
await g.waitForTimeout(800);
ok(await g.locator(".mx-door").count() === 2 && await g.locator(".mx-bow").isVisible(), "two doors tied with a ribbon bow");
const left = await brightness(g, { x: 20, y: 200, width: 150, height: 300 });
const right = await brightness(g, { x: 220, y: 200, width: 150, height: 300 });
ok(left > 150 && right > 150 && Math.abs(left - right) < 30, `both doors are carved white (left ${Math.round(left)}, right ${Math.round(right)})`);
if (S) await g.screenshot({ path: `${S}/gate-closed.png` });
await g.locator(".mx-hint").click();
await g.waitForTimeout(1200);
ok(!(await g.locator(".mx-bow").isVisible().catch(() => false)) || (await g.locator(".mx-bow").evaluate((el) => Number(getComputedStyle(el).opacity))) < 0.6, "the ribbon falls away");
await g.locator(".mx-scroll-cue").waitFor({ timeout: 20_000 });
if (S) await g.screenshot({ path: `${S}/gate-open.png` });
const glow = await brightness(g, { x: 160, y: 200, width: 70, height: 60 });
ok(glow > 170, `rings rise in golden light (brightness ${Math.round(glow)})`);
ok(((await g.locator(".mx-stage").textContent()) ?? "").includes("GETTING MARRIED"), "card shown on the arch");

for (const heading of ["Countdown", "Our Story", "Our Wedding Day", "Event Details", "Kindly Reply"]) {
  await g.getByRole("heading", { name: heading }).scrollIntoViewIfNeeded();
  ok(await g.getByRole("heading", { name: heading }).isVisible(), `page shows “${heading}”`);
}
ok(await g.getByText("A rainy evening at the Galle Fort lighthouse.").isVisible(), "story chapter text appears");
await g.locator(".ea-input").first().fill("Saman Perera");
await g.getByText("Joyfully accepts").click();
await g.getByRole("button", { name: "Send my reply" }).click();
await g.getByText("We can't wait to see you!").waitFor();
ok(true, "guest reply sent from the garden-gate invitation");

ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();

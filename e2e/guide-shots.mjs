// Screenshots for the in-app guide (public/guide/*.jpg), taken from the
// sample wedding. Usage: BASE_URL=… CHROMIUM_PATH=… PHOTO_DIR=… node e2e/guide-shots.mjs
import { chromium } from "playwright-core";
import path from "node:path";

const B = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("public/guide");
const b = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const ctx = await b.newContext({ viewport: { width: 1280, height: 820 }, acceptDownloads: true });
const page = await ctx.newPage();
const shot = async (name, target = page) => {
  await page.waitForTimeout(700);
  await target.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 70 });
  console.log("saved", name);
};

await page.goto(B + "/onboarding");
await page.getByRole("button", { name: /Explore Sample Wedding/ }).click();
await page.waitForURL("**/dashboard");
await shot("01-home");

await page.goto(B + "/design");
await page.getByRole("button", { name: /Ivory, champagne/ }).first().click();
await shot("02-colours");

await page.goto(B + "/vendors");
await page.getByRole("button", { name: "Hotel Package" }).click();
await shot("03-hotel");
await page.keyboard.press("Escape");

await page.goto(B + "/budget?tab=categories");
await page.getByRole("heading", { name: "Quick add" }).waitFor();
await shot("04-budget-quick");

await page.goto(B + "/budget?tab=payments");
await page.getByRole("heading", { name: "Every bill" }).waitFor();
await shot("05-payments");
await page.getByRole("button", { name: /Pay advance|Add payment/ }).first().click();
await page.locator("dialog[open]").getByRole("button", { name: "25%" }).click();
await page.locator("dialog[open]").getByRole("button", { name: "Both of us" }).click();
await shot("06-pay-dialog");
await page.keyboard.press("Escape");

await page.goto(B + "/guests?new=1");
await page.getByRole("button", { name: "Photography crew" }).first().click();
await shot("07-guest-form");
await page.keyboard.press("Escape");

await page.goto(B + "/menu");
await page.getByRole("button", { name: /Crystal Glow/ }).click();
await page.getByRole("button", { name: "Garlic bread salsa", exact: true }).click();
await shot("08-menu");

await page.goto(B + "/tables");
await page.getByText("Poruwa and bar outdoors").click();
await page.getByRole("button", { name: "Create Layout" }).click();
await page.getByRole("button", { name: "Seat Everyone" }).click();
await page.getByRole("button", { name: /^Table 3,/ }).click();
await shot("09-tables");
await page.getByRole("tab", { name: "3D view" }).click();
await page.waitForTimeout(3500);
await page.getByRole("button", { name: "From the entrance" }).click();
await page.waitForTimeout(2000);
await shot("10-3d");

await page.goto(B + "/guests/report");
await shot("11-report");

await page.goto(B + "/cards");
await shot("12-cards");

await page.goto(B + "/invitations/new?template=ivory-champagne");
await page.getByRole("button", { name: "Next", exact: true }).click();
await page.getByRole("button", { name: "Next", exact: true }).click();
await page.getByRole("button", { name: /Create and open the editor/ }).click();
await page.getByRole("tab", { name: "Details" }).waitFor();
await page.waitForTimeout(1500);
await shot("13-invitations");

const phone = await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1.5 });
const p2 = await phone.newPage();
await p2.goto(B + "/onboarding");
await p2.getByRole("button", { name: /Explore Sample Wedding/ }).click();
await p2.waitForURL("**/dashboard");
await p2.goto(B + "/invitations/new?template=ivory-champagne");
await p2.getByRole("button", { name: "Next", exact: true }).click();
await p2.getByRole("button", { name: "Next", exact: true }).click();
await p2.getByRole("button", { name: /Create and open the editor/ }).click();
await p2.getByRole("tab", { name: "Details" }).waitFor();
await p2.goto(p2.url() + "/preview");
await p2.locator(".ea-env").waitFor();
await p2.waitForTimeout(1200);
await p2.screenshot({ path: path.join(OUT, "14-invite-sealed.jpg"), type: "jpeg", quality: 72 });
await p2.locator(".ea-hint").click();
await p2.waitForTimeout(5500);
await p2.screenshot({ path: path.join(OUT, "15-invite-open.jpg"), type: "jpeg", quality: 72 });
console.log("saved 14/15");

await page.goto(B + "/reports");
await page.getByRole("heading", { name: "Everything in Excel" }).waitFor();
await shot("16-excel");

await page.goto(B + "/activity");
await shot("17-activity");

await b.close();

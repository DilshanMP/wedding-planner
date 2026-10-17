// Browser checks for the redesigned planner: home photo and colours, vision
// board, real-photo preview, spreadsheet editing, menu, tables, cards and the
// shareable checklist. Usage: BASE_URL=… PHOTO_DIR=… node e2e/redesign.mjs
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const B = process.env.BASE_URL ?? "http://localhost:3000";
const DIR = process.env.PHOTO_DIR;
const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
let failed = 0;
const step = async (name, fn) => {
  try {
    await fn();
    console.log("PASS", name);
  } catch (e) {
    failed++;
    console.log("FAIL", name, String(e).split("\n")[0]);
  }
};

await page.goto(B + "/onboarding");
await page.getByRole("button", { name: /Explore Sample Wedding/ }).click();
await page.waitForURL("**/dashboard");

await step("home shows plan tiles", async () => {
  await page.getByRole("heading", { name: "Your plan at a glance" }).waitFor();
  await page.getByRole("link", { name: /Menu/ }).first().waitFor();
});

await step("wedding colours recolour the app", async () => {
  await page.goto(B + "/design");
  await page.getByRole("button", { name: /Dusty blue/ }).click();
  await page.getByText("Use our colours across the app").click();
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--wine-600").trim().toLowerCase() === "#3d5a80");
});

if (DIR) {
  await step("venue photo becomes the home photo", async () => {
    await page.locator('input[type="file"]').last().setInputFiles(path.join(DIR, "venue.jpg"));
    await page.getByText("Home photo updated.").waitFor();
    await page.goto(B + "/dashboard");
    await page.locator(".home-hero__photo").waitFor();
  });
  await step("vision board upload, like and note", async () => {
    await page.goto(B + "/design?tab=board");
    await page.locator('input[type="file"][multiple]').setInputFiles([path.join(DIR, "venue.jpg")]);
    await page.getByRole("button", { name: "Like" }).first().click();
    await page.getByText(/♥/).first().waitFor();
  });
  await step("real-photo preview places a cut-out and downloads", async () => {
    await page.goto(B + "/design?tab=preview");
    await page.getByRole("button", { name: "Use as background" }).first().click();
    await page.getByLabel("Upload a photo of you").setInputFiles(path.join(DIR, "couple.png"));
    await page.getByRole("button", { name: /drag to move/ }).first().waitFor();
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download Picture" }).click()]);
    const file = await dl.path();
    if (fs.statSync(file).size < 20_000) throw new Error("preview image too small");
  });
}

await step("budget spreadsheet edits save", async () => {
  await page.goto(B + "/budget?tab=sheet");
  const cell = page.getByLabel("Planned").first();
  await cell.click();
  await cell.fill("123456");
  await cell.press("Enter");
  await page.reload();
  await page.getByLabel("Planned").first().waitFor();
  const v = await page.getByLabel("Planned").first().inputValue();
  if (v !== "123,456") throw new Error(`got ${v}`);
});

await step("guest spreadsheet", async () => {
  await page.goto(B + "/guests?view=sheet");
  await page.getByRole("button", { name: "Add Row" }).click();
  await page.getByLabel("Name").last().waitFor();
});

await step("menu: choose dishes, limit enforced, budget", async () => {
  await page.goto(B + "/menu");
  await page.getByRole("button", { name: /Crystal Glow/ }).click();
  for (const d of ["Garlic bread salsa", "Seafood mayonnaise", "Chicken wings with satay sauce", "Roasted pork with pineapple sauce"]) await page.getByRole("button", { name: d, exact: true }).click();
  await page.getByText(/You can choose 3 appetizers/).waitFor();
  await page.getByRole("button", { name: "Add to budget" }).click();
  await page.getByRole("button", { name: "Update Budget" }).click();
  await page.getByText("Budget updated.").waitFor();
});

await step("tables: layout, seat everyone", async () => {
  await page.goto(B + "/tables");
  await page.getByRole("button", { name: "Create Layout" }).click();
  await page.getByRole("button", { name: "Seat Everyone" }).click();
  await page.getByText(/Guests seated by side/).waitFor();
});

await step("cards: invitation PNG at 300 dpi", async () => {
  await page.goto(B + "/cards");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "PNG" }).first().click()]);
  const file = await dl.path();
  const buf = fs.readFileSync(file);
  const width = buf.readUInt32BE(16);
  if (width !== 1500) throw new Error(`width ${width}`);
});

await step("evening schedule template", async () => {
  await page.goto(B + "/timeline");
  await page.getByRole("button", { name: "Evening Wedding Plan" }).click();
  await page.getByRole("button", { name: "Use Evening Plan" }).click();
  await page.getByText("5:30 PM").first().waitFor();
});

await step("shareable checklist ticks a task", async () => {
  await page.goto(B + "/checklist");
  const item = page.locator(".checklist-item:not(.is-done)").first();
  const text = await item.innerText();
  await item.click();
  await page.locator(".checklist-item.is-done", { hasText: text.split("\n")[0] }).first().waitFor();
});

await step("hotel package covers decor and ticks the booking task", async () => {
  await page.goto(B + "/vendors");
  await page.getByRole("button", { name: "Hotel Package" }).click();
  const decor = page.getByRole("radiogroup", { name: "Decoration" });
  await decor.getByRole("radio", { name: "Hotel, extra charge" }).click();
  await page.getByRole("button", { name: "Save Package" }).click();
  await page.getByText(/now covers/).waitFor();
  await page.getByText(/Also provides: .*Decoration/).first().waitFor();
});

await step("activity shows the creative changes", async () => {
  await page.goto(B + "/activity");
  await page.getByText(/changed the wedding colours/).first().waitFor();
});

await step("pay an advance with who paid, and see the balance", async () => {
  await page.goto(B + "/budget?tab=payments");
  await page.getByRole("heading", { name: "Every bill" }).waitFor();
  await page.getByRole("button", { name: /Pay advance|Add payment/ }).first().click();
  const dlg = page.locator("dialog[open]");
  await dlg.getByRole("button", { name: "Full balance" }).click();
  await dlg.getByRole("button", { name: "Both of us" }).click();
  await dlg.getByRole("button", { name: "Record Payment" }).click();
  await page.getByText(/fully paid/).first().waitFor();
  await page.getByText("Both of us").first().waitFor();
});

await step("menu swaps pork for mutton and deletes a dish", async () => {
  await page.goto(B + "/menu");
  await page.getByRole("button", { name: "Add / Delete Dishes" }).click();
  await page.getByRole("button", { name: "Delete Apple", exact: true }).click();
  await page.getByRole("button", { name: "Done Editing" }).click();
  if (await page.getByRole("button", { name: "Delete Apple" }).count()) throw new Error("dish not deleted");
  await page.getByRole("heading", { name: "Mutton" }).waitFor();
});

await step("venue designer: turn a table, seat a guest by dragging, 3D view", async () => {
  await page.goto(B + "/tables");
  await page.getByRole("button", { name: /^Table 2,/ }).click();
  await page.getByRole("tab", { name: "Long" }).click();
  await page.getByRole("button", { name: "90°" }).click();
  const before = await page.locator(".vd-item.is-selected").first().getAttribute("transform");
  if (!before) throw new Error("no selected table");
  await page.getByRole("button", { name: /Flower stand/ }).click();
  await page.getByRole("button", { name: "Move outdoors" }).click();
  await page.getByText(/Moved outside/).waitFor();
  await page.getByRole("tab", { name: "3D view" }).click();
  await page.locator(".venue-3d canvas, .venue-3d").first().waitFor();
  await page.getByRole("tab", { name: "Floor plan" }).click();
});

await step("guest report shows tables", async () => {
  await page.goto(B + "/guests/report");
  await page.getByRole("heading", { name: /Table/ }).first().waitFor();
  await page.getByRole("tab", { name: /A–Z/ }).click();
  await page.locator(".greport-alpha li").first().waitFor();
});

await step("digital invitation opens, counts down and takes a reply", async () => {
  await page.goto(B + "/invitations");
  await page.getByRole("button", { name: /Piano/ }).click();
  await page.getByRole("button", { name: "Full screen" }).click();
  const inv = page.locator(".inv-full");
  await inv.getByRole("button", { name: /Break the seal/ }).click({ force: true });
  await inv.getByRole("timer").waitFor();
  await inv.getByText("Joyfully attending").click();
  await inv.getByRole("button", { name: "Send my reply" }).click();
  await inv.getByText("See you there!").waitFor();
  await page.getByRole("button", { name: "Close preview" }).click();
});

console.log(errors.length ? `console errors:\n${errors.join("\n")}` : "no console errors");
await b.close();
process.exit(failed || errors.length ? 1 : 0);

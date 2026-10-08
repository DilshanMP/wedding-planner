// Acceptance flow from AGENT.md §48, against a running app.
// Usage: BASE_URL=http://localhost:3000 npm run test:e2e
// Set CHROMIUM_PATH to use a specific Chromium binary.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
const B = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.env.E2E_OUT ?? "e2e/.failures";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let failed = 0;
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 300)));
const step = async (name, fn) => { try { await fn(); console.log("PASS", name); } catch (e) { failed++; console.log("FAIL", name, e.message.split("\n")[0]); await page.screenshot({ path: `${out}/fail-${name.replace(/\W+/g, "_")}.png` }); } };
const dlg = () => page.locator("dialog[open]");

await step("1-2 create wedding with June 2027 date", async () => {
  await page.goto(B + "/onboarding");
  await page.getByLabel("Bride's name").fill("Sanduni");
  await page.getByLabel("Groom's name").fill("Tharindu");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click(); // missing date -> error
  await page.getByText("Choose a valid date.").waitFor();
  await page.getByLabel("Wedding date").fill("2027-06-19");
  await page.getByLabel("Venue").fill("Cinnamon Grand");
  await page.getByLabel("Town or city").fill("Colombo");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Total budget").fill("4000000");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Photography" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "+ Excellent food" }).click();
  await page.getByRole("button", { name: "Create Our Plan" }).click();
  await page.waitForURL("**/dashboard");
});
await step("3 countdown visible", async () => {
  await page.getByText("days to go").waitFor();
  await page.getByText("Good", { exact: false }).first().waitFor();
});
await step("4-5 checklist generated, complete a task", async () => {
  await page.goto(B + "/tasks");
  const label = await page.locator("li label").first().innerText();
  await page.locator("input.wos-check").first().click({ noWaitAfter: true });
  await page.waitForTimeout(300);
  await page.getByRole("tab", { name: "Completed" }).click();
  await page.getByText(label).first().waitFor();
  if (await page.locator("input.wos-check:checked").count() !== 1) throw new Error("expected exactly one completed task");
});
await step("5b add custom task", async () => {
  await page.goto(B + "/tasks?new=1");
  await dlg().getByLabel("Task", { exact: true }).fill("Book Kandyan dancers");
  await dlg().getByRole("button", { name: "Add Task" }).click();
  await page.getByText("Book Kandyan dancers").first().waitFor();
});
await step("6-7 add bride and groom family guests", async () => {
  await page.goto(B + "/guests?new=1");
  await dlg().getByLabel("Name").fill("Perera family");
  await dlg().getByLabel("Party").selectOption("family");
  await dlg().getByRole("button", { name: "Save and Add Another" }).click();
  await dlg().getByRole("radio", { name: "Groom side" }).click();
  await dlg().getByLabel("Name").fill("Fernando family");
  await dlg().getByLabel("Children").fill("3");
  await dlg().getByLabel("Phone").fill("077 123 4567");
  await dlg().getByRole("button", { name: "Add Guest" }).click();
  await page.getByText("Fernando family").first().waitFor();
});
await step("8-9 track invitation and RSVP", async () => {
  await page.getByLabel("Invitation for Perera family").first().selectOption("sent");
  await page.getByLabel("RSVP for Perera family").first().selectOption("yes");
  await page.getByText("4 confirmed", { exact: false }).first().waitFor();
});
await step("10-11 budget and add expense", async () => {
  await page.goto(B + "/budget?tab=categories&newItem=1");
  await dlg().getByLabel("Category").selectOption("cake");
  await dlg().getByLabel("Item").fill("Tiered cake");
  await dlg().getByLabel("Planned").fill("60000");
  await dlg().getByRole("button", { name: "Add Line" }).click();
  await page.getByText("Tiered cake").waitFor();
});
await step("12 compare quotes", async () => {
  for (const [name, price] of [["Lens A", "250000"], ["Lens B", "325000"]]) {
    await page.goto(B + "/vendors?new=1");
    await dlg().getByLabel("Vendor name").fill(name);
    await dlg().getByLabel("Category").selectOption("photography");
    await dlg().getByRole("button", { name: "Add Vendor" }).click();
    await page.goto(B + "/vendors?tab=compare&newQuote=1");
    await dlg().getByLabel("Vendor", { exact: true }).selectOption({ label: `${name} · Photography` });
    await dlg().getByLabel("Package", { exact: true }).fill("Classic");
    await dlg().getByLabel("Package price").fill(price);
    await dlg().getByRole("button", { name: "Add Quote" }).click();
  }
  await page.goto(B + "/vendors?tab=compare");
  await page.getByText("Lowest Cost").waitFor();
  await page.getByText("Best Value").waitFor();
  await page.getByRole("button", { name: "Choose This Option" }).first().click();
  await page.getByText("Your choice").waitFor();
});
await step("13 track vendor payment", async () => {
  await page.goto(B + "/budget?tab=payments&newPayment=1");
  await dlg().getByLabel("Vendor").selectOption({ label: "Lens A" });
  await dlg().getByLabel("Description").fill("Advance");
  await dlg().getByLabel("Amount").fill("100000");
  await dlg().getByRole("button", { name: "Save Payment" }).click();
  await page.getByRole("button", { name: "Pay", exact: true }).first().click();
  await dlg().getByRole("button", { name: "Record Payment" }).click();
  await page.getByRole("tab", { name: "Paid" }).click();
  await page.getByText("LKR 100,000.00").waitFor();
});
await step("14 edit wedding timeline", async () => {
  await page.goto(B + "/timeline?new=1");
  await dlg().getByLabel("Moment").fill("Tea ceremony");
  await dlg().getByLabel("Starts at").fill("17:00");
  await dlg().getByRole("button", { name: "Add Moment" }).click();
  await page.getByText("Tea ceremony").waitFor();
});
await step("delete with confirmation", async () => {
  await page.goto(B + "/tasks?q=Kandyan");
  await page.getByRole("button", { name: "Edit Book Kandyan dancers" }).click();
  await dlg().getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete Task" }).click();
  await page.getByText("Book Kandyan dancers").waitFor({ state: "detached" });
});
await step("15 readiness", async () => {
  await page.goto(B + "/dashboard");
  await page.getByRole("button", { name: /How readiness is calculated/ }).click();
  await dlg().getByText("Wedding readiness").waitFor();
  await page.keyboard.press("Escape");
});
await step("16 wedding day mode", async () => {
  await page.goto(B + "/wedding-day");
  await page.getByText("Now", { exact: true }).waitFor();
  await page.getByLabel(/Rehearse the day/).fill("1020");
  await page.getByRole("heading", { name: "Tea ceremony" }).waitFor();
});
await step("17 simulator", async () => {
  await page.goto(B + "/simulator");
  await page.getByText("Sanduni & Tharindu").waitFor();
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(500);
});
await step("WhatsApp invitation link", async () => {
  await page.goto(B + "/guests");
  const wa = page.getByRole("link", { name: "Send invitation to Fernando family on WhatsApp" }).first();
  const href = await wa.getAttribute("href");
  if (!href?.startsWith("https://wa.me/94771234567?text=")) throw new Error("unexpected WhatsApp link: " + href);
  if (!decodeURIComponent(href).includes("Sanduni & Tharindu")) throw new Error("message missing couple names");
});
await step("document vault: upload, preview, delete", async () => {
  await page.goto(B + "/documents");
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 200 200]/Parent 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
  await page.getByLabel("Choose a file to upload").setInputFiles({ name: "Lens A contract.pdf", mimeType: "application/pdf", buffer: pdf });
  await dlg().getByLabel("Type").selectOption("contract");
  await dlg().getByLabel("Vendor").selectOption({ label: "Lens A" });
  await dlg().getByRole("button", { name: "Save Document" }).click();
  await page.getByText("Lens A contract").first().click();
  await dlg().locator("iframe").waitFor();
  await page.reload(); // the open document is in the URL, so it reopens
  await dlg().locator("iframe").waitFor(); // file survives reload (IndexedDB)
  await dlg().getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete Document" }).click();
  await page.getByText("No documents yet.").waitFor();
});
await step("reports: Excel download and PDF", async () => {
  await page.goto(B + "/reports?r=all");
  await page.getByRole("heading", { name: "Wedding readiness report" }).waitFor();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download Excel" }).click()]);
  if (!download.suggestedFilename().endsWith(".xlsx")) throw new Error("bad filename " + download.suggestedFilename());
  const path = await download.path();
  const { readFileSync } = await import("node:fs");
  if (readFileSync(path).subarray(0, 2).toString() !== "PK") throw new Error("not a zip");
  await page.getByRole("button", { name: "Download PDF" }).waitFor();
});
await step("assistant answers from the plan", async () => {
  await page.goto(B + "/assistant");
  await page.getByRole("button", { name: "Where am I overspending?" }).click();
  await page.getByText(/over plan|Nothing is over plan/).first().waitFor();
  await page.getByLabel("Your question").fill("Can I afford a photographer for LKR 350,000?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await page.getByText(/projected total would be|Not without trade-offs/).first().waitFor();
});
await step("persistence after reload", async () => {
  await page.goto(B + "/guests");
  await page.getByText("Fernando family").first().waitFor();
});
await step("date change moves tasks", async () => {
  await page.goto(B + "/settings");
  await page.getByLabel("Wedding date").fill("2027-07-03");
  await page.getByRole("button", { name: "Save Details" }).click();
  await page.getByText("Open tasks moved", { exact: false }).waitFor();
});
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
await browser.close();
process.exit(failed || errors.length ? 1 : 0);

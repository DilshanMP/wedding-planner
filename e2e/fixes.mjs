// Checks for: English guide by default, one time per simulator scene,
// deleting/adding tables, and assigning an earlier payment to a category.
// Run against a started app: node e2e/fixes.mjs [baseUrl] [screenshotDir]
import { chromium } from "playwright-core";

const B = process.argv[2] ?? "http://localhost:3200";
const S = process.argv[3] ?? null;
const ok = (cond, msg) => {
  if (!cond) throw new Error(`✗ ${msg}`);
  console.log(`✓ ${msg}`);
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
page.on("dialog", (d) => d.accept());
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(`${B}/onboarding`);
await page.getByRole("button", { name: /Explore Sample Wedding/ }).click();
await page.waitForURL("**/dashboard");

// Guide: English first, Sinhala on request.
await page.goto(`${B}/guide`);
await page.getByRole("radio", { name: "English" }).waitFor();
ok(await page.getByRole("radio", { name: "English" }).getAttribute("aria-checked") === "true", "guide opens in English");
await page.getByRole("radio", { name: "සිංහල" }).click();
ok(/[඀-෿]/.test(await page.locator("main").innerText()), "Sinhala is one tap away");
await page.getByRole("radio", { name: "English" }).click();

// Simulator: each scene shows a single time.
await page.goto(`${B}/simulator`);
await page.locator(".sim-scene").first().waitFor();
const scenes = await page.locator(".sim-scene").evaluateAll((els) => els.map((el) => {
  const times = el.innerText.match(/\b\d{1,2}:\d{2}\s?[AP]M\b/g) ?? [];
  return { repeats: times.length > 0 && times.filter((t) => t === times[0]).length > 1, tall: el.getBoundingClientRect().height >= window.innerHeight - 1 };
}));
ok(scenes.length > 0 && scenes.every((x) => !x.repeats), `no scene repeats its time (${scenes.length} scenes)`);
ok(scenes.every((x) => x.tall), "one scene fills the screen at a time");
if (S) await page.screenshot({ path: `${S}/fix-sim.png` });

// Tables: delete one, add two.
await page.goto(`${B}/tables`);
const create = page.getByRole("button", { name: "Create Layout" });
if (await create.isVisible().catch(() => false)) await create.click();
const summary = page.locator("summary", { hasText: "Manage tables" });
await summary.click();
const count = async () => Number((await summary.innerText()).match(/\((\d+)\)/)[1]);
const before = await count();
await page.getByRole("button", { name: /^Delete Table/ }).first().click();
await page.waitForTimeout(300);
ok(await count() === before - 1, `deleted a table (${before} → ${before - 1})`);
await page.getByLabel("How many").fill("2");
await page.getByRole("button", { name: "Add 2 tables" }).click();
await page.waitForTimeout(300);
ok(await count() === before + 1, `added two tables (${before + 1})`);
if (S) await page.screenshot({ path: `${S}/fix-tables.png` });

// Payments: an advance paid before its budget line existed.
await page.goto(`${B}/budget?tab=payments&newPayment=1`);
const dialog = page.getByRole("dialog");
await dialog.getByLabel("Budget line").selectOption("");
await dialog.getByLabel("Description").fill("Hall advance (paid early)");
await dialog.getByLabel("Amount").fill("150000");
await dialog.getByLabel("Status").selectOption("paid");
await dialog.getByRole("button", { name: "Record Payment" }).click();
await page.goto(`${B}/budget?tab=payments`);
const box = page.locator("section", { hasText: "Payments not in a category yet" });
await box.waitFor();
const row = box.locator("li", { hasText: "Hall advance (paid early)" });
ok(await row.isVisible(), "unlinked advance is listed for assigning");
await row.getByRole("button", { name: "Assign" }).click();
const assign = page.getByRole("dialog", { name: "Put this payment in a category" });
await assign.getByLabel("Category").selectOption("venue");
await assign.getByLabel("Budget line").selectOption("new");
await assign.getByLabel("Line name").fill("Reception hall");
if (S) await page.screenshot({ path: `${S}/fix-assign.png` });
await assign.getByRole("button", { name: "Assign Payment" }).click();
await page.getByText(/now counts towards/).waitFor();
ok(!(await row.isVisible().catch(() => false)), "advance assigned to the Venue category");

ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();

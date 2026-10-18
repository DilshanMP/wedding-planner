// EverAfter Studio journey (local mode): create → edit → undo → publish →
// download PNG/PDF/SVG → open the public link as a guest → reply → see it in
// Replies → Canva page shows the pending state.
// Run against a started app: node e2e/studio.mjs [baseUrl] [screenshotDir]
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";

const B = process.argv[2] ?? "http://localhost:3200";
const S = process.argv[3] ?? null;
const shot = async (page, name) => S && page.screenshot({ path: `${S}/${name}.png` });
const ok = (cond, msg) => {
  if (!cond) throw new Error(`✗ ${msg}`);
  console.log(`✓ ${msg}`);
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));

await page.goto(`${B}/onboarding`);
await page.getByRole("button", { name: /Explore Sample Wedding/ }).click();
await page.waitForURL("**/dashboard");

// 1. Empty dashboard → template → wizard.
await page.goto(`${B}/invitations`);
await page.getByRole("heading", { name: "No invitations yet" }).waitFor();
await page.getByRole("link", { name: /Dusty Pink Romantic Floral/ }).click();
await page.waitForURL("**/invitations/new?template=dusty-pink*");
await page.getByRole("heading", { name: "Your details" }).waitFor();
ok(await page.getByLabel("Bride's name").inputValue() !== "", "wizard pre-fills the couple from the wedding");
await page.getByRole("button", { name: "Next", exact: true }).click();
await page.getByRole("radio", { name: "Match my wedding colour" }).click();
await page.getByRole("button", { name: "Next", exact: true }).click();
await page.getByLabel("Design name").fill("Main invitation");
await shot(page, "studio-wizard");
await page.getByRole("button", { name: /Create and open the editor/ }).click();
await page.getByRole("tab", { name: "Details" }).waitFor();
ok(/\/invitations\/[\w-]+$/.test(page.url()) && await page.getByRole("textbox", { name: "Design name" }).inputValue() === "Main invitation", "editor opens the new design");

// 2. Edit, autosave, undo/redo.
const groom = page.getByLabel("Groom (as on the card)");
const before = await groom.inputValue();
await groom.fill("Kavindu Test");
await page.getByTestId("save-state").filter({ hasText: "Saved" }).waitFor();
await page.getByRole("radio", { name: "Card" }).click();
await page.waitForTimeout(300);
ok((await page.getByTestId("editor-preview").locator("svg").first().textContent()).includes("Kavindu Test"), "live preview shows the edit");
await page.getByRole("button", { name: "Undo" }).click();
ok(await groom.inputValue() === before, "undo restores the name");
await page.getByRole("button", { name: "Redo" }).click();
ok(await groom.inputValue() === "Kavindu Test", "redo re-applies it");
await page.getByLabel("Google Maps link").fill("https://evil.example/maps");
ok(await page.getByText("Paste a Google Maps link").isVisible(), "non-Google maps links are flagged");
await page.getByLabel("Google Maps link").fill("");

await page.getByRole("tab", { name: "Wording" }).click();
await page.getByRole("button", { name: "Use this wording" }).click();
await page.getByRole("tab", { name: "Design" }).click();
await page.getByRole("button", { name: "Deep palette" }).click();
await page.getByRole("tab", { name: "Motion & sound" }).click();
await page.getByRole("radio", { name: "Swift" }).click();
await page.getByRole("radio", { name: "Envelope" }).click();
await page.waitForTimeout(600);
await shot(page, "studio-editor");

// 3. Publish + downloads.
await page.getByRole("tab", { name: "Publish & share" }).click();
await page.getByRole("button", { name: "Publish", exact: true }).click();
const linkBox = page.getByLabel("Invitation link");
await linkBox.waitFor();
const link = await linkBox.inputValue();
ok(/\/i\/[a-z0-9-]+$/.test(link), `published to ${link}`);
ok(await page.getByAltText(/QR code for/).isVisible(), "QR code is shown");

for (const [label, check] of [["PNG (300 dpi)", (b) => b.subarray(0, 4).toString("hex") === "89504e47"], ["PDF for print", (b) => b.subarray(0, 5).toString() === "%PDF-"], ["SVG (vector)", (b) => b.toString().includes("<svg") && b.toString().includes("@font-face")]]) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: label }).click()]);
  const file = readFileSync(await dl.path());
  if (S) await dl.saveAs(`${S}/${dl.suggestedFilename()}`);
  ok(check(file) && file.length > 20_000, `${label} downloads a real file (${Math.round(file.length / 1024)} KB, ${dl.suggestedFilename()})`);
}
await shot(page, "studio-publish");

// 4. Guest opens the link and replies.
const guest = await ctx.newPage();
guest.on("pageerror", (e) => errors.push(e.message));
await guest.setViewportSize({ width: 390, height: 844 });
await guest.goto(link);
await guest.locator(".ea-env").waitFor();
await shot(guest, "studio-guest-sealed");
await guest.locator(".ea-hint").click();
await guest.getByRole("button", { name: "Send my reply" }).waitFor({ timeout: 15_000 });
await guest.locator(".ea-input").first().fill("Nimal Perera");
await guest.getByText("Joyfully accepts").click();
await guest.getByRole("button", { name: "One more" }).click();
await guest.getByRole("button", { name: "Send my reply" }).click();
await guest.getByText("We can't wait to see you!").waitFor();
ok(true, "guest reply sent");
await shot(guest, "studio-guest-thanks");

// 5. Replies dashboard.
await page.goto(`${B}/invitations/rsvps`);
const row = page.getByTestId("rsvp-table").getByRole("row", { name: /Nimal Perera/ });
await row.waitFor();
ok((await row.textContent()).includes("Coming"), "reply appears in Replies");
await row.getByRole("button", { name: /Add to guests/ }).click();
await page.getByText("Nimal Perera added to your guest list.").waitFor();
ok(true, "reply added to the guest list");
await shot(page, "studio-rsvps");

// 6. Dashboard + Canva + Send.
await page.goto(`${B}/invitations`);
const card = page.getByTestId("invite-project").first();
await card.getByText("Live").waitFor();
ok((await card.textContent()).includes("1 view"), "dashboard counts the guest's view");
await shot(page, "studio-dashboard");
await page.goto(`${B}/invitations/canva`);
await page.getByText("Pending setup").waitFor();
ok(true, "Canva page shows the pending state without credentials");
await page.goto(`${B}/invitations/send`);
ok(await page.getByLabel("Design for personal links").inputValue() !== "", "send page uses the published design");

ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();

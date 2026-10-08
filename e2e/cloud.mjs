// Cloud-mode acceptance flow: sign-in gate, saving to Postgres, sharing,
// and a guest answering through their RSVP link. See supabase/README.md.
// Usage: BASE_URL=http://localhost:3300 PG_ADMIN_URL=postgres://… JWT_SECRET=… node e2e/cloud.mjs
import { chromium } from "playwright-core";
import { createHmac, randomUUID } from "node:crypto";
import pg from "pg";
const B = process.env.BASE_URL ?? "http://localhost:3300";
const SECRET = process.env.JWT_SECRET;
if (!SECRET || !process.env.PG_ADMIN_URL) throw new Error("Set JWT_SECRET and PG_ADMIN_URL.");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (c) => { const h = b64({ alg: "HS256", typ: "JWT" }); const p = b64({ exp: Math.floor(Date.now() / 1000) + 3600, ...c }); return `${h}.${p}.${createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url")}`; };
const db = new pg.Client({ connectionString: process.env.PG_ADMIN_URL });
await db.connect();
const run = randomUUID().slice(0, 8);
const users = { owner: { id: randomUUID(), email: `nethmi-${run}@example.com` }, family: { id: randomUUID(), email: `amma-${run}@example.com` } };
for (const u of Object.values(users)) await db.query("insert into auth.users (id, email) values ($1,$2)", [u.id, u.email]);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
let failed = 0;
async function contextFor(user) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  if (user) {
    const token = jwt({ sub: user.id, email: user.email, role: "authenticated", aud: "authenticated" });
    const session = { access_token: token, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "local", user: { id: user.id, email: user.email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
    await ctx.addCookies([{ name: `sb-${new URL(process.env.SUPABASE_URL ?? "http://127.0.0.1:54331").hostname.split(".")[0]}-auth-token`, value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"), url: B }]);
  }
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
  return { ctx, page };
}
const step = async (name, fn) => { try { await fn(); console.log("PASS", name); } catch (e) { failed++; console.log("FAIL", name, e.message.split("\n")[0]); } };

const anon = await contextFor(null);
await step("signed-out visitors are sent to sign-in", async () => {
  await anon.page.goto(B + "/dashboard");
  await anon.page.waitForURL("**/login");
  await anon.page.getByRole("button", { name: "Email Me a Link" }).waitFor();
});

const owner = await contextFor(users.owner);
const dlg = (p) => p.locator("dialog[open]");
let weddingId;
await step("owner creates a wedding that is saved to the database", async () => {
  await owner.page.goto(B + "/dashboard");
  await owner.page.waitForURL("**/onboarding");
  await owner.page.getByRole("button", { name: "Explore Sample Wedding" }).click();
  await owner.page.waitForURL("**/dashboard", { timeout: 30000 });
  await owner.page.getByText("days to go").waitFor();
  const { rows: [w] } = await db.query("select wedding_id from wedding_members where user_id=$1 and role='owner'", [users.owner.id]);
  weddingId = w.wedding_id;
  const { rows } = await db.query("select (select count(*) from guests where wedding_id=$1) g, (select count(*) from tasks where wedding_id=$1) t, (select count(*) from wedding_members where wedding_id=$1 and role='owner') m", [weddingId]);
  if (Number(rows[0].g) < 100 || Number(rows[0].t) < 80 || Number(rows[0].m) !== 1) throw new Error(JSON.stringify(rows[0]));
});
await step("edits persist across reloads", async () => {
  await owner.page.goto(B + "/guests?q=Perera");
  const sel = owner.page.locator('select[aria-label^="RSVP for"]').first();
  await sel.selectOption("no");
  await owner.page.waitForTimeout(1500);
  await owner.page.reload();
  const v = await owner.page.locator('select[aria-label^="RSVP for"]').first().inputValue();
  if (v !== "no") throw new Error("rsvp not persisted: " + v);
});
await step("owner shares with family by email", async () => {
  await owner.page.goto(B + "/settings");
  await owner.page.getByText(`${users.owner.email} (you)`).waitFor();
  await owner.page.getByLabel("Email").fill(users.family.email);
  await owner.page.getByRole("button", { name: "Invite" }).click();
  await owner.page.getByText(`${users.family.email} now has access.`).waitFor();
  await owner.page.getByLabel("Email").fill(`planner-${run}@example.com`);
  await owner.page.getByLabel("Access").selectOption("planner");
  await owner.page.getByRole("button", { name: "Invite" }).click();
  await owner.page.getByText("Waiting to sign in").waitFor();
});
await step("family member sees and edits the shared wedding", async () => {
  const fam = await contextFor(users.family);
  await fam.page.goto(B + "/dashboard");
  await fam.page.getByText("Nethmi & Kasun").first().waitFor();
  await fam.page.goto(B + "/tasks?new=1");
  await dlg(fam.page).getByLabel("Task", { exact: true }).fill("Order kiribath for the morning");
  await dlg(fam.page).getByRole("button", { name: "Add Task" }).click();
  await fam.page.waitForTimeout(1500);
  const { rows } = await db.query("select count(*) c from tasks where wedding_id = $1 and title = 'Order kiribath for the morning'", [weddingId]);
  if (rows[0].c !== "1") throw new Error("task not saved");
  await fam.ctx.close();
});
let token;
await step("owner turns on online RSVP", async () => {
  await owner.page.goto(B + "/guests");
  await owner.page.getByLabel(/Online RSVP/).check();
  await owner.page.waitForTimeout(1500);
  const { rows } = await db.query("select g.rsvp_token, g.name from guests g join weddings w on w.id=g.wedding_id where w.id = $1 and w.rsvp_enabled and g.adults + g.children >= 2 and g.rsvp='pending' limit 1", [weddingId]);
  if (!rows[0]) throw new Error("rsvp not enabled");
  token = rows[0];
  await owner.page.getByRole("button", { name: /Copy RSVP link for/ }).first().waitFor();
});
await step("a guest replies through their link without signing in", async () => {
  await anon.page.goto(`${B}/rsvp/${token.rsvp_token}`);
  await anon.page.getByText(`Dear ${token.name}, will you join us?`).waitFor();
  await anon.page.getByRole("radio", { name: "Joyfully attending" }).click();
  await anon.page.getByLabel("Meal preference").selectOption("veg");
  await anon.page.getByLabel(/A note for the couple/).fill("Congratulations!");
  await anon.page.getByRole("button", { name: "Send My Reply" }).click();
  await anon.page.getByRole("heading", { name: "Thank you." }).waitFor();
  const { rows } = await db.query("select rsvp, meal, invitation, notes from guests where rsvp_token=$1", [token.rsvp_token]);
  if (rows[0].rsvp !== "yes" || rows[0].meal !== "veg" || !rows[0].notes.includes("Congratulations!")) throw new Error(JSON.stringify(rows[0]));
  await anon.page.goto(`${B}/rsvp/${randomUUID()}`);
  await anon.page.getByText("This invitation link isn't active.").waitFor();
});
await step("owner sees the reply", async () => {
  await owner.page.goto(B + `/guests?rsvp=yes&q=${encodeURIComponent(token.name)}`);
  await owner.page.getByText(token.name).first().waitFor();
});
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
await browser.close();
await db.end();
process.exit(failed ? 1 : 0);

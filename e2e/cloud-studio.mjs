import { chromium } from "playwright-core";
import { createHmac, randomUUID } from "node:crypto";
import pg from "pg";
// EverAfter Studio in cloud mode: the design saves to Postgres, publishing
// writes published_invitations, a signed-out guest replies through /i/<slug>,
// the couple sees it in Replies, and a personal /invite/<token> link shows
// the main design addressed to that guest. Setup: supabase/README.md.
// Usage: BASE_URL=http://localhost:3300 JWT_SECRET=… PG_ADMIN_URL=… node e2e/cloud-studio.mjs [screenshotDir]
const B = process.env.BASE_URL ?? "http://localhost:3300";
const SECRET = process.env.JWT_SECRET;
if (!SECRET || !process.env.PG_ADMIN_URL) throw new Error("Set JWT_SECRET and PG_ADMIN_URL.");
const S = process.argv[2];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (c) => { const h = b64({ alg: "HS256", typ: "JWT" }); const p = b64({ exp: Math.floor(Date.now() / 1000) + 3600, ...c }); return `${h}.${p}.${createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url")}`; };
const db = new pg.Client({ connectionString: process.env.PG_ADMIN_URL });
await db.connect();
const user = { id: randomUUID(), email: `studio-${Date.now()}@example.com` };
await db.query("insert into auth.users (id, email) values ($1,$2)", [user.id, user.email]);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ok = (c, m) => { if (!c) throw new Error("✗ " + m); console.log("✓ " + m); };
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const token = jwt({ sub: user.id, email: user.email, role: "authenticated", aud: "authenticated" });
const session = { access_token: token, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "local", user: { id: user.id, email: user.email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
await ctx.addCookies([{ name: `sb-${new URL(process.env.SUPABASE_URL ?? "http://127.0.0.1:54331").hostname.split(".")[0]}-auth-token`, value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"), url: B }]);
const page = await ctx.newPage();
page.setDefaultTimeout(60000);
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(B + "/dashboard");
await page.waitForURL("**/onboarding");
await page.getByRole("button", { name: "Explore Sample Wedding" }).click();
await page.waitForURL("**/dashboard", { timeout: 60000 });
await page.goto(B + "/invitations/new?template=sri-lankan");
await page.getByRole("button", { name: "Next", exact: true }).click();
await page.getByRole("button", { name: "Next", exact: true }).click();
await page.getByRole("button", { name: /Create and open the editor/ }).click();
await page.getByRole("tab", { name: "Details" }).waitFor();
await page.getByTestId("save-state").filter({ hasText: "Saved to your account" }).waitFor();
await page.waitForTimeout(1500); // planner debounce
const { rows: [w] } = await db.query("select w.invite_projects from weddings w join wedding_members m on m.wedding_id=w.id where m.user_id=$1", [user.id]);
ok(w.invite_projects?.projects?.length === 1, "design saved to the invite_projects column");
await page.getByRole("tab", { name: "Publish & share" }).click();
await page.getByRole("button", { name: "Publish", exact: true }).click();
const link = await page.getByLabel("Invitation link").inputValue();
ok(/\/i\//.test(link), "published " + link);
const { rows: pub } = await db.query("select slug, is_main from published_invitations where project_id=$1", [w.invite_projects.projects[0].id]);
ok(pub.length === 1 && pub[0].is_main, "row in published_invitations (main)");
if (S) await page.screenshot({ path: `${S}/cloud-publish.png` });

const guestCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const g = await guestCtx.newPage();
g.setDefaultTimeout(60000);
g.on("pageerror", (e) => errors.push(e.message));
await g.goto(link);
await g.locator(".ea-hint").click();
await g.getByRole("button", { name: "Send my reply" }).waitFor();
await g.locator(".ea-input").first().fill("Saman Kumara");
await g.getByText("Regretfully declines").click();
await g.getByRole("button", { name: "Send my reply" }).click();
await g.getByText("Thank you for letting us know").waitFor();
ok(true, "signed-out guest replied through the cloud link");
if (S) await g.screenshot({ path: `${S}/cloud-guest.png` });

await page.goto(B + "/invitations/rsvps");
await page.getByTestId("rsvp-table").getByRole("row", { name: /Saman Kumara/ }).waitFor();
ok(true, "owner sees the reply in Replies");

// Personal link: the guest's own envelope, using the main design.
const weddingId = (await db.query("select wedding_id from wedding_members where user_id=$1", [user.id])).rows[0].wedding_id;
await db.query("update weddings set rsvp_enabled = true where id=$1", [weddingId]);
const { rows: [gst] } = await db.query("select name, rsvp_token, adults + children as party from guests where wedding_id=$1 and adults + children >= 3 limit 1", [weddingId]);
const pp = await guestCtx.newPage();
pp.setDefaultTimeout(60000);
pp.on("pageerror", (e) => errors.push(e.message));
await pp.goto(`${B}/invite/${gst.rsvp_token}`);
await pp.locator(".ea-env").waitFor();
ok((await pp.locator(".ea-root").innerText()).includes(gst.name), `envelope addressed to ${gst.name}`);
if (S) await pp.screenshot({ path: `${S}/cloud-personal.png` });
await pp.locator(".ea-hint").click();
await pp.getByText("Joyfully accepts").click();
ok(Number(await pp.locator(".ea-stepper output").innerText()) === Number(gst.party), "party defaults to everyone invited");
await pp.getByRole("button", { name: "One fewer" }).click();
await pp.getByRole("button", { name: "Send my reply" }).click();
await pp.getByText("We can't wait to see you!").waitFor();
const { rows: [after] } = await db.query("select rsvp, adults + children as party from guests where rsvp_token=$1", [gst.rsvp_token]);
ok(after.rsvp === "yes" && Number(after.party) === Number(gst.party) - 1, "personal reply updates the guest list");

ok(errors.length === 0, "no page errors " + errors.join(" | "));
await browser.close();
await db.end();

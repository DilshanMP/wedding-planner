/**
 * Runs the real SupabaseRepository and cloud services (through supabase-js)
 * against Postgres + PostgREST with the project's migrations and RLS.
 *
 * Skipped unless POSTGREST_URL and JWT_SECRET are set — see supabase/README.md
 * ("Integration tests") for the two-minute local setup.
 */
import { createHmac, randomUUID } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSampleWedding } from "@/lib/domain/sample-data";
import { contentFromWedding, newProject, snapshot } from "@/lib/domain/invite-studio";
import { claimInvites, invitationLookup, inviteToWedding, listMembers, listPendingInvites, rsvpLookup, rsvpSubmit } from "./cloud-services";
import { CloudPublished } from "./published";
import { SupabaseRepository } from "./supabase-repository";

const POSTGREST_URL = process.env.POSTGREST_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const PG_ADMIN = process.env.PG_ADMIN_URL; // optional: lets the test create auth users via PostgREST-less SQL

const b64 = (o: object | string) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
function jwt(claims: Record<string, unknown>): string {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64({ exp: Math.floor(Date.now() / 1000) + 3600, ...claims });
  const sig = createHmac("sha256", JWT_SECRET!).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

describe.skipIf(!POSTGREST_URL || !JWT_SECRET)("Supabase repository against PostgREST + RLS", () => {
  let server: http.Server;
  let base = "";
  const users = { a: randomUUID(), b: randomUUID(), c: randomUUID() };
  const emails = { a: `a-${users.a}@example.com`, b: `b-${users.b}@example.com`, c: `c-${users.c}@example.com` };
  let anonKey = "";
  const clientFor = (userId?: string): SupabaseClient =>
    createClient(base, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: userId ? { headers: { Authorization: `Bearer ${jwt({ sub: userId, role: "authenticated" })}` } } : undefined,
    });

  beforeAll(async () => {
    anonKey = jwt({ role: "anon" });
    // supabase-js talks to <url>/rest/v1; PostgREST serves at its root.
    server = http.createServer((req, res) => {
      const target = new URL(POSTGREST_URL!);
      const path = (req.url ?? "/").replace(/^\/rest\/v1/, "");
      const headers = { ...req.headers, host: target.host };
      const upstream = http.request({ hostname: target.hostname, port: target.port, path, method: req.method, headers }, (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      });
      req.pipe(upstream);
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    // Create the three auth users (the stub's auth.users is writable by the test admin).
    if (!PG_ADMIN) throw new Error("Set PG_ADMIN_URL so the test can create auth users.");
    const { Client } = await import("pg");
    const pg = new Client({ connectionString: PG_ADMIN });
    await pg.connect();
    for (const k of ["a", "b"] as const) await pg.query("insert into auth.users (id, email) values ($1, $2)", [users[k], emails[k]]);
    await pg.end();
  });

  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  const today = "2026-10-08";
  const data = createSampleWedding(today, "2026-10-08T00:00:00.000Z");

  it("creates and reloads a full wedding exactly", async () => {
    const repo = new SupabaseRepository(clientFor(users.a));
    await repo.createWedding(data);
    const loaded = await repo.loadWedding(data.wedding.id);
    expect(loaded).not.toBeNull();
    const strip = (xs: object[]) =>
      xs
        .map((x) => {
          const { createdAt, updatedAt, ...rest } = x as { id: string; createdAt?: string; updatedAt?: string };
          void createdAt;
          void updatedAt;
          return rest;
        })
        .sort((p, q) => p.id.localeCompare(q.id));
    for (const key of ["people", "tasks", "guests", "budgetItems", "vendors", "quotes", "payments", "timeline"] as const) {
      expect(strip(loaded![key] as object[]), key).toEqual(strip(data[key] as object[]));
    }
    expect(loaded!.wedding.blueprint).toEqual(data.wedding.blueprint);
    expect(loaded!.wedding.plannerQuotes).toEqual(data.wedding.plannerQuotes);
    expect(loaded!.wedding.pendingAttendanceRate).toBe(0.75);
    expect(await repo.listWeddings()).toEqual([expect.objectContaining({ id: data.wedding.id, brideName: "Nethmi" })]);
  });

  it("upserts and removes items", async () => {
    const repo = new SupabaseRepository(clientFor(users.a));
    const guest = { ...data.guests[0], rsvp: "no" as const };
    await repo.upsert(data.wedding.id, "guests", [guest]);
    await repo.saveWedding({ ...data.wedding, venue: "Lotus Hall, Kandy" });
    await repo.remove(data.wedding.id, "tasks", [data.tasks[0].id]);
    const loaded = await repo.loadWedding(data.wedding.id);
    expect(loaded!.guests.find((g) => g.id === guest.id)!.rsvp).toBe("no");
    expect(loaded!.wedding.venue).toBe("Lotus Hall, Kandy");
    expect(loaded!.tasks.some((t) => t.id === data.tasks[0].id)).toBe(false);
  });

  it("keeps another user out (RLS)", async () => {
    const other = new SupabaseRepository(clientFor(users.b));
    expect(await other.listWeddings()).toEqual([]);
    expect(await other.loadWedding(data.wedding.id)).toBeNull();
    await expect(other.upsert(data.wedding.id, "guests", [{ ...data.guests[1], name: "Intruder" }])).rejects.toThrow();
    const anon = new SupabaseRepository(clientFor());
    expect(await anon.listWeddings()).toEqual([]);
  });

  it("shares a wedding by email, immediately or on first sign-in", async () => {
    const owner = clientFor(users.a);
    expect(await inviteToWedding(owner, data.wedding.id, emails.b, "editor")).toBe("added");
    expect((await new SupabaseRepository(clientFor(users.b)).listWeddings()).map((w) => w.id)).toEqual([data.wedding.id]);
    // B is an editor now and can write.
    await new SupabaseRepository(clientFor(users.b)).upsert(data.wedding.id, "guests", [{ ...data.guests[1], table: "Table 3" }]);

    expect(await inviteToWedding(owner, data.wedding.id, emails.c.toUpperCase(), "viewer")).toBe("pending");
    expect((await listPendingInvites(owner, data.wedding.id)).map((i) => i.email)).toEqual([emails.c]);
    // C signs up later and claims the invitation.
    const { Client } = await import("pg");
    const pg = new Client({ connectionString: PG_ADMIN });
    await pg.connect();
    await pg.query("insert into auth.users (id, email) values ($1, $2)", [users.c, emails.c]);
    await pg.end();
    expect(await claimInvites(clientFor(users.c))).toBe(1);
    const members = await listMembers(owner, data.wedding.id);
    expect(members.map((m) => [m.email, m.role]).sort()).toEqual([[emails.a, "owner"], [emails.b, "editor"], [emails.c, "viewer"]].sort());
    // A viewer can read but not write.
    await expect(new SupabaseRepository(clientFor(users.c)).upsert(data.wedding.id, "guests", [{ ...data.guests[1], table: "Table 9" }])).rejects.toThrow();
    // Only the owner can invite.
    await expect(inviteToWedding(clientFor(users.b), data.wedding.id, "x@example.com", "viewer")).rejects.toThrow(/owner/);
  });

  it("answers an RSVP through a guest's token only when RSVP is on", async () => {
    const guest = data.guests.find((g) => g.adults + g.children >= 3)!;
    const anon = clientFor();
    expect(await rsvpLookup(anon, guest.rsvpToken)).toBeNull();
    await new SupabaseRepository(clientFor(users.a)).saveWedding({ ...data.wedding, rsvpEnabled: true });
    const invite = await rsvpLookup(anon, guest.rsvpToken);
    expect(invite).toMatchObject({ guestName: guest.name, brideName: "Nethmi", groomName: "Kasun", weddingDate: "2027-06-12" });
    expect(await rsvpSubmit(anon, guest.rsvpToken, { response: "yes", meal: "veg", attending: 2, message: "So happy for you!" })).toBe(true);
    const loaded = await new SupabaseRepository(clientFor(users.a)).loadWedding(data.wedding.id);
    const updated = loaded!.guests.find((g) => g.id === guest.id)!;
    expect(updated).toMatchObject({ rsvp: "yes", meal: "veg", invitation: "confirmed" });
    expect(updated.adults + updated.children).toBe(2);
    expect(updated.notes).toContain("RSVP note: So happy for you!");
    expect(await rsvpLookup(anon, randomUUID())).toBeNull();
    await expect(rsvpSubmit(anon, guest.rsvpToken, { response: "yes", meal: "veg", attending: 99, message: "" })).rejects.toThrow();
    // Anonymous visitors still can't read tables directly.
    const { data: rows } = await anon.from("guests").select("id");
    expect(rows).toEqual([]);
  });

  it("publishes an invitation that guests can open and answer, and only members read the replies", async () => {
    const owner = new SupabaseRepository(clientFor(users.a));
    const project = newProject("ivory-champagne", contentFromWedding(data.wedding), "2026-10-20T10:00:00.000Z", randomUUID, "Main invitation");
    // The design itself is saved with the planner.
    await owner.savePlanner(data.wedding.id, "invites", { projects: [project], mainId: project.id });
    expect((await owner.loadWedding(data.wedding.id))!.planner.invites?.projects[0].name).toBe("Main invitation");

    const slug = `nethmi-and-kasun-${randomUUID().slice(0, 4)}`;
    const now = "2026-10-20T10:05:00.000Z";
    const rec = { slug, weddingId: data.wedding.id, projectId: project.id, isMain: true, data: snapshot(project, now), publishedAt: now, views: 0, active: true };
    await new CloudPublished(clientFor(users.a)).publish(rec);
    // A non-member can't publish over someone else's link, or into this wedding.
    await expect(new CloudPublished(clientFor(randomUUID())).publish({ ...rec })).rejects.toThrow();

    // A guest (signed out) opens it by slug and replies.
    const guest = new CloudPublished(clientFor());
    const opened = await guest.open(slug);
    expect(opened?.content.brideName).toBe("Nethmi");
    expect(await guest.open("no-such-invitation")).toBeNull();
    expect(await guest.reply(slug, { name: "Ruwan Silva", attending: "yes", party: 2, message: "Congratulations!", contact: "0771234567" })).toBe(true);
    await expect(guest.reply(slug, { name: "Too many", attending: "yes", party: 9, message: "", contact: "" })).rejects.toThrow();
    // Guests can't list invitations or read replies directly.
    expect((await clientFor().from("invitation_rsvps").select("id")).data).toEqual([]);
    await expect(guest.rsvps(data.wedding.id)).resolves.toEqual([]);

    // Members see the reply and the view count.
    const replies = await new CloudPublished(clientFor(users.a)).rsvps(data.wedding.id);
    expect(replies).toEqual([expect.objectContaining({ slug, name: "Ruwan Silva", attending: "yes", party: 2, message: "Congratulations!" })]);
    expect((await new CloudPublished(clientFor(users.c)).rsvps(data.wedding.id)).length).toBe(1); // viewer can read
    const listed = await new CloudPublished(clientFor(users.a)).list(data.wedding.id);
    expect(listed).toEqual([expect.objectContaining({ slug, isMain: true, views: 1, active: true })]);

    // Personal links pick up the main design.
    const someone = data.guests[2];
    const lookup = await invitationLookup(clientFor(), someone.rsvpToken);
    expect(lookup?.design?.projectId).toBe(project.id);

    // A viewer can't delete replies; the owner can. Unpublishing closes the link.
    await new CloudPublished(clientFor(users.c)).removeRsvp(data.wedding.id, replies[0].id);
    expect((await new CloudPublished(clientFor(users.a)).rsvps(data.wedding.id)).length).toBe(1);
    await new CloudPublished(clientFor(users.a)).removeRsvp(data.wedding.id, replies[0].id);
    expect(await new CloudPublished(clientFor(users.a)).rsvps(data.wedding.id)).toEqual([]);
    await new CloudPublished(clientFor(users.a)).unpublish(data.wedding.id, slug);
    expect(await guest.open(slug)).toBeNull();
    expect(await guest.reply(slug, { name: "Late", attending: "no", party: 0, message: "", contact: "" })).toBe(false);
  });

  it("soft-deletes a wedding", async () => {
    const repo = new SupabaseRepository(clientFor(users.a));
    await repo.deleteWedding(data.wedding.id);
    expect(await repo.listWeddings()).toEqual([]);
    expect(await repo.loadWedding(data.wedding.id)).toBeNull();
  });
});

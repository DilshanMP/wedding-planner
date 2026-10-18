import { describe, expect, it } from "vitest";
import {
  CARD_LAYOUTS, FONTS, TEMPLATES, applyTemplate, checkRsvp, contentFromWedding, designFromTemplate, makeSlug, matchColors, newProject,
  normalizeInvites, readableOn, SLUG_RE, snapshot, hasUnpublishedChanges, type PublishedInvitation,
} from "../invite-studio";
import { generateWording } from "../invite-wording";
import { contrast } from "../../theme-colors";
import { LocalPublished } from "../../data/published";
import { MemoryStorage } from "../../data/local-repository";

const now = "2026-10-20T10:00:00.000Z";
let n = 0;
const id = () => `id-${++n}`;
const wedding = { brideName: "Sachini", groomName: "Dilshan", weddingDate: "2027-05-27", venue: "Paradise Inn", location: "Bolgoda" };

describe("templates", () => {
  it("has eight distinct, complete templates", () => {
    expect(TEMPLATES).toHaveLength(8);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(8);
    expect(new Set(TEMPLATES.map((t) => t.design.card.layout)).size).toBe(8);
    for (const t of TEMPLATES) {
      expect(CARD_LAYOUTS).toContain(t.design.card.layout);
      expect(Object.keys(FONTS)).toContain(t.design.fonts.names);
      // Card text must be readable on its card.
      expect(contrast(t.design.colors.ink, t.design.colors.card)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("switching template keeps the couple's words and photo", () => {
    const p = newProject("ivory-champagne", contentFromWedding(wedding), now, id);
    p.content.dressCode = "Pastels";
    p.design.photo = { src: "data:image/jpeg;base64,xx", x: 40, y: 60, zoom: 1.4, placement: "card" };
    p.design.seal.text = "S & D";
    const q = applyTemplate(p, "black-tie");
    expect(q.design.card.layout).toBe("blacktie");
    expect(q.content.dressCode).toBe("Pastels");
    expect(q.design.photo.zoom).toBe(1.4);
    expect(q.design.seal.text).toBe("S & D");
  });

  it("fills missing fields in older saves", () => {
    const plan = normalizeInvites({ projects: [{ id: "x", design: { templateId: "wine-royal" } } as never] }, now);
    expect(plan.projects[0].design.colors.envelope).toBe(designFromTemplate("wine-royal").colors.envelope);
    expect(plan.projects[0].content.maxParty).toBe(2);
    expect(plan.mainId).toBeNull();
  });
});

describe("smart colours", () => {
  it.each(["#D9B3B8", "#722F37", "#C8B8DC", "#A8B5A0", "#123456", "#FFFFFF"])("keeps %s readable", (c) => {
    for (const mood of ["light", "dark"] as const) {
      const p = matchColors(c, mood);
      expect(contrast(p.ink, p.card)).toBeGreaterThanOrEqual(7);
      expect(contrast(readableOn(p.seal), p.seal)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("wording", () => {
  const c = { ...contentFromWedding(wedding), brideFull: "Sachini Perera", groomFull: "Dilshan Silva" };
  it("writes English, Sinhala or both, and varies", () => {
    const en = generateWording(c, { tone: "formal", tradition: "traditional", language: "en", length: "detailed", variant: 0 });
    expect(en.inviteMessage).toContain("Sachini Perera");
    expect(en.inviteMessage).toContain("Thursday, 27 May 2027");
    const si = generateWording(c, { tone: "formal", tradition: "traditional", language: "si", length: "short", variant: 0 });
    expect(si.inviteMessage).toMatch(/[඀-෿]/);
    const both = generateWording(c, { tone: "modern", tradition: "contemporary", language: "both", length: "short", variant: 1 });
    expect(both.inviteMessage).toMatch(/[඀-෿][\s\S]*\n\n[A-Za-z]/);
    const other = generateWording(c, { tone: "formal", tradition: "traditional", language: "en", length: "detailed", variant: 1 });
    expect(other.inviteMessage).not.toBe(en.inviteMessage);
  });
});

describe("publishing", () => {
  it("makes safe, readable slugs", () => {
    expect(makeSlug("Sachini", "Dilshan", () => 0.5)).toMatch(/^sachini-and-dilshan-[a-z0-9]{4}$/);
    expect(SLUG_RE.test(makeSlug("සචිනි", "", () => 0.1))).toBe(true);
  });

  it("validates replies", () => {
    expect(checkRsvp({ name: "", attending: "yes", party: 1, message: "" }, 2)).toMatch(/name/);
    expect(checkRsvp({ name: "Nimal", attending: "yes", party: 3, message: "" }, 2)).toMatch(/up to 2/);
    expect(checkRsvp({ name: "Nimal", attending: "no", party: 0, message: "" }, 2)).toBeNull();
  });

  it("local store: publish, open (counts views), reply, list, unpublish", async () => {
    const store = new LocalPublished(new MemoryStorage());
    const p = newProject("dusty-pink-floral", contentFromWedding(wedding), now, id);
    const rec: PublishedInvitation = { slug: "sachini-and-dilshan-x1y2", weddingId: "w1", projectId: p.id, isMain: true, data: snapshot(p, now), publishedAt: now, views: 0, active: true };
    await store.publish(rec);
    expect((await store.open(rec.slug))?.content.brideName).toBe("Sachini");
    expect((await store.list("w1"))[0].views).toBe(1);
    expect(await store.reply(rec.slug, { name: "Nimal", attending: "yes", party: 2, message: "Congrats", contact: "" })).toBe(true);
    expect((await store.rsvps("w1"))[0]).toMatchObject({ name: "Nimal", party: 2 });
    await expect(store.publish({ ...rec, weddingId: "w2" })).rejects.toThrow(/taken/);
    await store.unpublish("w1", rec.slug);
    expect(await store.open(rec.slug)).toBeNull();
    expect(await store.reply(rec.slug, { name: "Late", attending: "no", party: 0, message: "", contact: "" })).toBe(false);
  });

  it("notices edits after publishing", () => {
    const p = { ...newProject("gold-foil", contentFromWedding(wedding), now, id), publishedAt: now };
    expect(hasUnpublishedChanges(p)).toBe(false);
    expect(hasUnpublishedChanges({ ...p, updatedAt: "2026-10-21T00:00:00.000Z" })).toBe(true);
  });
});

describe("addressing personal invitations", () => {
  it("says You, You Both or You & Your Family from the party", async () => {
    const { addressFor, designFromTemplate } = await import("../invite-studio");
    expect(addressFor({ adults: 1, children: 0 })).toBe("You");
    expect(addressFor({ adults: 2, children: 0 })).toBe("You Both");
    expect(addressFor({ adults: 1, children: 1 })).toBe("You & Your Family");
    expect(addressFor({ adults: 4, children: 0 })).toBe("You & Your Family");
    expect(addressFor({ adults: 0, children: 0 })).toBe("You");
    expect(designFromTemplate("ivory-champagne").addressing).toBe("you");
  });

  it("uses the same words in the WhatsApp message", async () => {
    const { invitationMessage } = await import("../invitations");
    const wedding = { brideName: "Amaya", groomName: "Kavindu", weddingDate: "2027-05-27", venue: "Paradise Inn", location: "Bolgoda" };
    const msg = invitationMessage(wedding as never, { name: "Perera family", adults: 2, children: 2 } as never, null);
    expect(msg).toContain("warmly invite you and your family to celebrate");
  });
});

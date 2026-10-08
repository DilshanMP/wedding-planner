import { describe, expect, it } from "vitest";
import { answerLocally, assistantContext, SUGGESTED_QUESTIONS } from "../assistant";
import { toWhatsAppNumber, invitationMessage, whatsAppLink } from "../invitations";
import { createSampleWedding } from "../sample-data";

const TODAY = "2026-10-08";
const data = createSampleWedding(TODAY, "2026-10-08T00:00:00.000Z");

describe("assistant", () => {
  it("answers every suggested question from the data", () => {
    for (const q of SUGGESTED_QUESTIONS) {
      const a = answerLocally(q, data, TODAY);
      expect(a, q).not.toBeNull();
      expect(a!.text.length, q).toBeGreaterThan(20);
    }
  });
  it("checks affordability against the right category", () => {
    const a = answerLocally("Can I afford a photographer for LKR 350,000?", data, TODAY)!;
    expect(a.intent).toBe("afford");
    // Photography projected 280,000 → 350,000 raises the 3,630,000 projection to 3,700,000.
    expect(a.text).toContain("LKR 3,700,000");
    expect(a.text).toContain("You planned LKR 300,000 for photography");
    const lakhs = answerLocally("can we afford decoration at 4 lakhs", data, TODAY)!;
    expect(lakhs.text).toContain("LKR 400,000");
  });
  it("names the better-value quote", () => {
    const a = answerLocally("Compare my decoration quotes", data, TODAY)!;
    expect(a.text).toMatch(/Kandy Blooms/);
  });
  it("returns null for unknown questions so the model (or help) can take over", () => {
    expect(answerLocally("Write a poem about our love", data, TODAY)).toBeNull();
  });
  it("sends only aggregate facts to a language model", () => {
    const json = JSON.stringify(assistantContext(data, TODAY));
    for (const g of data.guests.slice(0, 20)) {
      expect(json).not.toContain(g.phone);
    }
    expect(json.length).toBeLessThan(60_000);
  });
});

describe("WhatsApp invitations", () => {
  it("converts Sri Lankan numbers to international form", () => {
    expect(toWhatsAppNumber("077 123 4567")).toBe("94771234567");
    expect(toWhatsAppNumber("+94 77 123 4567")).toBe("94771234567");
    expect(toWhatsAppNumber("0094771234567")).toBe("94771234567");
    expect(toWhatsAppNumber("771234567")).toBe("94771234567");
    expect(toWhatsAppNumber("123")).toBeNull();
  });
  it("builds a message with the RSVP link when online RSVP is on", () => {
    const g = data.guests[0];
    const msg = invitationMessage(data.wedding, g, "https://example.com/rsvp/abc");
    expect(msg).toContain("Nethmi & Kasun");
    expect(msg).toContain("Saturday, 12 June 2027");
    expect(msg).toContain("https://example.com/rsvp/abc");
    expect(whatsAppLink({ ...g, phone: "077 123 4567" }, msg)).toMatch(/^https:\/\/wa\.me\/94771234567\?text=/);
  });
});

import { can, canCreateWedding, PLANS } from "../plans";
describe("plans", () => {
  it("gives couples everything available today on Free", () => {
    for (const f of ["plan_wedding", "share_family", "online_rsvp", "document_vault", "reports"] as const) expect(can("free", f)).toBe(true);
    expect(can("free", "multiple_client_weddings")).toBe(false);
    expect(canCreateWedding("free", 1)).toBe(true);
    expect(canCreateWedding("free", 2)).toBe(false);
    expect(canCreateWedding("planner", 500)).toBe(true);
    expect(Object.values(PLANS).filter((p) => p.available).map((p) => p.id)).toEqual(["free"]);
  });
});

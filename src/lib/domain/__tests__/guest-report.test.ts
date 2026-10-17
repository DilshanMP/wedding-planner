import { describe, expect, it } from "vitest";
import { guestCategories } from "../guests";
import { guestReport, guestReportText } from "../guest-report";
import { createSampleWedding } from "../sample-data";

describe("guest report", () => {
  it("groups by table (plan first, else typed table) and lists the rest", () => {
    const data = createSampleWedding("2026-10-17", "2026-10-17T00:00:00Z");
    const [a, b, c] = data.guests;
    data.guests = data.guests.map((g) => ({ ...g, table: "", rsvp: g.rsvp === "no" ? "pending" : g.rsvp }));
    data.guests[2] = { ...data.guests[2], table: "Table 10" };
    data.planner.seating.tables = [{ id: "t2", label: "Table 2", x: 0, y: 0, seats: 10, shape: "round", guestIds: [a.id, b.id] }];
    const r = guestReport(data);
    expect(r.tables.map((t) => t.label)).toEqual(["Table 2", "Table 10"]);
    expect(r.tables[1].guests[0].id).toBe(c.id);
    expect(r.unseated.length).toBe(data.guests.length - 3);
    expect(r.alpha.find((x) => x.guest.id === a.id)?.table).toBe("Table 2");
    expect(guestReportText(r, data.wedding)).toContain("TABLE 2");
  });

  it("puts used categories first", () => {
    expect(guestCategories([{ category: "Brand team" }, { category: "Brand team" }, { category: "Office" }]).slice(0, 3)).toEqual(["Brand team", "Office", "Family"]);
  });
});

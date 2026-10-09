import { describe, expect, it } from "vitest";
import { describeRemove, describeUpsert, describeWedding, sampleActivity, timeAgo } from "../activity";
import { createSampleWedding } from "../sample-data";

const data = createSampleWedding("2026-10-08", "2026-10-08T00:00:00Z");

describe("activity descriptions", () => {
  it("says what changed on a task", () => {
    const task = data.tasks.find((t) => t.status === "not_started")!;
    expect(describeUpsert("tasks", [{ ...task, status: "completed" }], data)).toEqual([{ kind: "tasks", summary: `completed “${task.title}”` }]);
    expect(describeUpsert("tasks", [{ ...task, status: "in_progress" }], data)[0].summary).toBe(`moved “${task.title}” to In progress`);
    expect(describeUpsert("tasks", [{ ...task, id: "new", title: "Book drummers" }], data)[0].summary).toBe("added task “Book drummers”");
  });

  it("describes RSVPs, bookings and payments in plain words", () => {
    const guest = data.guests.find((g) => g.rsvp !== "yes")!;
    expect(describeUpsert("guests", [{ ...guest, rsvp: "yes" }], data)[0].summary).toBe(`marked “${guest.name}” as Attending`);
    const vendor = data.vendors.find((v) => v.status !== "booked")!;
    expect(describeUpsert("vendors", [{ ...vendor, status: "booked" }], data)[0].summary).toBe(`booked “${vendor.name}”`);
    const payment = data.payments.find((p) => p.status === "scheduled")!;
    expect(describeUpsert("payments", [{ ...payment, status: "paid" }], data)[0].summary).toMatch(/^paid LKR [\d,]+ for “/);
  });

  it("ignores Wedding Day Mode check-ins and summarises large batches", () => {
    const vendor = data.vendors[0];
    expect(describeUpsert("vendors", [{ ...vendor, dayStatus: "on_site" }], data)).toEqual([]);
    const many = data.tasks.slice(0, 10).map((t) => ({ ...t, notes: "x" }));
    expect(describeUpsert("tasks", many, data)).toEqual([{ kind: "tasks", summary: "updated 10 tasks" }]);
  });

  it("describes removals and wedding changes", () => {
    const g = data.guests[0];
    expect(describeRemove("guests", [g.id], data)[0].summary).toBe(`removed guest “${g.name}”`);
    expect(describeRemove("guests", ["missing"], data)).toEqual([]);
    expect(describeWedding(data.wedding, { ...data.wedding, weddingDate: "2027-06-19" })[0].summary).toBe("moved the wedding date to Saturday, 19 June 2027");
  });

  it("formats relative times", () => {
    const now = new Date("2026-10-09T12:00:00Z");
    expect(timeAgo("2026-10-09T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-10-09T11:55:00Z", now)).toBe("5 min ago");
    expect(timeAgo("2026-10-09T09:00:00Z", now)).toBe("3 h ago");
    expect(timeAgo("2026-10-08T10:00:00Z", now)).toBe("yesterday");
  });

  it("gives the sample wedding a history from both of them", () => {
    const entries = sampleActivity(data, new Date("2026-10-09T12:00:00Z"));
    expect(entries.length).toBeGreaterThan(4);
    expect(new Set(entries.map((e) => e.actorName))).toEqual(new Set(["Nethmi", "Kasun"]));
  });
});

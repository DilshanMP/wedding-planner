import { describe, expect, it } from "vitest";
import { suggestAllocation, summarizeBudget, rollupByCategory, bucketPayments, effectiveStatus } from "../budget";
import { addDays, daysBetween, formatDate, formatLongDate, formatTime, relativeDue, isISODate } from "../dates";
import { formatLKR, formatLKRExact, parseLKR, roundEstimate } from "../money";
import { generateTasks, rescheduleTasks, taskMetrics } from "../tasks";
import { TASK_TEMPLATES } from "../task-templates";
import { guestMetrics, guestGroup } from "../guests";
import { scoreQuotes, trueCost } from "../quotes";
import { computeReadiness, computeJourney } from "../readiness";
import { nowNext, overlaps } from "../day";
import { budgetInsights, nextActions } from "../insights";
import { createSampleWedding } from "../sample-data";
import { createWeddingData, defaultPeople } from "../factory";
import { BUDGET_CATEGORIES, TASK_CATEGORIES } from "../catalog";
import { guestSchema, setupSchema } from "../schemas";
import type { Guest } from "../types";

const TODAY = "2026-10-08";
const NOW = "2026-10-08T09:00:00.000Z";

describe("money", () => {
  it("formats LKR with currency code first and grouping", () => {
    expect(formatLKR(3_500_000)).toBe("LKR 3,500,000");
    expect(formatLKR(-125_000)).toBe("−LKR 125,000");
    expect(formatLKRExact(400_000)).toBe("LKR 400,000.00");
  });
  it("rounds estimates to avoid fake precision", () => {
    expect(roundEstimate(83_412)).toBe(85_000);
    expect(roundEstimate(12_400)).toBe(12_000);
  });
  it("parses user input", () => {
    expect(parseLKR("LKR 3,500,000")).toBe(3_500_000);
    expect(parseLKR("")).toBeNull();
    expect(parseLKR("-5")).toBeNull();
  });
});

describe("dates", () => {
  it("does calendar maths without timezone drift", () => {
    expect(daysBetween(TODAY, "2027-06-12")).toBe(247);
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    expect(formatDate("2027-06-12")).toBe("12 June 2027");
    expect(formatLongDate("2027-06-12")).toBe("Saturday, 12 June 2027");
    expect(formatTime("10:30")).toBe("10:30 AM");
    expect(formatTime("00:05")).toBe("12:05 AM");
    expect(formatTime("19:00")).toBe("7:00 PM");
    expect(relativeDue("2026-10-13", TODAY)).toBe("In 5 days");
    expect(relativeDue("2026-10-05", TODAY)).toBe("3 days overdue");
    expect(isISODate("2027-02-30")).toBe(false);
  });
});

describe("catalog", () => {
  it("default budget shares sum to 100%", () => {
    expect(BUDGET_CATEGORIES.reduce((s, c) => s + c.defaultShare, 0)).toBe(100);
  });
  it("every template uses a known task category", () => {
    const ids = new Set(TASK_CATEGORIES.map((c) => c.id));
    for (const t of TASK_TEMPLATES) expect(ids.has(t.categoryId), t.key).toBe(true);
  });
  it("template keys are unique and dependencies exist", () => {
    const keys = TASK_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const t of TASK_TEMPLATES) for (const d of t.dependsOn ?? []) expect(keys).toContain(d);
  });
});

describe("task generation", () => {
  const people = defaultPeople("Nethmi", "Kasun");
  it("calculates due dates from the wedding date", () => {
    const tasks = generateTasks({ weddingDate: "2027-06-12", today: "2026-01-01", people, now: NOW });
    const kit = tasks.find((t) => t.templateKey === "emergency-kit")!;
    expect(kit.dueDate).toBe("2027-06-05");
    const day = tasks.find((t) => t.templateKey === "day-brief")!;
    expect(day.dueDate).toBe("2027-06-12");
  });
  it("reschedules overdue template dates into the future as catch-up", () => {
    const tasks = generateTasks({ weddingDate: "2027-06-12", today: TODAY, people, now: NOW });
    for (const t of tasks) expect(t.dueDate! >= TODAY, t.title).toBe(true);
    const venue = tasks.find((t) => t.templateKey === "venue-book")!;
    expect(venue.notes).toMatch(/Catch-up/);
  });
  it("links dependencies by id and assigns owners by role", () => {
    const tasks = generateTasks({ weddingDate: "2027-06-12", today: "2026-01-01", people, now: NOW });
    const book = tasks.find((t) => t.templateKey === "photo-book")!;
    const shortlist = tasks.find((t) => t.templateKey === "photo-shortlist")!;
    expect(book.dependsOn).toEqual([shortlist.id]);
    const saree = tasks.find((t) => t.templateKey === "saree-choose")!;
    expect(saree.ownerId).toBe(people.find((m) => m.role === "bride")!.id);
  });
  it("shifts open tasks when the date moves", () => {
    const tasks = generateTasks({ weddingDate: "2027-06-12", today: "2026-01-01", people, now: NOW });
    const moved = rescheduleTasks(tasks, "2027-06-12", "2027-06-19");
    expect(daysBetween(tasks[0].dueDate!, moved[0].dueDate!)).toBe(7);
  });
});

describe("budget", () => {
  it("allocation matches the budget exactly and respects priorities", () => {
    const base = suggestAllocation({ budget: 3_500_000, priorities: [], avoid: [] });
    const total = Object.values(base).reduce((s, v) => s + v, 0);
    expect(total).toBe(3_500_000);
    const boosted = suggestAllocation({ budget: 3_500_000, priorities: ["photography"], avoid: ["decoration"] });
    expect(boosted.photography).toBeGreaterThan(base.photography);
    expect(boosted.decoration).toBeLessThan(base.decoration);
  });

  it("summarises the sample wedding consistently", () => {
    const data = createSampleWedding(TODAY, NOW);
    const s = summarizeBudget(data.wedding, data.budgetItems, data.payments);
    expect(s.original).toBe(3_500_000);
    expect(s.planned).toBe(3_500_000);
    expect(s.forecast).toBe(3_630_000);
    expect(s.variance).toBe(130_000);
    expect(s.committed).toBe(2_330_000);
    expect(s.remaining).toBe(3_500_000 - 2_330_000);
    expect(s.health).toBe("over");
    const decoration = rollupByCategory(data.budgetItems, data.payments).find((r) => r.categoryId === "decoration")!;
    expect(decoration.variancePct).toBe(15);
    expect(decoration.state).toBe("over");
  });

  it("derives paid status from payments", () => {
    const data = createSampleWedding(TODAY, NOW);
    const jewel = data.budgetItems.find((i) => i.categoryId === "jewelry")!;
    expect(effectiveStatus(jewel, data.payments)).toBe("paid");
    const venue = data.budgetItems.find((i) => i.categoryId === "venue")!;
    expect(effectiveStatus(venue, data.payments)).toBe("partially_paid");
  });

  it("buckets payments by urgency", () => {
    const data = createSampleWedding(TODAY, NOW);
    const b = bucketPayments(data.payments, TODAY);
    expect(b.thisWeek.map((p) => p.label)).toEqual(["Second instalment"]);
    expect(b.overdue).toHaveLength(0);
    expect(b.thisMonth.map((p) => p.label)).toEqual(["Advance"]);
  });
});

describe("guests", () => {
  const g = (over: Partial<Guest>): Guest => ({
    id: "x", name: "Test", phone: "", email: "", side: "bride", relation: "family", vip: false, partyType: "single",
    adults: 1, children: 0, invitation: "sent", rsvp: "pending", meal: "unknown", vegCount: 0, table: "",
    needsTransport: false, needsAccommodation: false, notes: "", rsvpToken: "t", createdAt: NOW, updatedAt: NOW, ...over,
  });
  it("counts people, not parties", () => {
    const m = guestMetrics(
      [
        g({ adults: 2, children: 2, rsvp: "yes", meal: "mixed", vegCount: 1 }),
        g({ side: "groom", adults: 2, rsvp: "no" }),
        g({ side: "groom", rsvp: "maybe" }),
        g({ invitation: "not_sent", adults: 2 }),
        g({ adults: 4 }),
      ],
      { pendingAttendanceRate: 0.75 },
    );
    expect(m.total).toBe(13);
    expect(m.confirmed).toBe(4);
    expect(m.declined).toBe(2);
    expect(m.notInvited).toBe(2);
    expect(m.invitationCoverage).toBe(85); // 11 of 13 people invited
    expect(m.rsvpCompletion).toBe(64); // 7 of 11 invited answered
    expect(m.pending).toBe(6);
    expect(m.expectedAttendance).toBe(Math.round(4 + 0.5 + 6 * 0.75));
    expect(m.meals).toEqual({ veg: 1, nonVeg: 3, unknown: 0 });
  });
  it("derives guest groups", () => {
    expect(guestGroup(g({ side: "groom", relation: "colleague" }))).toBe("groom_colleagues");
    expect(guestGroup(g({ vip: true }))).toBe("vip");
  });
  it("sample guest list has a realistic size", () => {
    const data = createSampleWedding(TODAY, NOW);
    const m = guestMetrics(data.guests, data.wedding);
    expect(m.total).toBeGreaterThan(250);
    expect(m.total).toBeLessThan(400);
    expect(m.notInvited).toBeGreaterThan(0);
  });
});

describe("quotes", () => {
  it("scores quotes transparently and labels them without auto-picking the cheapest", () => {
    const data = createSampleWedding(TODAY, NOW);
    const photoVendors = new Set(data.vendors.filter((v) => v.categoryId === "photography").map((v) => v.id));
    const quotes = data.quotes.filter((q) => photoVendors.has(q.vendorId));
    const scored = scoreQuotes(quotes, data.vendors, "photography");
    expect(scored).toHaveLength(3);
    const lowest = scored.find((s) => s.labels.includes("lowest_cost"))!;
    const best = scored.find((s) => s.labels.includes("best_value"))!;
    const premium = scored.find((s) => s.labels.includes("premium"))!;
    expect(lowest.trueCost).toBe(245_000);
    expect(premium.vendor?.name).toBe("Studio Serendib");
    expect(best.vendor?.name).not.toBe("Lens of Lanka");
    expect(trueCost(premium.quote)).toBe(475_000);
    for (const s of scored) {
      expect(s.valueScore).toBeGreaterThanOrEqual(0);
      expect(s.valueScore).toBeLessThanOrEqual(100);
    }
  });
});

describe("readiness and journey", () => {
  it("produces bounded component scores with explanations", () => {
    const data = createSampleWedding(TODAY, NOW);
    const r = computeReadiness(data);
    expect(r.components).toHaveLength(6);
    for (const c of r.components) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
      expect(c.explanation.length).toBeGreaterThan(10);
    }
    expect(r.overall).toBe(Math.round(r.components.reduce((s, c) => s + c.score, 0) / 6));
  });
  it("journey has 12 stages and early ones are complete in the sample", () => {
    const data = createSampleWedding(TODAY, NOW);
    const stages = computeJourney(data, TODAY);
    expect(stages).toHaveLength(12);
    expect(stages[0].state).toBe("completed");
    expect(stages[11].state).toBe("not_started");
  });
  it("a brand-new wedding starts at a low, honest readiness", () => {
    const data = createWeddingData(
      { brideName: "A", groomName: "B", weddingDate: "2027-06-12", venue: "", location: "", estimatedGuests: 200, budget: 2_000_000, style: "traditional", priorities: [], mustHave: [], niceToHave: [], avoidOverspending: [] },
      TODAY,
      NOW,
    );
    const r = computeReadiness(data);
    expect(r.overall).toBeLessThan(20);
    expect(data.budgetItems.reduce((s, i) => s + i.planned, 0)).toBe(2_000_000);
    expect(taskMetrics(data.tasks, TODAY).completed).toBe(0);
  });
});

describe("wedding day", () => {
  const data = createSampleWedding(TODAY, NOW);
  it("knows what is happening now and next", () => {
    const at1040 = nowNext(data.timeline, 10 * 60 + 40);
    expect(at1040.current?.title).toBe("Poruwa ceremony");
    expect(at1040.next?.title).toBe("Marriage registration");
    expect(nowNext(data.timeline, 4 * 60).phase).toBe("before");
    expect(nowNext(data.timeline, 23 * 60).phase).toBe("after");
  });
  it("flags clashes only when moments share a place", () => {
    expect(overlaps(data.timeline).size).toBe(0);
    const poruwa = data.timeline.find((e) => e.scene === "poruwa")!;
    const clash = { ...poruwa, id: "x", title: "Drummers rehearsal", scene: "other" as const, time: "10:45" };
    expect([...overlaps([...data.timeline, clash])].sort()).toEqual([poruwa.id, "x"].sort());
  });
});

describe("insights", () => {
  it("explains budget pressure in plain language", () => {
    const data = createSampleWedding(TODAY, NOW);
    const insights = budgetInsights(data);
    expect(insights[0].title).toBe("Your projected total is LKR 130,000 above the original budget.");
    expect(insights.some((i) => i.title.startsWith("Decoration is currently 15% above"))).toBe(true);
    expect(insights.some((i) => i.title.includes("Kandy Blooms could save about LKR 70,000"))).toBe(true);
  });
  it("puts the most urgent next action first", () => {
    const data = createSampleWedding(TODAY, NOW);
    const actions = nextActions(data, TODAY);
    expect(actions[0].title).toMatch(/Lotus Hall's second instalment is due in 5 days/);
  });
});

describe("schemas", () => {
  it("rejects invalid setup input with friendly messages", () => {
    const res = setupSchema.safeParse({ brideName: "", groomName: "K", weddingDate: "2027-02-30", venue: "", location: "", estimatedGuests: 0, budget: 0, style: "traditional", priorities: [], mustHave: [], niceToHave: [], avoidOverspending: [] });
    expect(res.success).toBe(false);
  });
  it("requires at least one person in a party", () => {
    const res = guestSchema.safeParse({ name: "X", phone: "", email: "", side: "bride", relation: "family", vip: false, partyType: "single", adults: 0, children: 0, invitation: "not_sent", rsvp: "pending", meal: "unknown", vegCount: 0, table: "", needsTransport: false, needsAccommodation: false, notes: "" });
    expect(res.success).toBe(false);
  });
});

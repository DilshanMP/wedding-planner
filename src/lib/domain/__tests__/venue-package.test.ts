import { describe, expect, it } from "vitest";
import { alsoProvides, applyPackage, currentPackage } from "../venue-package";
import { computeReadiness } from "../readiness";
import { createSampleWedding } from "../sample-data";

let n = 0;
const id = () => `vp-${++n}`;
const now = "2026-10-14T00:00:00Z";

describe("hotel package", () => {
  it("links covered categories to the hotel, ticks booking tasks and counts them as booked", () => {
    const data = createSampleWedding("2026-10-14", now);
    // Pretend decor isn't booked yet so we can see the hotel cover it.
    data.vendors = data.vendors.filter((v) => v.categoryId !== "decoration");
    data.budgetItems = data.budgetItems.map((i) => (i.categoryId === "decoration" ? { ...i, vendorId: null, status: "planned" } : i));
    data.tasks = data.tasks.map((t) => (t.templateKey === "decor-book" || t.templateKey === "decor-quotes" ? { ...t, status: "not_started", completedAt: null } : t));
    const before = computeReadiness(data).components.find((c) => c.id === "vendors")!.score;
    const hotel = data.vendors.find((v) => v.categoryId === "venue")!;

    const res = applyPackage(data, hotel, [
      { categoryId: "decoration", coverage: "extra", amount: 350_000 },
      { categoryId: "poruwa", coverage: "included", amount: null },
      { categoryId: "lighting", coverage: "extra", amount: 120_000 },
    ], now, id);

    const decor = res.budgetItems.find((i) => i.categoryId === "decoration")!;
    expect(decor).toMatchObject({ vendorId: hotel.id, quoted: 350_000, status: "booked" });
    const poruwa = res.budgetItems.find((i) => i.categoryId === "poruwa")!;
    expect(poruwa).toMatchObject({ planned: 0, quoted: 0, vendorId: hotel.id });
    expect(res.tasks.map((t) => t.templateKey)).toEqual(expect.arrayContaining(["decor-book", "decor-quotes"]));
    expect(res.tasks.every((t) => t.status === "completed")).toBe(true);

    const merged = { ...data, budgetItems: data.budgetItems.map((i) => res.budgetItems.find((x) => x.id === i.id) ?? i).concat(res.budgetItems.filter((x) => !data.budgetItems.some((i) => i.id === x.id))) };
    const after = computeReadiness(merged).components.find((c) => c.id === "vendors")!.score;
    expect(after).toBeGreaterThan(before);
    expect(alsoProvides(merged, hotel)).toEqual(expect.arrayContaining(["decoration", "poruwa", "lighting"]));
    expect(currentPackage(merged, hotel.id).find((c) => c.categoryId === "poruwa")?.coverage).toBe("included");
  });
});

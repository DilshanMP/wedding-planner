import { describe, expect, it } from "vitest";
import { checklistPhases, checklistText } from "../tasks";
import { CRYSTAL_GLOW_2027, defaultSeating, eveningTimeline, menuFromTemplate, menuProgress, menuText, normalizePlanner, seatsUsed, toggleDish, venueBudgetLines } from "../planner";
import { compareAdvice, outfitAdvice } from "../advisor";
import { createSampleWedding } from "../sample-data";
import { scoreQuotes } from "../quotes";
import { themeVars, contrast } from "@/lib/theme-colors";

let n = 0;
const id = () => `id-${++n}`;
const data = createSampleWedding("2026-10-14", "2026-10-14T00:00:00Z");

describe("menu", () => {
  it("respects how many dishes each course allows", () => {
    let m = menuFromTemplate(CRYSTAL_GLOW_2027);
    expect(menuProgress(m)).toMatchObject({ done: 0, total: 11 });
    for (const d of ["Garlic bread salsa", "Seafood mayonnaise", "Chicken wings with satay sauce"]) m = toggleDish(m, "appetizers", d)!;
    expect(m.chosen.appetizers).toHaveLength(3);
    expect(toggleDish(m, "appetizers", "Roasted pork with pineapple sauce")).toBeNull();
    // Single-choice courses swap instead of refusing.
    m = toggleDish(m, "soup", "Tom yum soup")!;
    m = toggleDish(m, "soup", "Mulligatawny soup")!;
    expect(m.chosen.soup).toEqual(["Mulligatawny soup"]);
    expect(menuText(m, "N & K")).toContain("• Mulligatawny soup");
    expect(menuText(m, "N & K")).toContain("Assorted bread & butter");
  });

  it("puts the venue package into the budget without duplicating lines", () => {
    const lines = venueBudgetLines(data.budgetItems, { menuName: "Crystal Glow", pricePerHead: 11_000, heads: 250, lighting: 120_000, decorMin: 175_000, decorMax: 1_500_000 }, "2026-10-14T00:00:00Z", id);
    const catering = lines.find((l) => l.categoryId === "catering")!;
    expect(catering.quoted).toBe(2_750_000);
    expect(data.budgetItems.some((i) => i.id === catering.id)).toBe(true);
    expect(lines.find((l) => l.categoryId === "lighting")?.quoted).toBe(120_000);
    expect(lines.find((l) => l.categoryId === "decoration")?.notes).toMatch(/175,000 to 1,500,000/);
  });
});

describe("evening wedding", () => {
  it("has the Poruwa at 5.30 pm and ends by midnight", () => {
    const t = eveningTimeline("2026-10-14T00:00:00Z", id);
    expect(t.find((e) => e.scene === "poruwa")?.time).toBe("17:30");
    expect(t.every((e) => e.time <= "23:45")).toBe(true);
  });
});

describe("seating", () => {
  it("lays out enough tables and counts seats by party size", () => {
    const plan = defaultSeating("Crystal Atrium", 25, id);
    expect(plan.tables).toHaveLength(25);
    const t = { ...plan.tables[0], guestIds: ["a", "b"] };
    expect(seatsUsed(t, (g) => (g === "a" ? 4 : 2))).toBe(6);
  });
});

describe("planner data", () => {
  it("fills missing parts with defaults", () => {
    const p = normalizePlanner({ theme: { name: "Ours", colors: ["#3d5a80", "#a9bcd0"], applyToApp: true, heroDocumentId: null } }, id);
    expect(p.theme.name).toBe("Ours");
    expect(p.vision.outfits.length).toBeGreaterThan(0);
    expect(p.stationery.text.timeLine).toMatch(/5\.30/);
  });
});

describe("wedding colours", () => {
  it("keeps buttons readable even with a pale main colour", () => {
    const vars = themeVars(["#f2c4ce", "#c9a24a", "#fbf6ef"]);
    expect(contrast(vars["--wine-600"], "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(vars["--champagne-700"], vars["--surface"])).toBeGreaterThanOrEqual(4.5);
  });
});

describe("checklist", () => {
  it("groups main points by time before the wedding", () => {
    const phases = checklistPhases(data.tasks, data.wedding.weddingDate, true);
    expect(phases.length).toBeGreaterThan(2);
    expect(phases.flatMap((p) => p.tasks).every((t) => t.priority !== "low")).toBe(true);
    expect(checklistText(phases, "Us")).toMatch(/✅|⬜/);
  });
});

describe("advisor", () => {
  it("names the best value and what the cheapest leaves out", () => {
    const photo = data.vendors.filter((v) => v.categoryId === "photography").map((v) => v.id);
    const scored = scoreQuotes(data.quotes.filter((q) => photo.includes(q.vendorId)), data.vendors, "photography");
    const tips = compareAdvice(scored, 280_000, {});
    expect(tips[0]).toMatch(/^Best value: /);
    expect(tips.join(" ")).toMatch(/planned LKR 280,000/);
  });
  it("gives outfit advice for the Kandyan, going-away and suit plan", () => {
    const tips = outfitAdvice(normalizePlanner(null, id).vision.outfits, ["#7b1e2b", "#c9a24a"]);
    expect(tips.length).toBeGreaterThanOrEqual(4);
  });
});

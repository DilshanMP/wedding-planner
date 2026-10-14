import { budgetCategoryLabel } from "./catalog";
import type { BudgetCategoryId, BudgetItem, ID, LKR, Task, Vendor, WeddingData } from "./types";

/**
 * Many Sri Lankan hotels provide much more than the hall: food, decor, the
 * Poruwa, lights and sound, sometimes the cake. When the hotel covers a
 * category, there's no separate vendor to find — the budget line belongs to
 * the hotel and the "find and book" tasks are already done.
 */

export type Coverage = "no" | "included" | "extra";

export interface PackageChoice {
  categoryId: BudgetCategoryId;
  /** included = part of the plate / hall price; extra = the hotel charges separately. */
  coverage: Coverage;
  amount: LKR | null;
}

/** Categories hotels commonly provide, in the order couples think about them. */
export const PACKAGE_CATEGORIES: BudgetCategoryId[] = ["venue", "catering", "decoration", "poruwa", "flowers", "lighting", "sound", "cake", "entertainment", "accommodation"];

/** The "find and book" tasks that a hotel package makes unnecessary. */
const BOOKING_TASKS: Partial<Record<BudgetCategoryId, string[]>> = {
  venue: ["venue-research", "venue-book"],
  catering: ["caterer-quotes", "caterer-book"],
  decoration: ["decor-quotes", "decor-book"],
  poruwa: ["poruwa-book"],
  flowers: ["florist-book"],
  lighting: ["lighting-sound"],
  sound: ["lighting-sound"],
  cake: ["cake-order"],
  entertainment: ["band-book"],
  accommodation: ["accommodation-block"],
};

/** What the hotel covers today, read back from budget lines linked to it. */
export function currentPackage(data: WeddingData, venueId: ID | null): PackageChoice[] {
  return PACKAGE_CATEGORIES.map((categoryId) => {
    const line = venueId ? data.budgetItems.find((i) => i.categoryId === categoryId && i.vendorId === venueId && i.status !== "cancelled") : undefined;
    if (!line) return { categoryId, coverage: "no", amount: null };
    const included = categoryId !== "catering" && line.planned === 0 && (line.quoted ?? 0) === 0;
    return { categoryId, coverage: included ? "included" : "extra", amount: included ? null : line.quoted ?? line.planned };
  });
}

export interface PackageResult {
  budgetItems: BudgetItem[];
  tasks: Task[];
  vendor: Vendor | null;
  ticked: number;
}

/**
 * Link each covered category to the hotel: the budget line is the hotel's
 * (zero when it's in the plate price), and the booking tasks are ticked off.
 */
export function applyPackage(data: WeddingData, venue: Vendor, choices: PackageChoice[], now: string, newId: () => string): PackageResult {
  const budgetItems: BudgetItem[] = [];
  const tasks = new Map<ID, Task>();
  const note = `Provided by ${venue.name} (venue package)`;
  const withNote = (notes: string) => (notes.includes(note) ? notes : [notes, note].filter(Boolean).join("\n"));

  for (const c of choices) {
    if (c.coverage === "no") continue;
    const line = data.budgetItems.find((i) => i.categoryId === c.categoryId && i.status !== "cancelled" && (i.vendorId === null || i.vendorId === venue.id))
      ?? data.budgetItems.find((i) => i.categoryId === c.categoryId && i.status !== "cancelled");
    // Catering is the plate price itself, so it keeps its amount either way.
    const included = c.coverage === "included" && c.categoryId !== "catering";
    const amount = included ? 0 : c.amount;
    if (line) {
      budgetItems.push({
        ...line,
        vendorId: venue.id,
        planned: included ? 0 : line.planned,
        quoted: included ? 0 : amount ?? line.quoted,
        status: included || amount !== null || line.quoted !== null ? (line.status === "paid" || line.status === "partially_paid" ? line.status : "booked") : line.status,
        notes: withNote(included ? `${line.notes ? `${line.notes}\n` : ""}Included in the hotel's price` : line.notes),
        updatedAt: now,
      });
    } else {
      budgetItems.push({
        id: newId(),
        categoryId: c.categoryId,
        name: `${budgetCategoryLabel(c.categoryId)} — ${venue.name}`,
        planned: amount ?? 0,
        quoted: amount,
        final: null,
        vendorId: venue.id,
        status: amount !== null ? "booked" : "planned",
        notes: withNote(included ? "Included in the hotel's price" : ""),
        createdAt: now,
        updatedAt: now,
      });
    }
    for (const key of BOOKING_TASKS[c.categoryId] ?? []) {
      const t = data.tasks.find((x) => x.templateKey === key && x.status !== "completed" && x.status !== "cancelled");
      if (t && !tasks.has(t.id)) tasks.set(t.id, { ...t, status: "completed", completedAt: now, vendorId: venue.id, notes: withNote(t.notes), updatedAt: now });
    }
  }
  const vendor = venue.status === "booked" || venue.status === "completed" ? null : { ...venue, status: "booked" as const, updatedAt: now };
  return { budgetItems, tasks: [...tasks.values()], vendor, ticked: tasks.size };
}

/** Categories a vendor provides besides its own, from linked budget lines. */
export function alsoProvides(data: WeddingData, vendor: Vendor): BudgetCategoryId[] {
  return [...new Set(data.budgetItems.filter((i) => i.vendorId === vendor.id && i.categoryId !== vendor.categoryId && i.status !== "cancelled").map((i) => i.categoryId))];
}

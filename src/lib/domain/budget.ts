import { BUDGET_CATEGORIES, budgetCategory } from "./catalog";
import { addDays, compareISO, daysBetween } from "./dates";
import { percent } from "./money";
import type {
  BudgetCategoryId,
  BudgetItem,
  BudgetItemStatus,
  ISODate,
  LKR,
  Payment,
  Wedding,
} from "./types";

/**
 * Budget maths. Definitions (shown to the couple in the UI):
 *
 * - Expected cost of an item: final amount, else quoted amount, else planned amount.
 * - Committed: expected cost of items that are booked, partially paid or paid.
 * - Paid: sum of payments marked paid.
 * - Forecast (projected): expected cost of every item that isn't cancelled.
 * - Remaining: original budget minus committed.
 * - Over / under: forecast minus original budget.
 */

const COMMITTED_STATUSES: BudgetItemStatus[] = ["booked", "partially_paid", "paid"];

export function expectedCost(item: BudgetItem): LKR {
  return item.final ?? item.quoted ?? item.planned;
}

export function isCommitted(item: BudgetItem): boolean {
  return item.status !== "cancelled" && (COMMITTED_STATUSES.includes(item.status) || item.final !== null);
}

export function paidForItem(item: BudgetItem, payments: Payment[]): LKR {
  return payments
    .filter((p) => p.budgetItemId === item.id && p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
}

/** Status after taking recorded payments into account. */
export function effectiveStatus(item: BudgetItem, payments: Payment[]): BudgetItemStatus {
  if (item.status === "cancelled") return "cancelled";
  const paid = paidForItem(item, payments);
  const cost = expectedCost(item);
  if (paid > 0 && paid >= cost) return "paid";
  if (paid > 0) return "partially_paid";
  return item.status;
}

export interface BudgetSummary {
  original: LKR;
  planned: LKR;
  unallocated: LKR;
  committed: LKR;
  paid: LKR;
  forecast: LKR;
  remaining: LKR;
  /** forecast − original; positive means over. */
  variance: LKR;
  committedPct: number;
  paidPct: number;
  health: "within" | "watch" | "over";
}

export function summarizeBudget(wedding: Wedding, items: BudgetItem[], payments: Payment[]): BudgetSummary {
  const live = items.filter((i) => i.status !== "cancelled");
  const planned = live.reduce((s, i) => s + i.planned, 0);
  const committed = live.filter(isCommitted).reduce((s, i) => s + expectedCost(i), 0);
  const forecast = live.reduce((s, i) => s + expectedCost(i), 0);
  const paid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const original = wedding.budget;
  const variance = forecast - original;
  const health: BudgetSummary["health"] =
    variance > 0 ? "over" : forecast > original * 0.97 ? "watch" : "within";
  return {
    original,
    planned,
    unallocated: original - planned,
    committed,
    paid,
    forecast,
    remaining: original - committed,
    variance,
    committedPct: percent(committed, original),
    paidPct: percent(paid, original),
    health,
  };
}

export interface CategoryRollup {
  categoryId: BudgetCategoryId;
  label: string;
  planned: LKR;
  forecast: LKR;
  committed: LKR;
  paid: LKR;
  /** (forecast − planned) / planned, whole percent; 0 when nothing is planned. */
  variancePct: number;
  variance: LKR;
  state: "within" | "watch" | "over";
  itemCount: number;
}

/** Over plan by more than this percentage is flagged "over"; above 0 is "watch". */
export const OVER_THRESHOLD_PCT = 5;

export function rollupByCategory(items: BudgetItem[], payments: Payment[]): CategoryRollup[] {
  const rows: CategoryRollup[] = [];
  for (const cat of BUDGET_CATEGORIES) {
    const catItems = items.filter((i) => i.categoryId === cat.id && i.status !== "cancelled");
    if (catItems.length === 0) continue;
    const planned = catItems.reduce((s, i) => s + i.planned, 0);
    const forecast = catItems.reduce((s, i) => s + expectedCost(i), 0);
    const committed = catItems.filter(isCommitted).reduce((s, i) => s + expectedCost(i), 0);
    const paid = catItems.reduce((s, i) => s + paidForItem(i, payments), 0);
    const variance = forecast - planned;
    const variancePct = planned > 0 ? Math.round((variance / planned) * 100) : 0;
    rows.push({
      categoryId: cat.id,
      label: cat.label,
      planned,
      forecast,
      committed,
      paid,
      variance,
      variancePct,
      state: variancePct > OVER_THRESHOLD_PCT ? "over" : variancePct > 0 ? "watch" : "within",
      itemCount: catItems.length,
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Suggested allocation                                                */
/* ------------------------------------------------------------------ */

export interface AllocationInput {
  budget: LKR;
  /** Categories the couple marked as priorities get +25% weight. */
  priorities: BudgetCategoryId[];
  /** Categories the couple wants to avoid overspending on get −25% weight. */
  avoid: BudgetCategoryId[];
}

/**
 * Split a budget across categories using typical Sri Lankan wedding shares,
 * nudged by the couple's priorities, rounded to LKR 5,000. Any rounding
 * remainder goes to contingency so the total matches the budget exactly.
 */
export function suggestAllocation({ budget, priorities, avoid }: AllocationInput): Record<BudgetCategoryId, LKR> {
  const weights = BUDGET_CATEGORIES.map((c) => {
    let w = c.defaultShare;
    if (priorities.includes(c.id)) w *= 1.25;
    if (avoid.includes(c.id)) w *= 0.75;
    return { id: c.id, w };
  });
  const total = weights.reduce((s, x) => s + x.w, 0);
  const result = {} as Record<BudgetCategoryId, LKR>;
  let assigned = 0;
  for (const { id, w } of weights) {
    if (id === "emergency") continue;
    const amount = Math.round(((budget * w) / total) / 5000) * 5000;
    result[id] = amount;
    assigned += amount;
  }
  result.emergency = Math.max(0, budget - assigned);
  return result;
}

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */

export interface PaymentBuckets {
  overdue: Payment[];
  thisWeek: Payment[];
  thisMonth: Payment[];
  later: Payment[];
  paid: Payment[];
}

export function bucketPayments(payments: Payment[], today: ISODate): PaymentBuckets {
  const buckets: PaymentBuckets = { overdue: [], thisWeek: [], thisMonth: [], later: [], paid: [] };
  const weekEnd = addDays(today, 7);
  const monthEnd = addDays(today, 30);
  const sorted = [...payments].sort((a, b) => compareISO(a.dueDate, b.dueDate));
  for (const p of sorted) {
    if (p.status === "paid") buckets.paid.push(p);
    else if (compareISO(p.dueDate, today) < 0) buckets.overdue.push(p);
    else if (compareISO(p.dueDate, weekEnd) <= 0) buckets.thisWeek.push(p);
    else if (compareISO(p.dueDate, monthEnd) <= 0) buckets.thisMonth.push(p);
    else buckets.later.push(p);
  }
  return buckets;
}

export function paymentDueTone(p: Payment, today: ISODate): "danger" | "warning" | "neutral" | "success" {
  if (p.status === "paid") return "success";
  const d = daysBetween(today, p.dueDate);
  if (d < 0) return "danger";
  if (d <= 7) return "warning";
  return "neutral";
}

export interface VendorBalance {
  total: LKR;
  paid: LKR;
  balance: LKR;
  deposit: LKR;
  nextPayment: Payment | null;
}

/** Totals for one vendor across its budget items and payments. */
export function vendorBalance(
  vendorId: string,
  items: BudgetItem[],
  payments: Payment[],
): VendorBalance {
  const vendorItems = items.filter((i) => i.vendorId === vendorId && i.status !== "cancelled");
  const vendorPayments = payments
    .filter((p) => p.vendorId === vendorId)
    .sort((a, b) => compareISO(a.dueDate, b.dueDate));
  const total = vendorItems.reduce((s, i) => s + expectedCost(i), 0);
  const paid = vendorPayments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const deposit = vendorPayments[0]?.amount ?? 0;
  return {
    total,
    paid,
    balance: Math.max(0, total - paid),
    deposit,
    nextPayment: vendorPayments.find((p) => p.status === "scheduled") ?? null,
  };
}

/** Category label helper re-exported for UI convenience. */
export const categoryLabel = (id: BudgetCategoryId) => budgetCategory(id).label;

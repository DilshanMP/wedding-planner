import { compareISO } from "./dates";
import { expectedCost } from "./budget";
import { budgetCategoryLabel } from "./catalog";
import type { BudgetItem, ID, LKR, Payment, Wedding, WeddingData } from "./types";

/**
 * "How much have we paid, how much is left, and who paid?" — one row per
 * bill (a budget line), with every advance and instalment against it.
 */

export interface Bill {
  id: ID;
  item: BudgetItem | null;
  title: string;
  subtitle: string;
  vendorId: ID | null;
  total: LKR;
  paid: LKR;
  /** Scheduled but not yet paid. */
  scheduled: LKR;
  balance: LKR;
  /** Balance with no payment scheduled for it yet. */
  unscheduled: LKR;
  pct: number;
  payments: Payment[];
  next: Payment | null;
  state: "paid" | "partly" | "not_started" | "included";
}

const byDue = (a: Payment, b: Payment) => compareISO(a.status === "paid" && a.paidDate ? a.paidDate : a.dueDate, b.status === "paid" && b.paidDate ? b.paidDate : b.dueDate);

export function bills(data: Pick<WeddingData, "budgetItems" | "payments" | "vendors">): Bill[] {
  const vendorName = (id: ID | null) => data.vendors.find((v) => v.id === id)?.name ?? "";
  const out: Bill[] = [];
  for (const item of data.budgetItems) {
    if (item.status === "cancelled") continue;
    const payments = data.payments.filter((p) => p.budgetItemId === item.id).sort(byDue);
    const total = expectedCost(item);
    if (total === 0 && payments.length === 0 && item.status !== "booked") continue;
    out.push(makeBill(item.id, item, item.name, [budgetCategoryLabel(item.categoryId), vendorName(item.vendorId)].filter(Boolean).join(" · "), item.vendorId, total, payments));
  }
  // Payments not linked to a line: one bill per vendor (or "Other").
  const loose = data.payments.filter((p) => !p.budgetItemId || !data.budgetItems.some((i) => i.id === p.budgetItemId));
  const groups = new Map<string, Payment[]>();
  for (const p of loose) groups.set(p.vendorId ?? "", [...(groups.get(p.vendorId ?? "") ?? []), p]);
  for (const [vendorId, payments] of groups) {
    const total = payments.reduce((s, p) => s + p.amount, 0);
    out.push(makeBill(`loose-${vendorId || "other"}`, null, vendorName(vendorId || null) || "Other payments", "Not linked to a budget line", vendorId || null, total, payments.sort(byDue)));
  }
  return out;
}

function makeBill(id: ID, item: BudgetItem | null, title: string, subtitle: string, vendorId: ID | null, total: LKR, payments: Payment[]): Bill {
  const paid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const scheduled = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, total - paid);
  return {
    id, item, title, subtitle, vendorId, total, paid, scheduled, balance,
    unscheduled: Math.max(0, balance - scheduled),
    pct: total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : paid > 0 ? 100 : 0,
    payments,
    next: payments.find((p) => p.status !== "paid") ?? null,
    state: total === 0 && paid === 0 ? "included" : paid >= total && total > 0 ? "paid" : paid > 0 ? "partly" : "not_started",
  };
}

export interface MoneyTotals {
  total: LKR;
  paid: LKR;
  balance: LKR;
  scheduled: LKR;
  unscheduled: LKR;
}

export function moneyTotals(list: Bill[]): MoneyTotals {
  return list.reduce(
    (t, b) => ({ total: t.total + b.total, paid: t.paid + b.paid, balance: t.balance + b.balance, scheduled: t.scheduled + Math.min(b.scheduled, b.balance), unscheduled: t.unscheduled + b.unscheduled }),
    { total: 0, paid: 0, balance: 0, scheduled: 0, unscheduled: 0 },
  );
}

export const NOT_RECORDED = "Not recorded";

export interface PayerRow {
  name: string;
  paid: LKR;
  /** Promised (scheduled) payments with this payer. */
  planned: LKR;
  count: number;
}

/** Who has paid how much (and who's down to pay what's scheduled). */
export function payerSummary(payments: Payment[]): PayerRow[] {
  const rows = new Map<string, PayerRow>();
  for (const p of payments) {
    const name = p.paidBy.trim() || NOT_RECORDED;
    const row = rows.get(name) ?? { name, paid: 0, planned: 0, count: 0 };
    if (p.status === "paid") row.paid += p.amount;
    else row.planned += p.amount;
    row.count += 1;
    rows.set(name, row);
  }
  return [...rows.values()].sort((a, b) => (a.name === NOT_RECORDED ? 1 : b.name === NOT_RECORDED ? -1 : b.paid - a.paid || b.planned - a.planned));
}

/** Names to offer in "Paid by": the couple, their families, and anyone used before. */
export function payerSuggestions(wedding: Pick<Wedding, "brideName" | "groomName">, payments: Payment[]): string[] {
  const g = wedding.groomName.trim() || "Groom";
  const b = wedding.brideName.trim() || "Bride";
  const base = [g, b, "Both of us", `${g}'s family`, `${b}'s family`];
  const used = payments.map((p) => p.paidBy.trim()).filter(Boolean);
  return [...new Set([...base, ...used])];
}

/** Sensible label for the next payment on a bill: Advance, 2nd payment, Final balance. */
export function nextPaymentLabel(bill: Pick<Bill, "payments" | "balance">, amount: LKR): string {
  const count = bill.payments.length;
  if (amount >= bill.balance && count > 0) return "Final balance";
  if (count === 0) return amount >= bill.balance ? "Full payment" : "Advance";
  const n = count + 1;
  const suffix = n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${suffix} payment`;
}

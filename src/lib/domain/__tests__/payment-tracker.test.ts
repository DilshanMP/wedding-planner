import { describe, expect, it } from "vitest";
import { bills, moneyTotals, nextPaymentLabel, payerSuggestions, payerSummary, NOT_RECORDED } from "../payment-tracker";
import type { BudgetItem, Payment } from "../types";

const now = "2026-10-17T00:00:00.000Z";
const item = (id: string, planned: number, extra: Partial<BudgetItem> = {}): BudgetItem => ({ id, categoryId: "venue", name: id, planned, quoted: null, final: null, vendorId: null, status: "booked", notes: "", createdAt: now, updatedAt: now, ...extra });
const pay = (id: string, budgetItemId: string | null, amount: number, status: "paid" | "scheduled", paidBy = "", due = "2026-11-01"): Payment => ({ id, vendorId: null, budgetItemId, label: id, amount, dueDate: due, paidDate: status === "paid" ? due : null, status, method: "", reference: "", paidBy, createdAt: now, updatedAt: now });

describe("payment tracker", () => {
  const data = {
    vendors: [],
    budgetItems: [item("hall", 1_000_000, { quoted: 1_200_000 }), item("lights", 120_000), item("decor", 0, { status: "planned" })],
    payments: [pay("a1", "hall", 300_000, "paid", "Dilshan"), pay("a2", "hall", 400_000, "scheduled", "Sachini's family", "2027-01-10"), pay("l1", "lights", 120_000, "paid", "Sachini"), pay("x", null, 15_000, "paid")],
  };

  it("works out paid, balance and what's not scheduled yet", () => {
    const list = bills(data);
    const hall = list.find((b) => b.id === "hall")!;
    expect(hall).toMatchObject({ total: 1_200_000, paid: 300_000, scheduled: 400_000, balance: 900_000, unscheduled: 500_000, pct: 25, state: "partly" });
    expect(hall.next?.id).toBe("a2");
    expect(list.find((b) => b.id === "lights")!.state).toBe("paid");
    expect(list.some((b) => b.id === "decor")).toBe(false); // no price yet, nothing paid
    expect(list.find((b) => b.id === "loose-other")!.paid).toBe(15_000);
    expect(moneyTotals(list)).toEqual({ total: 1_335_000, paid: 435_000, balance: 900_000, scheduled: 400_000, unscheduled: 500_000 });
  });

  it("sums by payer, unrecorded last", () => {
    const rows = payerSummary(data.payments);
    expect(rows[0]).toMatchObject({ name: "Dilshan", paid: 300_000 });
    expect(rows.find((r) => r.name === "Sachini's family")).toMatchObject({ paid: 0, planned: 400_000 });
    expect(rows.at(-1)!.name).toBe(NOT_RECORDED);
  });

  it("suggests payers and payment labels", () => {
    expect(payerSuggestions({ brideName: "Sachini", groomName: "Dilshan" }, data.payments).slice(0, 5)).toEqual(["Dilshan", "Sachini", "Both of us", "Dilshan's family", "Sachini's family"]);
    expect(nextPaymentLabel({ payments: [], balance: 100 }, 30)).toBe("Advance");
    expect(nextPaymentLabel({ payments: [], balance: 100 }, 100)).toBe("Full payment");
    expect(nextPaymentLabel({ payments: [pay("1", null, 1, "paid")], balance: 100 }, 30)).toBe("2nd payment");
    expect(nextPaymentLabel({ payments: [pay("1", null, 1, "paid")], balance: 100 }, 100)).toBe("Final balance");
  });
});

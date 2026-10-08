import { bucketPayments, effectiveStatus, expectedCost, paidForItem, rollupByCategory, summarizeBudget, vendorBalance } from "./budget";
import {
  BUDGET_STATUS_LABEL,
  INVITATION_LABEL,
  MEAL_LABEL,
  PRIORITY_LABEL,
  RSVP_LABEL,
  TASK_STATUS_LABEL,
  VENDOR_STATUS_LABEL,
  budgetCategoryLabel,
  taskCategory,
  JOURNEY_STAGES,
} from "./catalog";
import { formatDate, formatLongDate } from "./dates";
import { GUEST_GROUP_LABEL, guestGroup, guestMetrics, partySize, type GuestGroupId } from "./guests";
import { formatLKR } from "./money";
import { computeJourney, computeReadiness } from "./readiness";
import type { ISODate, WeddingData } from "./types";

/**
 * Report definitions shared by the printable (PDF) view and the Excel export,
 * so both always show the same numbers.
 */

export type ReportId = "budget" | "guests" | "vendors" | "tasks" | "payments" | "readiness";

export interface ReportColumn {
  label: string;
  money?: boolean;
  align?: "right";
}

export interface ReportTable {
  title: string;
  columns: ReportColumn[];
  rows: (string | number)[][];
  /** Optional totals row, same shape as rows. */
  total?: (string | number)[];
}

export interface Report {
  id: ReportId;
  title: string;
  subtitle: string;
  summary: [string, string][];
  tables: ReportTable[];
}

export const REPORT_TITLES: Record<ReportId, string> = {
  budget: "Budget report",
  guests: "Guest report",
  vendors: "Vendor report",
  tasks: "Task report",
  payments: "Payment report",
  readiness: "Wedding readiness report",
};

export function buildReport(id: ReportId, data: WeddingData, today: ISODate): Report {
  const { wedding } = data;
  const subtitle = `${wedding.brideName} & ${wedding.groomName} · ${formatLongDate(wedding.weddingDate)}${wedding.venue ? ` · ${wedding.venue}` : ""} · prepared ${formatDate(today)}`;
  const vendorName = (vid: string | null) => data.vendors.find((v) => v.id === vid)?.name ?? "";
  const person = (pid: string | null) => data.people.find((p) => p.id === pid)?.name ?? "Both";

  switch (id) {
    case "budget": {
      const s = summarizeBudget(wedding, data.budgetItems, data.payments);
      const rows = rollupByCategory(data.budgetItems, data.payments);
      return {
        id,
        title: REPORT_TITLES[id],
        subtitle,
        summary: [
          ["Original budget", formatLKR(s.original)],
          ["Committed", `${formatLKR(s.committed)} (${s.committedPct}%)`],
          ["Paid", formatLKR(s.paid)],
          ["Projected", formatLKR(s.forecast)],
          [s.variance > 0 ? "Over plan" : "Under plan", formatLKR(Math.abs(s.variance))],
          ["Remaining (plan − committed)", formatLKR(s.remaining)],
        ],
        tables: [
          {
            title: "By category",
            columns: [{ label: "Category" }, { label: "Planned", money: true }, { label: "Projected", money: true }, { label: "Committed", money: true }, { label: "Paid", money: true }, { label: "Vs plan", align: "right" }],
            rows: rows.map((r) => [r.label, r.planned, r.forecast, r.committed, r.paid, r.variancePct === 0 ? "On plan" : `${r.variancePct > 0 ? "+" : ""}${r.variancePct}%`]),
            total: ["Total", s.planned, s.forecast, s.committed, s.paid, ""],
          },
          {
            title: "Budget lines",
            columns: [{ label: "Category" }, { label: "Item" }, { label: "Vendor" }, { label: "Planned", money: true }, { label: "Quoted", money: true }, { label: "Final", money: true }, { label: "Paid", money: true }, { label: "Remaining", money: true }, { label: "Status" }],
            rows: data.budgetItems.map((i) => {
              const paid = paidForItem(i, data.payments);
              return [budgetCategoryLabel(i.categoryId), i.name, vendorName(i.vendorId), i.planned, i.quoted ?? "", i.final ?? "", paid, Math.max(0, expectedCost(i) - paid), BUDGET_STATUS_LABEL[effectiveStatus(i, data.payments)]];
            }),
          },
        ],
      };
    }
    case "guests": {
      const m = guestMetrics(data.guests, wedding);
      const groups = Object.keys(GUEST_GROUP_LABEL) as GuestGroupId[];
      return {
        id,
        title: REPORT_TITLES[id],
        subtitle,
        summary: [
          ["Guests (people)", String(m.total)],
          ["Invitations", String(m.parties)],
          ["Confirmed", String(m.confirmed)],
          ["Pending", String(m.pending)],
          ["Declined", String(m.declined)],
          ["Expected attendance", String(m.expectedAttendance)],
          ["Invitation coverage", `${m.invitationCoverage}%`],
          ["RSVP replies", `${m.rsvpCompletion}%`],
          ["Meals (confirmed)", `${m.meals.veg} veg · ${m.meals.nonVeg} non-veg · ${m.meals.unknown} not asked`],
        ],
        tables: [
          {
            title: "By group",
            columns: [{ label: "Group" }, { label: "Invitations", align: "right" }, { label: "People", align: "right" }, { label: "Confirmed", align: "right" }, { label: "Pending", align: "right" }],
            rows: groups
              .map((g) => {
                const gs = data.guests.filter((x) => guestGroup(x) === g);
                const gm = guestMetrics(gs, wedding);
                return [GUEST_GROUP_LABEL[g], gs.length, gm.total, gm.confirmed, gm.pending];
              })
              .filter((r) => r[1] !== 0),
            total: ["Total", m.parties, m.total, m.confirmed, m.pending],
          },
          {
            title: "Guest list",
            columns: [{ label: "Guest" }, { label: "Side" }, { label: "Group" }, { label: "People", align: "right" }, { label: "Invitation" }, { label: "RSVP" }, { label: "Meal" }, { label: "Table" }, { label: "Phone" }],
            rows: [...data.guests]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((g) => [g.name, g.side === "bride" ? "Bride" : "Groom", GUEST_GROUP_LABEL[guestGroup(g)], partySize(g), INVITATION_LABEL[g.invitation], RSVP_LABEL[g.rsvp], MEAL_LABEL[g.meal], g.table, g.phone]),
          },
        ],
      };
    }
    case "vendors": {
      return {
        id,
        title: REPORT_TITLES[id],
        subtitle,
        summary: [
          ["Vendors", String(data.vendors.length)],
          ["Booked", String(data.vendors.filter((v) => v.status === "booked" || v.status === "completed").length)],
          ["Quotes on file", String(data.quotes.length)],
        ],
        tables: [
          {
            title: "Vendors",
            columns: [{ label: "Vendor" }, { label: "Category" }, { label: "Status" }, { label: "Contact" }, { label: "Phone" }, { label: "Rating", align: "right" }, { label: "Total", money: true }, { label: "Paid", money: true }, { label: "Balance", money: true }, { label: "Next payment" }],
            rows: data.vendors.map((v) => {
              const b = vendorBalance(v.id, data.budgetItems, data.payments);
              return [v.name, budgetCategoryLabel(v.categoryId), VENDOR_STATUS_LABEL[v.status], v.contactName, v.phone, v.rating ?? "", b.total, b.paid, b.balance, b.nextPayment ? `${formatDate(b.nextPayment.dueDate)} · ${formatLKR(b.nextPayment.amount)}` : ""];
            }),
          },
        ],
      };
    }
    case "tasks": {
      const live = data.tasks.filter((t) => t.status !== "cancelled");
      return {
        id,
        title: REPORT_TITLES[id],
        subtitle,
        summary: [
          ["Tasks", String(live.length)],
          ["Completed", String(live.filter((t) => t.status === "completed").length)],
          ["Open", String(live.filter((t) => t.status !== "completed").length)],
          ["Overdue", String(live.filter((t) => t.status !== "completed" && t.dueDate && t.dueDate < today).length)],
        ],
        tables: [
          {
            title: "Checklist",
            columns: [{ label: "Task" }, { label: "Category" }, { label: "Stage" }, { label: "Owner" }, { label: "Due" }, { label: "Priority" }, { label: "Status" }],
            rows: [...data.tasks]
              .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
              .map((t) => [t.title, taskCategory(t.categoryId).label, JOURNEY_STAGES.find((s) => s.id === taskCategory(t.categoryId).stage)?.label ?? "", person(t.ownerId), t.dueDate ? formatDate(t.dueDate) : "", PRIORITY_LABEL[t.priority], TASK_STATUS_LABEL[t.status]]),
          },
        ],
      };
    }
    case "payments": {
      const b = bucketPayments(data.payments, today);
      const sum = (ps: typeof data.payments) => formatLKR(ps.reduce((s, p) => s + p.amount, 0));
      return {
        id,
        title: REPORT_TITLES[id],
        subtitle,
        summary: [
          ["Overdue", `${sum(b.overdue)} (${b.overdue.length})`],
          ["Due this week", `${sum(b.thisWeek)} (${b.thisWeek.length})`],
          ["Due this month", `${sum(b.thisMonth)} (${b.thisMonth.length})`],
          ["Later", `${sum(b.later)} (${b.later.length})`],
          ["Paid", `${sum(b.paid)} (${b.paid.length})`],
        ],
        tables: [
          {
            title: "Payment schedule",
            columns: [{ label: "Due" }, { label: "Vendor" }, { label: "Description" }, { label: "Amount", money: true }, { label: "Status" }, { label: "Paid on" }, { label: "Method" }, { label: "Reference" }],
            rows: [...data.payments]
              .sort((x, y) => x.dueDate.localeCompare(y.dueDate))
              .map((p) => [formatDate(p.dueDate), vendorName(p.vendorId), p.label, p.amount, p.status === "paid" ? "Paid" : p.dueDate < today ? "Overdue" : "Scheduled", p.paidDate ? formatDate(p.paidDate) : "", p.method, p.reference]),
            total: ["Total", "", "", data.payments.reduce((s, p) => s + p.amount, 0), "", "", "", ""],
          },
        ],
      };
    }
    case "readiness": {
      const r = computeReadiness(data);
      const stages = computeJourney(data, today);
      return {
        id,
        title: REPORT_TITLES[id],
        subtitle,
        summary: [["Overall readiness", `${r.overall}%`], ...r.components.map((c) => [c.label, `${c.score}%`] as [string, string])],
        tables: [
          { title: "How it's calculated", columns: [{ label: "Area" }, { label: "Score", align: "right" }, { label: "Calculation" }], rows: r.components.map((c) => [c.label, `${c.score}%`, c.explanation]) },
          {
            title: "Wedding journey",
            columns: [{ label: "Stage" }, { label: "State" }, { label: "Tasks done", align: "right" }, { label: "Next due" }],
            rows: stages.map((s) => [`${String(s.number).padStart(2, "0")} ${s.label}`, s.state === "completed" ? "Completed" : s.state === "in_progress" ? "In progress" : "Not started", `${s.done} of ${s.total}`, s.nextDue ? formatDate(s.nextDue) : ""]),
          },
        ],
      };
    }
  }
}

export const REPORT_IDS: ReportId[] = ["budget", "guests", "vendors", "tasks", "payments", "readiness"];

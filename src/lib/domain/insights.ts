import { bucketPayments, rollupByCategory, summarizeBudget } from "./budget";
import { budgetCategory } from "./catalog";
import { daysBetween, formatShortDate } from "./dates";
import { guestMetrics } from "./guests";
import { formatLKR, roundEstimate } from "./money";
import { scoreQuotes, trueCost } from "./quotes";
import { isOverdue } from "./tasks";
import type { BudgetCategoryId, ISODate, WeddingData } from "./types";

/**
 * "What should I do next?" — proactive, plain-language guidance built from the
 * couple's real data. Each insight states the fact, then one action.
 */

export type InsightTone = "danger" | "warning" | "info" | "success";

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
  action?: { label: string; href: string };
  /** Lower sorts first. */
  rank: number;
}

/** Match free-text blueprint items (e.g. "Excellent food") to budget categories. */
const KEYWORDS: Record<BudgetCategoryId, string[]> = {
  venue: ["venue", "hall", "hotel"],
  catering: ["food", "catering", "menu", "dinner", "lunch"],
  photography: ["photo"],
  videography: ["video", "film"],
  decoration: ["decor", "decoration"],
  flowers: ["flower", "jasmine", "lotus", "rose"],
  poruwa: ["poruwa"],
  attire: ["saree", "attire", "dress", "suit"],
  jewelry: ["jewel", "ring"],
  makeup: ["makeup", "hair"],
  transport: ["car", "transport"],
  entertainment: ["music", "band", "dj", "drummer", "dance", "entertainment"],
  cake: ["cake"],
  invitations: ["invitation", "stationery"],
  accommodation: ["accommodation", "room", "hotel stay"],
  lighting: ["light"],
  sound: ["sound"],
  gifts: ["favor", "favour", "gift"],
  album: ["album"],
  miscellaneous: [],
  emergency: [],
};

export function categoriesMentioned(items: string[]): BudgetCategoryId[] {
  const text = items.join(" ").toLowerCase();
  return (Object.keys(KEYWORDS) as BudgetCategoryId[]).filter((id) => KEYWORDS[id].some((k) => text.includes(k)));
}

/** Overruns smaller than this aren't worth a notice. */
export const MIN_OVERRUN = 25_000;

export function budgetInsights(data: WeddingData): Insight[] {
  const { wedding, budgetItems, payments, quotes, vendors } = data;
  const out: Insight[] = [];
  const summary = summarizeBudget(wedding, budgetItems, payments);
  const mustHave = categoriesMentioned([...wedding.mustHave, ...wedding.priorities.map((p) => budgetCategory(p).label)]);
  const avoid = categoriesMentioned(wedding.avoidOverspending);

  if (summary.variance > 0) {
    out.push({
      id: "budget-over",
      tone: "danger",
      title: `Your projected total is ${formatLKR(roundEstimate(summary.variance))} above the original budget.`,
      detail: "Start with categories you marked as places not to overspend, so the experiences that matter stay protected.",
      action: { label: "Review Categories", href: "/budget?tab=categories" },
      rank: 10,
    });
  }

  for (const row of rollupByCategory(budgetItems, payments)) {
    if (row.planned === 0) continue;
    // Ignore small overruns: they're noise, not decisions.
    if (row.state === "over" && row.variance >= MIN_OVERRUN) {
      const isAvoid = avoid.includes(row.categoryId);
      const isMust = mustHave.includes(row.categoryId);
      out.push({
        id: `cat-over-${row.categoryId}`,
        tone: isAvoid ? "danger" : "warning",
        title: `${row.label} is currently ${row.variancePct}% above your planned budget.`,
        detail: isMust
          ? "This is one of your must-haves, so it may be worth it. Compare options before trimming quality."
          : isAvoid
            ? "You marked this as somewhere you don't want to overspend."
            : `About ${formatLKR(roundEstimate(row.variance))} over plan.`,
        action: { label: "Review Options", href: `/vendors?category=${row.categoryId}` },
        rank: isAvoid ? 15 : 20,
      });
    }
  }

  // Better-value alternatives: a quote that is cheaper by ≥ LKR 20,000 with a
  // value score within 5 points of the currently selected / booked option.
  const categories = [...new Set(vendors.map((v) => v.categoryId))];
  for (const categoryId of categories) {
    const catVendorIds = new Set(vendors.filter((v) => v.categoryId === categoryId && v.status !== "cancelled").map((v) => v.id));
    const catQuotes = quotes.filter((q) => catVendorIds.has(q.vendorId));
    if (catQuotes.length < 2) continue;
    const scored = scoreQuotes(catQuotes, vendors, categoryId);
    const chosen = scored.find((s) => s.quote.selected);
    if (!chosen) continue;
    const alt = scored
      .filter((s) => s !== chosen && chosen.trueCost - s.trueCost >= 20_000 && s.valueScore >= chosen.valueScore - 5)
      .sort((a, b) => a.trueCost - b.trueCost)[0];
    if (alt) {
      out.push({
        id: `alt-${categoryId}`,
        tone: "info",
        title: `${alt.vendor?.name ?? "Another vendor"} could save about ${formatLKR(roundEstimate(chosen.trueCost - trueCost(alt.quote)))} with similar deliverables.`,
        detail: `${budgetCategory(categoryId).label}: value score ${alt.valueScore} vs ${chosen.valueScore} for your current choice.`,
        action: { label: "Compare Quotes", href: `/vendors?tab=compare&category=${categoryId}` },
        rank: 18,
      });
    }
  }

  for (const row of rollupByCategory(budgetItems, payments)) {
    if (row.state === "within" && row.committed > 0 && mustHave.includes(row.categoryId)) {
      out.push({
        id: `cat-ok-${row.categoryId}`,
        tone: "success",
        title: `${row.label} is within target.`,
        detail: row.variance < 0 ? `${formatLKR(roundEstimate(-row.variance))} under plan, and it's one of your priorities.` : "On plan, and it's one of your priorities.",
        rank: 80,
      });
    }
  }
  return out.sort((a, b) => a.rank - b.rank);
}

export function nextActions(data: WeddingData, today: ISODate): Insight[] {
  const { wedding, tasks, guests, payments, vendors } = data;
  const out: Insight[] = [];
  const buckets = bucketPayments(payments, today);
  const vendorName = (id: string | null) => vendors.find((v) => v.id === id)?.name ?? "A vendor";

  for (const p of buckets.overdue.slice(0, 2)) {
    out.push({
      id: `pay-overdue-${p.id}`,
      tone: "danger",
      title: `${vendorName(p.vendorId)}'s ${p.label.toLowerCase()} is ${-daysBetween(today, p.dueDate)} days overdue.`,
      detail: `${formatLKR(p.amount)} · was due ${formatShortDate(p.dueDate)}`,
      action: { label: "Record Payment", href: `/budget?tab=payments&pay=${p.id}` },
      rank: 1,
    });
  }
  for (const p of buckets.thisWeek.slice(0, 2)) {
    const d = daysBetween(today, p.dueDate);
    out.push({
      id: `pay-week-${p.id}`,
      tone: "warning",
      title: `${vendorName(p.vendorId)}'s ${p.label.toLowerCase()} is due ${d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`}.`,
      detail: `${formatLKR(p.amount)} · due ${formatShortDate(p.dueDate)}`,
      action: { label: "Pay Now", href: `/budget?tab=payments&pay=${p.id}` },
      rank: 5,
    });
  }

  const overdueTasks = tasks.filter((t) => isOverdue(t, today));
  if (overdueTasks.length) {
    out.push({
      id: "tasks-overdue",
      tone: "warning",
      title: overdueTasks.length === 1 ? `"${overdueTasks[0].title}" is overdue.` : `${overdueTasks.length} tasks are overdue.`,
      detail: "Finish them or move the date so the plan stays honest.",
      action: { label: "Review Tasks", href: "/tasks?filter=overdue" },
      rank: 8,
    });
  }

  const gm = guestMetrics(guests, wedding);
  const daysLeft = daysBetween(today, wedding.weddingDate);
  if (gm.notInvited > 0 && daysLeft < 150) {
    const notSent = guests.filter((g) => g.invitation === "not_sent");
    const groomPeople = notSent.filter((g) => g.side === "groom").reduce((s, g) => s + g.adults + g.children, 0);
    const side = groomPeople > gm.notInvited / 2 ? "Most are on the groom's side." : groomPeople < gm.notInvited / 2 ? "Most are on the bride's side." : "Evenly split between both sides.";
    out.push({
      id: "invites",
      tone: "info",
      title: `${gm.notInvited} guests haven't received invitations.`,
      detail: side,
      action: { label: "Review Invitations", href: "/guests?invitation=not_sent" },
      rank: 12,
    });
  }
  if (gm.pending > 0 && daysLeft < 60) {
    out.push({
      id: "rsvp",
      tone: "info",
      title: `${gm.pending} invited guests haven't replied yet.`,
      detail: "Your caterer will need a final headcount about three weeks before the day.",
      action: { label: "Follow Up", href: "/guests?rsvp=pending" },
      rank: 14,
    });
  }

  if (vendors.length === 0) {
    out.push({
      id: "no-vendors",
      tone: "info",
      title: "No vendors added yet.",
      detail: "Start with your venue and photographer; they book out first.",
      action: { label: "Add Vendor", href: "/vendors?new=1" },
      rank: 30,
    });
  }

  for (const b of budgetInsights(data).filter((i) => i.tone !== "success").slice(0, 2)) out.push(b);
  return out.sort((a, b) => a.rank - b.rank);
}

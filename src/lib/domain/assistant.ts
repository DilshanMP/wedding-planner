import { bucketPayments, rollupByCategory, summarizeBudget } from "./budget";
import { BUDGET_CATEGORIES, budgetCategory } from "./catalog";
import { daysBetween, formatShortDate, relativeDue } from "./dates";
import { guestMetrics } from "./guests";
import { budgetInsights, categoriesMentioned, nextActions } from "./insights";
import { formatLKR, parseLKR, roundEstimate } from "./money";
import { QUOTE_LABEL, scoreQuotes } from "./quotes";
import { computeReadiness } from "./readiness";
import { isOpen, upcomingTasks } from "./tasks";
import type { BudgetCategoryId, ISODate, WeddingData } from "./types";

/**
 * The wedding assistant's built-in answers. Every answer is computed from the
 * couple's own records with the same functions the screens use, so it never
 * contradicts the app. An optional language model (see /api/assistant) only
 * rephrases and reasons over `assistantContext()` — never over raw guest data.
 */

export interface AssistantAnswer {
  intent: string;
  text: string;
  links: { label: string; href: string }[];
}

export const SUGGESTED_QUESTIONS = [
  "Where am I overspending?",
  "What should I do this month?",
  "What should I book next?",
  "Can I afford a photographer for LKR 350,000?",
  "How much emergency budget should I reserve?",
  "Compare my photography quotes",
  "How are RSVPs going?",
  "What payments are coming up?",
];

/** Typical booking lead time in months, used to order "what to book next". */
const LEAD_MONTHS: Partial<Record<BudgetCategoryId, number>> = {
  venue: 12, catering: 10, photography: 10, videography: 9, decoration: 8, poruwa: 9, entertainment: 6,
  attire: 7, makeup: 6, jewelry: 7, flowers: 5, transport: 5, cake: 4, invitations: 6, accommodation: 6, lighting: 4, sound: 4, album: 3,
};

function amountIn(question: string): number | null {
  const m = question.match(/(?:lkr|rs\.?)?\s*([\d][\d,.]*)\s*(k|lakh|lakhs|m|million)?/i);
  if (!m) return null;
  const base = parseLKR(m[1]);
  if (base === null) return null;
  const unit = (m[2] ?? "").toLowerCase();
  const mult = unit === "k" ? 1_000 : unit.startsWith("lakh") ? 100_000 : unit === "m" || unit === "million" ? 1_000_000 : 1;
  const value = base * mult;
  return value >= 1000 ? value : null;
}

export function answerLocally(question: string, data: WeddingData, today: ISODate): AssistantAnswer | null {
  const q = question.toLowerCase();
  const has = (...words: string[]) => words.some((w) => q.includes(w));
  const budget = summarizeBudget(data.wedding, data.budgetItems, data.payments);
  const mentioned = categoriesMentioned([question]);

  if (has("afford", "can we pay", "can i pay")) {
    const amount = amountIn(question);
    const cat = mentioned[0];
    if (!amount) {
      return {
        intent: "afford",
        text: `Your plan has ${formatLKR(budget.original - budget.forecast)} of headroom against the projected total (${formatLKR(budget.forecast)} of ${formatLKR(budget.original)}). Tell me the amount — for example "Can I afford a photographer for LKR 350,000?" — and I'll check it against the right category.`,
        links: [{ label: "Open Investment", href: "/budget" }],
      };
    }
    const row = cat ? rollupByCategory(data.budgetItems, data.payments).find((r) => r.categoryId === cat) : undefined;
    const currentForCat = row?.forecast ?? 0;
    const newForecast = budget.forecast - currentForCat + amount;
    const over = newForecast - budget.original;
    const label = cat ? budgetCategory(cat).label.toLowerCase() : "this";
    const planLine = row ? ` You planned ${formatLKR(row.planned)} for ${label}; it's ${amount > row.planned ? `${formatLKR(amount - row.planned)} above` : `${formatLKR(row.planned - amount)} within`} that.` : "";
    const verdict =
      over <= 0
        ? `Yes. With ${formatLKR(amount)} for ${label}, your projected total would be ${formatLKR(newForecast)} — ${formatLKR(-over)} inside your ${formatLKR(budget.original)} plan.`
        : `Not without trade-offs. ${formatLKR(amount)} for ${label} would take the projected total to ${formatLKR(newForecast)}, about ${formatLKR(roundEstimate(over))} over your plan.`;
    const avoid = categoriesMentioned(data.wedding.avoidOverspending).map((c) => budgetCategory(c).label);
    const tip = over > 0 && avoid.length ? ` You marked ${avoid.join(" and ").toLowerCase()} as places not to overspend — that's where to look first.` : "";
    return { intent: "afford", text: verdict + planLine + tip, links: [{ label: "Review Categories", href: "/budget?tab=categories" }] };
  }

  if (has("overspend", "over budget", "over plan", "too much", "spending")) {
    const items = budgetInsights(data).filter((i) => i.tone !== "success").slice(0, 4);
    if (items.length === 0) return { intent: "overspending", text: `Nothing is over plan. Projected total ${formatLKR(budget.forecast)} against ${formatLKR(budget.original)}.`, links: [{ label: "Open Investment", href: "/budget" }] };
    return { intent: "overspending", text: items.map((i) => `• ${i.title} ${i.detail}`).join("\n"), links: items.flatMap((i) => (i.action ? [i.action] : [])).slice(0, 3) };
  }

  if (has("book next", "should i book", "what to book", "vendors left", "still need")) {
    const booked = new Set(data.vendors.filter((v) => v.status === "booked" || v.status === "completed").map((v) => v.categoryId));
    const needed = [...new Set(data.budgetItems.filter((i) => i.status !== "cancelled" && i.planned > 0 && budgetCategory(i.categoryId).vendorBacked).map((i) => i.categoryId))]
      .filter((c) => !booked.has(c))
      .sort((a, b) => (LEAD_MONTHS[b] ?? 3) - (LEAD_MONTHS[a] ?? 3));
    if (needed.length === 0) return { intent: "book-next", text: "Every vendor category in your budget is booked.", links: [{ label: "Vendors", href: "/vendors" }] };
    const monthsLeft = Math.max(0, Math.round(daysBetween(today, data.wedding.weddingDate) / 30));
    const lines = needed.slice(0, 5).map((c) => {
      const quoted = data.vendors.filter((v) => v.categoryId === c && v.status !== "cancelled").length;
      const late = (LEAD_MONTHS[c] ?? 3) >= monthsLeft;
      return `• ${budgetCategory(c).label}${late ? " — usually booked by now" : ""}${quoted ? ` (${quoted} ${quoted === 1 ? "vendor" : "vendors"} in progress)` : " (no vendors yet)"}`;
    });
    return { intent: "book-next", text: `In order of how early they usually book out:\n${lines.join("\n")}`, links: [{ label: "Compare Quotes", href: "/vendors?tab=compare" }] };
  }

  if (has("emergency", "contingency", "buffer", "reserve")) {
    const line = data.budgetItems.filter((i) => i.categoryId === "emergency" && i.status !== "cancelled").reduce((s, i) => s + i.planned, 0);
    const low = roundEstimate(budget.original * 0.05);
    const high = roundEstimate(budget.original * 0.1);
    const pct = budget.original ? Math.round((line / budget.original) * 100) : 0;
    const advice = line < low ? "That's on the thin side — weddings usually see late extras (overtime, extra guests, transport)." : line > high ? "That's generous; you could release some into a priority category." : "That's in a healthy range.";
    return {
      intent: "contingency",
      text: `Keep 5–10% of the budget in reserve: ${formatLKR(low)} to ${formatLKR(high)} for you. You currently hold ${formatLKR(line)} (${pct}%). ${advice}${budget.variance > 0 ? ` Note that your projection is already ${formatLKR(budget.variance)} over plan, so part of it is effectively spoken for.` : ""}`,
      links: [{ label: "Budget lines", href: "/budget?tab=categories" }],
    };
  }

  if (has("compare", "quote", "package", "which photographer", "which decorator", "best value")) {
    const vendorCat = new Map(data.vendors.map((v) => [v.id, v.categoryId]));
    const cats = BUDGET_CATEGORIES.map((c) => c.id).filter((c) => data.quotes.some((x) => vendorCat.get(x.vendorId) === c));
    const cat = mentioned.find((c) => cats.includes(c)) ?? cats[0];
    if (!cat) return { intent: "compare", text: "You haven't added any quotes yet. Add two or three packages in a category and I'll compare them on true cost, deliverables and value.", links: [{ label: "Add Quote", href: "/vendors?tab=compare&newQuote=1" }] };
    const scored = scoreQuotes(data.quotes.filter((x) => vendorCat.get(x.vendorId) === cat), data.vendors, cat).sort((a, b) => b.valueScore - a.valueScore);
    const lines = scored.map((s) => `• ${s.vendor?.name ?? "Vendor"} (${s.quote.packageName}): ${formatLKR(s.trueCost)} all-in${s.hidden ? `, incl. ${formatLKR(s.hidden)} extras` : ""} — value ${s.valueScore}/100${s.labels.length ? ` · ${s.labels.map((l) => QUOTE_LABEL[l]).join(", ")}` : ""}`);
    return { intent: "compare", text: `${budgetCategory(cat).label} quotes, best value first:\n${lines.join("\n")}\nThe cheapest is never automatically the right choice — weigh what each one leaves out.`, links: [{ label: "Open Comparison", href: `/vendors?tab=compare&category=${cat}` }] };
  }

  if (has("rsvp", "guest", "attend", "headcount", "invitation")) {
    const m = guestMetrics(data.guests, data.wedding);
    return {
      intent: "guests",
      text: `${m.confirmed} of ${m.total} guests have confirmed; expect about ${m.expectedAttendance}. ${m.notInvited} haven't been sent an invitation, ${m.pending - m.notInvited} invited guests haven't replied, and ${m.declined} declined. Bride side ${m.bySide.bride.confirmed}/${m.bySide.bride.total}, groom side ${m.bySide.groom.confirmed}/${m.bySide.groom.total}.`,
      links: [{ label: m.notInvited ? "Review Invitations" : "Guests", href: m.notInvited ? "/guests?invitation=not_sent" : "/guests" }],
    };
  }

  if (has("payment", "pay", "due", "balance", "owe")) {
    const b = bucketPayments(data.payments, today);
    const upcoming = [...b.overdue, ...b.thisWeek, ...b.thisMonth, ...b.later].slice(0, 5);
    if (upcoming.length === 0) return { intent: "payments", text: "No payments are scheduled.", links: [{ label: "Payments", href: "/budget?tab=payments" }] };
    const name = (id: string | null) => data.vendors.find((v) => v.id === id)?.name ?? "Payment";
    return {
      intent: "payments",
      text: `Coming up:\n${upcoming.map((p) => `• ${name(p.vendorId)} — ${p.label}, ${formatLKR(p.amount)}, ${relativeDue(p.dueDate, today).toLowerCase()} (${formatShortDate(p.dueDate)})`).join("\n")}\nStill to pay on booked vendors: ${formatLKR(budget.committed - budget.paid)}.`,
      links: [{ label: "Payment schedule", href: "/budget?tab=payments" }],
    };
  }

  if (has("this month", "do next", "what should i do", "to do", "todo", "this week", "tasks")) {
    const horizon = has("this week") ? 7 : 31;
    const tasks = upcomingTasks(data.tasks, 50).filter((t) => t.dueDate && daysBetween(today, t.dueDate) <= horizon).slice(0, 6);
    const actions = nextActions(data, today).slice(0, 2);
    const lines = [...actions.map((a) => `• ${a.title}`), ...tasks.map((t) => `• ${t.title} — ${relativeDue(t.dueDate!, today).toLowerCase()}`)];
    if (lines.length === 0) return { intent: "next", text: `Nothing is due in the next ${horizon === 7 ? "week" : "month"}. ${data.tasks.filter(isOpen).length} tasks remain overall.`, links: [{ label: "Checklist", href: "/tasks" }] };
    return { intent: "next", text: `For the next ${horizon === 7 ? "week" : "month"}:\n${lines.join("\n")}`, links: [{ label: "Checklist", href: "/tasks?filter=soon" }] };
  }

  if (has("ready", "readiness", "on track", "how are we doing")) {
    const r = computeReadiness(data);
    const weakest = [...r.components].sort((a, b) => a.score - b.score).slice(0, 2);
    return { intent: "readiness", text: `You're ${r.overall}% ready. ${weakest.map((w) => `${w.label} is at ${w.score}%: ${w.explanation}`).join(" ")}`, links: weakest.map((w) => ({ label: `Improve ${w.label.toLowerCase()}`, href: w.href })) };
  }

  return null;
}

/**
 * Compact, aggregate facts for a language model. No guest names or contact
 * details — only the numbers and labels the couple already sees on screen.
 */
export function assistantContext(data: WeddingData, today: ISODate) {
  const budget = summarizeBudget(data.wedding, data.budgetItems, data.payments);
  const guests = guestMetrics(data.guests, data.wedding);
  const vendorCat = new Map(data.vendors.map((v) => [v.id, v.categoryId]));
  const quoteCats = [...new Set(data.quotes.map((q) => vendorCat.get(q.vendorId)).filter((c): c is BudgetCategoryId => Boolean(c)))];
  return {
    today,
    wedding: {
      couple: `${data.wedding.brideName} & ${data.wedding.groomName}`,
      date: data.wedding.weddingDate,
      daysToGo: daysBetween(today, data.wedding.weddingDate),
      venue: [data.wedding.venue, data.wedding.location].filter(Boolean).join(", "),
      estimatedGuests: data.wedding.estimatedGuests,
      style: data.wedding.style,
      mustHave: data.wedding.mustHave,
      niceToHave: data.wedding.niceToHave,
      avoidOverspending: data.wedding.avoidOverspending,
      blueprint: data.wedding.blueprint,
    },
    budgetLKR: { original: budget.original, committed: budget.committed, paid: budget.paid, projected: budget.forecast, overPlan: budget.variance, remaining: budget.remaining },
    categoriesLKR: rollupByCategory(data.budgetItems, data.payments).map((r) => ({ category: r.label, planned: r.planned, projected: r.forecast, committed: r.committed, paid: r.paid, vsPlanPct: r.variancePct })),
    insights: budgetInsights(data).map((i) => `${i.title} ${i.detail}`),
    quotes: quoteCats.map((c) => ({
      category: budgetCategory(c).label,
      options: scoreQuotes(data.quotes.filter((q) => vendorCat.get(q.vendorId) === c), data.vendors, c).map((s) => ({
        vendor: s.vendor?.name, package: s.quote.packageName, trueCostLKR: s.trueCost, extrasLKR: s.hidden, valueScore: s.valueScore, labels: s.labels, chosen: s.quote.selected, deliverables: s.quote.deliverables,
      })),
    })),
    vendors: data.vendors.map((v) => ({ name: v.name, category: budgetCategory(v.categoryId).label, status: v.status, rating: v.rating })),
    guests: { total: guests.total, confirmed: guests.confirmed, pending: guests.pending, declined: guests.declined, notInvited: guests.notInvited, expected: guests.expectedAttendance, bride: guests.bySide.bride, groom: guests.bySide.groom },
    upcomingTasks: upcomingTasks(data.tasks, 12).map((t) => ({ title: t.title, due: t.dueDate, status: t.status })),
    upcomingPayments: bucketPayments(data.payments, today).thisMonth.concat(bucketPayments(data.payments, today).thisWeek, bucketPayments(data.payments, today).overdue).map((p) => ({ label: p.label, amountLKR: p.amount, due: p.dueDate, vendor: data.vendors.find((v) => v.id === p.vendorId)?.name })),
    readiness: computeReadiness(data).components.map((c) => ({ area: c.label, score: c.score, how: c.explanation })),
  };
}

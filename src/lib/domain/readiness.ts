import { CEREMONY_TASK_CATEGORIES, JOURNEY_STAGES, WEDDING_DAY_TASK_CATEGORIES, budgetCategory, taskCategory, type JourneyStageId } from "./catalog";
import { compareISO, daysBetween } from "./dates";
import { summarizeBudget } from "./budget";
import { guestMetrics } from "./guests";
import { percent } from "./money";
import type { ISODate, Task, WeddingData } from "./types";

/**
 * Wedding Readiness. Every component is a plain ratio of real records, and the
 * overall score is their simple average. Each row carries the sentence the UI
 * shows to explain how it was calculated.
 */

export interface ReadinessComponent {
  id: "budget" | "guests" | "vendors" | "ceremony" | "invitations" | "day";
  label: string;
  score: number;
  explanation: string;
  href: string;
}

export interface Readiness {
  overall: number;
  components: ReadinessComponent[];
}

function taskRatio(tasks: Task[], categories: string[]): { done: number; total: number } {
  const relevant = tasks.filter((t) => categories.includes(t.categoryId) && t.status !== "cancelled");
  return { done: relevant.filter((t) => t.status === "completed").length, total: relevant.length };
}

export function computeReadiness(data: WeddingData): Readiness {
  const { wedding, tasks, guests, budgetItems, vendors, payments, timeline } = data;
  const budget = summarizeBudget(wedding, budgetItems, payments);
  const gm = guestMetrics(guests, wedding);

  // Budget: share of the forecast that is locked in (committed).
  const budgetScore = Math.min(100, percent(budget.committed, budget.forecast));

  // Guests: half invitation coverage, half RSVP completion.
  const guestScore = gm.total ? Math.round((gm.invitationCoverage + gm.rsvpCompletion) / 2) : 0;

  // Vendors: vendor-backed categories with planned spend that have a booked vendor.
  const neededCategories = [
    ...new Set(
      budgetItems
        .filter((i) => i.status !== "cancelled" && i.planned > 0 && budgetCategory(i.categoryId).vendorBacked)
        .map((i) => i.categoryId),
    ),
  ];
  const bookedCategories = new Set(
    vendors.filter((v) => v.status === "booked" || v.status === "completed").map((v) => v.categoryId),
  );
  const bookedNeeded = neededCategories.filter((c) => bookedCategories.has(c)).length;
  const vendorScore = percent(bookedNeeded, neededCategories.length);

  const ceremony = taskRatio(tasks, CEREMONY_TASK_CATEGORIES);
  const ceremonyScore = percent(ceremony.done, ceremony.total);

  // Invitations: share of people whose invitation has gone out.
  const inviteScore = gm.invitationCoverage;

  // Wedding day: half day-of tasks done, half a timeline with at least 6 moments.
  const day = taskRatio(tasks, WEDDING_DAY_TASK_CATEGORIES);
  const timelineScore = Math.min(100, Math.round((timeline.length / 6) * 100));
  const dayScore = Math.round((percent(day.done, day.total) + timelineScore) / 2);

  const components: ReadinessComponent[] = [
    { id: "budget", label: "Budget", score: budgetScore, href: "/budget",
      explanation: `${percent(budget.committed, budget.forecast)}% of your forecast is committed with vendors.` },
    { id: "guests", label: "Guests", score: guestScore, href: "/guests",
      explanation: `Average of invitation coverage (${gm.invitationCoverage}%) and RSVP replies (${gm.rsvpCompletion}%).` },
    { id: "vendors", label: "Vendors", score: vendorScore, href: "/vendors",
      explanation: `${bookedNeeded} of ${neededCategories.length} vendor categories in your budget are booked.` },
    { id: "ceremony", label: "Ceremony", score: ceremonyScore, href: "/tasks?stage=ceremony",
      explanation: `${ceremony.done} of ${ceremony.total} Poruwa, ritual and registration tasks are done.` },
    { id: "invitations", label: "Invitations", score: inviteScore, href: "/guests?invitation=not_sent",
      explanation: `${gm.invitedPeople} of ${gm.total} guests have been sent an invitation.` },
    { id: "day", label: "Wedding Day", score: dayScore, href: "/timeline",
      explanation: `${day.done} of ${day.total} day-of tasks done; timeline has ${timeline.length} of 6+ moments.` },
  ];
  const overall = Math.round(components.reduce((s, c) => s + c.score, 0) / components.length);
  return { overall, components };
}

/* ------------------------------------------------------------------ */
/* Journey                                                             */
/* ------------------------------------------------------------------ */

export type StageState = "not_started" | "in_progress" | "completed";

export interface JourneyStage {
  id: JourneyStageId;
  number: number;
  label: string;
  state: StageState;
  done: number;
  total: number;
  /** Earliest open due date in the stage, if any. */
  nextDue: ISODate | null;
}

export function computeJourney(data: WeddingData, today: ISODate): JourneyStage[] {
  const { tasks, wedding } = data;
  const daysToWedding = daysBetween(today, wedding.weddingDate);
  return JOURNEY_STAGES.map((stage, i) => {
    const stageTasks = tasks.filter((t) => taskCategory(t.categoryId).stage === stage.id && t.status !== "cancelled");
    const done = stageTasks.filter((t) => t.status === "completed").length;
    const started = stageTasks.some((t) => t.status !== "not_started");
    let state: StageState = done === stageTasks.length && stageTasks.length > 0 ? "completed" : started ? "in_progress" : "not_started";
    if (stage.id === "day") state = daysToWedding < 0 ? "completed" : daysToWedding === 0 ? "in_progress" : state === "completed" ? "in_progress" : state;
    const open = stageTasks.filter((t) => t.status !== "completed" && t.dueDate).map((t) => t.dueDate!) .sort(compareISO);
    return { id: stage.id, number: i + 1, label: stage.label, state, done, total: stageTasks.length, nextDue: open[0] ?? null };
  });
}

/** The stage to highlight: the first one that isn't complete. */
export function currentStage(stages: JourneyStage[]): JourneyStage {
  return stages.find((s) => s.state !== "completed") ?? stages[stages.length - 1];
}

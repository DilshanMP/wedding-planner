import { addDays, compareISO, daysBetween } from "./dates";
import { newId } from "./ids";
import { TASK_TEMPLATES, type TaskTemplate } from "./task-templates";
import type { ISODate, ISODateTime, Person, Task } from "./types";

export interface GenerateOptions {
  weddingDate: ISODate;
  today: ISODate;
  people: Person[];
  now: ISODateTime;
  templates?: TaskTemplate[];
}

/** Earliest a catch-up task is scheduled after today, spread to avoid a wall of same-day tasks. */
const CATCH_UP_START = 7;

/**
 * Build the recommended checklist from the wedding date.
 *
 * Each task's due date is `weddingDate − daysBefore`. When the wedding is
 * closer than the template assumes, that date is already in the past; those
 * tasks are rescheduled into the near future (in their original order) and
 * marked "catch-up" in the notes so the plan stays achievable.
 */
export function generateTasks({ weddingDate, today, people, now, templates = TASK_TEMPLATES }: GenerateOptions): Task[] {
  const keyToId = new Map(templates.map((t) => [t.key, newId()]));
  const daysLeft = daysBetween(today, weddingDate);
  const late = templates.filter((t) => compareISO(addDays(weddingDate, -t.daysBefore), today) < 0 && t.daysBefore > 0);
  // Spread catch-up tasks over the first third of the remaining time (min one week).
  const window = Math.max(CATCH_UP_START, Math.floor(Math.max(daysLeft, 0) / 3));

  return templates.map((t) => {
    let due = addDays(weddingDate, -t.daysBefore);
    let notes = "";
    const lateIndex = late.indexOf(t);
    if (lateIndex >= 0) {
      const offset = Math.min(window, CATCH_UP_START + Math.floor((lateIndex / Math.max(late.length, 1)) * window));
      due = addDays(today, Math.min(offset, Math.max(daysLeft - 1, 0)));
      notes = "Catch-up: normally done earlier, rescheduled to fit your date.";
    }
    return {
      id: keyToId.get(t.key)!,
      title: t.title,
      categoryId: t.categoryId,
      description: t.description ?? "",
      priority: t.priority,
      dueDate: due,
      ownerId: ownerFor(t, people),
      estimatedCost: null,
      actualCost: null,
      vendorId: null,
      notes,
      dependsOn: (t.dependsOn ?? []).map((k) => keyToId.get(k)).filter((x): x is string => Boolean(x)),
      status: "not_started",
      completedAt: null,
      templateKey: t.key,
      createdAt: now,
      updatedAt: now,
    } satisfies Task;
  });
}

function ownerFor(t: TaskTemplate, people: Person[]): string | null {
  if (!t.owner || t.owner === "both") return null;
  return people.find((m) => m.role === t.owner)?.id ?? null;
}

/** Shift every open generated task when the wedding date changes. */
export function rescheduleTasks(tasks: Task[], oldDate: ISODate, newDate: ISODate): Task[] {
  const shift = daysBetween(oldDate, newDate);
  if (shift === 0) return tasks;
  return tasks.map((t) =>
    t.dueDate && t.status !== "completed" && t.status !== "cancelled"
      ? { ...t, dueDate: addDays(t.dueDate, shift) }
      : t,
  );
}

export const isOpen = (t: Task) => t.status !== "completed" && t.status !== "cancelled";

export function isOverdue(t: Task, today: ISODate): boolean {
  return isOpen(t) && t.dueDate !== null && compareISO(t.dueDate, today) < 0;
}

/** Open tasks whose dependencies are not yet complete. */
export function blockedBy(task: Task, all: Task[]): Task[] {
  if (task.dependsOn.length === 0) return [];
  const byId = new Map(all.map((t) => [t.id, t]));
  return task.dependsOn.map((id) => byId.get(id)).filter((t): t is Task => Boolean(t) && isOpen(t!));
}

export interface TaskMetrics {
  total: number;
  completed: number;
  open: number;
  overdue: number;
  dueThisWeek: number;
  completionPct: number;
}

export function taskMetrics(tasks: Task[], today: ISODate): TaskMetrics {
  const live = tasks.filter((t) => t.status !== "cancelled");
  const completed = live.filter((t) => t.status === "completed").length;
  const weekEnd = addDays(today, 7);
  return {
    total: live.length,
    completed,
    open: live.length - completed,
    overdue: live.filter((t) => isOverdue(t, today)).length,
    dueThisWeek: live.filter(
      (t) => isOpen(t) && t.dueDate && compareISO(t.dueDate, today) >= 0 && compareISO(t.dueDate, weekEnd) <= 0,
    ).length,
    completionPct: live.length ? Math.round((completed / live.length) * 100) : 0,
  };
}

/** Open tasks sorted by urgency: overdue first, then by due date, then priority. */
export function upcomingTasks(tasks: Task[], limit = 5): Task[] {
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return tasks
    .filter(isOpen)
    .sort((a, b) => {
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return compareISO(a.dueDate, b.dueDate);
      if (!a.dueDate !== !b.dueDate) return a.dueDate ? -1 : 1;
      return rank[a.priority] - rank[b.priority];
    })
    .slice(0, limit);
}

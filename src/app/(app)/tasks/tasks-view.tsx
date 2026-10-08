"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useQueryState } from "@/lib/hooks/use-query-state";
import { JOURNEY_STAGES, taskCategory, type JourneyStageId } from "@/lib/domain/catalog";
import { addDays, compareISO, monthLabel } from "@/lib/domain/dates";
import { isOpen, isOverdue, taskMetrics } from "@/lib/domain/tasks";
import type { Task } from "@/lib/domain/types";
import { Card, EmptyState, PageHeader, ProgressBar, cx } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { TaskRow } from "@/components/features/task-row";
import { TaskForm } from "@/components/features/task-form";

const FILTERS = [
  { id: "open", label: "Open" },
  { id: "soon", label: "Due soon" },
  { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" },
  { id: "all", label: "All" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

export function TasksView() {
  const page = usePage();
  const q = useQueryState();
  const view = (q.get("view") as "timeline" | "stage") ?? "timeline";
  const filter = (q.get("filter") as FilterId) ?? "open";
  const stage = q.get("stage") as JourneyStageId | null;
  const owner = q.get("owner") ?? "";
  const search = q.get("q") ?? "";
  const editingId = q.get("task");
  const creating = q.get("new") === "1";

  const groups = useMemo(() => {
    if (!page) return [];
    const { data, today } = page;
    const soonEnd = addDays(today, 14);
    const term = search.trim().toLowerCase();
    const list = data.tasks.filter((t) => {
      if (filter === "open" && !isOpen(t)) return false;
      if (filter === "completed" && t.status !== "completed") return false;
      if (filter === "overdue" && !isOverdue(t, today)) return false;
      if (filter === "soon" && !(isOpen(t) && t.dueDate && compareISO(t.dueDate, soonEnd) <= 0)) return false;
      if (stage && taskCategory(t.categoryId).stage !== stage) return false;
      if (owner === "both" ? t.ownerId !== null : owner && t.ownerId !== owner) return false;
      if (term && !`${t.title} ${t.description} ${t.notes}`.toLowerCase().includes(term)) return false;
      return true;
    });
    const sorted = [...list].sort((a, b) => compareISO(a.dueDate ?? "9999", b.dueDate ?? "9999"));
    if (view === "stage") {
      return JOURNEY_STAGES.map((s, i) => ({
        key: s.id,
        title: `${String(i + 1).padStart(2, "0")} — ${s.label}`,
        tasks: sorted.filter((t) => taskCategory(t.categoryId).stage === s.id),
      })).filter((g) => g.tasks.length);
    }
    const buckets = new Map<string, Task[]>();
    for (const t of sorted) {
      const key = isOverdue(t, today) ? "Overdue" : t.dueDate ? monthLabel(t.dueDate) : "No date";
      buckets.set(key, [...(buckets.get(key) ?? []), t]);
    }
    return [...buckets].map(([title, tasks]) => ({ key: title, title, tasks }));
  }, [page, filter, stage, owner, search, view]);

  if (!page) return <PageSkeleton />;
  const { data, today } = page;
  const m = taskMetrics(data.tasks, today);
  const editing = data.tasks.find((t) => t.id === editingId);
  const closeForm = () => q.set({ task: null, new: null });

  return (
    <>
      <PageHeader
        overline="Master checklist"
        title="Everything, A to Z"
        lead={`${m.completed} of ${m.total} done${m.overdue ? ` · ${m.overdue} overdue` : ""}${m.dueThisWeek ? ` · ${m.dueThisWeek} due this week` : ""}.`}
        actions={<button type="button" className="wos-btn wos-btn--primary" onClick={() => q.set({ new: "1" })}><Plus className="wos-icon" aria-hidden="true" />Add Task</button>}
      />
      <ProgressBar value={m.completionPct} label="Checklist progress" detail={`${m.completionPct}%`} tone="sage" />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="wos-tabs" role="tablist" aria-label="Filter tasks">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" role="tab" className="wos-tab" aria-selected={filter === f.id} onClick={() => q.set({ filter: f.id === "open" ? null : f.id })}>
                {f.label}
                {f.id === "overdue" && m.overdue > 0 && <span>{m.overdue}</span>}
              </button>
            ))}
          </div>
          <div className="wos-tabs" role="tablist" aria-label="Group tasks">
            <button type="button" role="tab" className="wos-tab" aria-selected={view === "timeline"} onClick={() => q.set({ view: null })}>By month</button>
            <button type="button" role="tab" className="wos-tab" aria-selected={view === "stage"} onClick={() => q.set({ view: "stage" })}>By journey stage</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="sr-only" htmlFor="task-search">Search tasks</label>
          <input id="task-search" type="search" className="wos-input max-w-[320px] flex-[1_1_200px]" placeholder="Search tasks" value={search} onChange={(e) => q.set({ q: e.target.value })} />
          <label className="sr-only" htmlFor="task-owner">Owner</label>
          <select id="task-owner" className="wos-input w-auto" value={owner} onChange={(e) => q.set({ owner: e.target.value })}>
            <option value="">Everyone</option>
            <option value="both">Both of us</option>
            {data.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label className="sr-only" htmlFor="task-stage">Journey stage</label>
          <select id="task-stage" className="wos-input w-auto" value={stage ?? ""} onChange={(e) => q.set({ stage: e.target.value })}>
            <option value="">All stages</option>
            {JOURNEY_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState mark="jasmine" title={filter === "overdue" ? "Nothing overdue." : "No tasks here."}
          action={<button type="button" className="wos-btn wos-btn--primary" onClick={() => q.set({ new: "1" })}>Add Task</button>}>
          {filter === "overdue" ? "You're on top of everything. Enjoy it." : "Try another filter, or add a task of your own."}
        </EmptyState>
      ) : (
        groups.map((g) => (
          <Card key={g.key} title={<span className={cx(g.key === "Overdue" && "text-danger")}>{g.title}</span>} action={<span className="text-[13px] font-medium text-ink-muted">{g.tasks.filter((t) => t.status === "completed").length} of {g.tasks.length} done</span>}>
            <ul className="wos-list">
              {g.tasks.map((t) => (
                <TaskRow key={t.id} task={t} today={today} showStatus onOpen={(task) => q.set({ task: task.id })} />
              ))}
            </ul>
          </Card>
        ))
      )}

      <TaskForm open={creating || Boolean(editing)} task={editing} onClose={closeForm} />
    </>
  );
}

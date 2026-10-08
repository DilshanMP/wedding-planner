"use client";

import { useState } from "react";
import { useStore, useWeddingData } from "@/lib/store/provider";
import { formatShortDate, relativeDue, compareISO } from "@/lib/domain/dates";
import { taskCategory, TASK_STATUS_LABEL, TASK_STATUS_TONE } from "@/lib/domain/catalog";
import { blockedBy } from "@/lib/domain/tasks";
import { nowISO } from "@/lib/domain/ids";
import type { Task } from "@/lib/domain/types";
import { Badge, cx } from "@/components/ui/primitives";

export function OwnerAvatar({ ownerId }: { ownerId: string | null }) {
  const { people } = useWeddingData();
  const owner = people.find((p) => p.id === ownerId);
  if (!owner) {
    return <Badge tone="champagne" plain>Both</Badge>;
  }
  if (owner.role === "bride" || owner.role === "groom") {
    return (
      <span title={owner.name} aria-label={`Owner: ${owner.name}`} className={cx("nav-avatar avatar-sm", owner.role === "bride" ? "nav-avatar--bride" : "nav-avatar--groom")} style={{ marginLeft: 0 }}>
        {owner.name.charAt(0)}
      </span>
    );
  }
  return <Badge tone="champagne" plain>{owner.name}</Badge>;
}

/** A checklist row. Ticking it completes the task (with a single petal). */
export function TaskRow({ task, today, onOpen, showStatus }: { task: Task; today: string; onOpen?: (t: Task) => void; showStatus?: boolean }) {
  const store = useStore();
  const data = useWeddingData();
  const [petal, setPetal] = useState(0);
  const done = task.status === "completed";
  const overdue = !done && task.status !== "cancelled" && task.dueDate !== null && compareISO(task.dueDate, today) < 0;
  const soon = !done && task.dueDate !== null && !overdue && compareISO(task.dueDate, today) >= 0 && relativeDue(task.dueDate, today).match(/^(Today|Tomorrow|In [1-6] days)$/);
  const blockers = done ? [] : blockedBy(task, data.tasks);
  const id = `task-${task.id}`;

  const toggle = (checked: boolean) => {
    if (checked) setPetal((p) => p + 1);
    store.upsert("tasks", { ...task, status: checked ? "completed" : "in_progress", completedAt: checked ? nowISO() : null });
  };

  return (
    <li style={{ padding: "14px 0" }} className="relative">
      <input className="wos-check" type="checkbox" id={id} checked={done} onChange={(e) => toggle(e.target.checked)} aria-describedby={`${id}-meta`} />
      {petal > 0 && <span key={petal} className="wos-petal" style={{ left: 6, top: 10 }} aria-hidden="true" />}
      <div className="flex min-w-0 flex-1 flex-col">
        <label htmlFor={id} className={cx("text-[14px] leading-5 font-semibold cursor-pointer", done && "line-through opacity-60")}>
          {task.title}
        </label>
        <span id={`${id}-meta`} className={cx("text-[13px] leading-[18px] font-medium text-ink-muted", done && "opacity-60")}>
          {taskCategory(task.categoryId).label}
          {done && task.completedAt ? ` · done ${formatShortDate(task.completedAt.slice(0, 10))}` : task.dueDate ? ` · due ${formatShortDate(task.dueDate)}` : ""}
          {blockers.length > 0 && ` · after “${blockers[0].title}”`}
        </span>
      </div>
      {overdue && <Badge tone="danger">{relativeDue(task.dueDate!, today)}</Badge>}
      {!overdue && soon && <Badge tone="warning">This week</Badge>}
      {showStatus && !overdue && !soon && task.status !== "not_started" && <Badge tone={TASK_STATUS_TONE[task.status]}>{TASK_STATUS_LABEL[task.status]}</Badge>}
      <span className="hidden sm:inline-flex"><OwnerAvatar ownerId={task.ownerId} /></span>
      {onOpen && (
        <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm !px-3" onClick={() => onOpen(task)} aria-label={`Edit ${task.title}`}>
          Edit
        </button>
      )}
    </li>
  );
}

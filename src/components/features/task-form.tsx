"use client";

import { useState } from "react";
import { useStore, useWeddingData } from "@/lib/store/provider";
import { TASK_CATEGORIES, TASK_STATUS_LABEL, PRIORITY_LABEL } from "@/lib/domain/catalog";
import { fieldErrors, taskSchema } from "@/lib/domain/schemas";
import { newId, nowISO } from "@/lib/domain/ids";
import { TASK_STATUSES, type Priority, type Task, type TaskStatus } from "@/lib/domain/types";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { MoneyField, SelectField, TextArea, TextField } from "@/components/ui/fields";
import { useToast } from "@/components/shell/toast";

type Draft = Omit<Task, "id" | "createdAt" | "updatedAt" | "completedAt" | "templateKey" | "dueDate"> & { dueDate: string };

function toDraft(t?: Task): Draft {
  return {
    title: t?.title ?? "",
    categoryId: t?.categoryId ?? "vision",
    description: t?.description ?? "",
    priority: t?.priority ?? "medium",
    dueDate: t?.dueDate ?? "",
    ownerId: t?.ownerId ?? null,
    estimatedCost: t?.estimatedCost ?? null,
    actualCost: t?.actualCost ?? null,
    vendorId: t?.vendorId ?? null,
    notes: t?.notes ?? "",
    dependsOn: t?.dependsOn ?? [],
    status: t?.status ?? "not_started",
  };
}

export function TaskForm({ open, task, onClose }: { open: boolean; task?: Task; onClose: () => void }) {
  // Remount the form body per task so the draft resets.
  return (
    <TaskFormInner key={`${task?.id ?? "new"}-${open}`} open={open} task={task} onClose={onClose} />
  );
}

function TaskFormInner({ open, task, onClose }: { open: boolean; task?: Task; onClose: () => void }) {
  const store = useStore();
  const data = useWeddingData();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(() => toDraft(task));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    const res = taskSchema.safeParse(draft);
    if (!res.success) return setErrors(fieldErrors(res.error));
    const now = nowISO();
    const completedAt = res.data.status === "completed" ? (task?.completedAt ?? now) : null;
    store.upsert("tasks", {
      ...(task ?? { id: newId(), createdAt: now, templateKey: null }),
      ...res.data,
      completedAt,
      updatedAt: now,
    } as Task);
    toast(task ? "Task updated." : "Task added.");
    onClose();
  };

  const candidates = data.tasks.filter((t) => t.id !== task?.id && !draft.dependsOn.includes(t.id) && t.status !== "cancelled");

  return (
    <>
      <Dialog
        open={open && !confirmDelete}
        onClose={onClose}
        title={task ? "Edit task" : "Add a task"}
        footer={
          <>
            {task && (
              <button type="button" className="wos-btn wos-btn--danger" onClick={() => setConfirmDelete(true)}>Delete</button>
            )}
            <span className="spacer" />
            <button type="button" className="wos-btn wos-btn--secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="wos-btn wos-btn--primary" onClick={save}>{task ? "Save Changes" : "Add Task"}</button>
          </>
        }
      >
        <form className="wos-form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <TextField className="full" label="Task" value={draft.title} onChange={(v) => set("title", v)} error={errors.title} autoFocus={!task} />
          <SelectField label="Category" value={draft.categoryId} onChange={(v) => set("categoryId", v)} options={TASK_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
          <SelectField<TaskStatus> label="Status" value={draft.status} onChange={(v) => set("status", v)} options={TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABEL[s] }))} />
          <TextField label="Due date" type="date" value={draft.dueDate} onChange={(v) => set("dueDate", v)} error={errors.dueDate} />
          <SelectField<Priority> label="Priority" value={draft.priority} onChange={(v) => set("priority", v)} options={(["high", "medium", "low"] as Priority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} />
          <SelectField label="Owner" value={draft.ownerId ?? ""} onChange={(v) => set("ownerId", v || null)} options={[{ value: "", label: "Both of us" }, ...data.people.map((p) => ({ value: p.id, label: p.name }))]} />
          <SelectField label="Vendor" value={draft.vendorId ?? ""} onChange={(v) => set("vendorId", v || null)} options={[{ value: "", label: "None" }, ...data.vendors.map((v) => ({ value: v.id, label: v.name }))]} />
          <MoneyField label="Estimated cost" value={draft.estimatedCost} onChange={(v) => set("estimatedCost", v)} optional error={errors.estimatedCost} />
          <MoneyField label="Actual cost" value={draft.actualCost} onChange={(v) => set("actualCost", v)} optional error={errors.actualCost} />
          <TextArea className="full" label="Description" value={draft.description} onChange={(v) => set("description", v)} rows={2} />
          <div className="wos-field full">
            <span className="text-[14px] leading-5 font-semibold">Do this after</span>
            {draft.dependsOn.length > 0 && (
              <ul className="wos-chips m-0 list-none p-0">
                {draft.dependsOn.map((id) => {
                  const dep = data.tasks.find((t) => t.id === id);
                  return (
                    <li key={id}>
                      <button type="button" className="wos-chip" aria-pressed="true" onClick={() => set("dependsOn", draft.dependsOn.filter((d) => d !== id))} aria-label={`Remove dependency ${dep?.title ?? ""}`}>
                        {dep?.title ?? "Removed task"} <span aria-hidden="true">×</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <label className="sr-only" htmlFor="dep-add">Add a task this depends on</label>
            <select id="dep-add" className="wos-input" value="" onChange={(e) => e.target.value && set("dependsOn", [...draft.dependsOn, e.target.value])}>
              <option value="">Add a task this depends on…</option>
              {candidates.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
          <TextArea className="full" label="Notes" value={draft.notes} onChange={(v) => set("notes", v)} rows={3} />
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (task) store.remove("tasks", task.id);
          toast("Task deleted.");
          setConfirmDelete(false);
          onClose();
        }}
        title="Delete this task?"
        body={`“${task?.title ?? ""}” will be removed from your checklist. Tasks that depended on it will no longer wait for it.`}
        confirmLabel="Delete Task"
        danger
      />
    </>
  );
}

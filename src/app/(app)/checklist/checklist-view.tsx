"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ClipboardCopy, Printer, Share2 } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useStore } from "@/lib/store/provider";
import { formatLongDate, formatShortDate } from "@/lib/domain/dates";
import { checklistPhases, checklistText } from "@/lib/domain/tasks";
import { nowISO } from "@/lib/domain/ids";
import { LotusMark, cx } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";

/** A beautiful one-page checklist of the main points: tick off, print, or send on WhatsApp. */
export function ChecklistView() {
  const page = usePage();
  const store = useStore();
  const toast = useToast();
  const [all, setAll] = useState(false);
  if (!page) return <PageSkeleton />;
  const { data } = page;
  const { wedding } = data;
  const phases = checklistPhases(data.tasks, wedding.weddingDate, !all);
  const done = phases.reduce((n, p) => n + p.done, 0);
  const total = phases.reduce((n, p) => n + p.tasks.length, 0);
  const title = `${wedding.brideName} & ${wedding.groomName} — wedding checklist`;
  const text = checklistText(phases, title);
  const colors = data.planner.theme.colors;

  const toggle = (id: string) => {
    const t = data.tasks.find((x) => x.id === id);
    if (!t) return;
    const completed = t.status !== "completed";
    store.upsert("tasks", { ...t, status: completed ? "completed" : "not_started", completedAt: completed ? nowISO() : null });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Checklist copied.");
    } catch {
      toast("Couldn't copy in this browser.", "danger");
    }
  };

  return (
    <>
      <div className="no-print flex flex-wrap items-center gap-2">
        <Link href="/tasks" className="wos-btn wos-btn--ghost">← Full checklist</Link>
        <span className="flex-1" />
        <div className="wos-tabs" role="tablist" aria-label="Show">
          <button type="button" role="tab" className="wos-tab" aria-selected={!all} onClick={() => setAll(false)}>Main points</button>
          <button type="button" role="tab" className="wos-tab" aria-selected={all} onClick={() => setAll(true)}>Everything</button>
        </div>
        <button type="button" className="wos-btn wos-btn--secondary" onClick={() => void copy()}><ClipboardCopy className="wos-icon" aria-hidden="true" />Copy</button>
        <a className="wos-btn wos-btn--secondary" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><Share2 className="wos-icon" aria-hidden="true" />WhatsApp</a>
        <button type="button" className="wos-btn wos-btn--primary" onClick={() => window.print()}><Printer className="wos-icon" aria-hidden="true" />Print / PDF</button>
      </div>

      <article className="checklist-sheet" style={{ ["--c1" as string]: colors[0], ["--c2" as string]: colors[1] ?? colors[0] }}>
        <header className="checklist-head">
          <LotusMark className="size-12" />
          <span className="checklist-overline">Our wedding checklist</span>
          <h1>{wedding.brideName} <i>&amp;</i> {wedding.groomName}</h1>
          <p>{formatLongDate(wedding.weddingDate)}{wedding.venue ? ` · ${wedding.venue}` : ""}</p>
          <div className="checklist-progress" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label="Checklist progress">
            <i style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
          <span className="text-[13px] font-semibold">{done} of {total} done</span>
        </header>
        <div className="checklist-grid">
          {phases.map((p) => (
            <section key={p.id} className="checklist-phase" aria-labelledby={`ph-${p.id}`}>
              <h2 id={`ph-${p.id}`}>{p.title}<span>{p.done}/{p.tasks.length}</span></h2>
              <ul>
                {p.tasks.map((t) => {
                  const isDone = t.status === "completed";
                  return (
                    <li key={t.id}>
                      <button type="button" className={cx("checklist-item", isDone && "is-done")} onClick={() => toggle(t.id)} aria-pressed={isDone}>
                        <span className="checklist-box" aria-hidden="true">{isDone && <Check style={{ width: 12, height: 12 }} />}</span>
                        <span className="flex-1">{t.title}</span>
                        {t.dueDate && <span className="checklist-date">{formatShortDate(t.dueDate)}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </article>
    </>
  );
}

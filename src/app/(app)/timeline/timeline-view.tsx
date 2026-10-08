"use client";

import Link from "next/link";
import { Clock, MapPin, Plus, Sparkles, SunMedium, AlertTriangle } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useQueryState } from "@/lib/hooks/use-query-state";
import { endTime, overlaps, sortTimeline } from "@/lib/domain/day";
import { addDays, compareISO, daysBetween, formatLongDate, formatShortDate, formatTime, minutesToTime, monthLabel } from "@/lib/domain/dates";
import { formatLKR } from "@/lib/domain/money";
import { isOpen } from "@/lib/domain/tasks";
import type { WeddingData } from "@/lib/domain/types";
import { Badge, Card, EmptyState, PageHeader, cx } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { EventForm } from "@/components/features/event-form";

export function TimelineView() {
  const page = usePage();
  const q = useQueryState();
  if (!page) return <PageSkeleton />;
  const { data, today } = page;
  const tab = q.get("tab") === "planning" ? "planning" : "day";
  const editing = data.timeline.find((e) => e.id === q.get("event"));
  const creating = q.get("new") === "1";

  return (
    <>
      <PageHeader
        overline="Timeline"
        title={tab === "day" ? "The wedding day" : "Planning timeline"}
        lead={tab === "day" ? `${formatLongDate(data.wedding.weddingDate)}${data.wedding.venue ? ` · ${data.wedding.venue}` : ""}` : `From today to ${formatShortDate(data.wedding.weddingDate)}, month by month.`}
        actions={
          tab === "day" ? (
            <>
              <Link href="/simulator" className="wos-btn wos-btn--secondary"><Sparkles className="wos-icon" aria-hidden="true" />Preview in Simulator</Link>
              <button type="button" className="wos-btn wos-btn--primary" onClick={() => q.set({ new: "1" })}><Plus className="wos-icon" aria-hidden="true" />Add Moment</button>
            </>
          ) : undefined
        }
      />
      <div className="wos-tabs" role="tablist" aria-label="Timelines">
        <button type="button" role="tab" className="wos-tab" aria-selected={tab === "day"} onClick={() => q.set({ tab: null })}>Wedding day</button>
        <button type="button" role="tab" className="wos-tab" aria-selected={tab === "planning"} onClick={() => q.set({ tab: "planning" })}>Planning</button>
      </div>
      {tab === "day" ? <DayTimeline data={data} onEdit={(id) => q.set({ event: id })} onAdd={() => q.set({ new: "1" })} /> : <PlanningTimeline data={data} today={today} />}
      <EventForm open={creating || Boolean(editing)} event={editing} onClose={() => q.set({ event: null, new: null })} />
    </>
  );
}

function DayTimeline({ data, onEdit, onAdd }: { data: WeddingData; onEdit: (id: string) => void; onAdd: () => void }) {
  const events = sortTimeline(data.timeline);
  const clash = overlaps(events);
  if (events.length === 0) {
    return <EmptyState mark="poruwa" title="Your day is a blank page." action={<button type="button" className="wos-btn wos-btn--primary" onClick={onAdd}>Add Moment</button>}>Start with the Poruwa time from your astrologer, then build the day around it.</EmptyState>;
  }
  return (
    <>
      <ol className="m-0 flex list-none flex-col p-0">
        {events.map((e, i) => {
          const vendors = data.vendors.filter((v) => e.vendorIds.includes(v.id));
          const owner = data.people.find((p) => p.id === e.ownerId);
          const isKey = e.scene === "poruwa" || e.scene === "going_away";
          return (
            <li key={e.id} className="grid grid-cols-[72px_24px_1fr] gap-3 sm:grid-cols-[96px_24px_1fr]">
              <div className="pt-4 text-right">
                <span className="wos-num block text-[15px] leading-[22px] font-semibold">{formatTime(e.time)}</span>
                <span className="text-[12px] text-ink-muted">to {formatTime(minutesToTime(endTime(e)))}</span>
              </div>
              <div className="relative flex justify-center" aria-hidden="true">
                <span className={cx("absolute top-0 bottom-0 w-0.5", i === 0 ? "top-6" : "", i === events.length - 1 ? "bottom-auto h-6" : "")} style={{ background: "var(--champagne-300)" }} />
                <span className={cx("relative mt-5 size-3 rounded-full border-2", isKey ? "border-wine-600 bg-wine-600" : "border-champagne-500 bg-surface-raised")} />
              </div>
              <button type="button" onClick={() => onEdit(e.id)} className={cx("wos-card wos-card--interactive mb-3 flex cursor-pointer flex-col gap-1 !p-4 text-left text-ink", isKey && "!border-wine-600")}>
                <span className="flex flex-wrap items-center gap-2">
                  <b className={cx("text-[16px] leading-6 font-semibold", isKey && "font-display text-[22px] leading-7 font-medium text-wine-600")}>{e.title}</b>
                  {clash.has(e.id) && <Badge tone="info">Same place, same time</Badge>}
                </span>
                <span className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] leading-[18px] text-ink-muted">
                  {e.location && <span className="inline-flex items-center gap-1"><MapPin className="wos-icon size-4" aria-hidden="true" />{e.location}</span>}
                  <span className="inline-flex items-center gap-1"><Clock className="wos-icon size-4" aria-hidden="true" />{e.durationMinutes} min</span>
                  {owner && <span>{owner.name}</span>}
                </span>
                {e.description && <span className="text-[14px] leading-5 text-ink-muted">{e.description}</span>}
                {vendors.length > 0 && <span className="mt-1 flex flex-wrap gap-1.5">{vendors.map((v) => <Badge key={v.id} tone="champagne" plain>{v.name}</Badge>)}</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-3">
        <Link href="/wedding-day" className="wos-btn wos-btn--secondary"><SunMedium className="wos-icon" aria-hidden="true" />Open Wedding Day Mode</Link>
      </div>
    </>
  );
}

function PlanningTimeline({ data, today }: { data: WeddingData; today: string }) {
  const months: { key: string; label: string; start: string }[] = [];
  const end = data.wedding.weddingDate;
  let cursor = `${today.slice(0, 7)}-01`;
  while (compareISO(cursor, addDays(end, 62)) <= 0 && months.length < 30) {
    months.push({ key: cursor.slice(0, 7), label: monthLabel(cursor), start: cursor });
    const [y, m] = cursor.split("-").map(Number);
    cursor = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  }
  const overdue = data.tasks.filter((t) => isOpen(t) && t.dueDate && compareISO(t.dueDate, today) < 0);
  const weddingMonth = end.slice(0, 7);
  return (
    <div className="flex flex-col gap-4">
      {overdue.length > 0 && (
        <Card title={<span className="inline-flex items-center gap-2 text-danger"><AlertTriangle className="wos-icon" aria-hidden="true" />Catch up</span>} action={<Link href="/tasks?filter=overdue" className="wos-link">Review</Link>}>
          <p className="m-0 text-ink-muted">{overdue.length} {overdue.length === 1 ? "task is" : "tasks are"} past due: {overdue.slice(0, 3).map((t) => t.title).join(", ")}{overdue.length > 3 ? "…" : "."}</p>
        </Card>
      )}
      {months.map((mo) => {
        const tasks = data.tasks.filter((t) => t.dueDate?.startsWith(mo.key) && t.status !== "cancelled");
        const payments = data.payments.filter((p) => p.dueDate.startsWith(mo.key) && p.status === "scheduled");
        const isWedding = mo.key === weddingMonth;
        if (!tasks.length && !payments.length && !isWedding) return null;
        const done = tasks.filter((t) => t.status === "completed").length;
        const monthsOut = Math.round(daysBetween(mo.start, end) / 30);
        return (
          <section key={mo.key} className={cx("wos-card flex flex-col gap-3", isWedding && "!border-wine-600 !bg-wine-50")} aria-labelledby={`m-${mo.key}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-col">
                <span className="wos-overline">{isWedding ? "Your wedding month" : monthsOut > 0 ? `${monthsOut} ${monthsOut === 1 ? "month" : "months"} before` : "After the wedding"}</span>
                <h2 id={`m-${mo.key}`} className="wos-h2">{mo.label}</h2>
              </div>
              <span className="text-[13px] font-medium text-ink-muted">{done} of {tasks.length} tasks done{payments.length ? ` · ${formatLKR(payments.reduce((s, p) => s + p.amount, 0))} due` : ""}</span>
            </div>
            {tasks.length > 0 && (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {tasks.slice(0, 12).map((t) => (
                  <li key={t.id}><Link href={`/tasks?task=${t.id}`} className={cx("wos-chip no-underline", t.status === "completed" && "line-through opacity-60")}>{t.title}</Link></li>
                ))}
                {tasks.length > 12 && <li><Link href="/tasks" className="wos-chip no-underline">+{tasks.length - 12} more</Link></li>}
              </ul>
            )}
            {payments.length > 0 && (
              <ul className="m-0 list-none p-0 text-[13px] text-ink-muted">
                {payments.map((p) => <li key={p.id}>{formatShortDate(p.dueDate)} · {data.vendors.find((v) => v.id === p.vendorId)?.name ?? "Payment"} — {p.label}, {formatLKR(p.amount)}</li>)}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

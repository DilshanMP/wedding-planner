"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Moon, Phone, Send, Sun } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useStore } from "@/lib/store/provider";
import { WeddingGate } from "@/components/shell/wedding-gate";
import { ToastProvider, useToast } from "@/components/shell/toast";
import { nowNext, sortTimeline, endTime } from "@/lib/domain/day";
import { formatLongDate, formatTime, minutesToTime, timeToMinutes, daysBetween } from "@/lib/domain/dates";
import { VENDOR_DAY_LABEL, VENDOR_DAY_TONE, WEDDING_DAY_TASK_CATEGORIES } from "@/lib/domain/catalog";
import { guestMetrics } from "@/lib/domain/guests";
import { formatLKR } from "@/lib/domain/money";
import { isOpen } from "@/lib/domain/tasks";
import { newId, nowISO } from "@/lib/domain/ids";
import type { VendorDayStatus, WeddingData } from "@/lib/domain/types";
import { Skeleton, cx } from "@/components/ui/primitives";

const DAY_STATUSES: VendorDayStatus[] = ["not_arrived", "on_the_way", "on_site", "ready", "delayed", "done"];

export function WeddingDayView() {
  return (
    <WeddingGate>
      <ToastProvider>
        <DayScreen />
      </ToastProvider>
    </WeddingGate>
  );
}

function DayScreen() {
  const page = usePage();
  const [theme, setTheme] = useState<"auto" | "ivory" | "evening">("auto");
  const [rehearsal, setRehearsal] = useState<number | null>(null);

  // Wedding Day Mode replaces the whole shell, including the page ground.
  const live = page ? daysBetween(page.today, page.data.wedding.weddingDate) === 0 : false;
  const minutes = page ? (live ? page.minutes : rehearsal ?? defaultRehearsal(page.data)) : 0;
  const evening = theme === "evening" || (theme === "auto" && (minutes >= 18 * 60 || minutes < 5 * 60));
  useEffect(() => {
    document.documentElement.dataset.theme = evening ? "evening" : "";
    return () => { delete document.documentElement.dataset.theme; };
  }, [evening]);

  if (!page) {
    return <div className="mx-auto flex max-w-[640px] flex-col gap-5 p-6"><Skeleton style={{ height: 96, width: 240 }} /><Skeleton style={{ height: 200 }} /></div>;
  }
  const { data } = page;
  const { wedding } = data;
  const nn = nowNext(data.timeline, minutes);

  return (
    <div className="min-h-dvh bg-surface text-ink" style={{ transition: "background var(--dur-slow) var(--ease-silk)" }}>
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 pt-6 pb-16 md:px-8 md:pt-10">
        <header className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="wos-overline">Wedding day{live ? "" : " · rehearsal"}</span>
            <span className="text-[13px] leading-[18px] font-medium text-ink-muted">{formatLongDate(wedding.weddingDate)}{wedding.venue ? ` · ${wedding.venue}` : ""}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" className="wos-iconbtn" onClick={() => setTheme(evening ? "ivory" : "evening")} aria-label={evening ? "Switch to Ivory theme" : "Switch to Evening theme"}>
              {evening ? <Sun className="wos-icon" aria-hidden="true" /> : <Moon className="wos-icon" aria-hidden="true" />}
            </button>
            <Link href="/dashboard" className="wos-btn wos-btn--secondary wos-btn--sm">Exit</Link>
          </div>
        </header>

        {!live && (
          <div className="wos-card flex flex-col gap-3 !p-4">
            <label htmlFor="rehearse" className="text-[14px] font-semibold">
              Rehearse the day: <span className="wos-num">{formatTime(minutesToTime(minutes))}</span>
            </label>
            <input id="rehearse" type="range" min={4 * 60} max={23 * 60} step={5} value={minutes} onChange={(e) => setRehearsal(Number(e.target.value))} className="w-full accent-[var(--wine-600)]" />
            <span className="text-[13px] text-ink-muted">On {formatLongDate(wedding.weddingDate)} this screen follows the real clock.</span>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-end">
          <section aria-label="Now" className="flex flex-col gap-2">
            <div className="wos-day__clock wos-num text-[88px] leading-[88px] md:text-[96px] md:leading-[96px]" aria-live="off">
              {formatTime(minutesToTime(minutes)).replace(/ (AM|PM)$/, "")}<small>{formatTime(minutesToTime(minutes)).slice(-2)}</small>
            </div>
            <span className="wos-overline mt-2"><i className="wos-pulse" aria-hidden="true" />Now</span>
            <h1 className="m-0 font-display text-[36px] leading-[40px] font-medium tracking-[.02em] text-wine-600 uppercase md:text-[40px] md:leading-[44px]">
              {nn.current?.title ?? (nn.phase === "before" ? "Before the day begins" : nn.phase === "after" ? "Married. Rest well." : "A moment to breathe")}
            </h1>
            {nn.current && (
              <span className="text-[14px] leading-5 font-medium text-ink-muted">
                Until {formatTime(minutesToTime(endTime(nn.current)))}{nn.current.location ? ` · ${nn.current.location}` : ""}
              </span>
            )}
          </section>
          <section aria-label="Next" className="wos-day__next">
            <span className="wos-overline">Next</span>
            {nn.next ? (
              <>
                <b>{nn.next.title}</b>
                <span>{formatTime(nn.next.time)}{nn.next.location ? ` · ${nn.next.location}` : ""} · in {timeToMinutes(nn.next.time) - minutes} min</span>
              </>
            ) : (
              <b>Nothing else scheduled</b>
            )}
          </section>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <VendorStatus data={data} />
          <div className="flex flex-col gap-6">
            <Essentials data={data} />
            <EmergencyTasks data={data} />
          </div>
          <CoordinatorNotes data={data} />
          <Upcoming data={data} minutes={minutes} />
        </div>

        <CallBar data={data} />
      </div>
    </div>
  );
}

function defaultRehearsal(data: WeddingData) {
  const poruwa = data.timeline.find((e) => e.scene === "poruwa");
  return poruwa ? timeToMinutes(poruwa.time) + 10 : 10 * 60;
}

function VendorStatus({ data }: { data: WeddingData }) {
  const store = useStore();
  const linked = new Set(data.timeline.flatMap((e) => e.vendorIds));
  const vendors = data.vendors.filter((v) => v.status === "booked" || linked.has(v.id));
  const toneClass: Record<string, string> = { success: "bg-success-50 text-success", warning: "bg-warning-50 text-warning", info: "bg-info-50 text-info", neutral: "bg-surface-sunken text-ink-muted" };
  return (
    <section aria-labelledby="d-vendors" className="flex flex-col gap-3">
      <h2 id="d-vendors" className="wos-overline m-0 !text-ink-muted">Vendors</h2>
      {vendors.length === 0 ? <p className="m-0 text-ink-muted">No booked vendors.</p> : (
        <ul className="wos-list wos-card !p-4">
          {vendors.map((v) => (
            <li key={v.id}>
              <span className="flex flex-1 flex-col">
                <span className="text-[14px] leading-5 font-semibold">{v.name}</span>
                {v.arrivalTime && <span className="text-[12px] text-ink-muted">Expected {formatTime(v.arrivalTime)}{v.phone ? ` · ${v.phone}` : ""}</span>}
              </span>
              <select aria-label={`${v.name} status`} value={v.dayStatus} onChange={(e) => store.upsert("vendors", { ...v, dayStatus: e.target.value as VendorDayStatus })}
                className={cx("h-7 cursor-pointer appearance-none rounded-full border-0 px-3 text-[12px] font-semibold", toneClass[VENDOR_DAY_TONE[v.dayStatus]])}>
                {DAY_STATUSES.map((s) => <option key={s} value={s}>{VENDOR_DAY_LABEL[s]}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Essentials({ data }: { data: WeddingData }) {
  const store = useStore();
  const toast = useToast();
  const gm = guestMetrics(data.guests, data.wedding);
  const dueToday = data.payments.filter((p) => p.status === "scheduled" && p.dueDate <= data.wedding.weddingDate && daysBetween(p.dueDate, data.wedding.weddingDate) <= 1);
  return (
    <section aria-labelledby="d-ess" className="flex flex-col gap-3">
      <h2 id="d-ess" className="wos-overline m-0 !text-ink-muted">Guests and payments</h2>
      <div className="wos-card flex flex-col gap-3 !p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col"><span className="wos-num font-display text-[30px] leading-[34px]">{gm.confirmed}</span><span className="text-[13px] text-ink-muted">confirmed guests</span></div>
          <div className="flex flex-col"><span className="wos-num font-display text-[30px] leading-[34px]">{gm.meals.veg} / {gm.meals.nonVeg}</span><span className="text-[13px] text-ink-muted">veg / non-veg meals</span></div>
        </div>
        {dueToday.length > 0 ? (
          <ul className="wos-list border-t border-line pt-3">
            {dueToday.map((p) => (
              <li key={p.id}>
                <span className="flex flex-1 flex-col">
                  <span className="text-[14px] font-semibold">{data.vendors.find((v) => v.id === p.vendorId)?.name ?? "Payment"}</span>
                  <span className="text-[13px] text-ink-muted">{p.label} · {formatLKR(p.amount)}</span>
                </span>
                <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => { store.upsert("payments", { ...p, status: "paid", paidDate: data.wedding.weddingDate, method: "Cash" }); toast("Payment recorded."); }}>Mark Paid</button>
              </li>
            ))}
          </ul>
        ) : <p className="m-0 border-t border-line pt-3 text-[13px] text-ink-muted">No balances due on the day.</p>}
      </div>
    </section>
  );
}

function EmergencyTasks({ data }: { data: WeddingData }) {
  const store = useStore();
  const tasks = data.tasks.filter((t) => WEDDING_DAY_TASK_CATEGORIES.includes(t.categoryId) && t.categoryId !== "seating" && t.categoryId !== "transport");
  if (tasks.length === 0) return null;
  return (
    <section aria-labelledby="d-tasks" className="flex flex-col gap-3">
      <h2 id="d-tasks" className="wos-overline m-0 !text-ink-muted">Day checklist</h2>
      <ul className="wos-list wos-card !p-4">
        {tasks.map((t) => (
          <li key={t.id}>
            <input id={`d-${t.id}`} type="checkbox" className="wos-check" checked={!isOpen(t)} onChange={(e) => store.upsert("tasks", { ...t, status: e.target.checked ? "completed" : "in_progress", completedAt: e.target.checked ? nowISO() : null })} />
            <label htmlFor={`d-${t.id}`} className={cx("flex-1 cursor-pointer text-[14px] font-semibold", !isOpen(t) && "line-through opacity-60")}>{t.title}</label>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CoordinatorNotes({ data }: { data: WeddingData }) {
  const store = useStore();
  const coordinator = data.people.find((p) => p.role === "coordinator");
  const [body, setBody] = useState("");
  const add = () => {
    const text = body.trim();
    if (!text) return;
    store.updateWedding({ dayNotes: [{ id: newId(), author: coordinator?.name ?? "Coordinator", body: text, at: nowISO() }, ...data.wedding.dayNotes].slice(0, 50) });
    setBody("");
  };
  return (
    <section aria-labelledby="d-notes" className="flex flex-col gap-3">
      <h2 id="d-notes" className="wos-overline m-0 !text-ink-muted">Coordinator notes</h2>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <label htmlFor="note" className="sr-only">Add a note</label>
        <input id="note" className="wos-input flex-1" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Car is 10 minutes late…" />
        <button type="submit" className="wos-btn wos-btn--primary" disabled={!body.trim()} aria-label="Add note"><Send className="wos-icon" aria-hidden="true" /></button>
      </form>
      {data.wedding.dayNotes.length === 0 ? <p className="m-0 text-[14px] text-ink-muted">Notes for the family and team appear here.</p> : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {data.wedding.dayNotes.map((n) => (
            <li key={n.id} className="wos-notice !border !border-line !bg-surface-raised">
              <div className="wos-notice__body">
                <b>{n.author} · {formatTime(new Date(n.at).toTimeString().slice(0, 5))}</b>
                <span>{n.body}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Upcoming({ data, minutes }: { data: WeddingData; minutes: number }) {
  const rest = sortTimeline(data.timeline).filter((e) => endTime(e) > minutes);
  return (
    <section aria-labelledby="d-later" className="flex flex-col gap-3">
      <h2 id="d-later" className="wos-overline m-0 !text-ink-muted">Rest of the day</h2>
      <ol className="wos-list wos-card !p-4">
        {rest.length === 0 ? <li className="text-ink-muted">That&apos;s everything.</li> : rest.map((e) => (
          <li key={e.id}>
            <span className="wos-num w-[76px] text-[13px] font-semibold text-ink-muted">{formatTime(e.time)}</span>
            <span className="flex-1 text-[14px] font-semibold">{e.title}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CallBar({ data }: { data: WeddingData }) {
  const coordinator = data.people.find((p) => p.role === "coordinator");
  if (!coordinator?.phone) {
    return <p className="m-0 text-[13px] text-ink-muted">Add your coordinator&apos;s phone number in Settings to call them from here.</p>;
  }
  return (
    <a href={`tel:${coordinator.phone.replace(/\s+/g, "")}`} className="wos-btn wos-btn--primary wos-btn--lg self-start"><Phone className="wos-icon" aria-hidden="true" />Call {coordinator.name}</a>
  );
}

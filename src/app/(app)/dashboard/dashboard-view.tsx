"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Info, ListChecks, Store, Users, Wallet } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import type { WeddingData } from "@/lib/domain/types";
import { daysBetween, formatDate, formatLongDate, formatTime, dayOfMonth, monthShort, greeting, formatShortDate } from "@/lib/domain/dates";
import { bucketPayments, rollupByCategory, summarizeBudget } from "@/lib/domain/budget";
import { guestMetrics } from "@/lib/domain/guests";
import { taskMetrics, upcomingTasks } from "@/lib/domain/tasks";
import { computeJourney, computeReadiness, currentStage } from "@/lib/domain/readiness";
import { nextActions, type Insight } from "@/lib/domain/insights";
import { budgetCategoryLabel, VENDOR_STATUS_LABEL, VENDOR_STATUS_TONE } from "@/lib/domain/catalog";
import { formatAmount, formatLKR, percent } from "@/lib/domain/money";
import { sortTimeline } from "@/lib/domain/day";
import { Badge, Card, LotusMark, Money, Ring, Stat, cx } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { BudgetBar, CategoryBars } from "@/components/features/budget-bits";
import { GuestDonut } from "@/components/features/guest-donut";
import { JourneyStrip } from "@/components/features/journey";
import { TaskRow } from "@/components/features/task-row";
import { ReadinessBreakdown } from "@/components/features/readiness-breakdown";
import { RecentActivityCard } from "@/components/features/activity-feed";

const toneIcon = { danger: AlertTriangle, warning: Clock, info: Info, success: CheckCircle2 } as const;
const toneGround = { danger: "bg-danger-50 text-danger", warning: "bg-warning-50 text-warning", info: "bg-info-50 text-info", success: "bg-success-50 text-success" } as const;

export function DashboardView() {
  const page = usePage();
  if (!page) return <PageSkeleton />;
  return <Dashboard today={page.today} data={page.data} />;
}

function Dashboard({ today, data }: { today: string; data: WeddingData }) {
  const { wedding } = data;
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const m = useMemo(() => {
    const budget = summarizeBudget(wedding, data.budgetItems, data.payments);
    const guests = guestMetrics(data.guests, wedding);
    const tasks = taskMetrics(data.tasks, today);
    const readiness = computeReadiness(data);
    const journey = computeJourney(data, today);
    const actions = nextActions(data, today);
    const payments = bucketPayments(data.payments, today);
    const categories = rollupByCategory(data.budgetItems, data.payments).sort((a, b) => b.forecast - a.forecast).slice(0, 4);
    const vendorsBooked = data.vendors.filter((v) => v.status === "booked" || v.status === "completed").length;
    const vendorsLive = data.vendors.filter((v) => v.status !== "cancelled").length;
    const quotesWaiting = data.vendors.filter((v) => v.status === "quoted").length;
    return { budget, guests, tasks, readiness, journey, actions, payments, categories, vendorsBooked, vendorsLive, quotesWaiting };
  }, [data, today, wedding]);

  const daysLeft = daysBetween(today, wedding.weddingDate);
  const timeline = sortTimeline(data.timeline);
  const keyMoments = ["poruwa", "reception", "going_away"]
    .map((scene) => timeline.find((e) => e.scene === scene))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  const attention = m.actions.slice(0, 3);
  const upcoming = upcomingTasks(data.tasks, 5);
  const upcomingPayments = [...m.payments.overdue, ...m.payments.thisWeek, ...m.payments.thisMonth, ...m.payments.later].slice(0, 3);
  const stage = currentStage(m.journey);
  const focusVendors = [...data.vendors]
    .filter((v) => v.status !== "cancelled")
    .sort((a, b) => (a.status === "booked" ? 1 : 0) - (b.status === "booked" ? 1 : 0))
    .slice(0, 4);

  const lead =
    attention.length === 0
      ? "Nothing urgent this week. Everything is on track."
      : `${attention.length === 1 ? "One thing needs" : `${["", "", "Two", "Three"][attention.length]} things need`} you this week. Everything else is on track.`;

  const breakdown = Object.fromEntries(m.readiness.components.map((c) => [c.id, c.score]));

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="wos-overline">{formatLongDate(today)}</span>
          <h1 className="m-0 font-display text-[32px] leading-[38px] md:text-[40px] md:leading-[46px] font-medium">
            {greeting()}, {wedding.brideName} &amp; {wedding.groomName}
          </h1>
          <p className="m-0 text-[16px] leading-[26px] text-ink-muted">{lead}</p>
        </div>
      </header>

      {/* Countdown + readiness */}
      <section aria-label="Countdown and readiness" className="wos-hero wos-reveal">
        <div className="wos-hero__main">
          <LotusMark className="wos-hero__lotus" />
          <span className="wos-overline">Your wedding</span>
          <div className="flex flex-wrap items-end gap-4">
            {daysLeft > 0 ? (
              <>
                <span className="wos-num font-display font-light text-[88px] leading-[80px] md:text-[120px] md:leading-[100px] tracking-[-0.02em]">{daysLeft}</span>
                <span className="font-display text-[28px] leading-[32px] md:text-[32px] md:leading-[36px] pb-1.5">{daysLeft === 1 ? "day to go" : "days to go"}</span>
              </>
            ) : daysLeft === 0 ? (
              <span className="font-display text-[56px] leading-[60px]">Today is the day.</span>
            ) : (
              <span className="font-display text-[48px] leading-[54px]">Married {-daysLeft} days ago</span>
            )}
          </div>
          <p className="m-0 text-[16px] leading-[26px] font-medium opacity-85">
            {formatLongDate(wedding.weddingDate)}
            {wedding.venue ? ` · ${wedding.venue}` : ""}
            {wedding.location ? `, ${wedding.location}` : ""}
          </p>
          {keyMoments.length > 0 && (
            <ul className="m-0 mt-2 flex list-none flex-wrap gap-[10px] p-0">
              {keyMoments.map((e) => (
                <li key={e.id} className="wos-hero__chip">
                  <span className="wos-overline">{e.scene === "going_away" ? "Going-away" : e.scene === "poruwa" ? "Poruwa" : "Reception"}</span>
                  <span className="wos-num text-[15px] leading-[22px] font-semibold">{formatTime(e.time)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="wos-hero__side">
          <button type="button" onClick={() => setBreakdownOpen(true)} className="cursor-pointer rounded-full border-0 bg-transparent p-0 text-inherit" aria-label={`Wedding readiness ${m.readiness.overall} percent. Show how it's calculated`}>
            <Ring value={m.readiness.overall} size={144} />
          </button>
          <div className="flex min-w-[160px] flex-1 flex-col gap-3">
            {[
              { label: "Budget committed", v: breakdown.budget },
              { label: "Tasks done", v: m.tasks.completionPct },
              { label: "Guests replied", v: m.guests.rsvpCompletion },
              { label: "Vendors booked", v: breakdown.vendors },
            ].map((row) => (
              <div key={row.label} className="flex flex-col gap-1">
                <div className="flex justify-between text-[13px] leading-[18px] font-semibold">
                  <span>{row.label}</span>
                  <span className="wos-num">{row.v}%</span>
                </div>
                <div className="wos-hero__bar"><i style={{ width: `${row.v}%` }} /></div>
              </div>
            ))}
            <button type="button" className="self-start cursor-pointer border-0 bg-transparent p-0 text-[13px] leading-[18px] font-semibold text-inherit underline underline-offset-4 opacity-85" onClick={() => setBreakdownOpen(true)}>
              How readiness is calculated
            </button>
          </div>
        </div>
      </section>
      <ReadinessBreakdown readiness={m.readiness} open={breakdownOpen} onClose={() => setBreakdownOpen(false)} />

      {/* Key numbers */}
      <section aria-label="Key numbers" className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <KeyCard href="/budget" overline="Committed" icon={Wallet} iconClass="bg-wine-50 text-wine-600"
          value={<span className="font-display text-[30px] leading-[34px] font-medium text-wine-600"><small className="mr-1.5 font-sans text-[12px] font-semibold text-ink-muted">LKR</small>{formatAmount(m.budget.committed)}</span>}
          detail={`${m.budget.committedPct}% of ${formatLKR(m.budget.original)}`} />
        <KeyCard href="/guests" overline="Guests confirmed" icon={Users} iconClass="bg-info-50 text-info"
          value={<span className="wos-num font-display text-[30px] leading-[34px] font-medium">{m.guests.confirmed} <small className="font-sans text-[13px] font-semibold text-ink-muted">of {m.guests.total}</small></span>}
          detail={<span className="text-success font-semibold">Expect about {m.guests.expectedAttendance}</span>} />
        <KeyCard href="/vendors" overline="Vendors booked" icon={Store} iconClass="bg-champagne-100 text-champagne-700"
          value={<span className="wos-num font-display text-[30px] leading-[34px] font-medium">{m.vendorsBooked} <small className="font-sans text-[13px] font-semibold text-ink-muted">of {m.vendorsLive}</small></span>}
          detail={m.quotesWaiting ? `${m.quotesWaiting} quotes waiting for you` : "No quotes waiting"} />
        <KeyCard href="/tasks" overline="Tasks done" icon={ListChecks} iconClass="bg-sage-50 text-sage-600"
          value={<span className="wos-num font-display text-[30px] leading-[34px] font-medium">{m.tasks.completed} <small className="font-sans text-[13px] font-semibold text-ink-muted">of {m.tasks.total}</small></span>}
          detail={m.tasks.overdue ? <span className="text-danger font-semibold">{m.tasks.overdue} overdue</span> : "Nothing overdue"} />
      </section>

      {/* Needs your attention */}
      <section className="wos-card" aria-labelledby="h-attn" style={{ padding: "8px 24px" }}>
        <div className="flex items-center justify-between pt-4 pb-2">
          <h2 className="wos-card__title" id="h-attn">
            Needs your attention
            {attention.length > 0 && <Badge tone="wine" plain className="ml-2 align-[2px]">{attention.length}</Badge>}
          </h2>
        </div>
        {attention.length === 0 ? (
          <p className="m-0 pb-5 text-ink-muted">You&apos;re all caught up. The next milestone is {stage.label.toLowerCase()}.</p>
        ) : (
          <ul className="wos-list">
            {attention.map((a) => (
              <AttentionRow key={a.id} insight={a} />
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-6">
          <Card title="Wedding Investment" action={<Link className="wos-link" href="/budget">Open Investment</Link>} className="!p-7 max-sm:!p-5 !gap-5">
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
              <Stat overline="Committed" keyFigure value={<Money value={m.budget.committed} animated size="sm" />} />
              <Stat overline="Paid" value={<Money value={m.budget.paid} animated size="sm" />} />
              <Stat
                overline="Projected"
                value={<Money value={m.budget.forecast} animated size="sm" />}
                delta={m.budget.variance > 0 ? `${formatLKR(m.budget.variance)} over plan` : `${formatLKR(-m.budget.variance)} under plan`}
                deltaTone={m.budget.variance > 0 ? "up" : "ok"}
              />
            </div>
            <BudgetBar summary={m.budget} />
            {m.categories.length > 0 && (
              <div className="flex flex-col gap-[14px] border-t border-line pt-5">
                <span className="wos-overline !text-ink-muted">Largest categories, projected against plan</span>
                <CategoryBars rows={m.categories} />
              </div>
            )}
          </Card>

          <Card title="Upcoming tasks" action={<Link className="wos-link" href="/tasks">All tasks</Link>} className="!p-7 max-sm:!p-5" id="dash-tasks">
            {upcoming.length === 0 ? (
              <p className="m-0 text-ink-muted">Every task is done. Beautiful work.</p>
            ) : (
              <ul className="wos-list">
                {upcoming.map((t) => (
                  <TaskRow key={t.id} task={t} today={today} />
                ))}
              </ul>
            )}
            <Link href="/tasks?new=1" className="wos-btn wos-btn--ghost wos-btn--sm self-start">Add Task</Link>
          </Card>
        </div>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-6">
          <RecentActivityCard wedding={data.wedding} />

          <Card title="Guests" action={<Link className="wos-link" href="/guests">Guest list</Link>} className="!gap-5">
            {m.guests.total === 0 ? (
              <p className="m-0 text-ink-muted">No guests yet. <Link className="wos-link" href="/guests?new=1">Add your first guest</Link></p>
            ) : (
              <>
                <GuestDonut m={m.guests} />
                <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
                  <div className="flex flex-col"><span className="wos-overline !text-ink-muted">Meals</span><span className="text-[14px] leading-5 font-semibold">{m.guests.meals.veg} veg · {m.guests.meals.nonVeg} non-veg</span></div>
                  <div className="flex flex-col"><span className="wos-overline !text-ink-muted">Expected</span><span className="text-[14px] leading-5 font-semibold">About {m.guests.expectedAttendance} people</span></div>
                </div>
              </>
            )}
          </Card>

          <Card title="Upcoming payments" action={<Link className="wos-link" href="/budget?tab=payments">Schedule</Link>}>
            {upcomingPayments.length === 0 ? (
              <p className="m-0 text-ink-muted">No payments scheduled.</p>
            ) : (
              <ol className="m-0 flex list-none flex-col p-0">
                {upcomingPayments.map((p, i) => {
                  const d = daysBetween(today, p.dueDate);
                  const urgent = d <= 7;
                  const vendor = data.vendors.find((v) => v.id === p.vendorId);
                  return (
                    <li key={p.id} className={cx("grid grid-cols-[48px_1fr] gap-3", i > 0 && "border-t border-line pt-4", i < upcomingPayments.length - 1 && "pb-4")}>
                      <div className={cx("flex flex-col items-center rounded-xl py-1.5", d < 0 ? "bg-danger-50 text-danger" : urgent ? "bg-warning-50 text-warning" : "bg-surface-sunken")}>
                        <b className="wos-num text-[18px] leading-5 font-semibold">{String(dayOfMonth(p.dueDate)).padStart(2, "0")}</b>
                        <span className="text-[10px] leading-[14px] font-bold tracking-[.1em] uppercase">{monthShort(p.dueDate)}</span>
                      </div>
                      <div className="flex flex-col">
                        <b className="text-[14px] leading-5 font-semibold">{vendor?.name ?? "Payment"}</b>
                        <span className="text-[13px] leading-[18px] font-medium text-ink-muted">{p.label}</span>
                        <span className="wos-num mt-0.5 text-[14px] leading-5 font-semibold">
                          {formatLKR(p.amount)}{" "}
                          {d < 0 ? <Badge tone="danger" className="ml-1.5">{-d} days overdue</Badge> : urgent ? <Badge tone="warning" className="ml-1.5">{d === 0 ? "Today" : `In ${d} days`}</Badge> : null}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          <Card title="Vendors" action={<span className="text-[13px] leading-[18px] font-medium text-ink-muted">{m.vendorsBooked} of {m.vendorsLive} booked</span>} className="!gap-3">
            {focusVendors.length === 0 ? (
              <p className="m-0 text-ink-muted">No vendors added yet.</p>
            ) : (
              <ul className="wos-list">
                {focusVendors.map((v) => (
                  <li key={v.id}>
                    <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-champagne-100 text-champagne-700"><Store className="wos-icon" aria-hidden="true" /></span>
                    <Link href={`/vendors?vendor=${v.id}`} className="flex flex-1 flex-col text-ink no-underline">
                      <b className="text-[14px] leading-5 font-semibold">{v.name}</b>
                      <span className="text-[13px] leading-[18px] font-medium text-ink-muted">{budgetCategoryLabel(v.categoryId)}{v.location ? ` · ${v.location}` : ""}</span>
                    </Link>
                    <Badge tone={VENDOR_STATUS_TONE[v.status]}>{VENDOR_STATUS_LABEL[v.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <Link className="wos-btn wos-btn--secondary wos-btn--sm self-start" href={data.vendors.length ? "/vendors?tab=compare" : "/vendors?new=1"}>
              {data.vendors.length ? "Compare Quotes" : "Add Vendor"}
            </Link>
          </Card>

          <section className="wos-card flex flex-col gap-2 !bg-champagne-100 !border-champagne-300" aria-labelledby="h-mile">
            <span className="wos-overline">Next milestone</span>
            <h2 id="h-mile" className="wos-h2">{stage.label}</h2>
            <p className="m-0 text-[13px] leading-[18px] font-medium text-ink-muted">
              {stage.total > 0 ? `${stage.done} of ${stage.total} tasks done` : "No tasks yet"}
              {stage.nextDue ? ` · next due ${formatShortDate(stage.nextDue)}` : ""}
            </p>
            {stage.total > 0 && (
              <div className="wos-progress__track mt-2" style={{ background: "var(--surface-raised)" }} role="progressbar" aria-valuenow={percent(stage.done, stage.total)} aria-valuemin={0} aria-valuemax={100} aria-label={`${stage.label} progress`}>
                <div className="wos-progress__fill" style={{ width: `${percent(stage.done, stage.total)}%` }} />
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="wos-card flex flex-col gap-5 !p-7 max-sm:!p-5" aria-labelledby="h-journey">
        <div className="wos-card__head" style={{ margin: 0 }}>
          <div className="flex flex-col gap-0.5">
            <span className="wos-overline">Stage {stage.number} of {m.journey.length}</span>
            <h2 id="h-journey" className="wos-h2">Your journey to {formatDate(wedding.weddingDate).replace(/ \d{4}$/, "")}</h2>
          </div>
          <Link className="wos-link" href="/timeline">Full timeline</Link>
        </div>
        <JourneyStrip stages={m.journey} weddingDate={wedding.weddingDate} />
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/simulator" className="wos-btn wos-btn--secondary"><CalendarClock className="wos-icon" aria-hidden="true" />Experience Your Wedding</Link>
      </div>
    </>
  );
}

function KeyCard({ href, overline, icon: Icon, iconClass, value, detail }: { href: string; overline: string; icon: typeof Wallet; iconClass: string; value: React.ReactNode; detail: React.ReactNode }) {
  return (
    <Link href={href} className="wos-card wos-card--interactive flex flex-col gap-[10px] !p-5 text-ink no-underline">
      <div className="flex items-center justify-between">
        <span className="wos-overline !text-ink-muted">{overline}</span>
        <span className={cx("grid size-8 place-items-center rounded-[10px]", iconClass)}><Icon className="wos-icon" aria-hidden="true" /></span>
      </div>
      {value}
      <span className="text-[13px] leading-[18px] font-medium text-ink-muted">{detail}</span>
    </Link>
  );
}

function AttentionRow({ insight }: { insight: Insight }) {
  const Icon = toneIcon[insight.tone];
  return (
    <li className="flex-wrap !gap-4" style={{ padding: "16px 0" }}>
      <span className={cx("grid size-10 flex-none place-items-center rounded-full", toneGround[insight.tone])}><Icon className="wos-icon" aria-hidden="true" /></span>
      <div className="flex flex-[1_1_240px] flex-col">
        <b className="text-[15px] leading-[22px] font-semibold">{insight.title}</b>
        <span className="text-[14px] leading-5 text-ink-muted">{insight.detail}</span>
      </div>
      {insight.action && (
        <Link href={insight.action.href} className={cx("wos-btn wos-btn--sm", insight.tone === "warning" || insight.tone === "danger" ? "wos-btn--primary" : "wos-btn--secondary")}>
          {insight.action.label}
        </Link>
      )}
    </li>
  );
}

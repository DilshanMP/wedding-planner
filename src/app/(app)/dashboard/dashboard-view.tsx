"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Info } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import type { WeddingData } from "@/lib/domain/types";
import { daysBetween, formatDate, dayOfMonth, monthShort, formatShortDate } from "@/lib/domain/dates";
import { bucketPayments, rollupByCategory, summarizeBudget } from "@/lib/domain/budget";
import { guestMetrics } from "@/lib/domain/guests";
import { taskMetrics, upcomingTasks } from "@/lib/domain/tasks";
import { computeJourney, computeReadiness, currentStage } from "@/lib/domain/readiness";
import { nextActions, type Insight } from "@/lib/domain/insights";
import { formatLKR, percent } from "@/lib/domain/money";
import { sortTimeline } from "@/lib/domain/day";
import { InstallBanner } from "@/components/shell/install-app";
import { Badge, Card, cx } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { GuestDonut } from "@/components/features/guest-donut";
import { JourneyStrip } from "@/components/features/journey";
import { TaskRow } from "@/components/features/task-row";
import { ReadinessBreakdown } from "@/components/features/readiness-breakdown";
import { RecentActivityCard } from "@/components/features/activity-feed";
import { PhotoHero, PlanTiles } from "@/components/features/home-bits";

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

  const lead =
    attention.length === 0
      ? "Nothing urgent this week. Everything is on track."
      : `${attention.length === 1 ? "One thing needs" : `${["", "", "Two", "Three"][attention.length]} things need`} you this week. Everything else is on track.`;

  return (
    <>
      <InstallBanner />
      <PhotoHero data={data} today={today} daysLeft={daysLeft} keyMoments={keyMoments} lead={lead} readiness={m.readiness.overall} onReadiness={() => setBreakdownOpen(true)} />
      <ReadinessBreakdown readiness={m.readiness} open={breakdownOpen} onClose={() => setBreakdownOpen(false)} />

      {/* Next steps */}
      <section className="wos-card" aria-labelledby="h-attn" style={{ padding: "8px 24px" }}>
        <div className="flex items-center justify-between pt-4 pb-2">
          <h2 className="wos-card__title" id="h-attn">
            Your next steps
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

      <Link href="/guide" className="guide-banner">
        <span className="guide-banner-icon" aria-hidden="true">🧭</span>
        <span className="min-w-0 flex-1">
          <b>Not sure what to do next? Open the user guide</b>
          <span>Step by step, with screenshots — colours, hotel, payments, guests, tables, invitations. Also in සිංහල.</span>
        </span>
        <span className="wos-link">Open guide →</span>
      </Link>
      <PlanTiles data={data} m={m} />

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-6">
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

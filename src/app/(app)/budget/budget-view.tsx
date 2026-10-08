"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Info, Plus, TrendingUp } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useQueryState } from "@/lib/hooks/use-query-state";
import { useStore } from "@/lib/store/provider";
import { bucketPayments, effectiveStatus, expectedCost, paidForItem, paymentDueTone, rollupByCategory, summarizeBudget } from "@/lib/domain/budget";
import { BUDGET_STATUS_LABEL, BUDGET_STATUS_TONE, budgetCategoryLabel } from "@/lib/domain/catalog";
import { budgetInsights } from "@/lib/domain/insights";
import { daysBetween, formatDate, relativeDue } from "@/lib/domain/dates";
import { formatAmount, formatLKR, formatLKRExact, roundEstimate } from "@/lib/domain/money";
import type { BudgetCategoryId, Payment, WeddingData } from "@/lib/domain/types";
import { downloadCSV } from "@/lib/export";
import { Badge, Card, EmptyState, Money, Notice, PageHeader, Stat, cx } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { BudgetBar, CategoryBars } from "@/components/features/budget-bits";
import { BudgetItemForm, PaymentForm } from "@/components/features/money-forms";
import { MoneyField } from "@/components/ui/fields";

type Tab = "overview" | "categories" | "payments" | "planner";

export function BudgetView() {
  const page = usePage();
  const q = useQueryState();
  if (!page) return <PageSkeleton />;
  const { data, today } = page;
  const tab = (q.get("tab") as Tab) ?? "overview";
  const summary = summarizeBudget(data.wedding, data.budgetItems, data.payments);
  const buckets = bucketPayments(data.payments, today);

  const exportCSV = () =>
    downloadCSV("wedding-budget.csv", [
      ["Category", "Item", "Vendor", "Planned (LKR)", "Quoted (LKR)", "Final (LKR)", "Paid (LKR)", "Remaining (LKR)", "Status"],
      ...data.budgetItems.map((i) => {
        const paid = paidForItem(i, data.payments);
        return [budgetCategoryLabel(i.categoryId), i.name, data.vendors.find((v) => v.id === i.vendorId)?.name ?? "", i.planned, i.quoted, i.final, paid, Math.max(0, expectedCost(i) - paid), BUDGET_STATUS_LABEL[effectiveStatus(i, data.payments)]];
      }),
      [],
      ["Original budget", "", "", summary.original],
      ["Forecast", "", "", summary.forecast],
      ["Committed", "", "", summary.committed],
      ["Paid", "", "", summary.paid],
    ]);

  const dueCount = buckets.overdue.length + buckets.thisWeek.length;
  return (
    <>
      <PageHeader
        overline="Budget"
        title="Wedding Investment"
        actions={
          <>
            <button type="button" className="wos-btn wos-btn--secondary" onClick={exportCSV}><Download className="wos-icon" aria-hidden="true" />Export</button>
            <button type="button" className="wos-btn wos-btn--primary" onClick={() => q.set({ tab: "payments", newPayment: "1" })}>Record Payment</button>
          </>
        }
      />
      <div className="wos-tabs" role="tablist" aria-label="Investment views">
        {([
          ["overview", "Overview", null],
          ["categories", "Categories", data.budgetItems.length],
          ["payments", "Payments", dueCount || null],
          ["planner", "Planner vs self-plan", null],
        ] as [Tab, string, number | null][]).map(([id, label, count]) => (
          <button key={id} type="button" role="tab" className="wos-tab" aria-selected={tab === id} onClick={() => q.set({ tab: id === "overview" ? null : id })}>
            {label}{count ? <span>{count}</span> : null}
          </button>
        ))}
        <Link href="/vendors?tab=compare" className="wos-tab">Quotes <span>{data.quotes.length}</span></Link>
      </div>

      <section className="wos-card wos-card--hero flex flex-col gap-6 max-sm:!p-5" aria-label="Investment summary">
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
          <Stat overline="Original plan" value={<Money value={summary.original} />} label={`${formatLKR(summary.unallocated)} not yet allocated`.replace("LKR 0 not yet allocated", "Fully allocated")} />
          <Stat overline="Committed" keyFigure value={<Money value={summary.committed} animated />} label={`${summary.committedPct}% of plan`} />
          <Stat overline="Paid" value={<Money value={summary.paid} animated />} label={`${formatLKR(summary.committed - summary.paid)} still to pay`} />
          <Stat overline="Projected" value={<Money value={summary.forecast} animated />}
            delta={summary.variance > 0 ? `${formatLKR(summary.variance)} over plan` : summary.variance < 0 ? `${formatLKR(-summary.variance)} under plan` : "Exactly on plan"}
            deltaTone={summary.variance > 0 ? "up" : "ok"} />
        </div>
        <BudgetBar summary={summary} detailed />
        <p className="m-0 text-[13px] leading-[18px] text-ink-muted">
          Projected uses the final amount where agreed, else the quote, else your plan. Committed counts booked lines only. Remaining is your original plan minus what&apos;s committed.
        </p>
      </section>

      {tab === "overview" && <Overview data={data} onCategory={() => q.set({ tab: "categories" })} />}
      {tab === "categories" && <Categories data={data} />}
      {tab === "payments" && <Payments data={data} today={today} />}
      {tab === "planner" && <PlannerComparison data={data} />}
    </>
  );
}

function Overview({ data, onCategory }: { data: WeddingData; onCategory: () => void }) {
  const rows = rollupByCategory(data.budgetItems, data.payments).sort((a, b) => b.forecast - a.forecast);
  const insights = budgetInsights(data);
  const icon = { danger: AlertTriangle, warning: TrendingUp, info: Info, success: CheckCircle2 };
  return (
    <div className="flex flex-wrap items-start gap-6">
      <Card
        title="By category"
        className="min-w-0 flex-[3_1_520px]"
        action={<span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted"><span className="h-3.5 w-0.5 rounded-[1px] bg-ink" aria-hidden="true" />Plan</span>}
      >
        {rows.length === 0 ? (
          <EmptyState title="No budget lines yet." action={<button type="button" className="wos-btn wos-btn--primary" onClick={onCategory}>Add Expense</button>}>Add the first line to see where your money goes.</EmptyState>
        ) : (
          <>
            <div className="hidden grid-cols-[180px_1fr_150px] gap-4 text-[11px] leading-4 font-bold tracking-[.1em] text-ink-muted uppercase sm:grid">
              <span>Category</span><span>Projected against plan</span><span className="text-right">Projected</span>
            </div>
            <CategoryBars rows={rows} labelWidth={180} />
            <p className="m-0 mt-2 text-[13px] leading-[18px] font-medium text-ink-muted">Figures in LKR. Over plan is marked in words as well as colour.</p>
          </>
        )}
      </Card>
      <section aria-labelledby="h-intel" className="flex min-w-0 flex-[2_1_320px] flex-col gap-3">
        <h2 id="h-intel" className="wos-card__title">Budget intelligence</h2>
        {insights.length === 0 ? (
          <Notice tone="success" icon={<CheckCircle2 className="wos-icon" />} title="Everything is within plan.">Spend intentionally on what matters most to you.</Notice>
        ) : (
          insights.slice(0, 6).map((i) => {
            const Icon = icon[i.tone];
            return (
              <Notice key={i.id} tone={i.tone} icon={<Icon className="wos-icon" />} title={i.title} role={i.tone === "danger" ? "status" : undefined}
                action={i.action && <Link className={cx("wos-btn wos-btn--sm", i.tone === "info" ? "wos-btn--ghost" : "wos-btn--secondary")} href={i.action.href}>{i.action.label}</Link>}>
                {i.detail}
              </Notice>
            );
          })
        )}
        <p className="m-0 text-[13px] leading-[18px] text-ink-muted">The goal is intentional spending, not spending less: save where it doesn&apos;t reduce the guest experience.</p>
      </section>
    </div>
  );
}

function Categories({ data }: { data: WeddingData }) {
  const q = useQueryState();
  const editing = data.budgetItems.find((i) => i.id === q.get("item"));
  const creating = q.get("newItem") === "1";
  const rows = rollupByCategory(data.budgetItems, data.payments);
  const cancelled = data.budgetItems.filter((i) => i.status === "cancelled");
  return (
    <>
      <div className="flex justify-end">
        <button type="button" className="wos-btn wos-btn--primary" onClick={() => q.set({ newItem: "1" })}><Plus className="wos-icon" aria-hidden="true" />Add Expense</button>
      </div>
      {rows.map((r) => {
        const items = data.budgetItems.filter((i) => i.categoryId === r.categoryId && i.status !== "cancelled");
        return (
          <section key={r.categoryId} className="wos-card overflow-hidden !p-0" aria-labelledby={`cat-${r.categoryId}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 pt-5 pb-4">
              <h2 id={`cat-${r.categoryId}`} className="wos-card__title">{r.label}</h2>
              <span className="text-[13px] font-medium text-ink-muted">Plan {formatLKR(r.planned)} · projected {formatLKR(r.forecast)} {r.state !== "within" && <b className={r.state === "over" ? "text-danger" : "text-warning"}>+{r.variancePct}%</b>}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="wos-table">
                <thead>
                  <tr><th>Item</th><th className="num">Planned</th><th className="num">Quoted</th><th className="num">Final</th><th className="num">Paid</th><th className="num">Remaining</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody>
                  {items.map((i) => {
                    const paid = paidForItem(i, data.payments);
                    const status = effectiveStatus(i, data.payments);
                    const vendor = data.vendors.find((v) => v.id === i.vendorId);
                    return (
                      <tr key={i.id}>
                        <td className="wrap"><strong>{i.name}</strong>{vendor && <em>{vendor.name}</em>}</td>
                        <td className="num">{formatAmount(i.planned)}</td>
                        <td className="num">{i.quoted === null ? "—" : formatAmount(i.quoted)}</td>
                        <td className="num">{i.final === null ? "—" : formatAmount(i.final)}</td>
                        <td className="num">{formatAmount(paid)}</td>
                        <td className="num">{formatAmount(Math.max(0, expectedCost(i) - paid))}</td>
                        <td><Badge tone={BUDGET_STATUS_TONE[status]}>{BUDGET_STATUS_LABEL[status]}</Badge></td>
                        <td><button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => q.set({ item: i.id })} aria-label={`Edit ${i.name}`}>Edit</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      {cancelled.length > 0 && (
        <p className="m-0 text-[13px] text-ink-muted">
          {cancelled.length} cancelled {cancelled.length === 1 ? "line is" : "lines are"} excluded from the forecast:{" "}
          {cancelled.map((c, idx) => (
            <span key={c.id}>{idx > 0 && ", "}<button type="button" className="wos-link border-0 bg-transparent p-0 cursor-pointer" onClick={() => q.set({ item: c.id })}>{c.name}</button></span>
          ))}
        </p>
      )}
      <BudgetItemForm open={creating || Boolean(editing)} item={editing} onClose={() => q.set({ item: null, newItem: null })} defaultCategory={(q.get("category") as BudgetCategoryId) ?? undefined} />
    </>
  );
}

function Payments({ data, today }: { data: WeddingData; today: string }) {
  const q = useQueryState();
  const filter = (q.get("show") as "upcoming" | "paid" | "all") ?? "upcoming";
  const payId = q.get("pay");
  const editId = q.get("payment");
  const creating = q.get("newPayment") === "1";
  const b = bucketPayments(data.payments, today);
  const total = (ps: Payment[]) => ps.reduce((s, p) => s + p.amount, 0);
  const list = filter === "paid" ? [...b.paid].reverse() : filter === "all" ? [...data.payments].sort((x, y) => x.dueDate.localeCompare(y.dueDate)) : [...b.overdue, ...b.thisWeek, ...b.thisMonth, ...b.later];
  const vendorName = (id: string | null) => data.vendors.find((v) => v.id === id)?.name ?? "No vendor";
  const itemFor = (p: Payment) => data.budgetItems.find((i) => i.id === p.budgetItemId);
  const paying = data.payments.find((p) => p.id === payId);
  const editing = data.payments.find((p) => p.id === editId);

  return (
    <>
      <section aria-label="Payments due" className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        {([
          ["Overdue", b.overdue, "danger"],
          ["Due this week", b.thisWeek, "warning"],
          ["Due this month", b.thisMonth, "neutral"],
          ["Paid so far", b.paid, "success"],
        ] as const).map(([label, ps, tone]) => (
          <div key={label} className="wos-card flex flex-col gap-1 !p-5">
            <span className={cx("wos-overline", tone === "danger" && ps.length ? "!text-danger" : tone === "warning" && ps.length ? "!text-warning" : "!text-ink-muted")}>{label}</span>
            <span className="wos-num font-display text-[28px] leading-[32px] font-medium"><small className="mr-1 font-sans text-[12px] font-semibold text-ink-muted">LKR</small>{formatAmount(total(ps))}</span>
            <span className="text-[13px] text-ink-muted">{ps.length} {ps.length === 1 ? "payment" : "payments"}</span>
          </div>
        ))}
      </section>

      <section aria-labelledby="h-pay" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="h-pay" className="wos-card__title">Payment schedule</h2>
          <div className="flex flex-wrap gap-3">
            <div className="wos-tabs" role="tablist" aria-label="Filter payments">
              {(["upcoming", "paid", "all"] as const).map((f) => (
                <button key={f} type="button" role="tab" className="wos-tab" aria-selected={filter === f} onClick={() => q.set({ show: f === "upcoming" ? null : f })}>{f[0].toUpperCase() + f.slice(1)}</button>
              ))}
            </div>
            <button type="button" className="wos-btn wos-btn--secondary" onClick={() => q.set({ newPayment: "1" })}><Plus className="wos-icon" aria-hidden="true" />Add Payment</button>
          </div>
        </div>
        {list.length === 0 ? (
          <EmptyState title={filter === "paid" ? "No payments recorded yet." : "No payments scheduled."} action={<button type="button" className="wos-btn wos-btn--primary" onClick={() => q.set({ newPayment: "1" })}>Add Payment</button>}>
            Schedule deposits and balances so nothing slips past its due date.
          </EmptyState>
        ) : (
          <div className="wos-table-wrap">
            <table className="wos-table">
              <thead><tr><th>Vendor</th><th>Category</th><th>Due</th><th className="num">Amount</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {list.map((p) => {
                  const tone = paymentDueTone(p, today);
                  const item = itemFor(p);
                  const d = daysBetween(today, p.dueDate);
                  return (
                    <tr key={p.id}>
                      <td className="wrap"><strong>{vendorName(p.vendorId)}</strong><em>{p.label}</em></td>
                      <td>{item ? budgetCategoryLabel(item.categoryId) : "—"}</td>
                      <td>{formatDate(p.status === "paid" && p.paidDate ? p.paidDate : p.dueDate)}</td>
                      <td className="num">{p.status === "paid" ? formatLKRExact(p.amount) : formatLKR(p.amount)}</td>
                      <td>
                        {p.status === "paid" ? <Badge tone="success">Paid</Badge>
                          : <Badge tone={tone === "neutral" ? "neutral" : tone}>{d < 0 || d <= 7 ? (d === 0 ? "Due today" : relativeDue(p.dueDate, today).replace(/^In/, "Due in")) : "Scheduled"}</Badge>}
                      </td>
                      <td className="whitespace-nowrap">
                        {p.status === "scheduled" && <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => q.set({ pay: p.id })}>Pay</button>}
                        <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => q.set({ payment: p.id })} aria-label={`Edit ${p.label}`}>Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PaymentForm open={creating || Boolean(editing)} payment={editing} today={today} onClose={() => q.set({ payment: null, newPayment: null })} />
      <PaymentForm open={Boolean(paying)} payment={paying} markPaid today={today} onClose={() => q.set({ pay: null })} />
    </>
  );
}

function PlannerComparison({ data }: { data: WeddingData }) {
  const store = useStore();
  const [editing, setEditing] = useState<BudgetCategoryId | null>(null);
  const rows = rollupByCategory(data.budgetItems, data.payments).filter((r) => r.categoryId !== "emergency" && r.categoryId !== "miscellaneous");
  const quotes = data.wedding.plannerQuotes;
  const compared = rows.filter((r) => quotes[r.categoryId] !== undefined);
  const mine = compared.reduce((s, r) => s + r.forecast, 0);
  const planner = compared.reduce((s, r) => s + (quotes[r.categoryId] ?? 0), 0);
  const diff = planner - mine;

  const setQuote = (id: BudgetCategoryId, v: number | null) => {
    const next = { ...quotes };
    if (v === null) delete next[id];
    else next[id] = v;
    store.updateWedding({ plannerQuotes: next });
  };

  return (
    <>
      <Notice tone="info" icon={<Info className="wos-icon" />} title="Self-planning isn't automatically better.">
        A planner&apos;s price often includes coordination, vendor relationships and your time on the day. Compare the difference against the stress it removes, then decide category by category.
      </Notice>
      {compared.length > 0 && (
        <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]" aria-label="Comparison totals">
          <div className="wos-card !p-5"><Stat overline="My plan (compared lines)" value={<Money value={mine} size="xs" />} /></div>
          <div className="wos-card !p-5"><Stat overline="Planner quotation" value={<Money value={planner} size="xs" />} /></div>
          <div className="wos-card !p-5"><Stat overline={diff >= 0 ? "Potential saving self-planning" : "Planner is cheaper by"} keyFigure value={<Money value={roundEstimate(Math.abs(diff))} size="xs" />} label="Rounded to the nearest LKR 5,000" /></div>
        </section>
      )}
      <div className="wos-table-wrap">
        <table className="wos-table">
          <thead><tr><th>Category</th><th className="num">My estimate</th><th className="num">Planner quotation</th><th className="num">Difference</th><th>Reading</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const pq = quotes[r.categoryId];
              const d = pq === undefined ? null : pq - r.forecast;
              const pct = d !== null && r.forecast > 0 ? Math.round((d / r.forecast) * 100) : null;
              return (
                <tr key={r.categoryId}>
                  <td><strong>{r.label}</strong></td>
                  <td className="num">{formatAmount(r.forecast)}</td>
                  <td className="num">
                    {editing === r.categoryId ? (
                      <div className="ml-auto w-[200px]">
                        <MoneyField label={`Planner quote for ${r.label}`} value={pq ?? null} onChange={(v) => setQuote(r.categoryId, v)} className="[&>label]:sr-only !min-w-0" />
                        <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm mt-1" onClick={() => setEditing(null)}>Done</button>
                      </div>
                    ) : (
                      <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => setEditing(r.categoryId)} aria-label={`${pq === undefined ? "Add" : "Edit"} planner quote for ${r.label}`}>
                        {pq === undefined ? "Add quote" : formatAmount(pq)}
                      </button>
                    )}
                  </td>
                  <td className="num">{d === null ? "—" : `${d > 0 ? "+" : d < 0 ? "−" : ""}${formatAmount(Math.abs(d))}`}</td>
                  <td className="wrap">
                    {d === null ? <em>No quotation</em>
                      : pct !== null && pct > 20 ? <Badge tone="warning">Self-plan saves {pct}%</Badge>
                      : d > 0 ? <Badge tone="info">Close — weigh convenience</Badge>
                      : <Badge tone="success">Planner is better value</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

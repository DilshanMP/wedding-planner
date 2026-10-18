"use client";

import { useState } from "react";
import { CheckCircle2, CircleDashed, Clock3, Plus, UserRound } from "lucide-react";
import { bills, moneyTotals, nextPaymentLabel, payerSuggestions, payerSummary, NOT_RECORDED, type Bill } from "@/lib/domain/payment-tracker";
import { formatDate, relativeDue } from "@/lib/domain/dates";
import { formatAmount, formatLKR } from "@/lib/domain/money";
import { newId, nowISO } from "@/lib/domain/ids";
import type { BudgetCategoryId, BudgetItem, Payment, WeddingData } from "@/lib/domain/types";
import { BUDGET_CATEGORIES, budgetCategoryLabel } from "@/lib/domain/catalog";
import { useStore, useWeddingData } from "@/lib/store/provider";
import { celebrate } from "@/lib/confetti";
import { Dialog } from "@/components/ui/dialog";
import { ChoiceChips, MoneyField, MoneySlider, SelectField, TextField } from "@/components/ui/fields";
import { Badge, cx } from "@/components/ui/primitives";
import { useToast } from "@/components/shell/toast";

/* ------------------------------------------------------------------ */
/* Who paid                                                            */
/* ------------------------------------------------------------------ */

export function PaidByField({ value, onChange, label = "Who paid?" }: { value: string; onChange: (v: string) => void; label?: string }) {
  const data = useWeddingData();
  const names = payerSuggestions(data.wedding, data.payments);
  const custom = value && !names.includes(value);
  const [typing, setTyping] = useState(Boolean(custom));
  return (
    <div className="wos-field full" role="group" aria-label={label}>
      <span className="text-[14px] leading-5 font-semibold">{label}</span>
      <div className="wos-chips">
        {names.map((n) => (
          <button key={n} type="button" className="wos-chip" aria-pressed={value === n} onClick={() => { setTyping(false); onChange(value === n ? "" : n); }}>
            <UserRound className="size-3.5" aria-hidden="true" />{n}
          </button>
        ))}
        <button type="button" className="wos-chip" aria-pressed={typing} onClick={() => { setTyping(true); if (!custom) onChange(""); }}>Someone else…</button>
      </div>
      {typing && <TextField label="Name" value={value} onChange={(v) => onChange(v.slice(0, 60))} placeholder="e.g. Uncle Sunil" />}
    </div>
  );
}

const METHODS = ["Cash", "Bank transfer", "Card", "Cheque", "Online"];

/* ------------------------------------------------------------------ */
/* Quick pay: advance, instalment or the full balance                  */
/* ------------------------------------------------------------------ */

export function QuickPayDialog({ bill, open, onClose, today }: { bill: Bill | null; open: boolean; onClose: () => void; today: string }) {
  return bill ? <QuickPay key={`${bill.id}-${open}`} bill={bill} open={open} onClose={onClose} today={today} /> : null;
}

function QuickPay({ bill, open, onClose, today }: { bill: Bill; open: boolean; onClose: () => void; today: string }) {
  const store = useStore();
  const toast = useToast();
  const balance = bill.balance || bill.total;
  const [amount, setAmount] = useState(bill.payments.length === 0 && balance > 0 ? Math.round(balance * 0.25 / 1000) * 1000 || balance : balance);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [date, setDate] = useState(today);
  const [paidBy, setPaidBy] = useState("");
  const [method, setMethod] = useState("Bank transfer");
  const [reference, setReference] = useState("");
  const [label, setLabel] = useState<string | null>(null);
  const shownLabel = label ?? nextPaymentLabel(bill, amount);
  const picks = balance > 0
    ? [{ label: "10%", value: Math.round(balance * 0.1) }, { label: "25%", value: Math.round(balance * 0.25) }, { label: "50%", value: Math.round(balance * 0.5) }, { label: "Full balance", value: balance }]
    : [];

  const save = (e: React.MouseEvent<HTMLButtonElement> | null) => {
    if (amount <= 0) return toast("Enter an amount first.", "danger");
    const now = nowISO();
    const p: Payment = {
      id: newId(),
      vendorId: bill.vendorId ?? bill.item?.vendorId ?? null,
      budgetItemId: bill.item?.id ?? null,
      label: shownLabel.slice(0, 120),
      amount,
      dueDate: date,
      paidDate: when === "now" ? date : null,
      status: when === "now" ? "paid" : "scheduled",
      method: when === "now" ? method : "",
      reference: reference.slice(0, 120),
      paidBy,
      createdAt: now,
      updatedAt: now,
    };
    store.upsert("payments", p);
    const left = Math.max(0, bill.balance - (when === "now" ? amount : 0));
    if (when === "now" && left === 0 && bill.total > 0) {
      celebrate(e?.currentTarget ?? null, 60);
      toast(`🎉 ${bill.title} is fully paid!`);
    } else if (when === "now") {
      celebrate(e?.currentTarget ?? null, 24);
      toast(`${formatLKR(amount)} paid${paidBy ? ` by ${paidBy}` : ""}. ${formatLKR(left)} left on ${bill.title}.`);
    } else toast(`${formatLKR(amount)} scheduled for ${formatDate(date)}.`);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Pay: ${bill.title}`}
      description={bill.total > 0 ? `Total ${formatLKR(bill.total)} · paid ${formatLKR(bill.paid)} · ${formatLKR(bill.balance)} left` : undefined}
      footer={
        <>
          <span className="spacer" />
          <button type="button" className="wos-btn wos-btn--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="wos-btn wos-btn--primary" onClick={(e) => save(e)}>{when === "now" ? "Record Payment" : "Schedule Payment"}</button>
        </>
      }
    >
      <form className="wos-form" onSubmit={(e) => { e.preventDefault(); save(null); }} noValidate>
        <ChoiceChips<"now" | "later"> className="full" label="Is it paid?" value={when} onChange={setWhen}
          options={[{ value: "now", label: "✅ Paid now" }, { value: "later", label: "🗓️ Pay later (reminder)" }]} />
        <MoneySlider className="full" label={shownLabel} value={amount} onChange={(v) => setAmount(Math.max(0, v))} max={balance || 100_000} picks={picks}
          help={bill.total > 0 ? (amount >= bill.balance ? "This clears the bill. 🎉" : `${formatLKR(Math.max(0, bill.balance - amount))} will still be left after this.`) : undefined} />
        <TextField label={when === "now" ? "Paid on" : "Due on"} type="date" value={date} onChange={setDate} />
        <TextField label="Description" value={shownLabel} onChange={(v) => setLabel(v)} />
        <PaidByField value={paidBy} onChange={setPaidBy} label={when === "now" ? "Who paid?" : "Who will pay?"} />
        {when === "now" && (
          <ChoiceChips className="full" label="How?" value={method} onChange={setMethod} options={METHODS.map((m) => ({ value: m, label: m }))} />
        )}
        {when === "now" && <TextField className="full" label="Receipt / reference (optional)" value={reference} onChange={setReference} placeholder="Receipt or transfer number" />}
      </form>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Board                                                               */
/* ------------------------------------------------------------------ */

const PAYER_COLORS = ["var(--wine-600)", "var(--champagne-700)", "var(--sage-600)", "#5b6b9a", "#9a5b86", "#6b8a3a"];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}

/* ------------------------------------------------------------------ */
/* Put an earlier payment into a budget category                       */
/* ------------------------------------------------------------------ */

export function AssignPaymentDialog({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
  return payment ? <Assign key={payment.id} payment={payment} onClose={onClose} /> : null;
}

function Assign({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const store = useStore();
  const data = useWeddingData();
  const toast = useToast();
  const vendor = data.vendors.find((v) => v.id === payment.vendorId);
  const [category, setCategory] = useState<BudgetCategoryId>(vendor?.categoryId ?? "venue");
  const lines = data.budgetItems.filter((i) => i.categoryId === category && i.status !== "cancelled");
  const [lineId, setLineId] = useState<string>(lines[0]?.id ?? "new");
  const [name, setName] = useState(vendor ? `${budgetCategoryLabel(category)} — ${vendor.name}` : payment.label);
  const [total, setTotal] = useState<number | null>(null);
  const chosen = lines.find((l) => l.id === lineId);

  const save = (e: React.MouseEvent<HTMLButtonElement>) => {
    const now = nowISO();
    let itemId = chosen?.id ?? null;
    if (!chosen) {
      if (!name.trim()) return toast("Give the budget line a name.", "danger");
      const item: BudgetItem = {
        id: newId(), categoryId: category, name: name.trim().slice(0, 120), planned: total ?? payment.amount, quoted: total, final: null,
        vendorId: payment.vendorId, status: "booked", notes: "Added from an earlier payment", createdAt: now, updatedAt: now,
      };
      store.upsert("budgetItems", item);
      itemId = item.id;
    }
    store.upsert("payments", { ...payment, budgetItemId: itemId, vendorId: payment.vendorId ?? chosen?.vendorId ?? null, updatedAt: now });
    celebrate(e.currentTarget, 20);
    toast(`${formatLKR(payment.amount)} now counts towards ${budgetCategoryLabel(category)}.`);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title="Put this payment in a category"
      description={`${payment.label} · ${formatLKR(payment.amount)} · ${formatDate(payment.paidDate ?? payment.dueDate)}${payment.paidBy ? ` · ${payment.paidBy}` : ""}`}
      footer={<><span className="spacer" /><button type="button" className="wos-btn wos-btn--secondary" onClick={onClose}>Cancel</button><button type="button" className="wos-btn wos-btn--primary" onClick={(e) => save(e)}>Assign Payment</button></>}>
      <form className="wos-form" onSubmit={(e) => e.preventDefault()}>
        <SelectField<BudgetCategoryId> className="full" label="Category" value={category}
          onChange={(v) => { setCategory(v); const first = data.budgetItems.find((i) => i.categoryId === v && i.status !== "cancelled"); setLineId(first?.id ?? "new"); setName(vendor ? `${budgetCategoryLabel(v)} — ${vendor.name}` : payment.label); }}
          options={BUDGET_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
        <SelectField className="full" label="Budget line" value={lineId} onChange={setLineId}
          options={[...lines.map((l) => ({ value: l.id, label: `${l.name} (${formatLKR(l.final ?? l.quoted ?? l.planned)})` })), { value: "new", label: "+ New line in this category" }]}
          help={chosen ? "The payment is added to this line's paid amount." : "A new line is made in this category with this payment as its advance."} />
        {!chosen && (
          <>
            <TextField className="full" label="Line name" value={name} onChange={setName} />
            <MoneyField className="full" label="Full price, if you know it" value={total} onChange={setTotal} optional help="Leave empty and fill in later — e.g. when the hotel confirms." />
          </>
        )}
      </form>
    </Dialog>
  );
}

export function BillsBoard({ data, today, onEditPayment }: { data: WeddingData; today: string; onEditPayment: (id: string) => void }) {
  const [paying, setPaying] = useState<Bill | null>(null);
  const [assigning, setAssigning] = useState<Payment | null>(null);
  const unassigned = data.payments.filter((p) => !p.budgetItemId || !data.budgetItems.some((i) => i.id === p.budgetItemId));
  const [show, setShow] = useState<"open" | "paid" | "all">("open");
  const list = bills(data);
  const totals = moneyTotals(list);
  const payers = payerSummary(data.payments);
  const payerTotal = payers.reduce((s, p) => s + p.paid, 0);
  const shown = list
    .filter((b) => (show === "open" ? b.state !== "paid" && b.state !== "included" : show === "paid" ? b.state === "paid" || b.state === "included" : true))
    .sort((a, b) => (a.next?.dueDate ?? "9999").localeCompare(b.next?.dueDate ?? "9999") || b.balance - a.balance);
  const paidPct = totals.total ? Math.round((totals.paid / totals.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <section className="wos-card wos-card--hero flex flex-col gap-4" aria-label="Money at a glance">
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
          {([
            ["Total bills", totals.total, "All booked and planned lines"],
            ["Paid so far", totals.paid, `${paidPct}% done`],
            ["Still to pay", totals.balance, `${formatLKR(totals.scheduled)} has a date`],
            ["No date yet", totals.unscheduled, "Add a reminder for these"],
          ] as const).map(([label, value, hint]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="wos-overline !text-ink-muted">{label}</span>
              <span className="wos-num font-display text-[30px] leading-[36px] font-medium"><small className="mr-1 font-sans text-[12px] font-semibold text-ink-muted">LKR</small>{formatAmount(value)}</span>
              <span className="text-[13px] text-ink-muted">{hint}</span>
            </div>
          ))}
        </div>
        <div className="bill-bar" role="img" aria-label={`${paidPct}% of all bills paid`}><i style={{ width: `${paidPct}%` }} /></div>
      </section>

      {unassigned.length > 0 && (
        <section className="wos-card flex flex-col gap-3 border-warning" aria-labelledby="h-unassigned">
          <h2 id="h-unassigned" className="wos-card__title">Payments not in a category yet ({unassigned.length})</h2>
          <p className="m-0 text-[14px] text-ink-muted">Paid before you added the budget line? Put each one in its category so the totals and balances are right.</p>
          <ul className="bill-pays">
            {unassigned.map((p) => (
              <li key={p.id} className="!grid-cols-[22px_1fr_auto_auto]">
                {p.status === "paid" ? <CheckCircle2 className="size-[18px] text-success" aria-label="Paid" /> : <CircleDashed className="size-[18px] text-ink-muted" aria-label="Not paid yet" />}
                <span className="min-w-0 truncate">{p.label} <span className="text-ink-muted">· {formatDate(p.paidDate ?? p.dueDate)}{p.paidBy ? ` · ${p.paidBy}` : ""}</span></span>
                <span className="wos-num font-semibold">{formatAmount(p.amount)}</span>
                <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => setAssigning(p)}>Assign</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {payers.length > 0 && (
        <section className="wos-card flex flex-col gap-3" aria-labelledby="h-payers">
          <h2 id="h-payers" className="wos-card__title">Who paid</h2>
          {payers.map((p, i) => (
            <div key={p.name} className="payer-row">
              <span className="payer-avatar" style={{ background: p.name === NOT_RECORDED ? "var(--ink-muted)" : PAYER_COLORS[i % PAYER_COLORS.length] }} aria-hidden="true">{p.name === NOT_RECORDED ? "?" : initials(p.name)}</span>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate font-semibold">{p.name}</span>
                <div className="bill-bar !h-2"><i style={{ width: `${payerTotal ? Math.round((p.paid / payerTotal) * 100) : 0}%`, background: p.name === NOT_RECORDED ? "var(--ink-muted)" : PAYER_COLORS[i % PAYER_COLORS.length] }} /></div>
              </div>
              <div className="text-right">
                <div className="wos-num font-semibold">{formatLKR(p.paid)}</div>
                {p.planned > 0 && <div className="text-[12px] text-ink-muted">+ {formatLKR(p.planned)} planned</div>}
              </div>
            </div>
          ))}
          {payers.some((p) => p.name === NOT_RECORDED) && <p className="m-0 text-[13px] text-ink-muted">Tip: tap a payment below to add who paid it.</p>}
        </section>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="h-bills">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="h-bills" className="wos-card__title">Every bill</h2>
          <div className="wos-tabs" role="tablist" aria-label="Show bills">
            {([["open", "Still to pay"], ["paid", "Fully paid"], ["all", "All"]] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" className="wos-tab" aria-selected={show === id} onClick={() => setShow(id)}>{label}</button>
            ))}
          </div>
        </div>
        {shown.length === 0 && <p className="m-0 py-6 text-center text-ink-muted">{show === "open" ? "Nothing left to pay. 🎉" : "No bills here yet."}</p>}
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
          {shown.map((b) => {
            const sched = b.total ? Math.min(100 - b.pct, Math.round((Math.min(b.scheduled, b.balance) / b.total) * 100)) : 0;
            return (
              <article key={b.id} className="wos-card bill" aria-label={b.title}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="m-0 truncate text-[16px] leading-6 font-semibold">{b.title}</h3>
                    <p className="m-0 truncate text-[13px] text-ink-muted">{b.subtitle}</p>
                  </div>
                  {b.state === "paid" ? <Badge tone="success">Paid ✓</Badge> : b.state === "included" ? <Badge tone="champagne">In package</Badge> : b.state === "partly" ? <Badge tone="info">{b.pct}% paid</Badge> : <Badge tone="neutral">Not paid</Badge>}
                </div>
                {b.total > 0 && (
                  <>
                    <div className="bill-bar" role="img" aria-label={`${b.pct}% paid${sched ? `, ${sched}% scheduled` : ""}`}>
                      <i style={{ width: `${b.pct}%` }} />
                      {sched > 0 && <b style={{ left: `${b.pct}%`, width: `${sched}%` }} />}
                    </div>
                    <div className="bill-figs">
                      <div><span>Total</span><strong>{formatAmount(b.total)}</strong></div>
                      <div><span>Paid</span><strong className="text-success">{formatAmount(b.paid)}</strong></div>
                      <div><span>Left</span><strong className={cx(b.balance > 0 && "text-wine-600")}>{formatAmount(b.balance)}</strong></div>
                    </div>
                  </>
                )}
                {b.next && (
                  <p className="m-0 flex items-center gap-2 rounded-[10px] bg-surface-sunken px-3 py-2 text-[13px]">
                    <Clock3 className="size-4 flex-none text-champagne-700" aria-hidden="true" />
                    <span>Next: <b>{formatLKR(b.next.amount)}</b> {relativeDue(b.next.dueDate, today).toLowerCase()}{b.next.paidBy ? ` · ${b.next.paidBy}` : ""}</span>
                  </p>
                )}
                {b.payments.length > 0 && (
                  <ul className="bill-pays">
                    {b.payments.map((p) => (
                      <li key={p.id}>
                        {p.status === "paid" ? <CheckCircle2 className="size-[18px] text-success" aria-label="Paid" /> : <CircleDashed className="size-[18px] text-ink-muted" aria-label="Not paid yet" />}
                        <button type="button" className="min-w-0 cursor-pointer truncate border-0 bg-transparent p-0 text-left text-ink" onClick={() => onEditPayment(p.id)} aria-label={`Edit ${p.label}`}>
                          {p.label} <span className="text-ink-muted">· {formatDate(p.paidDate ?? p.dueDate)}{p.paidBy ? ` · ${p.paidBy}` : ""}</span>
                        </button>
                        <span className="wos-num font-semibold">{formatAmount(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {b.state !== "paid" && (
                  <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm self-start" onClick={() => setPaying(b)}>
                    <Plus className="wos-icon" aria-hidden="true" />{b.payments.length === 0 ? "Pay advance" : "Add payment"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <QuickPayDialog bill={paying} open={Boolean(paying)} onClose={() => setPaying(null)} today={today} />
      <AssignPaymentDialog payment={assigning} onClose={() => setAssigning(null)} />
    </div>
  );
}

"use client";

import { Check, Minus, Plus, Star } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useQueryState } from "@/lib/hooks/use-query-state";
import { useStore } from "@/lib/store/provider";
import { BUDGET_CATEGORIES, VENDOR_STATUS_LABEL, VENDOR_STATUS_TONE, budgetCategory, budgetCategoryLabel } from "@/lib/domain/catalog";
import { vendorBalance } from "@/lib/domain/budget";
import { scoreQuotes, QUOTE_LABEL, VALUE_WEIGHTS } from "@/lib/domain/quotes";
import { formatAmount, formatLKR } from "@/lib/domain/money";
import { formatShortDate } from "@/lib/domain/dates";
import { nowISO } from "@/lib/domain/ids";
import type { BudgetCategoryId, Vendor, WeddingData } from "@/lib/domain/types";
import { Badge, EmptyState, PageHeader, ProgressBar, cx } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { QuoteForm, VendorForm } from "@/components/features/vendor-forms";
import { useToast } from "@/components/shell/toast";

export function VendorsView() {
  const page = usePage();
  const q = useQueryState();
  if (!page) return <PageSkeleton />;
  const { data } = page;
  const tab = q.get("tab") === "compare" ? "compare" : "vendors";
  const editing = data.vendors.find((v) => v.id === q.get("vendor"));
  const creating = q.get("new") === "1";
  const category = (q.get("category") ?? "") as BudgetCategoryId | "";
  const booked = data.vendors.filter((v) => v.status === "booked" || v.status === "completed").length;

  return (
    <>
      <PageHeader
        overline="People"
        title="Vendors"
        lead={data.vendors.length ? `${booked} booked of ${data.vendors.filter((v) => v.status !== "cancelled").length} · ${data.quotes.length} quotes to compare.` : undefined}
        actions={
          <>
            <button type="button" className="wos-btn wos-btn--secondary" onClick={() => q.set({ tab: "compare", newQuote: "1" })}>Add Quote</button>
            <button type="button" className="wos-btn wos-btn--primary" onClick={() => q.set({ new: "1" })}><Plus className="wos-icon" aria-hidden="true" />Add Vendor</button>
          </>
        }
      />
      <div className="wos-tabs" role="tablist" aria-label="Vendor views">
        <button type="button" role="tab" className="wos-tab" aria-selected={tab === "vendors"} onClick={() => q.set({ tab: null })}>All vendors <span>{data.vendors.length}</span></button>
        <button type="button" role="tab" className="wos-tab" aria-selected={tab === "compare"} onClick={() => q.set({ tab: "compare" })}>Compare quotes <span>{data.quotes.length}</span></button>
      </div>

      {tab === "vendors" ? <VendorList data={data} category={category} /> : <Compare data={data} category={category} />}

      <VendorForm open={creating || Boolean(editing)} vendor={editing} onClose={() => q.set({ vendor: null, new: null })} defaultCategory={category || undefined} />
    </>
  );
}

function VendorList({ data, category }: { data: WeddingData; category: BudgetCategoryId | "" }) {
  const q = useQueryState();
  if (data.vendors.length === 0) {
    return (
      <EmptyState title="No vendors added yet." action={<button type="button" className="wos-btn wos-btn--primary" onClick={() => q.set({ new: "1" })}>Add Vendor</button>}>
        Start with your venue and photographer; in Sri Lanka the best ones book out a year ahead.
      </EmptyState>
    );
  }
  const cats = BUDGET_CATEGORIES.filter((c) => data.vendors.some((v) => v.categoryId === c.id));
  const shown = cats.filter((c) => !category || c.id === category);
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="v-cat">Category</label>
        <select id="v-cat" className="wos-input w-auto" value={category} onChange={(e) => q.set({ category: e.target.value })}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      {shown.map((c) => (
        <section key={c.id} aria-labelledby={`vc-${c.id}`} className="flex flex-col gap-3">
          <h2 id={`vc-${c.id}`} className="wos-overline !text-ink-muted m-0">{c.label}</h2>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
            {data.vendors.filter((v) => v.categoryId === c.id).map((v) => <VendorCard key={v.id} vendor={v} data={data} />)}
          </div>
        </section>
      ))}
    </>
  );
}

function VendorCard({ vendor, data }: { vendor: Vendor; data: WeddingData }) {
  const q = useQueryState();
  const b = vendorBalance(vendor.id, data.budgetItems, data.payments);
  const quotes = data.quotes.filter((x) => x.vendorId === vendor.id);
  return (
    <article className={cx("wos-card wos-vendor wos-card--interactive !min-w-0", vendor.status === "cancelled" && "opacity-60")}>
      <div className="wos-vendor__head">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="wos-vendor__name">{vendor.name}</h3>
          <span className="wos-vendor__cat">{budgetCategoryLabel(vendor.categoryId)}{vendor.location ? ` · ${vendor.location}` : ""}</span>
        </div>
        <Badge tone={VENDOR_STATUS_TONE[vendor.status]}>{VENDOR_STATUS_LABEL[vendor.status]}</Badge>
      </div>
      {b.total > 0 ? (
        <>
          <span className="wos-vendor__price"><small>LKR</small>{formatAmount(b.total)}</span>
          <ProgressBar value={(b.paid / b.total) * 100} label="Paid" detail={`${formatLKR(b.paid)} of ${formatLKR(b.total)}`} />
          <dl className="wos-vendor__meta m-0">
            <dt>Balance</dt><dd>{formatLKR(b.balance)}</dd>
            <dt>Next payment</dt><dd>{b.nextPayment ? `${formatShortDate(b.nextPayment.dueDate)} · ${formatLKR(b.nextPayment.amount)}` : "—"}</dd>
          </dl>
        </>
      ) : (
        <p className="m-0 text-[14px] text-ink-muted">{quotes.length ? `${quotes.length} ${quotes.length === 1 ? "quote" : "quotes"} on file` : "No quote yet"}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="wos-vendor__rating">{vendor.rating !== null ? <><Star className="wos-icon inline -mt-0.5 size-4" aria-hidden="true" /> {vendor.rating.toFixed(1)} <span className="sr-only">out of 5</span></> : <span className="text-ink-muted">Not rated</span>}</span>
        <div className="flex gap-1">
          {quotes.length > 0 && <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => q.set({ tab: "compare", category: vendor.categoryId })}>Compare</button>}
          <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => q.set({ vendor: vendor.id })} aria-label={`Open ${vendor.name}`}>Open</button>
        </div>
      </div>
    </article>
  );
}

function Compare({ data, category }: { data: WeddingData; category: BudgetCategoryId | "" }) {
  const q = useQueryState();
  const store = useStore();
  const toast = useToast();
  const vendorCat = new Map(data.vendors.map((v) => [v.id, v.categoryId]));
  const withQuotes = BUDGET_CATEGORIES.filter((c) => data.quotes.some((x) => vendorCat.get(x.vendorId) === c.id));
  const active = (category && withQuotes.some((c) => c.id === category) ? category : withQuotes.sort((a, b) => data.quotes.filter((x) => vendorCat.get(x.vendorId) === b.id).length - data.quotes.filter((x) => vendorCat.get(x.vendorId) === a.id).length)[0]?.id) as BudgetCategoryId | undefined;
  const quotes = data.quotes.filter((x) => vendorCat.get(x.vendorId) === active);
  const scored = active ? scoreQuotes(quotes, data.vendors, active).sort((a, b) => a.trueCost - b.trueCost) : [];
  const features = active ? budgetCategory(active).compareFeatures : [];
  const editingQuote = data.quotes.find((x) => x.id === q.get("quote"));
  const creatingQuote = q.get("newQuote") === "1";

  const choose = (quoteId: string) => {
    const chosen = scored.find((s) => s.quote.id === quoteId)!;
    store.upsert("quotes", quotes.map((x) => ({ ...x, selected: x.id === quoteId })));
    // Carry the true cost into the budget so the forecast reflects the choice.
    const line = data.budgetItems.find((i) => i.categoryId === active && i.status !== "cancelled" && (i.vendorId === null || i.vendorId === chosen.quote.vendorId || data.vendors.find((v) => v.id === i.vendorId)?.categoryId === active));
    if (line && line.final === null) {
      store.upsert("budgetItems", { ...line, vendorId: chosen.quote.vendorId, quoted: chosen.trueCost, status: line.status === "planned" || line.status === "quoted" ? "negotiating" : line.status, updatedAt: nowISO() });
    }
    if (chosen.vendor && ["researching", "contacted", "quoted"].includes(chosen.vendor.status)) store.upsert("vendors", { ...chosen.vendor, status: "negotiating" });
    toast(`${chosen.vendor?.name ?? "Quote"} chosen. Your forecast now uses ${formatLKR(chosen.trueCost)}.`);
  };

  return (
    <>
      {withQuotes.length === 0 ? (
        <EmptyState title="No quotes to compare yet." action={<button type="button" className="wos-btn wos-btn--primary" onClick={() => q.set({ newQuote: "1" })}>Add Quote</button>}>
          Add two or three packages in a category and we&apos;ll compare the true cost, deliverables and value side by side.
        </EmptyState>
      ) : (
        <>
          <div className="wos-tabs" role="tablist" aria-label="Category">
            {withQuotes.map((c) => (
              <button key={c.id} type="button" role="tab" className="wos-tab" aria-selected={c.id === active} onClick={() => q.set({ category: c.id })}>{c.label}</button>
            ))}
          </div>
          <div className="grid gap-5 pt-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
            {scored.map((s) => {
              const picked = s.quote.selected;
              return (
                <article key={s.quote.id} className={cx("wos-card wos-vendor !min-w-0", picked && "wos-vendor--pick")}>
                  {s.labels.length > 0 && (
                    <div className="wos-ribbon flex gap-1.5">
                      {s.labels.map((l) => <Badge key={l} plain tone={l === "best_value" ? "wine" : l === "premium" ? "champagne" : "info"}>{QUOTE_LABEL[l]}</Badge>)}
                    </div>
                  )}
                  <div className="wos-vendor__head">
                    <div className="flex flex-col gap-1">
                      <h3 className="wos-vendor__name">{s.vendor?.name}</h3>
                      <span className="wos-vendor__cat">{s.quote.packageName}{s.quote.hours ? ` · ${s.quote.hours} hours` : ""}</span>
                    </div>
                    {picked && <Badge tone="success">Your choice</Badge>}
                  </div>
                  <div className="flex flex-col">
                    <span className="wos-vendor__price"><small>LKR</small>{formatAmount(s.trueCost)}</span>
                    <span className="text-[13px] text-ink-muted">True cost, all charges included</span>
                  </div>
                  {s.hidden > 0 ? (
                    <div className="rounded-xl bg-warning-50 p-3 text-[13px] leading-[18px]">
                      <b className="text-warning">+{formatLKR(s.hidden)} beyond the package price ({s.hiddenPct}%)</b>
                      <ul className="m-0 mt-1 list-none p-0 text-ink-muted">
                        {([["Additional charges", s.quote.additionalCharges], ["Overtime", s.quote.overtime], ["Transport", s.quote.transport], ["Taxes", s.quote.taxes]] as const).filter(([, v]) => v > 0).map(([k, v]) => (
                          <li key={k}>{k}: {formatLKR(v)}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-success-50 p-3 text-[13px] leading-[18px] font-semibold text-success">No extra charges declared</div>
                  )}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between">
                      <span className="wos-overline">Value score</span>
                      <span className="font-display text-[28px] leading-[32px] font-medium">{s.valueScore}<span className="text-[16px] text-ink-muted">/100</span></span>
                    </div>
                    <ScoreLine label={`Cost efficiency · ${VALUE_WEIGHTS.cost * 100}%`} value={s.scores.cost} />
                    <ScoreLine label={`Quality rating · ${VALUE_WEIGHTS.quality * 100}%`} value={s.scores.quality} />
                    <ScoreLine label={`Deliverables · ${VALUE_WEIGHTS.deliverables * 100}%`} value={s.scores.deliverables} />
                  </div>
                  {features.length > 0 && (
                    <ul className="m-0 grid list-none grid-cols-1 gap-1.5 p-0 text-[13px] leading-[18px]">
                      {features.map((f) => {
                        const has = Boolean(s.quote.features[f.key]);
                        return (
                          <li key={f.key} className={cx("flex items-center gap-2", !has && "text-ink-muted")}>
                            {has ? <Check className="wos-icon size-4 text-success" aria-hidden="true" /> : <Minus className="wos-icon size-4" aria-hidden="true" />}
                            {f.label}<span className="sr-only">{has ? ": included" : ": not included"}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {(s.quote.deliverables || s.quote.paymentTerms) && (
                    <dl className="wos-vendor__meta m-0 !grid-cols-1 border-t border-line pt-3">
                      {s.quote.deliverables && <><dt>Deliverables</dt><dd className="!text-left">{s.quote.deliverables}</dd></>}
                      {s.quote.paymentTerms && <><dt>Payment terms</dt><dd className="!text-left">{s.quote.paymentTerms}</dd></>}
                    </dl>
                  )}
                  <div className="mt-auto flex gap-2">
                    {!picked && <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm flex-1" onClick={() => choose(s.quote.id)}>Choose This Option</button>}
                    <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => q.set({ quote: s.quote.id })} aria-label={`Edit quote from ${s.vendor?.name}`}>Edit</button>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="m-0 text-[13px] leading-[18px] text-ink-muted">
            Value Score blends cost efficiency (lowest true cost ÷ this one), your quality rating and the share of compared features included. A missing rating is left out rather than counted as zero. The cheapest option is never chosen for you.
          </p>
        </>
      )}
      <QuoteForm open={creatingQuote || Boolean(editingQuote)} quote={editingQuote} categoryId={category || undefined} onClose={() => q.set({ quote: null, newQuote: null })} />
    </>
  );
}

function ScoreLine({ label, value }: { label: string; value: number | null }) {
  return value === null ? (
    <div className="flex justify-between text-[13px] font-semibold"><span>{label}</span><span className="text-ink-muted">No rating</span></div>
  ) : (
    <ProgressBar value={value} label={label} detail={value} tone="sage" />
  );
}

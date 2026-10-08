"use client";

import { useState } from "react";
import { useStore, useWeddingData } from "@/lib/store/provider";
import { BUDGET_CATEGORIES, VENDOR_STATUS_LABEL, budgetCategory } from "@/lib/domain/catalog";
import { fieldErrors, quoteSchema, vendorSchema } from "@/lib/domain/schemas";
import { newId, nowISO } from "@/lib/domain/ids";
import { vendorBalance } from "@/lib/domain/budget";
import { formatLKR } from "@/lib/domain/money";
import { formatDate } from "@/lib/domain/dates";
import { VENDOR_STATUSES, type BudgetCategoryId, type Vendor, type VendorQuote, type VendorStatus } from "@/lib/domain/types";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { MoneyField, NumberField, SelectField, TextArea, TextField, Toggle } from "@/components/ui/fields";
import { useToast } from "@/components/shell/toast";

type VendorDraft = Omit<Vendor, "id" | "createdAt" | "updatedAt" | "dayStatus">;

export function VendorForm({ open, vendor, onClose, defaultCategory }: { open: boolean; vendor?: Vendor; onClose: () => void; defaultCategory?: BudgetCategoryId }) {
  return <VendorInner key={`${vendor?.id ?? "new"}-${open}`} open={open} vendor={vendor} onClose={onClose} defaultCategory={defaultCategory} />;
}

function VendorInner({ open, vendor, onClose, defaultCategory }: { open: boolean; vendor?: Vendor; onClose: () => void; defaultCategory?: BudgetCategoryId }) {
  const store = useStore();
  const data = useWeddingData();
  const toast = useToast();
  const [draft, setDraft] = useState<VendorDraft>(() =>
    vendor ? { ...vendor } : { name: "", categoryId: defaultCategory ?? "venue", contactName: "", phone: "", email: "", location: "", status: "researching", rating: null, notes: "", arrivalTime: "" },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof VendorDraft>(k: K, v: VendorDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    const res = vendorSchema.safeParse(draft);
    if (!res.success) return setErrors(fieldErrors(res.error));
    const now = nowISO();
    store.upsert("vendors", { ...(vendor ?? { id: newId(), createdAt: now, dayStatus: "not_arrived" }), ...res.data, updatedAt: now } as Vendor);
    toast(vendor ? "Vendor updated." : `${res.data.name} added.`);
    onClose();
  };

  const balance = vendor ? vendorBalance(vendor.id, data.budgetItems, data.payments) : null;
  const quoteCount = vendor ? data.quotes.filter((q) => q.vendorId === vendor.id).length : 0;

  return (
    <>
      <Dialog
        open={open && !confirmDelete}
        onClose={onClose}
        title={vendor ? vendor.name : "Add a vendor"}
        footer={
          <>
            {vendor && <button type="button" className="wos-btn wos-btn--danger" onClick={() => setConfirmDelete(true)}>Delete</button>}
            <span className="spacer" />
            <button type="button" className="wos-btn wos-btn--secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="wos-btn wos-btn--primary" onClick={save}>{vendor ? "Save Changes" : "Add Vendor"}</button>
          </>
        }
      >
        {balance && balance.total > 0 && (
          <dl className="m-0 mb-5 grid grid-cols-2 gap-3 rounded-2xl bg-surface-sunken p-4 text-[14px] sm:grid-cols-4">
            {[["Total", formatLKR(balance.total)], ["Paid", formatLKR(balance.paid)], ["Balance", formatLKR(balance.balance)], ["Next payment", balance.nextPayment ? `${formatLKR(balance.nextPayment.amount)} · ${formatDate(balance.nextPayment.dueDate)}` : "None scheduled"]].map(([k, v]) => (
              <div key={k} className="flex flex-col"><dt className="wos-overline !text-ink-muted">{k}</dt><dd className="m-0 font-semibold">{v}</dd></div>
            ))}
          </dl>
        )}
        <form className="wos-form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <TextField className="full" label="Vendor name" value={draft.name} onChange={(v) => set("name", v)} error={errors.name} autoFocus={!vendor} />
          <SelectField<BudgetCategoryId> label="Category" value={draft.categoryId} onChange={(v) => set("categoryId", v)} options={BUDGET_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
          <SelectField<VendorStatus> label="Booking status" value={draft.status} onChange={(v) => set("status", v)} options={VENDOR_STATUSES.map((s) => ({ value: s, label: VENDOR_STATUS_LABEL[s] }))} />
          <TextField label="Contact person" value={draft.contactName} onChange={(v) => set("contactName", v)} />
          <TextField label="Phone" type="tel" value={draft.phone} onChange={(v) => set("phone", v)} />
          <TextField label="Email" type="email" value={draft.email} onChange={(v) => set("email", v)} error={errors.email} />
          <TextField label="Location" value={draft.location} onChange={(v) => set("location", v)} />
          <NumberField label="Your rating (0–5)" value={draft.rating} onChange={(v) => set("rating", v === null ? null : Math.min(5, Math.max(0, v)))} min={0} max={5} step={0.1} help="Used in the Value Score." />
          <TextField label="Wedding-day arrival" type="time" value={draft.arrivalTime} onChange={(v) => set("arrivalTime", v)} error={errors.arrivalTime} />
          <TextArea className="full" label="Notes" value={draft.notes} onChange={(v) => set("notes", v)} rows={3} placeholder="What's included, what to confirm, contract notes" />
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (vendor) store.remove("vendors", vendor.id);
          toast("Vendor deleted.");
          setConfirmDelete(false);
          onClose();
        }}
        title={`Delete ${vendor?.name ?? "this vendor"}?`}
        body={`${quoteCount ? `Their ${quoteCount} ${quoteCount === 1 ? "quote" : "quotes"} will be deleted. ` : ""}Budget lines and payments stay, unlinked from this vendor.`}
        confirmLabel="Delete Vendor"
        danger
      />
    </>
  );
}

type QuoteDraft = Omit<VendorQuote, "id" | "createdAt" | "updatedAt" | "selected" | "reviewScore">;

export function QuoteForm({ open, quote, onClose, categoryId }: { open: boolean; quote?: VendorQuote; onClose: () => void; categoryId?: BudgetCategoryId }) {
  return <QuoteInner key={`${quote?.id ?? "new"}-${open}`} open={open} quote={quote} onClose={onClose} categoryId={categoryId} />;
}

function QuoteInner({ open, quote, onClose, categoryId }: { open: boolean; quote?: VendorQuote; onClose: () => void; categoryId?: BudgetCategoryId }) {
  const store = useStore();
  const data = useWeddingData();
  const toast = useToast();
  const candidates = data.vendors.filter((v) => v.status !== "cancelled" && (!categoryId || v.categoryId === categoryId || v.id === quote?.vendorId));
  const [draft, setDraft] = useState<QuoteDraft>(() =>
    quote ? { ...quote } : { vendorId: candidates[0]?.id ?? "", packageName: "", price: 0, additionalCharges: 0, overtime: 0, transport: 0, taxes: 0, hours: null, deliverables: "", features: {}, paymentTerms: "" },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof QuoteDraft>(k: K, v: QuoteDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const vendor = data.vendors.find((v) => v.id === draft.vendorId);
  const features = vendor ? budgetCategory(vendor.categoryId).compareFeatures : [];

  const save = () => {
    const res = quoteSchema.safeParse(draft);
    if (!res.success) return setErrors(fieldErrors(res.error));
    const now = nowISO();
    store.upsert("quotes", { ...(quote ?? { id: newId(), createdAt: now, selected: false, reviewScore: null }), ...res.data, updatedAt: now } as VendorQuote);
    if (vendor && (vendor.status === "researching" || vendor.status === "contacted")) store.upsert("vendors", { ...vendor, status: "quoted" });
    toast(quote ? "Quote updated." : "Quote added.");
    onClose();
  };

  return (
    <>
      <Dialog
        open={open && !confirmDelete}
        onClose={onClose}
        title={quote ? "Edit quote" : "Add a quote"}
        description="Enter every charge. Extras are what make an affordable package expensive."
        footer={
          <>
            {quote && <button type="button" className="wos-btn wos-btn--danger" onClick={() => setConfirmDelete(true)}>Delete</button>}
            <span className="spacer" />
            <button type="button" className="wos-btn wos-btn--secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="wos-btn wos-btn--primary" onClick={save} disabled={candidates.length === 0}>{quote ? "Save Changes" : "Add Quote"}</button>
          </>
        }
      >
        {candidates.length === 0 ? (
          <p className="m-0 text-ink-muted">Add a vendor in this category first, then record their quote.</p>
        ) : (
          <form className="wos-form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
            <SelectField className="full" label="Vendor" value={draft.vendorId} onChange={(v) => set("vendorId", v)} error={errors.vendorId} options={candidates.map((v) => ({ value: v.id, label: `${v.name} · ${budgetCategory(v.categoryId).label}` }))} />
            <TextField label="Package" value={draft.packageName} onChange={(v) => set("packageName", v)} error={errors.packageName} placeholder="Signature" />
            <MoneyField label="Package price" value={draft.price} onChange={(v) => set("price", v ?? 0)} error={errors.price} />
            <MoneyField label="Additional charges" value={draft.additionalCharges} onChange={(v) => set("additionalCharges", v ?? 0)} />
            <MoneyField label="Overtime" value={draft.overtime} onChange={(v) => set("overtime", v ?? 0)} />
            <MoneyField label="Transport" value={draft.transport} onChange={(v) => set("transport", v ?? 0)} />
            <MoneyField label="Taxes" value={draft.taxes} onChange={(v) => set("taxes", v ?? 0)} />
            <NumberField label="Hours of coverage" value={draft.hours} onChange={(v) => set("hours", v)} max={48} help="Optional" />
            <TextField label="Payment terms" value={draft.paymentTerms} onChange={(v) => set("paymentTerms", v)} placeholder="40% advance, balance a week before" />
            {features.length > 0 && (
              <fieldset className="full m-0 flex flex-col gap-2 border-0 p-0">
                <legend className="mb-2 text-[14px] font-semibold">Included</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {features.map((f) => (
                    <Toggle key={f.key} label={f.label} checked={Boolean(draft.features[f.key])} onChange={(on) => set("features", { ...draft.features, [f.key]: on })} />
                  ))}
                </div>
              </fieldset>
            )}
            <TextArea className="full" label="Deliverables" value={draft.deliverables} onChange={(v) => set("deliverables", v)} rows={2} />
          </form>
        )}
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (quote) store.remove("quotes", quote.id);
          toast("Quote deleted.");
          setConfirmDelete(false);
          onClose();
        }}
        title="Delete this quote?"
        body="It will be removed from the comparison."
        confirmLabel="Delete Quote"
        danger
      />
    </>
  );
}

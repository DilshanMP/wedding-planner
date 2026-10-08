"use client";

import { useState } from "react";
import { useStore, useWeddingData } from "@/lib/store/provider";
import { BUDGET_CATEGORIES, BUDGET_STATUS_LABEL, budgetCategoryLabel } from "@/lib/domain/catalog";
import { budgetItemSchema, fieldErrors, paymentSchema } from "@/lib/domain/schemas";
import { newId, nowISO } from "@/lib/domain/ids";
import { formatLKR } from "@/lib/domain/money";
import { paidForItem, expectedCost } from "@/lib/domain/budget";
import { BUDGET_ITEM_STATUSES, type BudgetCategoryId, type BudgetItem, type BudgetItemStatus, type Payment } from "@/lib/domain/types";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { MoneyField, SelectField, TextArea, TextField } from "@/components/ui/fields";
import { useToast } from "@/components/shell/toast";

/* ------------------------------------------------------------------ */
/* Budget item                                                         */
/* ------------------------------------------------------------------ */

type ItemDraft = Omit<BudgetItem, "id" | "createdAt" | "updatedAt">;

export function BudgetItemForm({ open, item, onClose, defaultCategory }: { open: boolean; item?: BudgetItem; onClose: () => void; defaultCategory?: BudgetCategoryId }) {
  return <ItemInner key={`${item?.id ?? "new"}-${open}`} open={open} item={item} onClose={onClose} defaultCategory={defaultCategory} />;
}

function ItemInner({ open, item, onClose, defaultCategory }: { open: boolean; item?: BudgetItem; onClose: () => void; defaultCategory?: BudgetCategoryId }) {
  const store = useStore();
  const data = useWeddingData();
  const toast = useToast();
  const [draft, setDraft] = useState<ItemDraft>(() =>
    item ? { ...item } : { categoryId: defaultCategory ?? "venue", name: "", planned: 0, quoted: null, final: null, vendorId: null, status: "planned", notes: "" },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    const res = budgetItemSchema.safeParse(draft);
    if (!res.success) return setErrors(fieldErrors(res.error));
    const now = nowISO();
    store.upsert("budgetItems", { ...(item ?? { id: newId(), createdAt: now }), ...res.data, updatedAt: now } as BudgetItem);
    toast(item ? "Budget line updated." : "Budget line added.");
    onClose();
  };

  const vendors = data.vendors.filter((v) => v.categoryId === draft.categoryId || v.id === draft.vendorId);
  const linkedPayments = item ? data.payments.filter((p) => p.budgetItemId === item.id).length : 0;

  return (
    <>
      <Dialog
        open={open && !confirmDelete}
        onClose={onClose}
        title={item ? "Edit budget line" : "Add a budget line"}
        description="Planned is what you set aside. Quoted is what a vendor offered. Final is what you agreed."
        footer={
          <>
            {item && <button type="button" className="wos-btn wos-btn--danger" onClick={() => setConfirmDelete(true)}>Delete</button>}
            <span className="spacer" />
            <button type="button" className="wos-btn wos-btn--secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="wos-btn wos-btn--primary" onClick={save}>{item ? "Save Changes" : "Add Line"}</button>
          </>
        }
      >
        <form className="wos-form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <SelectField<BudgetCategoryId> label="Category" value={draft.categoryId} onChange={(v) => set("categoryId", v)} options={BUDGET_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
          <SelectField<BudgetItemStatus> label="Status" value={draft.status} onChange={(v) => set("status", v)} options={BUDGET_ITEM_STATUSES.map((s) => ({ value: s, label: BUDGET_STATUS_LABEL[s] }))} />
          <TextField className="full" label="Item" value={draft.name} onChange={(v) => set("name", v)} error={errors.name} placeholder="Hall and entrance decoration" />
          <MoneyField label="Planned" value={draft.planned} onChange={(v) => set("planned", v ?? 0)} error={errors.planned} />
          <MoneyField label="Quoted" value={draft.quoted} onChange={(v) => set("quoted", v)} optional error={errors.quoted} />
          <MoneyField label="Final (agreed)" value={draft.final} onChange={(v) => set("final", v)} optional error={errors.final} />
          <SelectField label="Vendor" value={draft.vendorId ?? ""} onChange={(v) => set("vendorId", v || null)} options={[{ value: "", label: "None yet" }, ...vendors.map((v) => ({ value: v.id, label: v.name }))]} />
          <TextArea className="full" label="Notes" value={draft.notes} onChange={(v) => set("notes", v)} rows={2} />
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (item) store.remove("budgetItems", item.id);
          toast("Budget line deleted.");
          setConfirmDelete(false);
          onClose();
        }}
        title="Delete this budget line?"
        body={linkedPayments ? `${linkedPayments} payments are linked to it. They'll stay in your schedule, unlinked.` : "It will be removed from your forecast."}
        confirmLabel="Delete Line"
        danger
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Payment                                                             */
/* ------------------------------------------------------------------ */

type PayDraft = Omit<Payment, "id" | "createdAt" | "updatedAt" | "paidDate"> & { paidDate: string };

export function PaymentForm({ open, payment, onClose, today, markPaid }: { open: boolean; payment?: Payment; onClose: () => void; today: string; markPaid?: boolean }) {
  return <PayInner key={`${payment?.id ?? "new"}-${open}-${markPaid}`} open={open} payment={payment} onClose={onClose} today={today} markPaid={markPaid} />;
}

function PayInner({ open, payment, onClose, today, markPaid }: { open: boolean; payment?: Payment; onClose: () => void; today: string; markPaid?: boolean }) {
  const store = useStore();
  const data = useWeddingData();
  const toast = useToast();
  const [draft, setDraft] = useState<PayDraft>(() =>
    payment
      ? { ...payment, paidDate: payment.paidDate ?? (markPaid ? today : ""), status: markPaid ? "paid" : payment.status }
      : { vendorId: null, budgetItemId: null, label: "", amount: 0, dueDate: today, paidDate: "", status: "scheduled", method: "", reference: "" },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof PayDraft>(k: K, v: PayDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    const input = { ...draft, paidDate: draft.status === "paid" ? draft.paidDate || today : "" };
    const res = paymentSchema.safeParse(input);
    if (!res.success) return setErrors(fieldErrors(res.error));
    const now = nowISO();
    store.upsert("payments", { ...(payment ?? { id: newId(), createdAt: now }), ...res.data, updatedAt: now } as Payment);
    toast(res.data.status === "paid" ? `Payment of ${formatLKR(res.data.amount)} recorded.` : "Payment scheduled.");
    onClose();
  };

  const items = data.budgetItems.filter((i) => !draft.vendorId || i.vendorId === draft.vendorId || i.id === draft.budgetItemId);
  const item = data.budgetItems.find((i) => i.id === draft.budgetItemId);
  const remainingOnItem = item ? expectedCost(item) - paidForItem(item, data.payments.filter((p) => p.id !== payment?.id)) : null;

  return (
    <>
      <Dialog
        open={open && !confirmDelete}
        onClose={onClose}
        title={markPaid ? "Record payment" : payment ? "Edit payment" : "Add a payment"}
        footer={
          <>
            {payment && !markPaid && <button type="button" className="wos-btn wos-btn--danger" onClick={() => setConfirmDelete(true)}>Delete</button>}
            <span className="spacer" />
            <button type="button" className="wos-btn wos-btn--secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="wos-btn wos-btn--primary" onClick={save}>{draft.status === "paid" ? "Record Payment" : "Save Payment"}</button>
          </>
        }
      >
        <form className="wos-form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <SelectField label="Vendor" value={draft.vendorId ?? ""} onChange={(v) => setDraft((d) => ({ ...d, vendorId: v || null, budgetItemId: data.budgetItems.find((i) => i.vendorId === v)?.id ?? d.budgetItemId }))}
            options={[{ value: "", label: "No vendor" }, ...data.vendors.map((v) => ({ value: v.id, label: v.name }))]} />
          <SelectField label="Budget line" value={draft.budgetItemId ?? ""} onChange={(v) => set("budgetItemId", v || null)}
            options={[{ value: "", label: "Not linked" }, ...items.map((i) => ({ value: i.id, label: `${budgetCategoryLabel(i.categoryId)} · ${i.name}` }))]}
            help={remainingOnItem !== null ? `${formatLKR(Math.max(0, remainingOnItem))} left to pay on this line` : "Link it so the line shows what's paid."} />
          <TextField className="full" label="Description" value={draft.label} onChange={(v) => set("label", v)} error={errors.label} placeholder="Second instalment" />
          <MoneyField label="Amount" value={draft.amount} onChange={(v) => set("amount", v ?? 0)} error={errors.amount} />
          <TextField label="Due date" type="date" value={draft.dueDate} onChange={(v) => set("dueDate", v)} error={errors.dueDate} />
          <SelectField<"scheduled" | "paid"> label="Status" value={draft.status} onChange={(v) => set("status", v)} options={[{ value: "scheduled", label: "Scheduled" }, { value: "paid", label: "Paid" }]} />
          {draft.status === "paid" && <TextField label="Paid on" type="date" value={draft.paidDate || today} onChange={(v) => set("paidDate", v)} error={errors.paidDate} />}
          {draft.status === "paid" && <TextField label="Method" value={draft.method} onChange={(v) => set("method", v)} placeholder="Bank transfer, cash, card" />}
          {draft.status === "paid" && <TextField label="Reference" value={draft.reference} onChange={(v) => set("reference", v)} placeholder="Receipt or transfer number" />}
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (payment) store.remove("payments", payment.id);
          toast("Payment deleted.");
          setConfirmDelete(false);
          onClose();
        }}
        title="Delete this payment?"
        body={`${payment?.label ?? "This payment"} (${formatLKR(payment?.amount ?? 0)}) will be removed from your schedule.`}
        confirmLabel="Delete Payment"
        danger
      />
    </>
  );
}

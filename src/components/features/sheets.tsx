"use client";

import { useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { BUDGET_CATEGORIES, BUDGET_STATUS_LABEL, RSVP_LABEL } from "@/lib/domain/catalog";
import { expectedCost, paidForItem } from "@/lib/domain/budget";
import { newId, nowISO } from "@/lib/domain/ids";
import { formatAmount } from "@/lib/domain/money";
import { BUDGET_ITEM_STATUSES, RSVP_STATUSES, type BudgetItem, type Guest, type WeddingData } from "@/lib/domain/types";
import { useStore } from "@/lib/store/provider";
import { cx } from "@/components/ui/primitives";

/**
 * Spreadsheet-style editing: every cell is an input, changes save when you
 * leave the cell (Tab / Enter / click away), and totals update as you go.
 */

function Cell({ value, onCommit, type = "text", align, placeholder, label }: { value: string; onCommit: (v: string) => void; type?: "text" | "money" | "number"; align?: "right"; placeholder?: string; label: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;
  const commit = () => {
    if (draft !== null && draft !== value) onCommit(draft);
    setDraft(null);
  };
  return (
    <input
      className={cx("sheet-cell", align === "right" && "text-right wos-num")}
      value={shown}
      placeholder={placeholder}
      aria-label={label}
      inputMode={type === "text" ? undefined : "numeric"}
      onFocus={(e) => {
        if (type === "money") setDraft(value.replace(/,/g, ""));
        e.currentTarget.select();
      }}
      onChange={(e) => setDraft(type === "text" ? e.target.value : e.target.value.replace(/[^\d]/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(null);
          e.currentTarget.blur();
        }
      }}
    />
  );
}

function SelectCell<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <select className="sheet-cell" value={value} aria-label={label} onChange={(e) => onChange(e.target.value as T)}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

const money = (n: number | null) => (n === null ? "" : formatAmount(n));
const parseMoney = (s: string): number | null => (s.trim() === "" ? null : Math.max(0, Math.round(Number(s.replace(/[^\d]/g, "")) || 0)));

function Sheet({ head, children, foot }: { head: ReactNode; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className="sheet-wrap">
      <table className="sheet">
        <thead>{head}</thead>
        <tbody>{children}</tbody>
        {foot && <tfoot>{foot}</tfoot>}
      </table>
    </div>
  );
}

export function BudgetSheet({ data }: { data: WeddingData }) {
  const store = useStore();
  const items = [...data.budgetItems].sort((a, b) => BUDGET_CATEGORIES.findIndex((c) => c.id === a.categoryId) - BUDGET_CATEGORIES.findIndex((c) => c.id === b.categoryId) || a.name.localeCompare(b.name));
  const save = (i: BudgetItem, patch: Partial<BudgetItem>) => store.upsert("budgetItems", { ...i, ...patch });
  const totals = items.reduce(
    (t, i) => {
      if (i.status === "cancelled") return t;
      const paid = paidForItem(i, data.payments);
      return { planned: t.planned + i.planned, quoted: t.quoted + (i.quoted ?? 0), final: t.final + (i.final ?? 0), expected: t.expected + expectedCost(i), paid: t.paid + paid };
    },
    { planned: 0, quoted: 0, final: 0, expected: 0, paid: 0 },
  );
  const add = () => {
    const now = nowISO();
    store.upsert("budgetItems", { id: newId(), categoryId: "miscellaneous", name: "New item", planned: 0, quoted: null, final: null, vendorId: null, status: "planned", notes: "", createdAt: now, updatedAt: now });
  };
  return (
    <div className="flex flex-col gap-3">
      <Sheet
        head={
          <tr>
            <th>Category</th><th>Item</th><th className="text-right">Planned</th><th className="text-right">Quoted</th><th className="text-right">Final</th><th className="text-right">Paid</th><th className="text-right">Balance</th><th>Status</th><th>Notes</th><th aria-label="Delete" />
          </tr>
        }
        foot={
          <tr>
            <td colSpan={2}>Total (LKR)</td>
            <td className="text-right wos-num">{formatAmount(totals.planned)}</td>
            <td className="text-right wos-num">{formatAmount(totals.quoted)}</td>
            <td className="text-right wos-num">{formatAmount(totals.final)}</td>
            <td className="text-right wos-num">{formatAmount(totals.paid)}</td>
            <td className="text-right wos-num">{formatAmount(Math.max(0, totals.expected - totals.paid))}</td>
            <td colSpan={3} />
          </tr>
        }
      >
        {items.map((i) => {
          const paid = paidForItem(i, data.payments);
          return (
            <tr key={i.id} className={cx(i.status === "cancelled" && "opacity-50")}>
              <td><SelectCell label="Category" value={i.categoryId} options={BUDGET_CATEGORIES.map((c) => [c.id, c.label])} onChange={(v) => save(i, { categoryId: v })} /></td>
              <td><Cell label="Item" value={i.name} onCommit={(v) => v.trim() && save(i, { name: v.trim().slice(0, 120) })} /></td>
              <td><Cell label="Planned" type="money" align="right" value={money(i.planned)} onCommit={(v) => save(i, { planned: parseMoney(v) ?? 0 })} /></td>
              <td><Cell label="Quoted" type="money" align="right" value={money(i.quoted)} onCommit={(v) => save(i, { quoted: parseMoney(v) })} /></td>
              <td><Cell label="Final" type="money" align="right" value={money(i.final)} onCommit={(v) => save(i, { final: parseMoney(v) })} /></td>
              <td className="text-right wos-num px-3 text-ink-muted">{paid ? formatAmount(paid) : ""}</td>
              <td className="text-right wos-num px-3 font-semibold">{formatAmount(Math.max(0, expectedCost(i) - paid))}</td>
              <td><SelectCell label="Status" value={i.status} options={BUDGET_ITEM_STATUSES.map((s) => [s, BUDGET_STATUS_LABEL[s]])} onChange={(v) => save(i, { status: v })} /></td>
              <td><Cell label="Notes" value={i.notes} onCommit={(v) => save(i, { notes: v.slice(0, 500) })} /></td>
              <td><button type="button" className="sheet-del" aria-label={`Delete ${i.name}`} onClick={() => { if (window.confirm(`Delete “${i.name}”?`)) store.remove("budgetItems", i.id); }}><Trash2 style={{ width: 16, height: 16 }} /></button></td>
            </tr>
          );
        })}
      </Sheet>
      <button type="button" className="wos-btn wos-btn--secondary self-start" onClick={add}><Plus className="wos-icon" aria-hidden="true" />Add Row</button>
    </div>
  );
}

export function GuestSheet({ guests }: { guests: Guest[] }) {
  const store = useStore();
  const save = (g: Guest, patch: Partial<Guest>) => store.upsert("guests", { ...g, ...patch });
  const add = () => {
    const now = nowISO();
    store.upsert("guests", {
      id: newId(), name: "New guest", phone: "", email: "", side: "bride", relation: "family", vip: false, partyType: "single", adults: 1, children: 0,
      invitation: "not_sent", rsvp: "pending", meal: "unknown", vegCount: 0, table: "", needsTransport: false, needsAccommodation: false, notes: "", rsvpToken: newId(), createdAt: now, updatedAt: now,
    });
  };
  const adults = guests.reduce((n, g) => n + g.adults, 0);
  const children = guests.reduce((n, g) => n + g.children, 0);
  return (
    <div className="flex flex-col gap-3">
      <Sheet
        head={<tr><th>Name</th><th>Side</th><th className="text-right">Adults</th><th className="text-right">Kids</th><th>Phone</th><th>RSVP</th><th>Table</th><th>Notes</th><th aria-label="Delete" /></tr>}
        foot={<tr><td colSpan={2}>{guests.length} invitations</td><td className="text-right wos-num">{adults}</td><td className="text-right wos-num">{children}</td><td colSpan={5}>{adults + children} people</td></tr>}
      >
        {guests.map((g) => (
          <tr key={g.id}>
            <td><Cell label="Name" value={g.name} onCommit={(v) => v.trim() && save(g, { name: v.trim().slice(0, 120) })} /></td>
            <td><SelectCell label="Side" value={g.side} options={[["bride", "Bride"], ["groom", "Groom"]]} onChange={(v) => save(g, { side: v })} /></td>
            <td><Cell label="Adults" type="number" align="right" value={String(g.adults)} onCommit={(v) => save(g, { adults: Math.min(50, Number(v) || 0) })} /></td>
            <td><Cell label="Children" type="number" align="right" value={String(g.children)} onCommit={(v) => save(g, { children: Math.min(50, Number(v) || 0) })} /></td>
            <td><Cell label="Phone" value={g.phone} onCommit={(v) => save(g, { phone: v.trim().slice(0, 30) })} /></td>
            <td><SelectCell label="RSVP" value={g.rsvp} options={RSVP_STATUSES.map((s) => [s, RSVP_LABEL[s]])} onChange={(v) => save(g, { rsvp: v, invitation: v !== "pending" && g.invitation !== "confirmed" ? "confirmed" : g.invitation })} /></td>
            <td><Cell label="Table" value={g.table} onCommit={(v) => save(g, { table: v.trim().slice(0, 40) })} /></td>
            <td><Cell label="Notes" value={g.notes} onCommit={(v) => save(g, { notes: v.slice(0, 500) })} /></td>
            <td><button type="button" className="sheet-del" aria-label={`Delete ${g.name}`} onClick={() => { if (window.confirm(`Delete “${g.name}”?`)) store.remove("guests", g.id); }}><Trash2 style={{ width: 16, height: 16 }} /></button></td>
          </tr>
        ))}
      </Sheet>
      <button type="button" className="wos-btn wos-btn--secondary self-start" onClick={add}><Plus className="wos-icon" aria-hidden="true" />Add Row</button>
    </div>
  );
}

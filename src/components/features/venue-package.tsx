"use client";

import { useState } from "react";
import { Hotel } from "lucide-react";
import { budgetCategoryLabel } from "@/lib/domain/catalog";
import { newId, nowISO } from "@/lib/domain/ids";
import { applyPackage, currentPackage, PACKAGE_CATEGORIES, type Coverage, type PackageChoice } from "@/lib/domain/venue-package";
import type { Vendor, WeddingData } from "@/lib/domain/types";
import { useStore } from "@/lib/store/provider";
import { Dialog } from "@/components/ui/dialog";
import { MoneyField } from "@/components/ui/fields";
import { useToast } from "@/components/shell/toast";
import { cx } from "@/components/ui/primitives";

const COVERAGE: { value: Coverage; label: string }[] = [
  { value: "no", label: "Not the hotel" },
  { value: "included", label: "In the price" },
  { value: "extra", label: "Hotel, extra charge" },
];

/** Button + dialog: tell the app what the hotel provides. */
export function VenuePackageButton({ data, className }: { data: WeddingData; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={cx("wos-btn wos-btn--secondary", className)} onClick={() => setOpen(true)}><Hotel className="wos-icon" aria-hidden="true" />Hotel Package</button>
      {open && <VenuePackageDialog data={data} onClose={() => setOpen(false)} />}
    </>
  );
}

function suggested(data: WeddingData, venueId: string | null): PackageChoice[] {
  const now = currentPackage(data, venueId);
  if (now.some((c) => c.coverage !== "no")) return now;
  // A sensible start for a hotel wedding: hall and food from the hotel, lights charged separately.
  const paradise = /paradise/i.test(`${data.planner.menu.venue} ${data.wedding.venue}`);
  return now.map((c) =>
    c.categoryId === "venue" || c.categoryId === "catering" ? { ...c, coverage: "included" } : c.categoryId === "lighting" && paradise ? { ...c, coverage: "extra", amount: 120_000 } : c,
  );
}

function VenuePackageDialog({ data, onClose }: { data: WeddingData; onClose: () => void }) {
  const store = useStore();
  const toast = useToast();
  const venues = data.vendors.filter((v) => v.categoryId === "venue" && v.status !== "cancelled");
  const [venueId, setVenueId] = useState<string>(venues[0]?.id ?? "new");
  const [newName, setNewName] = useState(data.planner.menu.venue.split("—")[0].trim() || data.wedding.venue || "");
  const [choices, setChoices] = useState<PackageChoice[]>(() => suggested(data, venues[0]?.id ?? null));
  const set = (categoryId: string, patch: Partial<PackageChoice>) => setChoices((cs) => cs.map((c) => (c.categoryId === categoryId ? { ...c, ...patch } : c)));
  const covered = choices.filter((c) => c.coverage !== "no").length;

  const save = () => {
    const now = nowISO();
    let venue: Vendor | undefined = data.vendors.find((v) => v.id === venueId);
    if (!venue) {
      if (!newName.trim()) return toast("Enter the hotel's name.", "danger");
      venue = { id: newId(), name: newName.trim().slice(0, 120), categoryId: "venue", contactName: "", phone: "", email: "", location: data.wedding.location, status: "booked", rating: null, notes: "", dayStatus: "not_arrived", arrivalTime: "", createdAt: now, updatedAt: now };
      store.upsert("vendors", venue);
    }
    const result = applyPackage(data, venue, choices, now, newId);
    if (result.vendor) store.upsert("vendors", result.vendor);
    if (result.budgetItems.length) store.upsert("budgetItems", result.budgetItems);
    if (result.tasks.length) store.upsert("tasks", result.tasks);
    toast(`${venue.name} now covers ${covered} ${covered === 1 ? "category" : "categories"}${result.ticked ? ` · ${result.ticked} booking tasks ticked off` : ""}.`);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title="What does the hotel provide?" description="Anything the hotel covers doesn't need a separate vendor: it's linked to the hotel in your budget, counts as booked, and the 'find and book' tasks are ticked off."
      footer={<><span className="spacer" /><button type="button" className="wos-btn wos-btn--secondary" onClick={onClose}>Cancel</button><button type="button" className="wos-btn wos-btn--primary" onClick={save}>Save Package</button></>}>
      <div className="flex flex-col gap-4">
        <label className="wos-field">
          <span className="text-[14px] font-semibold">Hotel</span>
          <select className="wos-input" value={venueId} onChange={(e) => { setVenueId(e.target.value); setChoices(suggested(data, e.target.value === "new" ? null : e.target.value)); }}>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            <option value="new">Add a new hotel…</option>
          </select>
        </label>
        {venueId === "new" && <label className="wos-field"><span className="text-[14px] font-semibold">Hotel name</span><input className="wos-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Paradise Inn, Bolgoda" /></label>}
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {PACKAGE_CATEGORIES.map((id) => {
            const c = choices.find((x) => x.categoryId === id)!;
            return (
              <li key={id} className={cx("flex flex-col gap-2 rounded-2xl border p-3", c.coverage !== "no" ? "border-wine-600 bg-wine-50" : "border-line")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b className="text-[15px]">{budgetCategoryLabel(id)}</b>
                  <div className="wos-tabs" role="radiogroup" aria-label={budgetCategoryLabel(id)}>
                    {COVERAGE.map((o) => (
                      <button key={o.value} type="button" role="radio" className="wos-tab !h-8 !px-3 !text-[13px]" aria-checked={c.coverage === o.value} onClick={() => set(id, { coverage: o.value })}>
                        {id === "catering" && o.value === "included" ? "Plate price" : o.label}
                      </button>
                    ))}
                  </div>
                </div>
                {c.coverage === "extra" && <MoneyField label="Hotel's charge" value={c.amount} onChange={(v) => set(id, { amount: v })} optional />}
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}

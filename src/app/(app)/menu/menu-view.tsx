"use client";

import { useState } from "react";
import { Check, ClipboardCopy, Lock, Pencil, Plus, Printer, Share2, Trash2, UtensilsCrossed, Wallet } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { usePlanner } from "@/lib/hooks/use-planner";
import { useStore } from "@/lib/store/provider";
import { newId, nowISO } from "@/lib/domain/ids";
import { guestMetrics } from "@/lib/domain/guests";
import { formatLKR } from "@/lib/domain/money";
import { CRYSTAL_GLOW_2027, emptyMenu, menuFromTemplate, menuProgress, menuText, toggleDish, venueBudgetLines, type MenuPlan } from "@/lib/domain/planner";
import type { WeddingData } from "@/lib/domain/types";
import { MoneyField, NumberField, TextArea } from "@/components/ui/fields";
import { Notice, PageHeader, cx } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";
import { Dialog } from "@/components/ui/dialog";

export function MenuView() {
  const page = usePage();
  if (!page) return <PageSkeleton />;
  return <Menu data={page.data} />;
}

function Menu({ data }: { data: WeddingData }) {
  const [menu, setMenu] = usePlanner("menu");
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const gm = guestMetrics(data.guests, data.wedding);
  const heads = gm.expectedAttendance || data.wedding.estimatedGuests;

  if (menu.sections.length === 0) {
    return (
      <>
        <PageHeader overline="Food" title="Menu" lead="Choose your dishes course by course. Your partner sees every choice, and you can send the final menu straight to the caterer." />
        <div className="grid gap-4 md:grid-cols-2">
          <button type="button" className="plan-tile !gap-3 text-left" onClick={() => setMenu(menuFromTemplate(CRYSTAL_GLOW_2027))}>
            <span className="grid size-12 place-items-center rounded-2xl bg-wine-50 text-wine-600"><UtensilsCrossed className="wos-icon" aria-hidden="true" /></span>
            <span className="font-display text-[26px] leading-8">Paradise Inn — Crystal Glow</span>
            <span className="text-[14px] text-ink-muted">Bolgoda · Crystal Atrium · 2027 menu card. Welcome drink, 3 appetizers, 4 salads, soup, prawns, seafood, chicken, pork, 4 vegetables, 3 rice &amp; noodles, 5 desserts.</span>
            <span className="font-semibold text-wine-600">LKR 11,000 per plate</span>
          </button>
          <button type="button" className="plan-tile !gap-3 text-left" onClick={() => { setMenu({ ...emptyMenu(), menuName: "Our menu", sections: [{ id: newId(), title: "Mains", pick: 2, items: [] }] }); setEditing(true); }}>
            <span className="grid size-12 place-items-center rounded-2xl bg-champagne-100 text-champagne-700"><Plus className="wos-icon" aria-hidden="true" /></span>
            <span className="font-display text-[26px] leading-8">Another venue&apos;s menu</span>
            <span className="text-[14px] text-ink-muted">Type in the courses and dishes from any menu card, then choose like above.</span>
          </button>
        </div>
      </>
    );
  }

  const progress = menuProgress(menu);
  const total = menu.pricePerHead * heads;
  const allChosen = progress.open.length === 0;

  const pick = (sectionId: string, dish: string) => {
    const next = toggleDish(menu, sectionId, dish);
    if (!next) {
      const sec = menu.sections.find((x) => x.id === sectionId);
      toast(`You can choose ${sec?.pick} ${sec?.title.toLowerCase()}. Untick one first.`, "danger");
      return;
    }
    setMenu(next);
  };

  const text = menuText(menu, `${data.wedding.brideName} & ${data.wedding.groomName}`);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Menu copied.");
    } catch {
      toast("Couldn't copy in this browser.", "danger");
    }
  };

  return (
    <>
      <div className="no-print">
        <PageHeader
          overline="Food"
          title={menu.menuName || "Menu"}
          lead={menu.venue || "Choose your dishes course by course."}
          actions={
            <>
              <button type="button" className="wos-btn wos-btn--secondary" onClick={() => setEditing((v) => !v)}><Pencil className="wos-icon" aria-hidden="true" />{editing ? "Done Editing" : "Edit Menu"}</button>
              <button type="button" className="wos-btn wos-btn--primary" onClick={() => window.print()}><Printer className="wos-icon" aria-hidden="true" />Print</button>
            </>
          }
        />
      </div>

      <section className="menu-summary no-print" aria-label="Menu summary">
        <div className="flex flex-col">
          <span className="wos-overline">Per plate</span>
          <span className="font-display text-[30px] leading-9">{formatLKR(menu.pricePerHead)}</span>
          {menu.listedPrice && menu.listedPrice !== menu.pricePerHead && <span className="text-[12px] text-ink-muted">Menu card: {formatLKR(menu.listedPrice)}</span>}
        </div>
        <div className="flex flex-col">
          <span className="wos-overline">Guests</span>
          <span className="font-display text-[30px] leading-9">{heads}</span>
          <span className="text-[12px] text-ink-muted">Expected from your guest list</span>
        </div>
        <div className="flex flex-col">
          <span className="wos-overline">Food total</span>
          <span className="font-display text-[30px] leading-9 text-wine-600">{formatLKR(total)}</span>
          <button type="button" className="wos-link self-start text-[13px]" onClick={() => setBudgetOpen(true)}>Add to budget</button>
        </div>
        <div className="flex flex-col gap-2">
          <span className="wos-overline">Chosen</span>
          <span className="font-display text-[30px] leading-9">{progress.done}/{progress.total} <small className="font-sans text-[13px] text-ink-muted">courses</small></span>
          <div className="plan-tile__bar !mt-0"><i style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
        </div>
      </section>

      {menu.finalizedAt ? (
        <Notice tone="success" icon={<Lock className="wos-icon" />} title="Menu is final." action={<button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => setMenu({ ...menu, finalizedAt: null })}>Reopen</button>}>
          Send it to the venue: <button type="button" className="wos-link" onClick={() => void copy()}>copy the text</button> or print it.
        </Notice>
      ) : allChosen ? (
        <Notice tone="info" icon={<Check className="wos-icon" />} title="Every course is chosen." action={<button type="button" className="wos-btn wos-btn--primary wos-btn--sm" onClick={() => setMenu({ ...menu, finalizedAt: nowISO() })}>Mark Menu Final</button>}>
          Look it over together, then mark it final.
        </Notice>
      ) : (
        <p className="m-0 text-[15px] text-ink-muted no-print">Still to choose: {progress.open.map((x) => `${x.title.toLowerCase()} (${(menu.chosen[x.id] ?? []).length}/${x.pick})`).join(", ")}.</p>
      )}

      <div className="print-only">
        <h1 className="font-display text-[34px]">{data.wedding.brideName} &amp; {data.wedding.groomName}</h1>
        <p>{menu.menuName} · {menu.venue}</p>
      </div>

      <div className="menu-grid">
        {menu.sections.map((sec) => {
          const chosen = menu.chosen[sec.id] ?? [];
          const full = sec.pick > 0 && chosen.length >= sec.pick;
          return (
            <section key={sec.id} className="wos-card flex flex-col gap-3" aria-labelledby={`m-${sec.id}`}>
              <div className="flex items-baseline justify-between gap-2">
                {editing ? (
                  <input className="wos-input !h-9 font-semibold" value={sec.title} aria-label="Course name" onChange={(e) => setMenu(editSection(menu, sec.id, { title: e.target.value }))} />
                ) : (
                  <h2 id={`m-${sec.id}`} className="m-0 font-display text-[22px] leading-7">{sec.title}</h2>
                )}
                {editing ? (
                  <label className="flex items-center gap-1 text-[12px] font-semibold text-ink-muted">Choose
                    <input type="number" min={0} max={20} className="wos-input !h-9 !w-16" value={sec.pick} onChange={(e) => setMenu(editSection(menu, sec.id, { pick: Math.max(0, Math.min(20, Number(e.target.value) || 0)) }))} />
                  </label>
                ) : sec.pick === 0 ? (
                  <span className="text-[12px] font-semibold text-sage-600">Included</span>
                ) : (
                  <span className={cx("wos-num text-[13px] font-semibold", full ? "text-success" : "text-ink-muted")}>{chosen.length} of {sec.pick}</span>
                )}
              </div>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {sec.items.map((dish) => {
                  const on = sec.pick === 0 || chosen.includes(dish);
                  return (
                    <li key={dish} className={cx(!on && "print-hide")}>
                      {editing ? (
                        <span className="dish-chip">
                          {dish}
                          <button type="button" className="ml-1 border-0 bg-transparent p-0 text-ink-muted" aria-label={`Remove ${dish}`} onClick={() => setMenu(editSection(menu, sec.id, { items: sec.items.filter((d) => d !== dish) }))}><Trash2 style={{ width: 14, height: 14 }} /></button>
                        </span>
                      ) : sec.pick === 0 ? (
                        <span className="dish-chip dish-chip--included">{dish}</span>
                      ) : (
                        <button type="button" className={cx("dish-chip", on && "dish-chip--on", !on && full && "dish-chip--muted")} aria-pressed={on} onClick={() => pick(sec.id, dish)}>
                          {on && <Check style={{ width: 14, height: 14 }} aria-hidden="true" />}{dish}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {editing && <AddDish onAdd={(d) => setMenu(editSection(menu, sec.id, { items: [...sec.items, d] }))} />}
              {editing && <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm self-start" onClick={() => setMenu({ ...menu, sections: menu.sections.filter((x) => x.id !== sec.id) })}><Trash2 className="wos-icon" aria-hidden="true" />Remove course</button>}
            </section>
          );
        })}
        {editing && (
          <button type="button" className="grid min-h-[120px] place-items-center rounded-[24px] border border-dashed border-line-strong text-ink-muted" onClick={() => setMenu({ ...menu, sections: [...menu.sections, { id: newId(), title: "New course", pick: 1, items: [] }] })}>
            <span className="flex items-center gap-2 font-semibold"><Plus className="wos-icon" aria-hidden="true" />Add course</span>
          </button>
        )}
      </div>

      {editing && (
        <section className="wos-card grid gap-4 md:grid-cols-3">
          <label className="wos-field"><span className="text-[14px] font-semibold">Menu name</span><input className="wos-input" value={menu.menuName} onChange={(e) => setMenu({ ...menu, menuName: e.target.value })} /></label>
          <label className="wos-field"><span className="text-[14px] font-semibold">Venue</span><input className="wos-input" value={menu.venue} onChange={(e) => setMenu({ ...menu, venue: e.target.value })} /></label>
          <MoneyField label="Price per plate" value={menu.pricePerHead} onChange={(v) => setMenu({ ...menu, pricePerHead: v ?? 0 })} />
          <button type="button" className="wos-btn wos-btn--ghost self-start text-danger" onClick={() => { setMenu(emptyMenu()); setEditing(false); }}><Trash2 className="wos-icon" aria-hidden="true" />Start over with another menu</button>
        </section>
      )}

      <section className="wos-card flex flex-col gap-3 no-print">
        <TextArea label="Notes for the caterer" value={menu.notes} onChange={(v) => setMenu({ ...menu, notes: v.slice(0, 1000) })} placeholder="Spice level, kids' meals, vegetarian table, Jain meals…" />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="wos-btn wos-btn--secondary" onClick={() => void copy()}><ClipboardCopy className="wos-icon" aria-hidden="true" />Copy Menu</button>
          <a className="wos-btn wos-btn--secondary" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><Share2 className="wos-icon" aria-hidden="true" />Share on WhatsApp</a>
        </div>
      </section>

      <BudgetDialog open={budgetOpen} onClose={() => setBudgetOpen(false)} data={data} menu={menu} heads={heads} />
    </>
  );
}

function editSection(menu: MenuPlan, id: string, patch: Partial<MenuPlan["sections"][number]>): MenuPlan {
  const sections = menu.sections.map((x) => (x.id === id ? { ...x, ...patch } : x));
  // Drop choices that no longer exist or exceed the new limit.
  const chosen = { ...menu.chosen };
  const sec = sections.find((x) => x.id === id);
  if (sec) chosen[id] = (chosen[id] ?? []).filter((d) => sec.items.includes(d)).slice(0, sec.pick || undefined);
  return { ...menu, sections, chosen };
}

function AddDish({ onAdd }: { onAdd: (dish: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v.trim().slice(0, 120)); setV(""); } }}>
      <input className="wos-input !h-9 flex-1" placeholder="Add a dish" value={v} onChange={(e) => setV(e.target.value)} aria-label="New dish" />
      <button type="submit" className="wos-btn wos-btn--secondary wos-btn--sm">Add</button>
    </form>
  );
}

function BudgetDialog({ open, onClose, data, menu, heads }: { open: boolean; onClose: () => void; data: WeddingData; menu: MenuPlan; heads: number }) {
  const store = useStore();
  const toast = useToast();
  const paradise = /paradise/i.test(menu.venue);
  const [guests, setGuests] = useState(heads);
  const [lighting, setLighting] = useState<number | null>(paradise ? 120_000 : null);
  const [decorMin, setDecorMin] = useState<number | null>(paradise ? 175_000 : null);
  const [decorMax, setDecorMax] = useState<number | null>(paradise ? 1_500_000 : null);
  const save = () => {
    const lines = venueBudgetLines(data.budgetItems, { menuName: menu.menuName || "Menu", pricePerHead: menu.pricePerHead, heads: guests, lighting, decorMin, decorMax }, nowISO(), newId);
    store.upsert("budgetItems", lines);
    toast("Budget updated.");
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} title="Add the venue to your budget" description="Updates your catering line and adds the venue's extras. Nothing is booked or paid."
      footer={<><span className="spacer" /><button type="button" className="wos-btn wos-btn--secondary" onClick={onClose}>Cancel</button><button type="button" className="wos-btn wos-btn--primary" onClick={save}><Wallet className="wos-icon" aria-hidden="true" />Update Budget</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Guests to cater for" value={guests} onChange={(v) => setGuests(v ?? 0)} min={0} />
        <div className="flex flex-col justify-end pb-1 text-[14px]">Food: <b className="font-display text-[24px]">{formatLKR(menu.pricePerHead * guests)}</b></div>
        <MoneyField label="Light operation" value={lighting} onChange={setLighting} optional />
        <span />
        <MoneyField label="Decor packages from" value={decorMin} onChange={setDecorMin} optional />
        <MoneyField label="Decor packages up to" value={decorMax} onChange={setDecorMax} optional />
      </div>
    </Dialog>
  );
}

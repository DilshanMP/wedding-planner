"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { Armchair, Box, Copy, Eye, GripVertical, LayoutGrid, Plus, Printer, RotateCcw, RotateCw, Ruler, Shuffle, Trash2, Trees, Users, X } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { usePlanner } from "@/lib/hooks/use-planner";
import { newId } from "@/lib/domain/ids";
import { guestMetrics } from "@/lib/domain/guests";
import { defaultSeating, FIXTURE_LABEL, FIXTURE_SIZE, seatsUsed, type Fixture, type FixtureKind, type SeatingPlan, type SeatTable } from "@/lib/domain/planner";
import type { Guest, WeddingData } from "@/lib/domain/types";
import { Notice, PageHeader, SideChip, cx } from "@/components/ui/primitives";
import { NumberField, Toggle } from "@/components/ui/fields";
import { FloorPlan, type Selection } from "@/components/features/venue-designer";
import type { CameraPreset } from "@/components/features/venue-3d";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";

export function TablesView() {
  const page = usePage();
  if (!page) return <PageSkeleton />;
  return <Tables data={page.data} />;
}

const size = (g: Guest) => g.adults + g.children;

const Venue3D = dynamic(() => import("@/components/features/venue-3d"), {
  ssr: false,
  loading: () => <div className="venue-3d grid place-items-center text-ink-muted">Building your hall in 3D…</div>,
});

function Tables({ data }: { data: WeddingData }) {
  const [plan, setPlan] = usePlanner("seating");
  const [theme] = usePlanner("theme");
  const toast = useToast();
  const [view, setView] = useState<"plan" | "3d">("plan");
  const [selection, setSelection] = useState<Selection>(null);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [snap, setSnap] = useState(true);
  const [showNames, setShowNames] = useState(false);
  const [evening, setEvening] = useState(true);
  const [preset, setPreset] = useState<CameraPreset>("entrance");
  const [presetKey, setPresetKey] = useState(0);
  const [spin, setSpin] = useState(false);
  const [filter, setFilter] = useState("");

  const guests = useMemo(() => data.guests.filter((g) => g.rsvp !== "no"), [data.guests]);
  const byId = useMemo(() => new Map(data.guests.map((g) => [g.id, g])), [data.guests]);
  const partySize = useCallback((id: string) => {
    const g = byId.get(id);
    return g ? size(g) : 0;
  }, [byId]);
  const guestName = useCallback((id: string) => byId.get(id)?.name ?? "Removed guest", [byId]);
  const seatedIds = new Set(plan.tables.flatMap((t) => t.guestIds));
  const unseated = guests.filter((g) => !seatedIds.has(g.id));
  const shownUnseated = unseated.filter((g) => !filter || `${g.name} ${g.category}`.toLowerCase().includes(filter.toLowerCase()));
  const people = guests.reduce((n, g) => n + size(g), 0);
  const seated = plan.tables.reduce((n, t) => n + seatsUsed(t, partySize), 0);
  const seats = plan.tables.reduce((n, t) => n + t.seats, 0);
  const outdoor = plan.outdoorDepth ?? 0;

  if (plan.tables.length === 0 && plan.fixtures.length === 0) return <Setup data={data} onCreate={setPlan} />;

  const setTable = (id: string, patch: Partial<SeatTable>) => setPlan((p) => ({ ...p, tables: p.tables.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const setFixture = (id: string, patch: Partial<Fixture>) => setPlan((p) => ({ ...p, fixtures: p.fixtures.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
  const seat = (tableId: string, guestId: string) => {
    const table = plan.tables.find((t) => t.id === tableId);
    if (!table) return;
    const already = table.guestIds.includes(guestId);
    const free = table.seats - seatsUsed(table, partySize) + (already ? partySize(guestId) : 0);
    if (partySize(guestId) > free) {
      toast(`${table.label} has ${free} free seat${free === 1 ? "" : "s"}; ${byId.get(guestId)?.name} need ${partySize(guestId)}.`, "danger");
      return;
    }
    setPlan((p) => ({ ...p, tables: p.tables.map((t) => (t.id === tableId ? { ...t, guestIds: already ? t.guestIds : [...t.guestIds, guestId] } : { ...t, guestIds: t.guestIds.filter((x) => x !== guestId) })) }));
    setSelectedGuest(null);
    toast(`${byId.get(guestId)?.name} → ${table.label}`);
  };

  const autoSeat = () => {
    // Bride's side fills tables from the left, groom's side from the right; families and VIPs first.
    const tables = plan.tables.map((t) => ({ ...t, guestIds: [...t.guestIds] }));
    const order = (side: Guest["side"]) => [...tables].sort((a, b) => (side === "groom" ? b.x - a.x : a.x - b.x) || a.y - b.y);
    for (const side of ["bride", "groom", "both"] as const) {
      const list = unseated.filter((g) => g.side === side).sort((a, b) => Number(b.vip) - Number(a.vip) || a.category.localeCompare(b.category) || size(b) - size(a));
      for (const g of list) {
        const t = order(side).find((x) => x.seats - seatsUsed(x, partySize) >= size(g));
        if (t) t.guestIds.push(g.id);
      }
    }
    setPlan((p) => ({ ...p, tables }));
    toast("Guests seated by side and category. Move anyone you like.");
  };

  const addTable = (shape: SeatTable["shape"]) => {
    const t: SeatTable = { id: newId(), label: `Table ${plan.tables.length + 1}`, x: plan.width / 2, y: Math.max(2, plan.depth - 4), seats: shape === "long" ? 12 : shape === "square" ? 8 : 10, shape, guestIds: [], rotation: 0 };
    setPlan((p) => ({ ...p, tables: [...p.tables, t] }));
    setSelection({ kind: "table", id: t.id });
  };
  const addFixture = (kind: FixtureKind) => {
    const [w, h] = FIXTURE_SIZE[kind];
    const f: Fixture = { id: newId(), kind, label: FIXTURE_LABEL[kind], x: plan.width / 2, y: plan.depth / 2, w, h, rotation: 0 };
    setPlan((p) => ({ ...p, fixtures: [...p.fixtures, f] }));
    setSelection({ kind: "fixture", id: f.id });
    toast(`${f.label} added in the middle. Drag it into place.`);
  };

  const table = selection?.kind === "table" ? plan.tables.find((t) => t.id === selection.id) ?? null : null;
  const fixture = selection?.kind === "fixture" ? plan.fixtures.find((f) => f.id === selection.id) ?? null : null;
  const remove = () => {
    if (!selection) return;
    setPlan((p) => selection.kind === "table" ? { ...p, tables: p.tables.filter((t) => t.id !== selection.id) } : { ...p, fixtures: p.fixtures.filter((f) => f.id !== selection.id) });
    setSelection(null);
  };
  const duplicate = () => {
    if (table) {
      const copy = { ...table, id: newId(), label: `Table ${plan.tables.length + 1}`, x: Math.min(plan.width, table.x + 3), guestIds: [] };
      setPlan((p) => ({ ...p, tables: [...p.tables, copy] }));
      setSelection({ kind: "table", id: copy.id });
    } else if (fixture) {
      const copy = { ...fixture, id: newId(), x: Math.min(plan.width, fixture.x + fixture.w + 0.5) };
      setPlan((p) => ({ ...p, fixtures: [...p.fixtures, copy] }));
      setSelection({ kind: "fixture", id: copy.id });
    }
  };
  const moveOutside = (item: { id: string; y: number }, kind: "table" | "fixture") => {
    const out = item.y > plan.depth;
    const od = outdoor || 10;
    const y = out ? plan.depth - 3 : plan.depth + od / 2;
    setPlan((p) => ({
      ...p,
      outdoorDepth: od,
      outdoorLabel: p.outdoorLabel || "Lakeside lawn",
      tables: kind === "table" ? p.tables.map((t) => (t.id === item.id ? { ...t, y } : t)) : p.tables,
      fixtures: kind === "fixture" ? p.fixtures.map((f) => (f.id === item.id ? { ...f, y } : f)) : p.fixtures,
    }));
    toast(out ? "Moved inside the hall." : `Moved outside to the ${plan.outdoorLabel || "lakeside lawn"}.`);
  };
  const pickTable = (id: string) => (selectedGuest ? seat(id, selectedGuest) : setSelection(selection?.kind === "table" && selection.id === id ? null : { kind: "table", id }));
  const go = (p: CameraPreset) => {
    setPreset(p);
    setPresetKey((k) => k + 1);
  };

  return (
    <>
      <div className="no-print">
        <PageHeader
          overline="People"
          title="Tables & venue"
          lead={`${plan.hallName || "Your hall"} · ${plan.width} × ${plan.depth} m${outdoor ? ` + ${outdoor} m outdoors` : ""} · ${plan.tables.length} tables · ${seats} seats`}
          actions={
            <>
              <div className="wos-tabs" role="tablist" aria-label="View">
                <button type="button" role="tab" className="wos-tab" aria-selected={view === "plan"} onClick={() => setView("plan")}><LayoutGrid className="wos-icon" aria-hidden="true" />Floor plan</button>
                <button type="button" role="tab" className="wos-tab" aria-selected={view === "3d"} onClick={() => setView("3d")}><Box className="wos-icon" aria-hidden="true" />3D view</button>
              </div>
              <Link href="/guests/report" className="wos-btn wos-btn--secondary"><Users className="wos-icon" aria-hidden="true" />Guest report</Link>
              <button type="button" className="wos-btn wos-btn--secondary" onClick={() => window.print()}><Printer className="wos-icon" aria-hidden="true" />Print</button>
            </>
          }
        />
      </div>

      <section className="menu-summary no-print" aria-label="Seating summary">
        <Stat label="Seated" value={`${seated} / ${people}`} detail="people (not counting ‘No’ replies)" />
        <Stat label="Free seats" value={String(Math.max(0, seats - seated))} detail={seats < people ? `${people - seats} more seats needed` : "Enough seats"} warn={seats < people} />
        <Stat label="Waiting for a table" value={String(unseated.length)} detail="guest parties" />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="wos-btn wos-btn--primary wos-btn--sm" onClick={autoSeat} disabled={unseated.length === 0}><Shuffle className="wos-icon" aria-hidden="true" />Seat Everyone</button>
          <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => addTable("round")}><Plus className="wos-icon" aria-hidden="true" />Round</button>
          <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => addTable("long")}><Plus className="wos-icon" aria-hidden="true" />Long</button>
          <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => addTable("square")}><Plus className="wos-icon" aria-hidden="true" />Square</button>
        </div>
      </section>

      {selectedGuest && (
        <Notice tone="info" icon={<Armchair className="wos-icon" />} title={`Tap a table to seat ${byId.get(selectedGuest)?.name} (${partySize(selectedGuest)})`} action={<button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => setSelectedGuest(null)}>Cancel</button>}>
          Tables with enough free seats are highlighted in green.
        </Notice>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <section aria-label="Hall" className="flex min-w-0 flex-col gap-3">
          {view === "plan" ? (
            <>
              <div className="flex flex-wrap items-center gap-4 no-print">
                <Toggle label="Snap to grid" checked={snap} onChange={setSnap} />
                <Toggle label="Show names" checked={showNames} onChange={setShowNames} />
              </div>
              <FloorPlan plan={plan} setPlan={setPlan} partySize={partySize} guestName={guestName} selection={selection} onSelect={setSelection}
                onTableTap={pickTable} selectedGuest={selectedGuest} onDropGuest={seat} colors={theme.colors} showNames={showNames} snap={snap} />
              <p className="m-0 text-[13px] text-ink-muted no-print">Tap anything to select it, then drag to move, use the round handle to turn and the square handle to resize. Drag a guest from the list onto a table. Keys: arrows move, R turns, Delete removes.</p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 no-print">
                {([["entrance", "From the entrance"], ["poruwa", "From the Poruwa"], ["guest", "A guest's seat"], ["above", "Bird's eye"]] as [CameraPreset, string][]).map(([p, label]) => (
                  <button key={p} type="button" className="wos-chip" aria-pressed={preset === p} onClick={() => go(p)}><Eye className="size-3.5" aria-hidden="true" />{label}</button>
                ))}
                <span className="flex-1" />
                <Toggle label="Evening lights" checked={evening} onChange={setEvening} />
                <Toggle label="Slowly turn" checked={spin} onChange={setSpin} />
              </div>
              <Venue3D plan={plan} colors={theme.colors} partySize={partySize} evening={evening} preset={preset} presetKey={presetKey} autoRotate={spin} onPickTable={pickTable} />
              <p className="m-0 text-[13px] text-ink-muted no-print">Drag to look around, scroll or pinch to zoom, right-drag (two fingers) to slide. Tap a table to see who sits there. Coloured figures are seated guests.</p>
            </>
          )}
        </section>

        <aside className="flex flex-col gap-4 no-print">
          {table && (
            <TablePanel table={table} byId={byId} partySize={partySize} unseated={unseated} onSeat={(gid) => seat(table.id, gid)} onChange={(patch) => setTable(table.id, patch)} onClose={() => setSelection(null)}
              onDelete={remove} onDuplicate={duplicate} onOutside={() => moveOutside(table, "table")} outside={table.y > plan.depth} />
          )}
          {fixture && (
            <FixturePanel fixture={fixture} onChange={(patch) => setFixture(fixture.id, patch)} onClose={() => setSelection(null)} onDelete={remove} onDuplicate={duplicate}
              onOutside={() => moveOutside(fixture, "fixture")} outside={fixture.y > plan.depth} />
          )}
          <section className="wos-card flex flex-col gap-3" aria-labelledby="h-unseated">
            <h2 id="h-unseated" className="wos-card__title">Waiting for a table <span className="text-ink-muted">({unseated.length})</span></h2>
            {unseated.length > 6 && <input type="search" className="wos-input" placeholder="Find a guest or category" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Find a guest" />}
            {unseated.length === 0 ? (
              <p className="m-0 text-[14px] text-ink-muted">{guests.length ? "Everyone has a seat. 🎉" : "Add guests first, then seat them here."}</p>
            ) : (
              <ul className="m-0 flex max-h-[440px] list-none flex-col gap-1 overflow-y-auto p-0">
                {shownUnseated.map((g) => (
                  <li key={g.id}>
                    <button type="button" draggable onDragStart={(e) => { e.dataTransfer.setData("text/guest-id", g.id); e.dataTransfer.effectAllowed = "move"; }}
                      onClick={() => setSelectedGuest(selectedGuest === g.id ? null : g.id)} className={cx("flex w-full cursor-grab items-center gap-2 rounded-xl border px-3 py-2 text-left", selectedGuest === g.id ? "border-wine-600 bg-wine-50" : "border-transparent hover:bg-surface-sunken")} aria-pressed={selectedGuest === g.id}>
                      <GripVertical className="size-4 flex-none text-ink-muted" aria-hidden="true" />
                      <SideChip side={g.side} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold">{g.name}</span>
                        {g.category && <span className="block truncate text-[12px] text-ink-muted">{g.category}</span>}
                      </span>
                      <span className="wos-num text-[13px] text-ink-muted">{size(g)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <HallPanel plan={plan} setPlan={setPlan} />
          <AddFixture onAdd={addFixture} />
          <button type="button" className="wos-btn wos-btn--ghost self-start text-danger" onClick={() => { if (window.confirm("Start the hall layout again? Seating will be cleared.")) { setPlan((p) => ({ ...p, tables: [], fixtures: [] })); setSelection(null); } }}><RotateCcw className="wos-icon" aria-hidden="true" />Start over</button>
        </aside>
      </div>

      {/* Printable seating list */}
      <section className="print-only">
        <h1 className="font-display text-[30px]">{data.wedding.brideName} &amp; {data.wedding.groomName} — seating</h1>
        {plan.tables.map((t) => (
          <div key={t.id} style={{ breakInside: "avoid", marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, margin: "8px 0 4px" }}>{t.label} ({seatsUsed(t, partySize)}/{t.seats})</h2>
            <p style={{ margin: 0, fontSize: 13 }}>{t.guestIds.map((id) => `${byId.get(id)?.name ?? ""} (${partySize(id)})`).join(" · ") || "—"}</p>
          </div>
        ))}
      </section>
    </>
  );
}

function Stat({ label, value, detail, warn }: { label: string; value: string; detail: string; warn?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="wos-overline">{label}</span>
      <span className={cx("font-display text-[30px] leading-9", warn && "text-danger")}>{value}</span>
      <span className="text-[12px] text-ink-muted">{detail}</span>
    </div>
  );
}

function Setup({ data, onCreate }: { data: WeddingData; onCreate: (p: SeatingPlan) => void }) {
  const gm = guestMetrics(data.guests, data.wedding);
  const expected = gm.expectedAttendance || data.wedding.estimatedGuests;
  const paradise = /paradise/i.test(`${data.planner.menu.venue} ${data.wedding.venue}`);
  const [hall, setHall] = useState(paradise ? "Crystal Atrium, Paradise Inn" : data.wedding.venue);
  const [tables, setTables] = useState(Math.max(1, Math.ceil(expected / 10)));
  const [outside, setOutside] = useState(paradise);
  const create = () => {
    const plan = defaultSeating(hall, tables, newId);
    if (!outside) return onCreate(plan);
    // Poruwa and bar out on the lawn, under the sky.
    const od = 12;
    onCreate({
      ...plan,
      outdoorDepth: od,
      outdoorLabel: paradise ? "Lakeside lawn" : "Garden",
      fixtures: plan.fixtures.map((f) => (f.kind === "poruwa" ? { ...f, x: plan.width / 2, y: plan.depth + od / 2 } : f.kind === "bar" ? { ...f, x: plan.width - 4, y: plan.depth + od / 2, w: 3.5, h: 1.2 } : f)),
    });
  };
  return (
    <>
      <PageHeader overline="People" title="Tables & venue" lead="Lay out your hall, move and turn everything, and seat your guests — then walk around it in 3D." />
      <section className="wos-card flex max-w-[640px] flex-col gap-4">
        <h2 className="wos-h2">Set up your hall</h2>
        <label className="wos-field"><span className="text-[14px] font-semibold">Hall</span><input className="wos-input" value={hall} onChange={(e) => setHall(e.target.value)} /></label>
        <NumberField label="Round tables (10 seats each)" value={tables} onChange={(v) => setTables(Math.max(1, Math.min(80, v ?? 1)))} min={1} max={80} help={`About ${expected} guests expected → ${Math.ceil(expected / 10)} tables`} />
        <Toggle label="Poruwa and bar outdoors (garden or lakeside)" checked={outside} onChange={setOutside} />
        <button type="button" className="wos-btn wos-btn--primary self-start" onClick={create}>Create Layout</button>
        <p className="m-0 text-[13px] text-ink-muted">You&apos;ll get a Poruwa, head table, dance floor, buffet, bar and band area to start with. Move, turn, resize or remove anything to match your hall.</p>
      </section>
    </>
  );
}

function RotateControl({ value, onChange }: { value: number; onChange: (deg: number) => void }) {
  const norm = (d: number) => ((Math.round(d) % 360) + 360) % 360;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[13px] font-semibold text-ink-muted"><span>Turn</span><span className="wos-num">{value}°</span></div>
      <div className="flex items-center gap-2">
        <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm !px-2" aria-label="Turn left 15 degrees" onClick={() => onChange(norm(value - 15))}><RotateCcw className="wos-icon" /></button>
        <input type="range" min={0} max={359} value={value} onChange={(e) => onChange(Number(e.target.value))} className="money-slider__range flex-1" style={{ "--pct": `${(value / 359) * 100}%` } as CSSProperties} aria-label="Turn (degrees)" />
        <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm !px-2" aria-label="Turn right 15 degrees" onClick={() => onChange(norm(value + 15))}><RotateCw className="wos-icon" /></button>
      </div>
      <div className="flex gap-1">{[0, 45, 90, 135].map((d) => <button key={d} type="button" className="wos-chip !h-7 !px-3" aria-pressed={value === d} onClick={() => onChange(d)}>{d}°</button>)}</div>
    </div>
  );
}

function PanelActions({ onDuplicate, onDelete, onOutside, outside }: { onDuplicate: () => void; onDelete: () => void; onOutside: () => void; outside: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={onOutside}><Trees className="wos-icon" aria-hidden="true" />{outside ? "Move inside" : "Move outdoors"}</button>
      <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={onDuplicate}><Copy className="wos-icon" aria-hidden="true" />Duplicate</button>
      <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm text-danger" onClick={onDelete}><Trash2 className="wos-icon" aria-hidden="true" />Remove</button>
    </div>
  );
}

function TablePanel({ table, byId, partySize, unseated, onSeat, onChange, onClose, onDelete, onDuplicate, onOutside, outside }: {
  table: SeatTable; byId: Map<string, Guest>; partySize: (id: string) => number; unseated: Guest[]; onSeat: (guestId: string) => void;
  onChange: (patch: Partial<SeatTable>) => void; onClose: () => void; onDelete: () => void; onDuplicate: () => void; onOutside: () => void; outside: boolean;
}) {
  const used = seatsUsed(table, partySize);
  return (
    <section className="wos-card vd-panel flex flex-col gap-3" aria-label={table.label}>
      <div className="flex items-center gap-2">
        <input className="wos-input !h-10 flex-1 font-semibold" value={table.label} onChange={(e) => onChange({ label: e.target.value.slice(0, 40) })} aria-label="Table name" />
        <button type="button" className="wos-iconbtn" aria-label="Close" onClick={onClose}><X className="wos-icon" /></button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[14px]">
        <label className="flex items-center gap-2 font-semibold text-ink-muted">Seats
          <input type="number" min={2} max={30} className="wos-input !h-9 !w-20" value={table.seats} onChange={(e) => onChange({ seats: Math.max(2, Math.min(30, Number(e.target.value) || 2)) })} />
        </label>
        <div className="wos-tabs" role="tablist" aria-label="Shape">
          {(["round", "long", "square"] as const).map((sh) => <button key={sh} type="button" role="tab" className="wos-tab" aria-selected={table.shape === sh} onClick={() => onChange({ shape: sh })}>{sh[0].toUpperCase() + sh.slice(1)}</button>)}
        </div>
      </div>
      {table.shape !== "round" && <RotateControl value={table.rotation ?? 0} onChange={(rotation) => onChange({ rotation })} />}
      <div className="flex items-center justify-between">
        <b className="text-[14px]">Who sits here</b>
        <span className={cx("wos-num text-[13px] font-semibold", used > table.seats ? "text-danger" : "text-ink-muted")}>{used}/{table.seats} seats</span>
      </div>
      {table.guestIds.length === 0 ? (
        <p className="m-0 text-[14px] text-ink-muted">Nobody here yet. Drag a guest onto the table, or add one below.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {table.guestIds.map((id) => {
            const g = byId.get(id);
            return (
              <li key={id} className="flex items-center gap-2 rounded-xl bg-surface-sunken px-3 py-2">
                {g && <SideChip side={g.side} />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{g?.name ?? "Removed guest"}</span>
                  {g?.category && <span className="block truncate text-[12px] text-ink-muted">{g.category}</span>}
                </span>
                <span className="wos-num text-[13px] text-ink-muted">{partySize(id)}</span>
                <button type="button" className="border-0 bg-transparent p-1 text-ink-muted" aria-label={`Move ${g?.name} off this table`} onClick={() => onChange({ guestIds: table.guestIds.filter((x) => x !== id) })}><X style={{ width: 16, height: 16 }} /></button>
              </li>
            );
          })}
        </ul>
      )}
      {unseated.length > 0 && (
        <select className="wos-input" value="" onChange={(e) => e.target.value && onSeat(e.target.value)} aria-label={`Add a guest to ${table.label}`}>
          <option value="">+ Add a guest…</option>
          {unseated.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.adults + g.children}){g.category ? ` · ${g.category}` : ""}</option>)}
        </select>
      )}
      <PanelActions onDuplicate={onDuplicate} onDelete={onDelete} onOutside={onOutside} outside={outside} />
    </section>
  );
}

function FixturePanel({ fixture, onChange, onClose, onDelete, onDuplicate, onOutside, outside }: {
  fixture: Fixture; onChange: (patch: Partial<Fixture>) => void; onClose: () => void; onDelete: () => void; onDuplicate: () => void; onOutside: () => void; outside: boolean;
}) {
  const slider = (label: string, value: number, key: "w" | "h") => (
    <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-muted">
      <span className="flex justify-between"><span>{label}</span><span className="wos-num">{value.toFixed(1)} m</span></span>
      <input type="range" min={0.3} max={16} step={0.1} value={value} onChange={(e) => onChange({ [key]: Number(e.target.value) })} className="money-slider__range" style={{ "--pct": `${((value - 0.3) / 15.7) * 100}%` } as CSSProperties} />
    </label>
  );
  return (
    <section className="wos-card vd-panel flex flex-col gap-3" aria-label={fixture.label}>
      <div className="flex items-center gap-2">
        <input className="wos-input !h-10 flex-1 font-semibold" value={fixture.label} onChange={(e) => onChange({ label: e.target.value.slice(0, 40) })} aria-label="Name" />
        <button type="button" className="wos-iconbtn" aria-label="Close" onClick={onClose}><X className="wos-icon" /></button>
      </div>
      {slider("Width", fixture.w, "w")}
      {slider("Length", fixture.h, "h")}
      <RotateControl value={fixture.rotation ?? 0} onChange={(rotation) => onChange({ rotation })} />
      <PanelActions onDuplicate={onDuplicate} onDelete={onDelete} onOutside={onOutside} outside={outside} />
    </section>
  );
}

function HallPanel({ plan, setPlan }: { plan: SeatingPlan; setPlan: (fn: (p: SeatingPlan) => SeatingPlan) => void }) {
  const outdoor = plan.outdoorDepth ?? 0;
  const range = (label: string, value: number, min: number, max: number, onChange: (v: number) => void) => (
    <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-muted">
      <span className="flex justify-between"><span>{label}</span><span className="wos-num">{value} m</span></span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="money-slider__range" style={{ "--pct": `${((value - min) / (max - min)) * 100}%` } as CSSProperties} />
    </label>
  );
  return (
    <details className="wos-card flex flex-col gap-3" open={false}>
      <summary className="cursor-pointer text-[15px] font-semibold"><Ruler className="mr-2 inline size-4 align-[-2px]" aria-hidden="true" />Hall size &amp; outdoor area</summary>
      <div className="mt-3 flex flex-col gap-3">
        <label className="wos-field"><span className="text-[13px] font-semibold text-ink-muted">Hall name</span><input className="wos-input" value={plan.hallName} onChange={(e) => setPlan((p) => ({ ...p, hallName: e.target.value.slice(0, 80) }))} /></label>
        {range("Width", plan.width, 8, 80, (width) => setPlan((p) => ({ ...p, width })))}
        {range("Length", plan.depth, 8, 80, (depth) => setPlan((p) => ({ ...p, depth })))}
        <Toggle label="Outdoor area (Poruwa or bar outside)" checked={outdoor > 0} onChange={(on) => setPlan((p) => ({ ...p, outdoorDepth: on ? 10 : 0, outdoorLabel: p.outdoorLabel || "Lakeside lawn" }))} />
        {outdoor > 0 && (
          <>
            {range("Outdoor depth", outdoor, 3, 40, (outdoorDepth) => setPlan((p) => ({ ...p, outdoorDepth })))}
            <label className="wos-field"><span className="text-[13px] font-semibold text-ink-muted">Outdoor name</span><input className="wos-input" value={plan.outdoorLabel ?? ""} onChange={(e) => setPlan((p) => ({ ...p, outdoorLabel: e.target.value.slice(0, 40) }))} placeholder="Lakeside lawn" /></label>
          </>
        )}
      </div>
    </details>
  );
}

function AddFixture({ onAdd }: { onAdd: (kind: FixtureKind) => void }) {
  const groups: [string, FixtureKind[]][] = [
    ["Areas", ["poruwa", "head", "dance", "buffet", "bar", "band", "cake", "entrance", "photo", "gift", "kids", "lounge"]],
    ["Decor", ["arch", "flowers", "lamp", "screen", "pillar"]],
  ];
  return (
    <section className="wos-card flex flex-col gap-3" aria-label="Add areas and decor">
      {groups.map(([title, kinds]) => (
        <div key={title} className="flex flex-col gap-2">
          <b className="text-[14px]">Add {title.toLowerCase()}</b>
          <div className="flex flex-wrap gap-2">
            {kinds.map((k) => <button key={k} type="button" className="wos-chip" onClick={() => onAdd(k)}><Plus className="size-3.5" aria-hidden="true" />{FIXTURE_LABEL[k]}</button>)}
          </div>
        </div>
      ))}
    </section>
  );
}

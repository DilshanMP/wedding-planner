"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Armchair, Box, LayoutGrid, Plus, Printer, RotateCcw, Shuffle, Trash2, X } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { usePlanner } from "@/lib/hooks/use-planner";
import { newId } from "@/lib/domain/ids";
import { guestMetrics } from "@/lib/domain/guests";
import { defaultSeating, FIXTURE_LABEL, seatsUsed, type Fixture, type FixtureKind, type SeatingPlan, type SeatTable } from "@/lib/domain/planner";
import type { Guest, WeddingData } from "@/lib/domain/types";
import { Notice, PageHeader, SideChip, cx } from "@/components/ui/primitives";
import { NumberField } from "@/components/ui/fields";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";

export function TablesView() {
  const page = usePage();
  if (!page) return <PageSkeleton />;
  return <Tables data={page.data} />;
}

const size = (g: Guest) => g.adults + g.children;

function Tables({ data }: { data: WeddingData }) {
  const [plan, setPlan] = usePlanner("seating");
  const [theme] = usePlanner("theme");
  const toast = useToast();
  const [view, setView] = useState<"plan" | "walk">("plan");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [turn, setTurn] = useState(0);
  const [tilt, setTilt] = useState(56);

  const guests = useMemo(() => data.guests.filter((g) => g.rsvp !== "no"), [data.guests]);
  const byId = useMemo(() => new Map(data.guests.map((g) => [g.id, g])), [data.guests]);
  const partySize = (id: string) => {
    const g = byId.get(id);
    return g ? size(g) : 0;
  };
  const seatedIds = new Set(plan.tables.flatMap((t) => t.guestIds));
  const unseated = guests.filter((g) => !seatedIds.has(g.id));
  const people = guests.reduce((n, g) => n + size(g), 0);
  const seated = plan.tables.reduce((n, t) => n + seatsUsed(t, partySize), 0);
  const seats = plan.tables.reduce((n, t) => n + t.seats, 0);

  if (plan.tables.length === 0 && plan.fixtures.length === 0) return <Setup data={data} onCreate={setPlan} />;

  const setTable = (id: string, patch: Partial<SeatTable>) => setPlan((p) => ({ ...p, tables: p.tables.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const seat = (tableId: string, guestId: string) => {
    const table = plan.tables.find((t) => t.id === tableId);
    if (!table) return;
    const free = table.seats - seatsUsed(table, partySize);
    if (partySize(guestId) > free) {
      toast(`${table.label} has ${free} free seat${free === 1 ? "" : "s"}; ${byId.get(guestId)?.name} need ${partySize(guestId)}.`, "danger");
      return;
    }
    setPlan((p) => ({ ...p, tables: p.tables.map((t) => (t.id === tableId ? { ...t, guestIds: [...t.guestIds, guestId] } : { ...t, guestIds: t.guestIds.filter((x) => x !== guestId) })) }));
    setSelectedGuest(null);
  };

  const autoSeat = () => {
    // Bride's side fills tables from the left, groom's side from the right; VIPs nearest the front.
    const tables = plan.tables.map((t) => ({ ...t, guestIds: [...t.guestIds] }));
    const order = (side: "bride" | "groom") => [...tables].sort((a, b) => (side === "bride" ? a.x - b.x : b.x - a.x) || a.y - b.y);
    for (const side of ["bride", "groom"] as const) {
      const list = unseated.filter((g) => g.side === side).sort((a, b) => Number(b.vip) - Number(a.vip) || size(b) - size(a));
      for (const g of list) {
        const t = order(side).find((x) => x.seats - seatsUsed(x, partySize) >= size(g));
        if (t) t.guestIds.push(g.id);
      }
    }
    setPlan((p) => ({ ...p, tables }));
    toast("Guests seated by side. Move anyone you like.");
  };

  const table = plan.tables.find((t) => t.id === selectedTable) ?? null;

  return (
    <>
      <div className="no-print">
        <PageHeader
          overline="People"
          title="Tables"
          lead={`${plan.hallName || "Your hall"} · ${plan.tables.length} tables · ${seats} seats`}
          actions={
            <>
              <div className="wos-tabs" role="tablist" aria-label="View">
                <button type="button" role="tab" className="wos-tab" aria-selected={view === "plan"} onClick={() => setView("plan")}><LayoutGrid className="wos-icon" aria-hidden="true" />Floor plan</button>
                <button type="button" role="tab" className="wos-tab" aria-selected={view === "walk"} onClick={() => setView("walk")}><Box className="wos-icon" aria-hidden="true" />Walk-in view</button>
              </div>
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
          <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => setPlan((p) => ({ ...p, tables: [...p.tables, { id: newId(), label: `Table ${p.tables.length + 1}`, x: p.width / 2, y: p.depth - 4, seats: 10, shape: "round", guestIds: [] }] }))}><Plus className="wos-icon" aria-hidden="true" />Table</button>
        </div>
      </section>

      {selectedGuest && (
        <Notice tone="info" icon={<Armchair className="wos-icon" />} title={`Tap a table to seat ${byId.get(selectedGuest)?.name} (${partySize(selectedGuest)})`} action={<button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => setSelectedGuest(null)}>Cancel</button>}>
          Tables with enough free seats are highlighted.
        </Notice>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <section aria-label="Hall" className="flex flex-col gap-3">
          {view === "plan" ? (
            <FloorPlan plan={plan} setPlan={setPlan} partySize={partySize} selectedTable={selectedTable} selectedGuest={selectedGuest}
              onTable={(id) => (selectedGuest ? seat(id, selectedGuest) : setSelectedTable(id === selectedTable ? null : id))} colors={theme.colors} />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="walk-wrap">
                <div className="walk-floor" style={{ transform: `rotateX(${tilt}deg) rotateZ(${turn}deg)` }}>
                  <FloorPlan plan={plan} setPlan={setPlan} partySize={partySize} selectedTable={selectedTable} selectedGuest={selectedGuest} onTable={(id) => setSelectedTable(id)} colors={theme.colors} walk />
                </div>
                <div className="walk-glow" aria-hidden="true" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 no-print">
                <label className="grid grid-cols-[80px_1fr] items-center gap-2 text-[13px] font-semibold text-ink-muted">Turn<input type="range" min={-180} max={180} value={turn} onChange={(e) => setTurn(Number(e.target.value))} className="accent-[var(--wine-600)]" /></label>
                <label className="grid grid-cols-[80px_1fr] items-center gap-2 text-[13px] font-semibold text-ink-muted">Height<input type="range" min={20} max={70} value={tilt} onChange={(e) => setTilt(Number(e.target.value))} className="accent-[var(--wine-600)]" /></label>
              </div>
            </div>
          )}
          <p className="m-0 text-[13px] text-ink-muted no-print">Drag tables and areas to match your hall. Tap a guest on the right, then a table, to seat them.</p>
        </section>

        <aside className="flex flex-col gap-4 no-print">
          {table ? (
            <TablePanel table={table} byId={byId} partySize={partySize} onChange={(patch) => setTable(table.id, patch)} onClose={() => setSelectedTable(null)}
              onDelete={() => { setPlan((p) => ({ ...p, tables: p.tables.filter((t) => t.id !== table.id) })); setSelectedTable(null); }} />
          ) : null}
          <section className="wos-card flex flex-col gap-3" aria-labelledby="h-unseated">
            <h2 id="h-unseated" className="wos-card__title">Waiting for a table <span className="text-ink-muted">({unseated.length})</span></h2>
            {unseated.length === 0 ? (
              <p className="m-0 text-[14px] text-ink-muted">{guests.length ? "Everyone has a seat." : "Add guests first, then seat them here."}</p>
            ) : (
              <ul className="m-0 flex max-h-[520px] list-none flex-col gap-1 overflow-y-auto p-0">
                {unseated.map((g) => (
                  <li key={g.id}>
                    <button type="button" onClick={() => setSelectedGuest(selectedGuest === g.id ? null : g.id)} className={cx("flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left", selectedGuest === g.id ? "border-wine-600 bg-wine-50" : "border-transparent hover:bg-surface-sunken")} aria-pressed={selectedGuest === g.id}>
                      <SideChip side={g.side} />
                      <span className="flex-1 text-[14px] font-semibold">{g.name}</span>
                      <span className="wos-num text-[13px] text-ink-muted">{size(g)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <AddFixture onAdd={(kind) => setPlan((p) => ({ ...p, fixtures: [...p.fixtures, { id: newId(), kind, label: FIXTURE_LABEL[kind], x: p.width / 2, y: p.depth / 2, w: kind === "dance" ? 6 : 3, h: kind === "dance" ? 5 : 2 }] }))} />
          <button type="button" className="wos-btn wos-btn--ghost self-start text-danger" onClick={() => { if (window.confirm("Start the hall layout again? Seating will be cleared.")) setPlan((p) => ({ ...p, tables: [], fixtures: [] })); }}><RotateCcw className="wos-icon" aria-hidden="true" />Start over</button>
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
  const [hall, setHall] = useState(/paradise/i.test(data.planner.menu.venue) ? "Crystal Atrium, Paradise Inn" : data.wedding.venue);
  const [tables, setTables] = useState(Math.max(1, Math.ceil(expected / 10)));
  return (
    <>
      <PageHeader overline="People" title="Tables" lead="Lay out your hall and seat your guests — see exactly how the evening will look." />
      <section className="wos-card flex max-w-[640px] flex-col gap-4">
        <h2 className="wos-h2">Set up your hall</h2>
        <label className="wos-field"><span className="text-[14px] font-semibold">Hall</span><input className="wos-input" value={hall} onChange={(e) => setHall(e.target.value)} /></label>
        <NumberField label="Round tables (10 seats each)" value={tables} onChange={(v) => setTables(Math.max(1, Math.min(80, v ?? 1)))} min={1} max={80} help={`About ${expected} guests expected → ${Math.ceil(expected / 10)} tables`} />
        <button type="button" className="wos-btn wos-btn--primary self-start" onClick={() => onCreate(defaultSeating(hall, tables, newId))}>Create Layout</button>
        <p className="m-0 text-[13px] text-ink-muted">You&apos;ll get a Poruwa, head table, dance floor, buffet, bar and band area to start with. Move or remove anything to match your hall.</p>
      </section>
    </>
  );
}

function TablePanel({ table, byId, partySize, onChange, onClose, onDelete }: { table: SeatTable; byId: Map<string, Guest>; partySize: (id: string) => number; onChange: (patch: Partial<SeatTable>) => void; onClose: () => void; onDelete: () => void }) {
  const used = seatsUsed(table, partySize);
  return (
    <section className="wos-card flex flex-col gap-3" aria-label={table.label}>
      <div className="flex items-center gap-2">
        <input className="wos-input !h-10 flex-1 font-semibold" value={table.label} onChange={(e) => onChange({ label: e.target.value.slice(0, 40) })} aria-label="Table name" />
        <button type="button" className="wos-iconbtn" aria-label="Close" onClick={onClose}><X className="wos-icon" /></button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[14px]">
        <label className="flex items-center gap-2 font-semibold text-ink-muted">Seats
          <input type="number" min={2} max={30} className="wos-input !h-9 !w-20" value={table.seats} onChange={(e) => onChange({ seats: Math.max(2, Math.min(30, Number(e.target.value) || 2)) })} />
        </label>
        <div className="wos-tabs" role="tablist" aria-label="Shape">
          <button type="button" role="tab" className="wos-tab" aria-selected={table.shape === "round"} onClick={() => onChange({ shape: "round" })}>Round</button>
          <button type="button" role="tab" className="wos-tab" aria-selected={table.shape === "long"} onClick={() => onChange({ shape: "long" })}>Long</button>
        </div>
        <span className={cx("wos-num font-semibold", used > table.seats ? "text-danger" : "text-ink-muted")}>{used}/{table.seats} seated</span>
      </div>
      {table.guestIds.length === 0 ? (
        <p className="m-0 text-[14px] text-ink-muted">Nobody here yet.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {table.guestIds.map((id) => {
            const g = byId.get(id);
            return (
              <li key={id} className="flex items-center gap-2 rounded-xl bg-surface-sunken px-3 py-2">
                {g && <SideChip side={g.side} />}
                <span className="flex-1 text-[14px] font-semibold">{g?.name ?? "Removed guest"}</span>
                <span className="wos-num text-[13px] text-ink-muted">{partySize(id)}</span>
                <button type="button" className="border-0 bg-transparent p-1 text-ink-muted" aria-label={`Move ${g?.name} off this table`} onClick={() => onChange({ guestIds: table.guestIds.filter((x) => x !== id) })}><X style={{ width: 16, height: 16 }} /></button>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm self-start text-danger" onClick={onDelete}><Trash2 className="wos-icon" aria-hidden="true" />Remove table</button>
    </section>
  );
}

function AddFixture({ onAdd }: { onAdd: (kind: FixtureKind) => void }) {
  return (
    <section className="wos-card flex flex-col gap-2" aria-label="Add an area">
      <b className="text-[14px]">Add an area</b>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FIXTURE_LABEL) as FixtureKind[]).map((k) => (
          <button key={k} type="button" className="wos-chip" onClick={() => onAdd(k)}>{FIXTURE_LABEL[k]}</button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The floor plan (SVG, metres)                                        */
/* ------------------------------------------------------------------ */

const FIXTURE_FILL: Record<FixtureKind, string> = {
  poruwa: "var(--champagne-300)",
  head: "var(--surface-raised)",
  dance: "url(#dance)",
  buffet: "var(--sage-50)",
  bar: "var(--info-50)",
  band: "var(--wine-50)",
  cake: "var(--champagne-100)",
  entrance: "var(--surface-sunken)",
  photo: "var(--wine-50)",
};

function FloorPlan({ plan, setPlan, partySize, selectedTable, selectedGuest, onTable, colors, walk }: {
  plan: SeatingPlan;
  setPlan: (fn: (p: SeatingPlan) => SeatingPlan) => void;
  partySize: (id: string) => number;
  selectedTable: string | null;
  selectedGuest: string | null;
  onTable: (id: string) => void;
  colors: string[];
  walk?: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const need = selectedGuest ? partySize(selectedGuest) : 0;

  const toMetres = (e: PointerEvent | ReactPointerEvent) => {
    const ctm = svg.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const startDrag = (kind: "table" | "fixture", id: string, onClick?: () => void) => (e: ReactPointerEvent<SVGGElement>) => {
    if (walk) {
      onClick?.();
      return;
    }
    const start = toMetres(e);
    if (!start) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const item = kind === "table" ? plan.tables.find((t) => t.id === id) : plan.fixtures.find((f) => f.id === id);
    if (!item) return;
    const origin = { x: item.x, y: item.y };
    let moved = false;
    const move = (ev: PointerEvent) => {
      const p = toMetres(ev);
      if (!p) return;
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      if (!moved && Math.hypot(dx, dy) < 0.3) return;
      moved = true;
      const x = Math.round(Math.min(plan.width, Math.max(0, origin.x + dx)) * 10) / 10;
      const y = Math.round(Math.min(plan.depth, Math.max(0, origin.y + dy)) * 10) / 10;
      setPlan((pl) => (kind === "table" ? { ...pl, tables: pl.tables.map((t) => (t.id === id ? { ...t, x, y } : t)) } : { ...pl, fixtures: pl.fixtures.map((f) => (f.id === id ? { ...f, x, y } : f)) }));
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      if (!moved) onClick?.();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };

  const removeFixture = (f: Fixture) => setPlan((p) => ({ ...p, fixtures: p.fixtures.filter((x) => x.id !== f.id) }));

  return (
    <svg ref={svg} viewBox={`-0.5 -0.5 ${plan.width + 1} ${plan.depth + 1}`} className={cx("floor-plan", walk && "floor-plan--walk")} role="img" aria-label={`Floor plan of ${plan.hallName || "the hall"}`}>
      <defs>
        <pattern id="dance" width="1" height="1" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" fill="#2a2430" />
          <rect width="0.5" height="0.5" fill="#3a3342" />
          <rect x="0.5" y="0.5" width="0.5" height="0.5" fill="#3a3342" />
        </pattern>
        <pattern id="floor" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="2" height="2" fill="var(--surface-raised)" />
          <path d="M0 0H2V2" fill="none" stroke="var(--line)" strokeWidth="0.03" />
        </pattern>
        <radialGradient id="cloth"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#f1ece2" /></radialGradient>
      </defs>
      <rect x="0" y="0" width={plan.width} height={plan.depth} rx="0.4" fill="url(#floor)" stroke="var(--line-strong)" strokeWidth="0.12" />

      {plan.fixtures.map((f) => (
        <g key={f.id} className="cursor-grab" onPointerDown={startDrag("fixture", f.id)} onDoubleClick={() => { if (window.confirm(`Remove ${f.label}?`)) removeFixture(f); }}>
          <rect x={f.x - f.w / 2} y={f.y - f.h / 2} width={f.w} height={f.h} rx={f.kind === "poruwa" ? 0.2 : 0.35} fill={FIXTURE_FILL[f.kind]} stroke={f.kind === "poruwa" ? colors[1] ?? "var(--champagne-500)" : "var(--line-strong)"} strokeWidth={f.kind === "poruwa" ? 0.14 : 0.06} />
          {f.kind === "poruwa" && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => <circle key={i} cx={f.x + sx * (f.w / 2 - 0.3)} cy={f.y + sy * (f.h / 2 - 0.3)} r="0.18" fill={colors[1] ?? "#c9a24a"} />)}
          <text x={f.x} y={f.y} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(0.62, (f.w * 0.9) / (f.label.length * 0.52), f.h * 0.5)} fontWeight={700} fill={f.kind === "dance" ? "#fff" : "var(--ink)"} style={{ pointerEvents: "none" }}>{f.label}</text>
        </g>
      ))}

      {plan.tables.map((t) => {
        const used = seatsUsed(t, partySize);
        const fits = selectedGuest ? t.seats - used >= need : false;
        const sel = selectedTable === t.id;
        const r = t.shape === "round" ? 0.9 : 0;
        const chairs = Array.from({ length: t.seats }, (_, i) => {
          if (t.shape === "round") {
            const a = (i / t.seats) * Math.PI * 2;
            return { x: t.x + Math.cos(a) * 1.25, y: t.y + Math.sin(a) * 1.25, filled: i < used };
          }
          const perSide = Math.ceil(t.seats / 2);
          const side = i < perSide ? -1 : 1;
          const k = i < perSide ? i : i - perSide;
          return { x: t.x - 1.4 + (k + 0.5) * (2.8 / perSide), y: t.y + side * 0.75, filled: i < used };
        });
        return (
          <g key={t.id} className="cursor-grab" onPointerDown={startDrag("table", t.id, () => onTable(t.id))} role="button" aria-label={`${t.label}, ${used} of ${t.seats} seats taken`}>
            {chairs.map((c, i) => <circle key={i} cx={Math.round(c.x * 100) / 100} cy={Math.round(c.y * 100) / 100} r="0.22" fill={c.filled ? colors[0] ?? "var(--wine-600)" : "var(--surface-sunken)"} stroke="var(--line-strong)" strokeWidth="0.03" />)}
            {t.shape === "round" ? (
              <circle cx={t.x} cy={t.y} r={r} fill="url(#cloth)" stroke={sel ? "var(--wine-600)" : fits ? "var(--success)" : used > t.seats ? "var(--danger)" : "var(--line-strong)"} strokeWidth={sel || fits ? 0.16 : 0.05} />
            ) : (
              <rect x={t.x - 1.5} y={t.y - 0.45} width="3" height="0.9" rx="0.1" fill="url(#cloth)" stroke={sel ? "var(--wine-600)" : fits ? "var(--success)" : "var(--line-strong)"} strokeWidth={sel || fits ? 0.16 : 0.05} />
            )}
            <circle cx={t.x} cy={t.y - 0.18} r="0.16" fill={colors[1] ?? "#c9a24a"} opacity="0.9" />
            <text x={t.x} y={t.y + 0.28} textAnchor="middle" fontSize={0.4} fontWeight={700} fill="var(--ink)" style={{ pointerEvents: "none" }}>{t.label.replace(/^Table\s*/i, "T")}</text>
          </g>
        );
      })}
    </svg>
  );
}


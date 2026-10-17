"use client";

import { useRef, type DragEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { seatsUsed, type Fixture, type FixtureKind, type SeatingPlan, type SeatTable } from "@/lib/domain/planner";
import { cx } from "@/components/ui/primitives";

/**
 * The hall as an editable drawing, in metres. Tap to select; drag to move;
 * drag the round handle to turn and the square handle to resize. Arrow keys
 * nudge, R turns, Delete removes. Guests can be dragged from the list onto a
 * table.
 */

export type Selection = { kind: "table" | "fixture"; id: string } | null;

const FIXTURE_FILL: Record<FixtureKind, string> = {
  poruwa: "var(--champagne-300)",
  head: "var(--surface-raised)",
  dance: "url(#vd-dance)",
  buffet: "var(--sage-50)",
  bar: "var(--info-50)",
  band: "var(--wine-50)",
  cake: "var(--champagne-100)",
  entrance: "var(--surface-sunken)",
  photo: "var(--wine-50)",
  arch: "var(--wine-50)",
  flowers: "#f6d9df",
  lamp: "var(--champagne-300)",
  lounge: "var(--champagne-100)",
  gift: "var(--champagne-100)",
  kids: "#e6f0f8",
  screen: "#2a2430",
  pillar: "var(--surface-sunken)",
};

const ICON: Partial<Record<FixtureKind, string>> = {
  poruwa: "🪷", dance: "💃", buffet: "🍽️", bar: "🍸", band: "🎵", cake: "🎂", entrance: "🚪", photo: "📸",
  arch: "🌸", flowers: "💐", lamp: "🪔", lounge: "🛋️", gift: "🎁", kids: "🧸", screen: "📺",
};

export function tableSize(t: Pick<SeatTable, "shape" | "seats">): [number, number] {
  if (t.shape === "round") return [1.8, 1.8];
  if (t.shape === "square") return [1.6, 1.6];
  return [Math.max(2, Math.ceil(t.seats / 2) * 0.62), 0.9];
}

export function chairSpots(t: Pick<SeatTable, "shape" | "seats">): { x: number; y: number }[] {
  if (t.shape === "round") {
    return Array.from({ length: t.seats }, (_, i) => {
      const a = (i / t.seats) * Math.PI * 2 - Math.PI / 2;
      return { x: Math.cos(a) * 1.25, y: Math.sin(a) * 1.25 };
    });
  }
  if (t.shape === "square") {
    const per = Math.ceil(t.seats / 4);
    return Array.from({ length: t.seats }, (_, i) => {
      const side = Math.floor(i / per);
      const k = i % per;
      const off = -0.8 + (k + 0.5) * (1.6 / per);
      return side === 0 ? { x: off, y: -1.1 } : side === 1 ? { x: 1.1, y: off } : side === 2 ? { x: -off, y: 1.1 } : { x: -1.1, y: -off };
    });
  }
  const [w] = tableSize(t);
  const per = Math.ceil(t.seats / 2);
  return Array.from({ length: t.seats }, (_, i) => {
    const side = i < per ? -1 : 1;
    const k = i < per ? i : i - per;
    return { x: -w / 2 + (k + 0.5) * (w / per), y: side * 0.75 };
  });
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function FloorPlan({
  plan, setPlan, partySize, guestName, selection, onSelect, onTableTap, selectedGuest, onDropGuest, colors, showNames, snap,
}: {
  plan: SeatingPlan;
  setPlan: (fn: (p: SeatingPlan) => SeatingPlan) => void;
  partySize: (id: string) => number;
  guestName: (id: string) => string;
  selection: Selection;
  onSelect: (s: Selection) => void;
  /** A tap on a table (seats the picked guest when one is waiting). */
  onTableTap: (id: string) => void;
  selectedGuest: string | null;
  onDropGuest: (tableId: string, guestId: string) => void;
  colors: string[];
  showNames: boolean;
  snap: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const outdoor = plan.outdoorDepth ?? 0;
  const totalDepth = plan.depth + outdoor;
  const need = selectedGuest ? partySize(selectedGuest) : 0;
  const grid = (v: number) => (snap ? Math.round(v * 2) / 2 : Math.round(v * 10) / 10);

  const toMetres = (e: { clientX: number; clientY: number }) => {
    const ctm = svg.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const update = (sel: NonNullable<Selection>, patch: Partial<Fixture & SeatTable>) =>
    setPlan((pl) => sel.kind === "table"
      ? { ...pl, tables: pl.tables.map((t) => (t.id === sel.id ? { ...t, ...patch } as SeatTable : t)) }
      : { ...pl, fixtures: pl.fixtures.map((f) => (f.id === sel.id ? { ...f, ...patch } as Fixture : f)) });

  const find = (sel: NonNullable<Selection>) => (sel.kind === "table" ? plan.tables.find((t) => t.id === sel.id) : plan.fixtures.find((f) => f.id === sel.id));

  /** One gesture: move (body), turn (round handle) or resize (square handle). */
  const gesture = (sel: NonNullable<Selection>, mode: "move" | "rotate" | "resize", onTap?: () => void) => (e: ReactPointerEvent<SVGElement>) => {
    e.stopPropagation();
    const start = toMetres(e);
    const item = find(sel);
    if (!start || !item) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const origin = { x: item.x, y: item.y, rot: item.rotation ?? 0 };
    let moved = false;
    const move = (ev: PointerEvent) => {
      const p = toMetres(ev);
      if (!p) return;
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      if (!moved && Math.hypot(dx, dy) < 0.25) return;
      moved = true;
      if (mode === "move") {
        update(sel, { x: Math.min(plan.width, Math.max(0, grid(origin.x + dx))), y: Math.min(totalDepth, Math.max(0, grid(origin.y + dy))) });
      } else if (mode === "rotate") {
        let deg = (Math.atan2(p.x - origin.x, -(p.y - origin.y)) * 180) / Math.PI;
        deg = snap || ev.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg);
        update(sel, { rotation: ((deg % 360) + 360) % 360 });
      } else {
        // Into the item's own (unrotated) frame, then size = twice the distance from the centre.
        const a = (-origin.rot * Math.PI) / 180;
        const lx = (p.x - origin.x) * Math.cos(a) - (p.y - origin.y) * Math.sin(a);
        const ly = (p.x - origin.x) * Math.sin(a) + (p.y - origin.y) * Math.cos(a);
        update(sel, { w: Math.max(0.4, grid(Math.abs(lx) * 2)), h: Math.max(0.3, grid(Math.abs(ly) * 2)) });
      }
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      if (!moved) onTap?.();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!selection) return;
    const item = find(selection);
    if (!item) return;
    const step = e.shiftKey ? 1 : 0.1;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      update(selection, { x: Math.min(plan.width, Math.max(0, r2(item.x + dx))), y: Math.min(totalDepth, Math.max(0, r2(item.y + dy))) });
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      update(selection, { rotation: (((item.rotation ?? 0) + (e.shiftKey ? -15 : 15)) % 360 + 360) % 360 });
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      setPlan((pl) => selection.kind === "table" ? { ...pl, tables: pl.tables.filter((t) => t.id !== selection.id) } : { ...pl, fixtures: pl.fixtures.filter((f) => f.id !== selection.id) });
      onSelect(null);
    } else if (e.key === "Escape") onSelect(null);
  };

  const onDrop = (e: DragEvent<SVGSVGElement>) => {
    const guestId = e.dataTransfer.getData("text/guest-id");
    const p = toMetres(e);
    if (!guestId || !p) return;
    e.preventDefault();
    const near = [...plan.tables].map((t) => ({ t, d: Math.hypot(t.x - p.x, t.y - p.y) })).sort((a, b) => a.d - b.d)[0];
    if (near && near.d < 2.2) onDropGuest(near.t.id, guestId);
  };

  const handles = (w: number, h: number, sel: NonNullable<Selection>, resizable: boolean) => (
    <g className="vd-handles">
      <rect x={-w / 2 - 0.15} y={-h / 2 - 0.15} width={w + 0.3} height={h + 0.3} rx="0.15" fill="none" stroke="var(--wine-600)" strokeWidth="0.06" strokeDasharray="0.2 0.12" />
      <line x1="0" y1={-h / 2 - 0.15} x2="0" y2={-h / 2 - 0.75} stroke="var(--wine-600)" strokeWidth="0.05" />
      <circle cx="0" cy={-h / 2 - 0.9} r="0.24" fill="#fff" stroke="var(--wine-600)" strokeWidth="0.07" className="vd-rotate" onPointerDown={gesture(sel, "rotate")}>
        <title>Drag to turn</title>
      </circle>
      {resizable && (
        <rect x={w / 2 - 0.05} y={h / 2 - 0.05} width="0.36" height="0.36" fill="#fff" stroke="var(--wine-600)" strokeWidth="0.07" className="vd-resize" onPointerDown={gesture(sel, "resize")}>
          <title>Drag to resize</title>
        </rect>
      )}
    </g>
  );

  return (
    <svg
      ref={svg}
      viewBox={`-0.6 -0.6 ${plan.width + 1.2} ${totalDepth + 1.2}`}
      className="floor-plan vd-plan"
      role="application"
      aria-label={`Floor plan of ${plan.hallName || "the hall"}. Select an item, then use arrow keys to move it, R to turn it, Delete to remove it.`}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerDown={() => onSelect(null)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <defs>
        <pattern id="vd-dance" width="1" height="1" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" fill="#2a2430" /><rect width="0.5" height="0.5" fill="#3a3342" /><rect x="0.5" y="0.5" width="0.5" height="0.5" fill="#3a3342" />
        </pattern>
        <pattern id="vd-floor" width="1" height="1" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" fill="var(--surface-raised)" />
          <path d="M0 0H1V1" fill="none" stroke="var(--line)" strokeWidth="0.015" />
        </pattern>
        <pattern id="vd-grass" width="1.2" height="1.2" patternUnits="userSpaceOnUse">
          <rect width="1.2" height="1.2" fill="#dfe9d6" />
          <path d="M0.2 0.5l0.06-0.18 0.06 0.18M0.8 1l0.06-0.18 0.06 0.18" stroke="#9fbb8e" strokeWidth="0.03" fill="none" />
        </pattern>
        <radialGradient id="vd-cloth"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#f1ece2" /></radialGradient>
      </defs>

      <rect x="0" y="0" width={plan.width} height={plan.depth} rx="0.3" fill="url(#vd-floor)" stroke="var(--line-strong)" strokeWidth="0.14" />
      {outdoor > 0 && (
        <g>
          <rect x="0" y={plan.depth} width={plan.width} height={outdoor} rx="0.3" fill="url(#vd-grass)" stroke="#9fbb8e" strokeWidth="0.1" strokeDasharray="0.4 0.2" />
          <rect x={plan.width / 2 - 2} y={plan.depth - 0.12} width="4" height="0.24" fill="var(--surface-raised)" />
          <text x="0.5" y={plan.depth + 0.8} fontSize="0.55" fontWeight="700" fill="#4a6a4c">🌿 {plan.outdoorLabel || "Outdoor area"}</text>
        </g>
      )}
      <text x={plan.width - 0.3} y="0.75" textAnchor="end" fontSize="0.45" fill="var(--ink-muted)">{plan.width} m × {plan.depth} m</text>

      {plan.fixtures.map((f) => {
        const sel = selection?.kind === "fixture" && selection.id === f.id;
        const s = { kind: "fixture" as const, id: f.id };
        const label = f.label.length > 18 ? `${f.label.slice(0, 16)}…` : f.label;
        const round = f.kind === "flowers" || f.kind === "lamp" || f.kind === "pillar";
        return (
          <g key={f.id} transform={`translate(${f.x} ${f.y}) rotate(${f.rotation ?? 0})`} className={cx("vd-item", sel && "is-selected")}>
            <g onPointerDown={gesture(s, "move", () => onSelect(sel ? null : s))} role="button" aria-label={`${f.label}${sel ? ", selected" : ""}`}>
              {round ? (
                <ellipse rx={f.w / 2} ry={f.h / 2} fill={FIXTURE_FILL[f.kind]} stroke="var(--line-strong)" strokeWidth="0.05" />
              ) : (
                <rect x={-f.w / 2} y={-f.h / 2} width={f.w} height={f.h} rx={f.kind === "poruwa" ? 0.15 : 0.3} fill={FIXTURE_FILL[f.kind]}
                  stroke={f.kind === "poruwa" ? colors[1] ?? "var(--champagne-500)" : "var(--line-strong)"} strokeWidth={f.kind === "poruwa" ? 0.14 : 0.05} />
              )}
              {f.kind === "poruwa" && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => <circle key={i} cx={sx * (f.w / 2 - 0.3)} cy={sy * (f.h / 2 - 0.3)} r="0.18" fill={colors[1] ?? "#c9a24a"} />)}
              {f.kind === "arch" && <path d={`M${-f.w / 2} ${f.h / 2} Q0 ${-f.h * 1.6} ${f.w / 2} ${f.h / 2}`} fill="none" stroke={colors[0] ?? "#c2607a"} strokeWidth="0.12" />}
              {(f.w >= 1.2 || ICON[f.kind]) && (
                <text y={f.w >= 1.4 && f.h >= 0.9 ? -0.05 : 0.05} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(0.55, Math.max(0.3, (f.w * 0.9) / (label.length * 0.5)), f.h * 0.55)}
                  fontWeight={700} fill={f.kind === "dance" || f.kind === "screen" ? "#fff" : "var(--ink)"} style={{ pointerEvents: "none" }}>
                  {f.w >= 1.4 ? label : ICON[f.kind] ?? label}
                </text>
              )}
              {f.w >= 1.4 && f.h >= 0.9 && ICON[f.kind] && <text y={Math.min(0.5, f.h / 2 - 0.2)} textAnchor="middle" fontSize="0.4" style={{ pointerEvents: "none" }}>{ICON[f.kind]}</text>}
            </g>
            {sel && handles(f.w, f.h, s, true)}
          </g>
        );
      })}

      {plan.tables.map((t) => {
        const used = seatsUsed(t, partySize);
        const fits = selectedGuest ? t.seats - used >= need : false;
        const sel = selection?.kind === "table" && selection.id === t.id;
        const s = { kind: "table" as const, id: t.id };
        const [w, h] = tableSize(t);
        const names = t.guestIds.map(guestName);
        const stroke = sel ? "var(--wine-600)" : fits ? "var(--success)" : used > t.seats ? "var(--danger)" : "var(--line-strong)";
        return (
          <g key={t.id} transform={`translate(${t.x} ${t.y})`} className={cx("vd-item", sel && "is-selected")}>
            <g transform={`rotate(${t.rotation ?? 0})`}>
              <g onPointerDown={gesture(s, "move", () => onTableTap(t.id))} role="button" aria-label={`${t.label}, ${used} of ${t.seats} seats taken${names.length ? `: ${names.join(", ")}` : ""}`}>
                <title>{`${t.label} (${used}/${t.seats})${names.length ? `\n${names.join("\n")}` : ""}`}</title>
                {chairSpots(t).map((c, i) => <circle key={i} cx={r2(c.x)} cy={r2(c.y)} r="0.22" fill={i < used ? colors[0] ?? "var(--wine-600)" : "var(--surface-sunken)"} stroke="var(--line-strong)" strokeWidth="0.03" />)}
                {t.shape === "round" ? (
                  <circle r={w / 2} fill="url(#vd-cloth)" stroke={stroke} strokeWidth={sel || fits ? 0.16 : 0.05} />
                ) : (
                  <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="0.1" fill="url(#vd-cloth)" stroke={stroke} strokeWidth={sel || fits ? 0.16 : 0.05} />
                )}
                <circle cy={-0.18} r="0.14" fill={colors[1] ?? "#c9a24a"} opacity="0.9" />
              </g>
              {sel && handles(t.shape === "round" ? 2.7 : w + 0.9, t.shape === "round" ? 2.7 : h + 1.1, s, false)}
            </g>
            <text y={0.28} textAnchor="middle" fontSize={0.4} fontWeight={700} fill="var(--ink)" style={{ pointerEvents: "none" }}>{t.label.replace(/^Table\s*/i, "T")}</text>
            {showNames && names.length > 0 && (
              <g style={{ pointerEvents: "none" }}>
                <rect x={-1.6} y={1.55} width={3.2} height={0.32 * Math.min(names.length, 6) + 0.16} rx="0.12" fill="rgb(255 255 255 / .92)" stroke="var(--line)" strokeWidth="0.02" />
                {names.slice(0, 6).map((n, i) => (
                  <text key={i} x={0} y={1.84 + i * 0.32} textAnchor="middle" fontSize="0.24" fill="var(--ink)">{i === 5 && names.length > 6 ? `+${names.length - 5} more` : n.length > 22 ? `${n.slice(0, 20)}…` : n}</text>
                ))}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

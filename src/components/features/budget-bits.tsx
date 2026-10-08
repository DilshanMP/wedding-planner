"use client";

import type { BudgetSummary, CategoryRollup } from "@/lib/domain/budget";
import { formatAmount, formatLKR } from "@/lib/domain/money";

/** Paid / committed / remaining bar against the original plan. */
export function BudgetBar({ summary, detailed }: { summary: BudgetSummary; detailed?: boolean }) {
  const base = Math.max(summary.original, summary.forecast, 1);
  const committedW = Math.min(100, (summary.committed / base) * 100);
  const paidW = Math.min(100, (summary.paid / base) * 100);
  const notYetPaid = summary.committed - summary.paid;
  return (
    <div className="wos-budget">
      <div
        className="wos-budget__bar"
        role="img"
        aria-label={`Paid ${summary.paidPct} percent, committed ${summary.committedPct} percent of the ${formatLKR(summary.original)} plan`}
      >
        <i className="wos-budget__committed" style={{ width: `${committedW}%` }} />
        <i className="wos-budget__paid" style={{ width: `${paidW}%` }} />
      </div>
      <div className="wos-budget__legend">
        <span style={{ "--k": "var(--wine-600)" } as React.CSSProperties}>Paid{detailed ? ` · ${formatLKR(summary.paid)}` : ""}</span>
        <span style={{ "--k": "var(--champagne-300)" } as React.CSSProperties}>
          {detailed ? `Committed, not yet paid · ${formatLKR(notYetPaid)}` : "Committed"}
        </span>
        <span style={{ "--k": "var(--surface-sunken)" } as React.CSSProperties}>
          {summary.remaining >= 0 ? `Remaining · ${formatLKR(summary.remaining)}` : `Over plan · ${formatLKR(-summary.remaining)}`}
        </span>
      </div>
    </div>
  );
}

/**
 * Category rows: the bar is the projected cost, the tick is the plan.
 * Scaled so the plan tick sits at 80% of the track, leaving room to show overspend.
 */
export function CategoryBars({ rows, labelWidth = 170 }: { rows: CategoryRollup[]; labelWidth?: number }) {
  return (
    <div className="flex flex-col gap-[14px]">
      {rows.map((r) => {
        const scale = r.planned > 0 ? 80 / r.planned : 0;
        const width = r.planned > 0 ? Math.min(100, r.forecast * scale) : 100;
        const color = r.state === "over" ? undefined : r.state === "watch" ? "var(--warning)" : r.categoryId === "emergency" ? "var(--sage-600)" : undefined;
        const word = r.state === "over" ? `+${r.variancePct}%` : r.state === "watch" ? `+${r.variancePct}%` : "within";
        return (
          <div key={r.categoryId} className="wos-cat max-sm:!grid-cols-[minmax(0,1fr)_auto]" style={{ gridTemplateColumns: `${labelWidth}px 1fr 150px` }}>
            <span className="truncate">{r.label}</span>
            <div
              className={`wos-cat__bar max-sm:col-span-2 max-sm:row-start-2 ${r.state === "over" ? "wos-cat__bar--over" : ""}`}
              role="img"
              aria-label={`${r.label}: projected ${formatLKR(r.forecast)} against a plan of ${formatLKR(r.planned)}, ${r.state === "within" ? "within plan" : `${r.variancePct}% over plan`}`}
            >
              <i style={{ width: `${width}%`, background: color }} />
              {r.planned > 0 && <u style={{ left: "80%" }} />}
            </div>
            <span className="wos-cat__val">
              {formatAmount(r.forecast)}{" "}
              <b style={{ color: r.state === "over" ? "var(--danger)" : r.state === "watch" ? "var(--warning)" : "var(--success)" }}>{word}</b>
            </span>
          </div>
        );
      })}
    </div>
  );
}

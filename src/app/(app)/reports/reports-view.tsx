"use client";

import { FileDown, FileSpreadsheet } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useQueryState } from "@/lib/hooks/use-query-state";
import { buildReport, REPORT_IDS, REPORT_TITLES, type Report, type ReportId } from "@/lib/domain/reports";
import { formatAmount } from "@/lib/domain/money";
import { downloadXlsx, type Sheet } from "@/lib/xlsx";
import { PageHeader } from "@/components/ui/primitives";
import { PageSkeleton } from "@/components/shell/wedding-gate";

function toSheets(report: Report): Sheet[] {
  return report.tables.map((t) => ({
    name: report.tables.length > 1 ? `${REPORT_TITLES[report.id].replace(/ report$/, "")} - ${t.title}` : REPORT_TITLES[report.id].replace(/ report$/, ""),
    rows: [t.columns.map((c) => (c.money ? `${c.label} (LKR)` : c.label)), ...t.rows, ...(t.total ? [t.total] : [])],
    moneyColumns: t.columns.flatMap((c, i) => (c.money ? [i] : [])),
  }));
}

function summarySheet(reports: Report[]): Sheet {
  return { name: "Summary", rows: [["Measure", "Value"], ...reports.flatMap((r) => [[r.title, ""], ...r.summary])], widths: [36, 48] };
}

export function ReportsView() {
  const page = usePage();
  const q = useQueryState();
  if (!page) return <PageSkeleton />;
  const { data, today } = page;
  const selected = (q.get("r") as ReportId | "all" | null) ?? "budget";
  const ids = selected === "all" ? REPORT_IDS : [selected];
  const reports = ids.map((id) => buildReport(id, data, today));
  const slug = `${data.wedding.brideName}-${data.wedding.groomName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const excel = () => {
    const name = selected === "all" ? "wedding-report" : `${selected}-report`;
    downloadXlsx(`${name}-${slug}-${today}.xlsx`, [summarySheet(reports), ...reports.flatMap(toSheets)]);
  };

  return (
    <>
      <div className="no-print">
        <PageHeader
          overline="Records"
          title="Reports"
          lead="Share with family, take to vendor meetings, or keep for your records."
          actions={
            <>
              <button type="button" className="wos-btn wos-btn--secondary" onClick={excel}><FileSpreadsheet className="wos-icon" aria-hidden="true" />Download Excel</button>
              <button type="button" className="wos-btn wos-btn--primary" onClick={() => window.print()}><FileDown className="wos-icon" aria-hidden="true" />Download PDF</button>
            </>
          }
        />
      </div>
      <div className="wos-tabs no-print" role="tablist" aria-label="Report">
        {REPORT_IDS.map((id) => (
          <button key={id} type="button" role="tab" className="wos-tab" aria-selected={selected === id} onClick={() => q.set({ r: id })}>{REPORT_TITLES[id].replace(/ report$/, "").replace("Wedding readiness", "Readiness")}</button>
        ))}
        <button type="button" role="tab" className="wos-tab" aria-selected={selected === "all"} onClick={() => q.set({ r: "all" })}>Everything</button>
      </div>
      <p className="no-print m-0 text-[13px] text-ink-muted">“Download PDF” opens your browser&apos;s print dialog — choose <b>Save as PDF</b> as the destination.</p>

      <div className="report-doc flex flex-col gap-8">
        {reports.map((r) => <ReportView key={r.id} report={r} />)}
      </div>
    </>
  );
}

function ReportView({ report }: { report: Report }) {
  return (
    <article className="report wos-card flex flex-col gap-6 !p-7 max-sm:!p-5" aria-labelledby={`r-${report.id}`}>
      <header className="flex flex-col gap-1 border-b border-line pb-4">
        <span className="wos-overline">Wedding OS</span>
        <h2 id={`r-${report.id}`} className="wos-h1">{report.title}</h2>
        <p className="m-0 text-[14px] text-ink-muted">{report.subtitle}</p>
      </header>
      <dl className="m-0 grid gap-x-6 gap-y-3 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        {report.summary.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="wos-overline !text-ink-muted">{k}</dt>
            <dd className="m-0 text-[16px] leading-6 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      {report.tables.map((t) => (
        <section key={t.title} className="flex flex-col gap-3" aria-label={t.title}>
          <h3 className="wos-card__title">{t.title}</h3>
          {t.rows.length === 0 ? (
            <p className="m-0 text-ink-muted">Nothing recorded yet.</p>
          ) : (
            <div className="wos-table-wrap">
              <table className="wos-table">
                <thead>
                  <tr>{t.columns.map((c) => <th key={c.label} className={c.money || c.align === "right" ? "num" : undefined}>{c.label}{c.money ? " (LKR)" : ""}</th>)}</tr>
                </thead>
                <tbody>
                  {t.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((v, j) => (
                        <td key={j} className={t.columns[j]?.money || t.columns[j]?.align === "right" ? "num" : "wrap"}>
                          {t.columns[j]?.money && typeof v === "number" ? formatAmount(v) : v}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {t.total && (
                    <tr className="font-bold">
                      {t.total.map((v, j) => <td key={j} className={t.columns[j]?.money || t.columns[j]?.align === "right" ? "num" : undefined}><b>{t.columns[j]?.money && typeof v === "number" ? formatAmount(v) : v}</b></td>)}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </article>
  );
}

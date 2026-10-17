"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ClipboardCopy, FileSpreadsheet, Printer, Share2 } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { guestReport, guestReportText } from "@/lib/domain/guest-report";
import { SIDE_LABEL, partySize } from "@/lib/domain/guests";
import { formatLongDate } from "@/lib/domain/dates";
import { RSVP_LABEL } from "@/lib/domain/catalog";
import type { WeddingData } from "@/lib/domain/types";
import { downloadXlsx } from "@/lib/xlsx";
import { cx } from "@/components/ui/primitives";
import { Toggle } from "@/components/ui/fields";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";

export function GuestReportView() {
  const page = usePage();
  if (!page) return <PageSkeleton />;
  return <Report data={page.data} />;
}

function Report({ data }: { data: WeddingData }) {
  const toast = useToast();
  const [view, setView] = useState<"tables" | "alpha">("tables");
  const [attendingOnly, setAttendingOnly] = useState(false);
  const { wedding } = data;
  const r = guestReport(data, { attendingOnly });
  const text = guestReportText(r, wedding);
  const fileBase = `guest-list-${wedding.brideName}-${wedding.groomName}`.toLowerCase().replace(/\s+/g, "-");

  const excel = () =>
    downloadXlsx(`${fileBase}.xlsx`, [
      {
        name: "By table",
        rows: [["Table", "Guest", "People", "Side", "Category", "RSVP", "Phone"], ...r.tables.flatMap((t) => t.guests.map((g) => [t.label, g.name, partySize(g), SIDE_LABEL[g.side], g.category, RSVP_LABEL[g.rsvp], g.phone])), ...r.unseated.map((g) => ["Not seated", g.name, partySize(g), SIDE_LABEL[g.side], g.category, RSVP_LABEL[g.rsvp], g.phone])],
        widths: [16, 32, 8, 10, 18, 14, 16],
      },
      { name: "A-Z", rows: [["Guest", "Table", "People"], ...r.alpha.map((a) => [a.guest.name, a.table || "—", partySize(a.guest)])], widths: [32, 16, 8] },
    ]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Guest list copied.");
    } catch {
      toast("Couldn't copy in this browser.", "danger");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/guests" className="wos-btn wos-btn--ghost"><ArrowLeft className="wos-icon" aria-hidden="true" />Guests</Link>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="wos-btn wos-btn--secondary" onClick={() => void copy()}><ClipboardCopy className="wos-icon" aria-hidden="true" />Copy</button>
          <a className="wos-btn wos-btn--secondary" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><Share2 className="wos-icon" aria-hidden="true" />WhatsApp</a>
          <button type="button" className="wos-btn wos-btn--secondary" onClick={excel}><FileSpreadsheet className="wos-icon" aria-hidden="true" />Excel</button>
          <button type="button" className="wos-btn wos-btn--primary" onClick={() => window.print()}><Printer className="wos-icon" aria-hidden="true" />Print / PDF</button>
        </div>
      </div>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="wos-tabs" role="tablist" aria-label="Layout">
          <button type="button" role="tab" className="wos-tab" aria-selected={view === "tables"} onClick={() => setView("tables")}>By table</button>
          <button type="button" role="tab" className="wos-tab" aria-selected={view === "alpha"} onClick={() => setView("alpha")}>A–Z · find your table</button>
        </div>
        <Toggle label="Only guests who said yes" checked={attendingOnly} onChange={setAttendingOnly} />
      </div>

      <article className="greport">
        <header className="greport-head">
          <span className="greport-over">Guest list</span>
          <h1 className="greport-names">{wedding.brideName} <i>&amp;</i> {wedding.groomName}</h1>
          <p className="greport-sub">{formatLongDate(wedding.weddingDate)}{wedding.venue ? ` · ${wedding.venue}` : ""}</p>
          <div className="greport-stats">
            <div><b>{r.invitations}</b><span>invitations</span></div>
            <div><b>{r.people}</b><span>people</span></div>
            <div><b>{r.attending}</b><span>attending</span></div>
            <div><b>{r.pending}</b><span>waiting</span></div>
            <div><b>{r.tables.length}</b><span>tables</span></div>
          </div>
        </header>

        {view === "tables" ? (
          <div className="greport-tables">
            {r.tables.map((t, i) => (
              <section key={t.label} className="greport-table" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                <div className="greport-table-head">
                  <span className="greport-badge">{t.label.replace(/^table\s*/i, "") || t.label}</span>
                  <div className="min-w-0">
                    <h2>{t.label}</h2>
                    <span className={cx(t.seats !== null && t.people > t.seats && "text-danger")}>{t.seats ? `${t.people} of ${t.seats} seats` : `${t.people} ${t.people === 1 ? "person" : "people"}`}</span>
                  </div>
                </div>
                <ul>
                  {t.guests.map((g) => (
                    <li key={g.id}>
                      <i className={`greport-dot greport-dot--${g.side}`} title={`${SIDE_LABEL[g.side]} side`} aria-label={`${SIDE_LABEL[g.side]} side`} />
                      <span className="min-w-0 flex-1 truncate">{g.name}</span>
                      {g.category && <small>{g.category}</small>}
                      {partySize(g) > 1 && <b>×{partySize(g)}</b>}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {r.unseated.length > 0 && (
              <section className="greport-table greport-table--open">
                <div className="greport-table-head">
                  <span className="greport-badge">?</span>
                  <div>
                    <h2>Not seated yet</h2>
                    <span>{r.unseated.reduce((n, g) => n + partySize(g), 0)} people · <Link href="/tables" className="wos-link no-print">seat them</Link></span>
                  </div>
                </div>
                <ul>
                  {r.unseated.map((g) => (
                    <li key={g.id}>
                      <i className={`greport-dot greport-dot--${g.side}`} aria-label={`${SIDE_LABEL[g.side]} side`} />
                      <span className="min-w-0 flex-1 truncate">{g.name}</span>
                      {g.category && <small>{g.category}</small>}
                      {partySize(g) > 1 && <b>×{partySize(g)}</b>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <ol className="greport-alpha">
            {r.alpha.map(({ guest, table }, i) => {
              const letter = guest.name[0]?.toUpperCase() ?? "";
              const first = i === 0 || r.alpha[i - 1].guest.name[0]?.toUpperCase() !== letter;
              return (
                <li key={guest.id} className={cx(first && "has-letter")} data-letter={letter}>
                  <span className="min-w-0 flex-1 truncate">{guest.name}{partySize(guest) > 1 && <small> ×{partySize(guest)}</small>}</span>
                  <span className={cx("greport-pill", !table && "is-empty")}>{table || "—"}</span>
                </li>
              );
            })}
          </ol>
        )}
        <footer className="greport-foot">
          <span><i className="greport-dot greport-dot--bride" /> Bride side</span>
          <span><i className="greport-dot greport-dot--groom" /> Groom side</span>
          <span><i className="greport-dot greport-dot--both" /> Both</span>
        </footer>
      </article>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { exportWorkbook, planImport, type ImportPlan } from "@/lib/domain/workbook";
import { newId, nowISO } from "@/lib/domain/ids";
import { todayISO } from "@/lib/domain/dates";
import type { CollectionItem, WeddingData } from "@/lib/domain/types";
import { downloadXlsx } from "@/lib/xlsx";
import { readXlsx } from "@/lib/xlsx-read";
import { celebrate } from "@/lib/confetti";
import { useStore } from "@/lib/store/provider";
import { Dialog } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/primitives";
import { useToast } from "@/components/shell/toast";

/** Everything in one Excel file, and back again with a preview before saving. */
export function WorkbookCard({ data }: { data: WeddingData }) {
  const store = useStore();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const today = todayISO();
  const slug = `${data.wedding.brideName}-${data.wedding.groomName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const download = (suffix = "") => {
    downloadXlsx(`wedding-plan-${slug}-${today}${suffix}.xlsx`, exportWorkbook(data, today));
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const sheets = await readXlsx(await f.arrayBuffer());
      setFileName(f.name);
      setPlan(planImport(data, sheets, nowISO(), newId));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't read that file.", "danger");
    }
    setBusy(false);
    if (file.current) file.current.value = "";
  };

  const apply = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!plan) return;
    for (const c of plan.changes) {
      if (c.upserts.length) store.upsert(c.key, c.upserts as unknown as CollectionItem<typeof c.key>[]);
      if (c.removes.length) store.remove(c.key, c.removes);
    }
    if (plan.wedding) store.updateWedding(plan.wedding);
    if (plan.seating) store.updatePlanner("seating", plan.seating);
    if (plan.menu) store.updatePlanner("menu", plan.menu);
    const n = plan.changes.reduce((s, c) => s + c.added + c.updated + c.removes.length, 0) + (plan.wedding ? 1 : 0) + (plan.seating ? 1 : 0) + (plan.menu ? 1 : 0);
    celebrate(e.currentTarget, 40);
    toast(`Imported ${n} change${n === 1 ? "" : "s"} from Excel.`);
    setPlan(null);
  };

  return (
    <section className="wos-card flex flex-col gap-4 no-print" aria-labelledby="h-workbook">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid size-12 flex-none place-items-center rounded-2xl bg-success-50 text-success"><FileSpreadsheet className="wos-icon" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 id="h-workbook" className="wos-card__title">Everything in Excel</h2>
          <p className="m-0 text-[14px] text-ink-muted">Guests, budget, payments, vendors, checklist, day plan, seating and menu — one file. Edit it in Excel or Google Sheets and bring it back. You&apos;ll see every change before it&apos;s saved, and nothing is deleted unless you write <b>Yes</b> in its &ldquo;Delete?&rdquo; column.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="wos-btn wos-btn--primary" onClick={() => download()}><Download className="wos-icon" aria-hidden="true" />Export Everything</button>
        <button type="button" className="wos-btn wos-btn--secondary" onClick={() => file.current?.click()} disabled={busy}><Upload className="wos-icon" aria-hidden="true" />{busy ? "Reading…" : "Import from Excel"}</button>
        <input ref={file} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" aria-label="Choose an Excel file to import" onChange={(e) => void pick(e.target.files?.[0])} />
      </div>

      <Dialog
        open={Boolean(plan)}
        onClose={() => setPlan(null)}
        title="Check the changes"
        description={fileName ? `From ${fileName}` : undefined}
        footer={
          <>
            <button type="button" className="wos-btn wos-btn--ghost" onClick={() => download("-backup")}><Download className="wos-icon" aria-hidden="true" />Backup first</button>
            <span className="spacer" />
            <button type="button" className="wos-btn wos-btn--secondary" onClick={() => setPlan(null)}>Cancel</button>
            <button type="button" className="wos-btn wos-btn--primary" disabled={!plan || plan.empty} onClick={apply}>Apply Changes</button>
          </>
        }
      >
        {plan && (
          <div className="flex flex-col gap-4">
            {plan.empty ? (
              <Notice tone="info" icon={<CheckCircle2 className="wos-icon" />} title="Nothing has changed.">The file matches what&apos;s in the app.</Notice>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {plan.changes.map((c) => (
                  <li key={c.key} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line px-4 py-3">
                    <b>{c.sheet}</b>
                    <span className="flex flex-wrap gap-2 text-[13px]">
                      {c.added > 0 && <span className="rounded-full bg-success-50 px-2.5 py-0.5 font-semibold text-success">+{c.added} new</span>}
                      {c.updated > 0 && <span className="rounded-full bg-info-50 px-2.5 py-0.5 font-semibold text-info">{c.updated} updated</span>}
                      {c.removes.length > 0 && <span className="rounded-full bg-danger-50 px-2.5 py-0.5 font-semibold text-danger">{c.removes.length} to delete</span>}
                    </span>
                  </li>
                ))}
                {plan.wedding && <li className="rounded-2xl border border-line px-4 py-3"><b>Wedding details</b> <span className="text-[13px] text-ink-muted">· {Object.keys(plan.wedding).join(", ")}</span></li>}
                {plan.seating && <li className="rounded-2xl border border-line px-4 py-3"><b>Seating</b> <span className="text-[13px] text-ink-muted">· guests moved between tables</span></li>}
                {plan.menu && <li className="rounded-2xl border border-line px-4 py-3"><b>Menu</b> <span className="text-[13px] text-ink-muted">· chosen dishes</span></li>}
              </ul>
            )}
            {plan.issues.length > 0 && (
              <Notice tone="warning" icon={<AlertTriangle className="wos-icon" />} title={`${plan.issues.length} row${plan.issues.length === 1 ? "" : "s"} skipped`}>
                <ul className="m-0 mt-1 flex max-h-48 list-disc flex-col gap-1 overflow-y-auto pl-5 text-[13px]">
                  {plan.issues.slice(0, 30).map((i, k) => <li key={k}><b>{i.sheet} row {i.row}:</b> {i.message}</li>)}
                </ul>
                <span className="mt-1 block text-[13px]">Fix them in Excel and import again — everything else can be applied now.</span>
              </Notice>
            )}
            {plan.ignored.length > 0 && <p className="m-0 text-[13px] text-ink-muted">Sheets left alone: {plan.ignored.join(", ")}.</p>}
          </div>
        )}
      </Dialog>
    </section>
  );
}

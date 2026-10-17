"use client";

import { useRef, useState, type ComponentType, type ReactNode } from "react";
import { Download, ImagePlus, Printer, Sparkles } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useQueryState } from "@/lib/hooks/use-query-state";
import { usePlanner } from "@/lib/hooks/use-planner";
import { formatLongDate } from "@/lib/domain/dates";
import type { CardTemplate, InvitationText, StationeryPlan } from "@/lib/domain/planner";
import type { WeddingData } from "@/lib/domain/types";
import { downloadBlob, svgToFile, svgToPng } from "@/lib/svg-export";
import { useFileUrl } from "@/lib/hooks/use-file-url";
import { usePhotoUpload } from "@/lib/hooks/use-photo-upload";
import { BoxBand, BoxLid, Envelope, InvitationCover, InvitationInside, TableCard, TEMPLATE_LABEL, ThankYouCard, stationeryPalette, type CardProps, type Palette } from "@/components/features/stationery";
import { PageHeader, cx } from "@/components/ui/primitives";
import { ChoiceChips, TextArea, Toggle } from "@/components/ui/fields";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";

type Tab = "invitation" | "envelope" | "box" | "tables" | "thanks";
const TABS: { id: Tab; label: string }[] = [
  { id: "invitation", label: "Invitation" },
  { id: "envelope", label: "Envelope" },
  { id: "box", label: "Cake box" },
  { id: "tables", label: "Table cards" },
  { id: "thanks", label: "Thank-you card" },
];

export function CardsView() {
  const page = usePage();
  if (!page) return <PageSkeleton />;
  return <Cards data={page.data} />;
}

interface Piece {
  key: string;
  title: string;
  /** Print width in mm. */
  mm: number;
  render: (className?: string) => ReactNode;
}

function Cards({ data }: { data: WeddingData }) {
  const q = useQueryState();
  const tab = (TABS.find((t) => t.id === q.get("tab"))?.id ?? "invitation") as Tab;
  const [plan, setPlan] = usePlanner("stationery");
  const [theme] = usePlanner("theme");
  const toast = useToast();
  const refs = useRef(new Map<string, HTMLDivElement | null>());
  const [busy, setBusy] = useState<string | null>(null);

  const { wedding } = data;
  const photo = useFileUrl(plan.photoId);
  const upload = usePhotoUpload(wedding.id);
  const p = stationeryPalette(plan, theme.colors);
  const date = formatLongDate(wedding.weddingDate);
  const withVenue: StationeryPlan = { ...plan, text: { ...plan.text, venueLine: plan.text.venueLine || [wedding.venue, wedding.location].filter(Boolean).join(", ") } };
  const props: CardProps = { plan: withVenue, p, bride: wedding.brideName, groom: wedding.groomName, date, photo };
  const card = (C: ComponentType<CardProps>) =>
    function renderCard(cls?: string) {
      return <C {...props} className={cls} />;
    };
  const tables = data.planner.seating.tables.length
    ? data.planner.seating.tables.map((t) => t.label)
    : Array.from({ length: Math.max(1, Math.ceil(wedding.estimatedGuests / 10)) }, (_, i) => `Table ${i + 1}`);

  const pieces: Record<Tab, Piece[]> = {
    invitation: [
      { key: "cover", title: "Cover", mm: 127, render: card(InvitationCover) },
      { key: "inside", title: "Inside", mm: 127, render: card(InvitationInside) },
    ],
    envelope: [{ key: "envelope", title: "Envelope front", mm: 190, render: card(Envelope) }],
    box: [
      { key: "lid", title: "Box lid (90 mm)", mm: 90, render: card(BoxLid) },
      { key: "band", title: "Box band (240 × 45 mm)", mm: 240, render: card(BoxBand) },
    ],
    tables: tables.map((label) => ({ key: `t-${label}`, title: label, mm: 100, render: (cls?: string) => <TableCard plan={withVenue} p={p} label={label} className={cls} /> })),
    thanks: [{ key: "thanks", title: "Thank-you card (A6)", mm: 148, render: card(ThankYouCard) }],
  };
  const shown = pieces[tab];

  const download = async (piece: Piece, kind: "png" | "svg" = "png") => {
    const svg = refs.current.get(piece.key)?.querySelector("svg");
    if (!svg) return;
    setBusy(`${piece.key}-${kind}`);
    try {
      // 300 dpi: mm / 25.4 × 300.
      const blob = kind === "svg" ? await svgToFile(svg) : await svgToPng(svg, Math.round((piece.mm / 25.4) * 300));
      downloadBlob(blob, `${wedding.brideName}-${wedding.groomName}-${piece.key}.${kind}`.toLowerCase().replace(/[^a-z0-9.]+/g, "-"));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't create the picture.", "danger");
    } finally {
      setBusy(null);
    }
  };

  const setText = (patch: Partial<InvitationText>) => setPlan({ ...plan, text: { ...plan.text, ...patch } });

  return (
    <>
      <div className="no-print flex flex-col gap-6">
        <PageHeader
          overline="Create"
          title="Cards & boxes"
          lead="Design your invitation, envelope, cake box, table cards and thank-you cards in your colours. Print at home or send the files to your printer."
          actions={<button type="button" className="wos-btn wos-btn--primary" onClick={() => window.print()}><Printer className="wos-icon" aria-hidden="true" />Print {TABS.find((t) => t.id === tab)?.label}</button>}
        />
        <div className="wos-tabs flex-wrap" role="tablist" aria-label="Design">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" className="wos-tab" aria-selected={tab === t.id} onClick={() => q.set({ tab: t.id === "invitation" ? null : t.id })}>{t.label}</button>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
          <section aria-label="Preview" className={cx("grid gap-5", tab === "tables" ? "[grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]" : tab === "invitation" ? "md:grid-cols-2" : "")}>
            {shown.map((piece) => (
              <figure key={piece.key} className="m-0 flex w-full flex-col gap-2" style={{ maxWidth: tab === "tables" ? undefined : `${Math.min(560, piece.mm * 4)}px` }}>
                <div ref={(el) => { refs.current.set(piece.key, el); }} className="card-preview">{piece.render("block h-auto w-full")}</div>
                <figcaption className="flex items-center justify-between gap-2 text-[13px] font-semibold text-ink-muted">
                  {piece.title}
                  <span className="flex gap-1">
                    <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => void download(piece)} disabled={busy === `${piece.key}-png`}><Download className="wos-icon" aria-hidden="true" />{busy === `${piece.key}-png` ? "…" : "PNG"}</button>
                    <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => void download(piece, "svg")} disabled={busy === `${piece.key}-svg`} title="Vector file for Canva or a printer"><Download className="wos-icon" aria-hidden="true" />{busy === `${piece.key}-svg` ? "…" : "SVG"}</button>
                  </span>
                </figcaption>
              </figure>
            ))}
          </section>

          <aside className="wos-card flex flex-col gap-4 xl:sticky xl:top-5" aria-label="Edit">
            <div className="flex flex-col gap-2">
              <b className="text-[14px]">Style</b>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(TEMPLATE_LABEL) as CardTemplate[]).map((t) => (
                  <button key={t} type="button" onClick={() => setPlan({ ...plan, template: t })} className={cx("flex flex-col gap-1 rounded-xl border p-2 text-left text-[13px] font-semibold", plan.template === t ? "border-wine-600 ring-2 ring-[color-mix(in_srgb,var(--wine-600)_25%,transparent)]" : "border-line")} aria-pressed={plan.template === t}>
                    <span className="block overflow-hidden rounded-lg border border-line"><InvitationCover {...props} plan={{ ...withVenue, template: t }} p={stationeryPalette({ ...plan, template: t }, theme.colors)} className="block h-auto w-full" /></span>
                    {TEMPLATE_LABEL[t]}
                  </button>
                ))}
              </div>
              <Toggle label="Use our wedding colours" checked={plan.useTheme} onChange={(v) => setPlan({ ...plan, useTheme: v })} />
              <Swatches p={p} />
              <ChoiceChips<"script" | "serif"> label="Names" value={plan.nameFont} onChange={(nameFont) => setPlan({ ...plan, nameFont })}
                options={[{ value: "script", label: "Calligraphy" }, { value: "serif", label: "Classic" }]} />
              {plan.template === "arch" && (
                <label className="wos-btn wos-btn--secondary wos-btn--sm cursor-pointer self-start">
                  <ImagePlus className="wos-icon" aria-hidden="true" />{plan.photoId ? "Change our photo" : "Add our photo"}
                  <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const id = await upload(f, { title: "Card photo", kind: "wedding" });
                      setPlan((s) => ({ ...s, photoId: id }));
                      toast("Photo added to the card.");
                    } catch (err) {
                      toast(err instanceof Error ? err.message : "Couldn't add the photo.", "danger");
                    }
                  }} />
                </label>
              )}
            </div>

            {(tab === "invitation" || tab === "envelope") && (
              <div className="flex flex-col gap-3 border-t border-line pt-4">
                <Field label="Sinhala heading" value={plan.text.sinhalaLine} onChange={(v) => setText({ sinhalaLine: v })} />
                <Field label="Cover line" value={plan.text.coverLine} onChange={(v) => setText({ coverLine: v })} />
                {tab === "invitation" && (
                  <>
                    <Field label="Blessing" value={plan.text.blessing} onChange={(v) => setText({ blessing: v })} />
                    <TextArea label="Parents / hosts" value={plan.text.hosts} onChange={(v) => setText({ hosts: v.slice(0, 200) })} rows={2} />
                    <TextArea label="Invitation line" value={plan.text.inviteLine} onChange={(v) => setText({ inviteLine: v.slice(0, 200) })} rows={2} />
                    <Field label="Bride's full name" value={plan.text.brideFull} placeholder={wedding.brideName} onChange={(v) => setText({ brideFull: v })} />
                    <Field label="Groom's full name" value={plan.text.groomFull} placeholder={wedding.groomName} onChange={(v) => setText({ groomFull: v })} />
                    <Field label="Date" value={plan.text.dateLine} placeholder={date} onChange={(v) => setText({ dateLine: v })} />
                    <Field label="Time" value={plan.text.timeLine} onChange={(v) => setText({ timeLine: v })} />
                    <Field label="Venue" value={plan.text.venueLine} placeholder={withVenue.text.venueLine} onChange={(v) => setText({ venueLine: v })} />
                    <Field label="RSVP" value={plan.text.rsvpLine} onChange={(v) => setText({ rsvpLine: v })} />
                  </>
                )}
              </div>
            )}
            {tab === "box" && <div className="border-t border-line pt-4"><Field label="Line on the box band" value={plan.boxLine} onChange={(v) => setPlan({ ...plan, boxLine: v.slice(0, 80) })} /></div>}
            {tab === "thanks" && <div className="border-t border-line pt-4"><TextArea label="Message" value={plan.thankYouLine} onChange={(v) => setPlan({ ...plan, thankYouLine: v.slice(0, 200) })} rows={3} /></div>}
            {tab === "tables" && <p className="m-0 border-t border-line pt-4 text-[13px] text-ink-muted">Table cards follow your table names from the Tables page. Print on card, cut, and fold along the top.</p>}
            <p className="m-0 text-[12px] text-ink-muted">Printing: choose “Actual size” (100%) so the cards come out at their real size. PNGs are 300 dpi for professional printers.</p>
            <details className="rounded-2xl bg-surface-sunken p-3 text-[13px]">
              <summary className="cursor-pointer font-semibold"><Sparkles className="mr-1 inline size-4 align-[-3px]" aria-hidden="true" />Finish it in Canva Pro</summary>
              <ol className="m-0 mt-2 flex list-decimal flex-col gap-1 pl-5 text-ink-muted">
                <li>Download the <b>SVG</b> (keeps text sharp at any size) or the 300 dpi <b>PNG</b>.</li>
                <li>In Canva: <b>Create a design → Custom size</b> (e.g. 127 × 178 mm for the invitation).</li>
                <li><b>Uploads → Upload files</b>, then drag the file onto the page and stretch it to the edges.</li>
                <li>Add Canva extras on top: photos, animated stickers, a QR code to your invitation link.</li>
                <li>Download from Canva as <b>PDF Print</b> (with crop marks) for your printer.</li>
              </ol>
              <p className="m-0 mt-2 text-ink-muted">Canva can&apos;t be opened directly from this app (Canva only allows apps it has reviewed), so the file is the bridge.</p>
            </details>
          </aside>
        </div>
      </div>

      {/* Print sheet: real sizes */}
      <div className="print-only">
        <div className="flex flex-wrap gap-[6mm]">
          {shown.map((piece) => <div key={piece.key} style={{ width: `${piece.mm}mm`, breakInside: "avoid" }}>{piece.render("block h-auto w-full")}</div>)}
        </div>
      </div>
    </>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[13px] font-semibold">{label}</span>
      <input className="wos-input !h-10" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value.slice(0, 160))} />
    </label>
  );
}

function Swatches({ p }: { p: Palette }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-ink-muted">
      {[p.main, p.accent, p.bg].map((c) => <i key={c} className="block size-5 rounded-full border border-line" style={{ background: c }} />)}
      <span>Change colours on the Our look page</span>
    </div>
  );
}

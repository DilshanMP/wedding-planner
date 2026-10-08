"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileImage, FileSpreadsheet, FileText, Paperclip, Upload } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useQueryState } from "@/lib/hooks/use-query-state";
import { useFileStore, useStore } from "@/lib/store/provider";
import { DOCUMENT_KIND_LABEL, budgetCategoryLabel } from "@/lib/domain/catalog";
import { documentSchema, fieldErrors } from "@/lib/domain/schemas";
import { formatShortDate } from "@/lib/domain/dates";
import { newId, nowISO } from "@/lib/domain/ids";
import { DOCUMENT_KINDS, type DocumentKind, type WeddingData, type WeddingDocument } from "@/lib/domain/types";
import { MAX_FILE_BYTES, documentPath } from "@/lib/data/file-store";
import { Badge, EmptyState, Notice, PageHeader, cx } from "@/components/ui/primitives";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { SelectField, TextArea, TextField } from "@/components/ui/fields";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";
import { AlertTriangle } from "lucide-react";

const ACCEPT = "application/pdf,image/*,.doc,.docx,.xls,.xlsx,.csv,.txt";

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function guessKind(name: string): DocumentKind {
  const n = name.toLowerCase();
  if (n.includes("contract") || n.includes("agreement")) return "contract";
  if (n.includes("quot") || n.includes("estimate")) return "quotation";
  if (n.includes("receipt")) return "receipt";
  if (n.includes("invoice") || n.includes("bill")) return "invoice";
  return "other";
}

export function DocumentsView() {
  const page = usePage();
  const q = useQueryState();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  if (!page) return <PageSkeleton />;
  const { data } = page;
  const kind = (q.get("kind") ?? "") as DocumentKind | "";
  const vendorFilter = q.get("vendor");
  const docs = data.documents
    .filter((d) => (!kind || d.kind === kind) && (!vendorFilter || d.vendorId === vendorFilter))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const editing = data.documents.find((d) => d.id === q.get("doc"));
  const vendorName = vendorFilter ? data.vendors.find((v) => v.id === vendorFilter)?.name : null;

  return (
    <>
      <PageHeader
        overline="Records"
        title="Document vault"
        lead={data.documents.length ? `${data.documents.length} ${data.documents.length === 1 ? "document" : "documents"} — contracts, quotations, receipts and the papers you'll need on the day.` : "Contracts, quotations, receipts and wedding documents in one safe place."}
        actions={
          <button type="button" className="wos-btn wos-btn--primary" onClick={() => inputRef.current?.click()}>
            <Upload className="wos-icon" aria-hidden="true" />Upload
          </button>
        }
      />
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-label="Choose a file to upload"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPending(f);
          e.target.value = "";
        }}
      />

      {data.documents.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="wos-tabs" role="tablist" aria-label="Document type">
            <button type="button" role="tab" className="wos-tab" aria-selected={!kind} onClick={() => q.set({ kind: null })}>All</button>
            {DOCUMENT_KINDS.filter((k) => data.documents.some((d) => d.kind === k)).map((k) => (
              <button key={k} type="button" role="tab" className="wos-tab" aria-selected={kind === k} onClick={() => q.set({ kind: k })}>{DOCUMENT_KIND_LABEL[k]}</button>
            ))}
          </div>
          {vendorName && <button type="button" className="wos-chip" aria-pressed="true" onClick={() => q.set({ vendor: null })}>{vendorName} ×</button>}
        </div>
      )}

      {docs.length === 0 ? (
        <EmptyState
          title={data.documents.length ? "Nothing matches." : "No documents yet."}
          action={<button type="button" className="wos-btn wos-btn--primary" onClick={() => inputRef.current?.click()}>Upload a Document</button>}
        >
          Upload signed contracts and receipts as you go, and link them to the vendor or budget line they belong to.
        </EmptyState>
      ) : (
        <ul className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {docs.map((d) => <DocumentCard key={d.id} doc={d} data={data} onOpen={() => q.set({ doc: d.id })} />)}
        </ul>
      )}

      {pending && <UploadDialog file={pending} data={data} defaultVendor={vendorFilter} onClose={() => setPending(null)} />}
      {editing && <DocumentDialog doc={editing} data={data} onClose={() => q.set({ doc: null })} />}
    </>
  );
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith("image/")) return <FileImage className="wos-icon" aria-hidden="true" />;
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return <FileSpreadsheet className="wos-icon" aria-hidden="true" />;
  return <FileText className="wos-icon" aria-hidden="true" />;
}

function linksOf(doc: WeddingDocument, data: WeddingData): string[] {
  const out: string[] = [];
  const v = data.vendors.find((x) => x.id === doc.vendorId);
  if (v) out.push(v.name);
  const b = data.budgetItems.find((x) => x.id === doc.budgetItemId);
  if (b) out.push(`${budgetCategoryLabel(b.categoryId)} · ${b.name}`);
  const t = data.tasks.find((x) => x.id === doc.taskId);
  if (t) out.push(t.title);
  return out;
}

function DocumentCard({ doc, data, onOpen }: { doc: WeddingDocument; data: WeddingData; onOpen: () => void }) {
  const links = linksOf(doc, data);
  return (
    <li>
      <button type="button" onClick={onOpen} className="wos-card wos-card--interactive flex h-full w-full cursor-pointer flex-col gap-3 text-left text-ink">
        <div className="flex items-start gap-3">
          <span className="grid size-10 flex-none place-items-center rounded-[10px] bg-champagne-100 text-champagne-700"><FileIcon mime={doc.mimeType} /></span>
          <span className="flex min-w-0 flex-col">
            <b className="truncate text-[15px] leading-[22px] font-semibold">{doc.title}</b>
            <span className="text-[13px] text-ink-muted">{formatBytes(doc.sizeBytes)} · added {formatShortDate(doc.createdAt.slice(0, 10))}</span>
          </span>
        </div>
        <span className="flex flex-wrap gap-1.5">
          <Badge tone="champagne" plain>{DOCUMENT_KIND_LABEL[doc.kind]}</Badge>
          {links.map((l) => <Badge key={l} plain><Paperclip className="wos-icon size-3" aria-hidden="true" />{l}</Badge>)}
        </span>
        {doc.notes && <span className="line-clamp-2 text-[13px] text-ink-muted">{doc.notes}</span>}
      </button>
    </li>
  );
}

type Meta = { kind: DocumentKind; title: string; notes: string; vendorId: string | null; budgetItemId: string | null; taskId: string | null };

function MetaFields({ meta, setMeta, errors, data }: { meta: Meta; setMeta: (m: Meta) => void; errors: Record<string, string>; data: WeddingData }) {
  return (
    <div className="wos-form">
      <TextField className="full" label="Title" value={meta.title} onChange={(v) => setMeta({ ...meta, title: v })} error={errors.title} />
      <SelectField<DocumentKind> label="Type" value={meta.kind} onChange={(v) => setMeta({ ...meta, kind: v })} options={DOCUMENT_KINDS.map((k) => ({ value: k, label: DOCUMENT_KIND_LABEL[k] }))} />
      <SelectField label="Vendor" value={meta.vendorId ?? ""} onChange={(v) => setMeta({ ...meta, vendorId: v || null })} options={[{ value: "", label: "None" }, ...data.vendors.map((v) => ({ value: v.id, label: v.name }))]} />
      <SelectField label="Budget line" value={meta.budgetItemId ?? ""} onChange={(v) => setMeta({ ...meta, budgetItemId: v || null })} options={[{ value: "", label: "None" }, ...data.budgetItems.map((b) => ({ value: b.id, label: `${budgetCategoryLabel(b.categoryId)} · ${b.name}` }))]} />
      <SelectField label="Task" value={meta.taskId ?? ""} onChange={(v) => setMeta({ ...meta, taskId: v || null })} options={[{ value: "", label: "None" }, ...data.tasks.filter((t) => t.status !== "cancelled").map((t) => ({ value: t.id, label: t.title }))]} />
      <TextArea className="full" label="Notes" value={meta.notes} onChange={(v) => setMeta({ ...meta, notes: v })} rows={2} placeholder="Signed copy, balance due on delivery…" />
    </div>
  );
}

function UploadDialog({ file, data, defaultVendor, onClose }: { file: File; data: WeddingData; defaultVendor: string | null; onClose: () => void }) {
  const store = useStore();
  const files = useFileStore();
  const toast = useToast();
  const [meta, setMeta] = useState<Meta>({ kind: guessKind(file.name), title: file.name.replace(/\.[^.]+$/, ""), notes: "", vendorId: defaultVendor, budgetItemId: null, taskId: null });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const tooBig = file.size > MAX_FILE_BYTES;

  const save = async () => {
    const res = documentSchema.safeParse(meta);
    if (!res.success) return setErrors(fieldErrors(res.error));
    setBusy(true);
    setFailure(null);
    const id = newId();
    const path = documentPath(data.wedding.id, id, file.name);
    try {
      await files.put(path, file);
      const now = nowISO();
      store.upsert("documents", { id, ...res.data, storagePath: path, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, createdAt: now, updatedAt: now });
      toast("Document saved.");
      onClose();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Couldn't save the file.");
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Add to the vault" description={`${file.name} · ${formatBytes(file.size)}`}
      footer={<>
        <span className="spacer" />
        <button type="button" className="wos-btn wos-btn--secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="wos-btn wos-btn--primary" onClick={() => void save()} disabled={busy || tooBig}>{busy ? "Saving…" : "Save Document"}</button>
      </>}>
      <div className="flex flex-col gap-4">
        {tooBig && <Notice tone="danger" icon={<AlertTriangle className="wos-icon" />} title="This file is larger than 20 MB.">Compress it or save a smaller scan.</Notice>}
        {failure && <Notice tone="danger" role="alert" icon={<AlertTriangle className="wos-icon" />} title="Upload failed.">{failure}</Notice>}
        <MetaFields meta={meta} setMeta={setMeta} errors={errors} data={data} />
      </div>
    </Dialog>
  );
}

function DocumentDialog({ doc, data, onClose }: { doc: WeddingDocument; data: WeddingData; onClose: () => void }) {
  const store = useStore();
  const files = useFileStore();
  const toast = useToast();
  const [meta, setMeta] = useState<Meta>({ kind: doc.kind, title: doc.title, notes: doc.notes, vendorId: doc.vendorId, budgetItemId: doc.budgetItemId, taskId: doc.taskId });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [url, setUrl] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let active = true;
    let opened: string | null = null;
    files.open(doc.storagePath).then(
      (u) => {
        opened = u;
        if (active) setUrl(u);
        else files.release(u);
      },
      (e: unknown) => active && setFailure(e instanceof Error ? e.message : "Couldn't open the file."),
    );
    return () => {
      active = false;
      if (opened) files.release(opened);
    };
  }, [doc.storagePath, files]);

  const save = () => {
    const res = documentSchema.safeParse(meta);
    if (!res.success) return setErrors(fieldErrors(res.error));
    store.upsert("documents", { ...doc, ...res.data });
    toast("Document updated.");
    onClose();
  };

  const isImage = doc.mimeType.startsWith("image/");
  const isPdf = doc.mimeType === "application/pdf";

  return (
    <>
      <Dialog open={!confirm} onClose={onClose} title={doc.title} description={`${DOCUMENT_KIND_LABEL[doc.kind]} · ${formatBytes(doc.sizeBytes)}`}
        footer={<>
          <button type="button" className="wos-btn wos-btn--danger" onClick={() => setConfirm(true)}>Delete</button>
          <span className="spacer" />
          {url && <a className="wos-btn wos-btn--secondary" href={url} download={doc.storagePath.split("/").pop()?.replace(/^[0-9a-f-]{36}-/, "")}><Download className="wos-icon" aria-hidden="true" />Download</a>}
          <button type="button" className="wos-btn wos-btn--primary" onClick={save}>Save Changes</button>
        </>}>
        <div className="flex flex-col gap-5">
          <div className={cx("overflow-hidden rounded-2xl border border-line bg-surface-sunken", (isImage || isPdf) && "min-h-[240px]")}>
            {failure ? (
              <p className="m-0 p-4 text-danger">{failure}</p>
            ) : !url ? (
              <div className="wos-skel h-[240px]" />
            ) : isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={doc.title} className="block max-h-[420px] w-full object-contain" />
            ) : isPdf ? (
              <iframe src={url} title={doc.title} className="block h-[420px] w-full border-0" />
            ) : (
              <p className="m-0 p-4 text-[14px] text-ink-muted">No preview for this file type. Download it to open.</p>
            )}
          </div>
          <MetaFields meta={meta} setMeta={setMeta} errors={errors} data={data} />
        </div>
      </Dialog>
      <ConfirmDialog open={confirm} onCancel={() => setConfirm(false)} danger confirmLabel="Delete Document"
        title="Delete this document?" body={`“${doc.title}” and its file will be permanently removed.`}
        onConfirm={async () => {
          try {
            await files.remove([doc.storagePath]);
          } catch {
            // The metadata still goes; an orphaned file is harmless and private.
          }
          store.remove("documents", doc.id);
          toast("Document deleted.");
          setConfirm(false);
          onClose();
        }} />
    </>
  );
}

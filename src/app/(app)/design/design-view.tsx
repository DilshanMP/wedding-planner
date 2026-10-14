"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Download, Heart, Home, ImagePlus, Lightbulb, Palette, Plus, Trash2, Wand2 } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { useQueryState } from "@/lib/hooks/use-query-state";
import { usePlanner } from "@/lib/hooks/use-planner";
import { usePhotoUpload } from "@/lib/hooks/use-photo-upload";
import { useFileUrl } from "@/lib/hooks/use-file-url";
import { useFileStore, useStore } from "@/lib/store/provider";
import { newId } from "@/lib/domain/ids";
import { PALETTES, type OutfitPlan, type PreviewLayer, type VisionTag } from "@/lib/domain/planner";
import type { WeddingData } from "@/lib/domain/types";
import { outfitAdvice } from "@/lib/domain/advisor";
import { contrast, paletteFromImage } from "@/lib/theme-colors";
import { Badge, EmptyState, Notice, PageHeader, cx } from "@/components/ui/primitives";
import { Toggle } from "@/components/ui/fields";
import { PageSkeleton } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";
import { StoredPhoto } from "@/components/features/stored-photo";

type Tab = "colours" | "board" | "preview" | "outfits";
const TABS: { id: Tab; label: string }[] = [
  { id: "colours", label: "Colours" },
  { id: "board", label: "Vision board" },
  { id: "preview", label: "See it real" },
  { id: "outfits", label: "Outfits" },
];

export const TAG_LABEL: Record<VisionTag, string> = {
  venue: "Venue",
  couple: "Us",
  bride: "Bride",
  groom: "Groom",
  decor: "Decor",
  outfit: "Outfits",
  flowers: "Flowers",
  cake: "Cake",
  card: "Cards",
  other: "Other",
};

export function DesignView() {
  const page = usePage();
  const q = useQueryState();
  if (!page) return <PageSkeleton />;
  const tab = (TABS.find((t) => t.id === q.get("tab"))?.id ?? "colours") as Tab;
  return (
    <>
      <PageHeader overline="Create" title="Our look" lead="Your colours, the photos that inspire you, and how it all comes together. Everything here is shared with your partner." />
      <div className="wos-tabs flex-wrap" role="tablist" aria-label="Our look">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" className="wos-tab" aria-selected={tab === t.id} onClick={() => q.set({ tab: t.id === "colours" ? null : t.id })}>{t.label}</button>
        ))}
      </div>
      {tab === "colours" && <ColoursTab data={page.data} />}
      {tab === "board" && <BoardTab data={page.data} />}
      {tab === "preview" && <PreviewTab data={page.data} />}
      {tab === "outfits" && <OutfitsTab data={page.data} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Colours                                                             */
/* ------------------------------------------------------------------ */

function ColoursTab({ data }: { data: WeddingData }) {
  const [theme, setTheme] = usePlanner("theme");
  const [vision, setVision] = usePlanner("vision");
  const upload = usePhotoUpload(data.wedding.id);
  const toast = useToast();
  const [suggested, setSuggested] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const files = useFileUrlGetter();

  const fromPhoto = async (file: File) => {
    setBusy(true);
    try {
      const url = URL.createObjectURL(file);
      try {
        setSuggested(await paletteFromImage(url, 5));
      } finally {
        URL.revokeObjectURL(url);
      }
      // Keep the photo on the vision board too.
      const id = await upload(file, { title: "Colour inspiration" });
      setVision((v) => ({ ...v, items: [...v.items, { documentId: id, tag: "decor", caption: "Colour inspiration", likes: [] }] }));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't read that photo.", "danger");
    } finally {
      setBusy(false);
    }
  };

  const fromBoardPhoto = async (documentId: string) => {
    setBusy(true);
    try {
      const url = await files(documentId);
      setSuggested(await paletteFromImage(url, 5));
    } catch {
      toast("Couldn't read colours from that photo.", "danger");
    } finally {
      setBusy(false);
    }
  };

  const setColor = (i: number, c: string) => setTheme({ ...theme, name: "Our colours", colors: theme.colors.map((x, j) => (j === i ? c : x)) });
  const mainOk = contrast(theme.colors[0] ?? "#000", "#ffffff") >= 3;

  return (
    <div className="flex flex-col gap-6">
      <section className="wos-card flex flex-col gap-5" aria-labelledby="h-ours">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="h-ours" className="wos-h2">Our wedding colours</h2>
            <p className="m-0 text-[14px] text-ink-muted">Tap a colour to change it. The first is your main colour, the second your accent.</p>
          </div>
          <Toggle label="Use our colours across the app" checked={theme.applyToApp} onChange={(v) => setTheme({ ...theme, applyToApp: v })} />
        </div>
        <div className="flex flex-wrap gap-4">
          {theme.colors.map((c, i) => (
            <label key={i} className="flex cursor-pointer flex-col items-center gap-2 text-[12px] font-semibold text-ink-muted">
              <span className="relative block size-20 rounded-[22px] border border-line shadow-[var(--shadow-sm)]" style={{ background: c }}>
                <input type="color" value={c} onChange={(e) => setColor(i, e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label={`Colour ${i + 1}`} />
              </span>
              {["Main", "Accent", "Light", "Extra", "Extra"][i]}
              <span className="wos-num text-[11px] font-medium uppercase">{c}</span>
            </label>
          ))}
          {theme.colors.length < 5 && (
            <button type="button" className="grid size-20 place-items-center rounded-[22px] border border-dashed border-line-strong text-ink-muted" onClick={() => setTheme({ ...theme, colors: [...theme.colors, "#c9a24a"] })} aria-label="Add a colour"><Plus className="wos-icon" /></button>
          )}
        </div>
        {!mainOk && <Notice tone="info" icon={<Lightbulb className="wos-icon" />} title="Your main colour is very light.">The app darkens it a little for buttons so text stays easy to read.</Notice>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="wos-btn wos-btn--secondary" onClick={() => fileRef.current?.click()} disabled={busy}><Wand2 className="wos-icon" aria-hidden="true" />{busy ? "Reading colours…" : "Get colours from a photo"}</button>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void fromPhoto(f); }} />
        </div>
        {suggested && (
          <div className="flex flex-col gap-3 rounded-2xl bg-surface-sunken p-4">
            <b className="text-[14px]">Colours from your photo</b>
            <div className="flex flex-wrap items-center gap-2">
              {suggested.map((c) => <span key={c} className="block size-11 rounded-xl border border-line" style={{ background: c }} title={c} />)}
              <button type="button" className="wos-btn wos-btn--primary wos-btn--sm ml-2" onClick={() => { setTheme({ ...theme, name: "From our photo", colors: suggested.slice(0, 4) }); setSuggested(null); }}>Use These</button>
              <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => setSuggested(null)}>Dismiss</button>
            </div>
          </div>
        )}
        {vision.items.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-ink-muted">Or pick colours from a vision board photo</span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {vision.items.slice(0, 12).map((it) => (
                <button key={it.documentId} type="button" onClick={() => void fromBoardPhoto(it.documentId)} className="flex-none overflow-hidden rounded-xl border border-line p-0" aria-label={`Colours from ${it.caption || TAG_LABEL[it.tag]}`}>
                  <StoredPhoto documentId={it.documentId} className="size-16" />
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="h-palettes">
        <h2 id="h-palettes" className="wos-h2">Popular Sri Lankan palettes</h2>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
          {PALETTES.map((p) => {
            const active = theme.colors.join() === p.colors.join();
            return (
              <button key={p.name} type="button" onClick={() => setTheme({ ...theme, name: p.name, colors: p.colors })} className={cx("flex flex-col gap-3 rounded-2xl border bg-surface-raised p-3 text-left", active ? "border-wine-600 ring-2 ring-[color-mix(in_srgb,var(--wine-600)_30%,transparent)]" : "border-line")} aria-pressed={active}>
                <span className="flex h-16 overflow-hidden rounded-xl">{p.colors.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</span>
                <span className="flex items-center justify-between text-[14px] font-semibold">{p.name}{active && <Check className="wos-icon text-wine-600" aria-hidden="true" />}</span>
              </button>
            );
          })}
        </div>
      </section>

      <HeroPicker data={data} />
    </div>
  );
}

/** Returns a function that opens a stored photo as a URL (for reading its colours). */
function useFileUrlGetter() {
  const store = useStore();
  const files = useFileStore();
  return async (documentId: string) => {
    const s = store.getState();
    const doc = s.status === "ready" ? s.data.documents.find((d) => d.id === documentId) : undefined;
    if (!doc) throw new Error("That photo is missing.");
    return files.open(doc.storagePath);
  };
}

function HeroPicker({ data }: { data: WeddingData }) {
  const [theme, setTheme] = usePlanner("theme");
  const [vision, setVision] = usePlanner("vision");
  const upload = usePhotoUpload(data.wedding.id);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const photos = vision.items.filter((i) => i.tag === "venue" || i.tag === "couple" || i.tag === "decor");
  const add = async (file: File) => {
    setBusy(true);
    try {
      const id = await upload(file, { title: "Our venue" });
      setVision((v) => ({ ...v, items: [...v.items, { documentId: id, tag: "venue", caption: "Our venue", likes: [] }] }));
      setTheme({ ...theme, heroDocumentId: id });
      toast("Home photo updated.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't upload the photo.", "danger");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="wos-card flex flex-col gap-4" aria-labelledby="h-hero">
      <div className="flex flex-col gap-1">
        <h2 id="h-hero" className="wos-h2">Home screen photo</h2>
        <p className="m-0 text-[14px] text-ink-muted">Your venue or a favourite photo of you two, shown on the home screen every time you open the app.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className={cx("grid size-28 cursor-pointer place-items-center rounded-2xl border border-dashed border-line-strong text-center text-[13px] font-semibold text-ink-muted", busy && "opacity-60")}>
          <span className="flex flex-col items-center gap-1"><ImagePlus className="wos-icon" aria-hidden="true" />{busy ? "Uploading…" : "Upload"}</span>
          <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void add(f); }} />
        </label>
        {photos.map((p) => (
          <button key={p.documentId} type="button" onClick={() => setTheme({ ...theme, heroDocumentId: p.documentId })} className={cx("relative size-28 overflow-hidden rounded-2xl border-2 p-0", theme.heroDocumentId === p.documentId ? "border-wine-600" : "border-transparent")} aria-pressed={theme.heroDocumentId === p.documentId} aria-label={`Use ${p.caption || "this photo"} on the home screen`}>
            <StoredPhoto documentId={p.documentId} className="size-full" />
            {theme.heroDocumentId === p.documentId && <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-wine-600 text-on-wine"><Check style={{ width: 14, height: 14 }} /></span>}
          </button>
        ))}
        {theme.heroDocumentId && <button type="button" className="wos-btn wos-btn--ghost self-center" onClick={() => setTheme({ ...theme, heroDocumentId: null })}>Use our colours instead</button>}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Vision board                                                        */
/* ------------------------------------------------------------------ */

function BoardTab({ data }: { data: WeddingData }) {
  const [vision, setVision] = usePlanner("vision");
  const [theme, setTheme] = usePlanner("theme");
  const store = useStore();
  const upload = usePhotoUpload(data.wedding.id);
  const toast = useToast();
  const [tag, setTag] = useState<VisionTag>("decor");
  const [filter, setFilter] = useState<VisionTag | "all">("all");
  const [busy, setBusy] = useState(0);
  const me = store.actorName;

  const addFiles = async (list: FileList) => {
    const arr = [...list].filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    setBusy(arr.length);
    const added: { documentId: string; tag: VisionTag; caption: string; likes: string[] }[] = [];
    for (const f of arr) {
      try {
        const id = await upload(f, { title: `${TAG_LABEL[tag]} idea` });
        added.push({ documentId: id, tag, caption: "", likes: [] });
      } catch (e) {
        toast(e instanceof Error ? e.message : "Couldn't upload a photo.", "danger");
      }
      setBusy((n) => n - 1);
    }
    if (added.length) setVision((v) => ({ ...v, items: [...added, ...v.items] }));
  };

  const update = (documentId: string, patch: Partial<(typeof vision.items)[number]>) => setVision((v) => ({ ...v, items: v.items.map((i) => (i.documentId === documentId ? { ...i, ...patch } : i)) }));
  const shown = filter === "all" ? vision.items : vision.items.filter((i) => i.tag === filter);
  const counts = vision.items.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.tag]: (acc[i.tag] ?? 0) + 1 }), {});

  return (
    <div className="flex flex-col gap-5">
      <section className="wos-card flex flex-wrap items-end gap-3">
        <label className="wos-field min-w-[160px]">
          <span className="text-[14px] leading-5 font-semibold">These photos are</span>
          <select className="wos-input" value={tag} onChange={(e) => setTag(e.target.value as VisionTag)}>
            {Object.entries(TAG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className={cx("wos-btn wos-btn--primary cursor-pointer", busy > 0 && "opacity-70")}>
          <ImagePlus className="wos-icon" aria-hidden="true" />{busy > 0 ? `Uploading ${busy}…` : "Add Photos"}
          <input type="file" accept="image/*" multiple className="sr-only" disabled={busy > 0} onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
        </label>
        <p className="m-0 flex-[1_1_240px] text-[13px] text-ink-muted">Screenshots from Instagram or Pinterest, your venue, decor quotes, saree ideas — anything you love. Heart the ones you both like.</p>
      </section>

      {vision.items.length === 0 ? (
        <EmptyState title="Start your vision board">Add a few photos you love. Your partner sees them too, and can heart their favourites.</EmptyState>
      ) : (
        <>
          <div className="wos-tabs flex-wrap" role="tablist" aria-label="Filter photos">
            <button type="button" role="tab" className="wos-tab" aria-selected={filter === "all"} onClick={() => setFilter("all")}>All <span>{vision.items.length}</span></button>
            {(Object.keys(TAG_LABEL) as VisionTag[]).filter((t) => counts[t]).map((t) => (
              <button key={t} type="button" role="tab" className="wos-tab" aria-selected={filter === t} onClick={() => setFilter(t)}>{TAG_LABEL[t]} <span>{counts[t]}</span></button>
            ))}
          </div>
          <ul className="vision-grid m-0 list-none p-0">
            {shown.map((it) => {
              const liked = it.likes.includes(me);
              return (
                <li key={it.documentId} className="vision-card">
                  <StoredPhoto documentId={it.documentId} alt={it.caption || TAG_LABEL[it.tag]} className="w-full" />
                  <div className="flex flex-col gap-2 p-3">
                    <div className="flex items-center gap-2">
                      <Badge>{TAG_LABEL[it.tag]}</Badge>
                      <span className="flex-1" />
                      <button type="button" className={cx("wos-iconbtn !size-9", liked && "!text-wine-600")} aria-pressed={liked} aria-label={liked ? "Unlike" : "Like"} onClick={() => update(it.documentId, { likes: liked ? it.likes.filter((n) => n !== me) : [...it.likes, me] })}>
                        <Heart className="wos-icon" fill={liked ? "currentColor" : "none"} aria-hidden="true" />
                      </button>
                    </div>
                    {it.likes.length > 0 && <span className="text-[12px] font-semibold text-wine-600">♥ {it.likes.join(" & ")}</span>}
                    <input className="wos-input !h-9 text-[14px]" placeholder="Add a note…" value={it.caption} onChange={(e) => update(it.documentId, { caption: e.target.value.slice(0, 200) })} aria-label="Note" />
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => { setTheme({ ...theme, heroDocumentId: it.documentId }); toast("Home photo updated."); }}><Home className="wos-icon" aria-hidden="true" />Home photo</button>
                      <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" aria-label="Remove from board" onClick={() => setVision((v) => ({ ...v, items: v.items.filter((i) => i.documentId !== it.documentId) }))}><Trash2 className="wos-icon" aria-hidden="true" /></button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* See it real: your photos placed into your venue photo               */
/* ------------------------------------------------------------------ */

function PreviewTab({ data }: { data: WeddingData }) {
  const [vision, setVision] = usePlanner("vision");
  const [theme] = usePlanner("theme");
  const upload = usePhotoUpload(data.wedding.id);
  const toast = useToast();
  const stage = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bgUrl = useFileUrl(vision.preview.backgroundId);
  const venues = vision.items.filter((i) => i.tag === "venue" || i.tag === "decor");
  const people = vision.items.filter((i) => ["couple", "bride", "groom", "outfit"].includes(i.tag));

  const setPreview = (fn: (p: typeof vision.preview) => typeof vision.preview) => setVision((v) => ({ ...v, preview: fn(v.preview) }));
  const addLayer = (documentId: string) => {
    setPreview((p) => ({ ...p, layers: [...p.layers, { documentId, x: 0.5, y: 0.6, width: 0.3 }] }));
    setSelected(documentId);
  };
  const updateLayer = (documentId: string, patch: Partial<PreviewLayer>) => setPreview((p) => ({ ...p, layers: p.layers.map((l) => (l.documentId === documentId ? { ...l, ...patch } : l)) }));

  const uploadAs = async (file: File, tag: VisionTag) => {
    setBusy(true);
    try {
      const id = await upload(file, { title: tag === "venue" ? "Our venue" : "Us" });
      setVision((v) => ({
        ...v,
        items: [...v.items, { documentId: id, tag, caption: "", likes: [] }],
        preview: tag === "venue" ? { ...v.preview, backgroundId: id } : { ...v.preview, layers: [...v.preview.layers, { documentId: id, x: 0.5, y: 0.6, width: 0.3 }] },
      }));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't upload the photo.", "danger");
    } finally {
      setBusy(false);
    }
  };

  const drag = (documentId: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return;
    setSelected(documentId);
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const layer = vision.preview.layers.find((l) => l.documentId === documentId);
    if (!layer) return;
    const start = { px: e.clientX, py: e.clientY, x: layer.x, y: layer.y };
    const move = (ev: PointerEvent) => {
      updateLayer(documentId, {
        x: Math.min(1, Math.max(0, start.x + (ev.clientX - start.px) / box.width)),
        y: Math.min(1.1, Math.max(0, start.y + (ev.clientY - start.py) / box.height)),
      });
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };

  const download = async () => {
    const root = stage.current;
    if (!root) return;
    try {
      const imgs = [...root.querySelectorAll("img")];
      const canvas = document.createElement("canvas");
      const W = 1600;
      const H = Math.round(W * (root.clientHeight / root.clientWidth));
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error();
      const box = root.getBoundingClientRect();
      for (const img of imgs) {
        const r = img.getBoundingClientRect();
        const copy = new Image();
        copy.crossOrigin = "anonymous";
        await new Promise<void>((res, rej) => { copy.onload = () => res(); copy.onerror = () => rej(new Error()); copy.src = img.src; });
        const sx = W / box.width;
        if (img.dataset.bg) {
          // object-fit: cover
          const scale = Math.max(W / copy.naturalWidth, H / copy.naturalHeight);
          const dw = copy.naturalWidth * scale;
          const dh = copy.naturalHeight * scale;
          ctx.drawImage(copy, (W - dw) / 2, (H - dh) / 2, dw, dh);
        } else {
          ctx.drawImage(copy, (r.left - box.left) * sx, (r.top - box.top) * sx, r.width * sx, r.height * sx);
        }
      }
      // Colour band with your names.
      const band = Math.round(H * 0.12);
      ctx.fillStyle = theme.colors[0] ?? "#7b1e2b";
      ctx.globalAlpha = 0.85;
      ctx.fillRect(0, H - band, W, band);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fffdf9";
      ctx.textAlign = "center";
      ctx.font = `500 ${Math.round(band * 0.45)}px ${getComputedStyle(document.documentElement).getPropertyValue("--wos-display") || "Georgia"}`;
      ctx.fillText(`${data.wedding.brideName} & ${data.wedding.groomName}`, W / 2, H - band * 0.38);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.9));
      if (!blob) throw new Error();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "our-wedding-preview.jpg";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast("Couldn't create the picture in this browser.", "danger");
    }
  };

  const layer = vision.preview.layers.find((l) => l.documentId === selected);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <section className="flex flex-col gap-3" aria-label="Preview">
        <div ref={stage} className="preview-stage" onPointerDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          {bgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- private, signed URLs
            <img src={bgUrl} alt="Your venue" data-bg="1" className="absolute inset-0 size-full object-cover" crossOrigin="anonymous" />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-ink-muted">
              <span className="flex max-w-[320px] flex-col items-center gap-2"><ImagePlus className="wos-icon" aria-hidden="true" /><b>Start with a photo of your venue</b>The Crystal Atrium, your Poruwa decor, or any hall photo from your venue&apos;s page.</span>
            </div>
          )}
          {vision.preview.layers.map((l) => (
            <PreviewLayerView key={l.documentId} layer={l} selected={selected === l.documentId} onPointerDown={drag(l.documentId)} />
          ))}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 py-2" style={{ background: `color-mix(in srgb, ${theme.colors[0]} 82%, transparent)` }}>
            <span className="font-display text-[22px] text-[#fffdf9]">{data.wedding.brideName} &amp; {data.wedding.groomName}</span>
            {theme.colors.slice(1, 4).map((c) => <i key={c} className="block size-3 rounded-full border border-white/70" style={{ background: c }} />)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="wos-btn wos-btn--primary" onClick={() => void download()} disabled={!bgUrl}><Download className="wos-icon" aria-hidden="true" />Download Picture</button>
        </div>
        <p className="m-0 text-[13px] text-ink-muted">Tip: for the most real look, use photos of you two with the background removed (a PNG “cut-out”). Free apps like remove.bg or your phone&apos;s “lift subject” do it in seconds. Drag to move, use the slider to resize.</p>
      </section>

      <aside className="wos-card flex flex-col gap-4" aria-label="Preview controls">
        <div className="flex flex-col gap-2">
          <b className="text-[14px]">1. Venue photo</b>
          <div className="flex flex-wrap gap-2">
            {venues.map((v) => (
              <button key={v.documentId} type="button" onClick={() => setPreview((p) => ({ ...p, backgroundId: v.documentId }))} className={cx("size-16 overflow-hidden rounded-xl border-2 p-0", vision.preview.backgroundId === v.documentId ? "border-wine-600" : "border-transparent")} aria-label="Use as background"><StoredPhoto documentId={v.documentId} className="size-full" /></button>
            ))}
            <label className="grid size-16 cursor-pointer place-items-center rounded-xl border border-dashed border-line-strong text-ink-muted" aria-label="Upload venue photo">
              <Plus className="wos-icon" aria-hidden="true" />
              <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void uploadAs(f, "venue"); }} />
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <b className="text-[14px]">2. Add you two</b>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => (
              <button key={p.documentId} type="button" onClick={() => addLayer(p.documentId)} className="size-16 overflow-hidden rounded-xl border border-line bg-surface-sunken p-0" aria-label="Place in the picture"><StoredPhoto documentId={p.documentId} className="size-full" fit="contain" /></button>
            ))}
            <label className="grid size-16 cursor-pointer place-items-center rounded-xl border border-dashed border-line-strong text-ink-muted" aria-label="Upload a photo of you">
              <Plus className="wos-icon" aria-hidden="true" />
              <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void uploadAs(f, "couple"); }} />
            </label>
          </div>
        </div>
        {layer && (
          <div className="flex flex-col gap-2 rounded-2xl bg-surface-sunken p-3">
            <b className="text-[14px]">Selected photo</b>
            <label className="grid grid-cols-[64px_1fr] items-center gap-2 text-[13px] font-semibold text-ink-muted">Size
              <input type="range" min={0.08} max={0.9} step={0.01} value={layer.width} onChange={(e) => updateLayer(layer.documentId, { width: Number(e.target.value) })} className="accent-[var(--wine-600)]" />
            </label>
            <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm self-start" onClick={() => { setPreview((p) => ({ ...p, layers: p.layers.filter((l) => l.documentId !== layer.documentId) })); setSelected(null); }}><Trash2 className="wos-icon" aria-hidden="true" />Remove from picture</button>
          </div>
        )}
        <Notice tone="info" icon={<Palette className="wos-icon" />} title="AI photos later">When you&apos;re ready, an AI image service can turn this into a fully realistic photo. Ask me to connect one.</Notice>
      </aside>
    </div>
  );
}

function PreviewLayerView({ layer, selected, onPointerDown }: { layer: PreviewLayer; selected: boolean; onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void }) {
  const url = useFileUrl(layer.documentId);
  return (
    <div
      className={cx("absolute cursor-grab touch-none select-none", selected && "outline-2 outline-offset-2 outline-dashed outline-white")}
      style={{ left: `${layer.x * 100}%`, top: `${layer.y * 100}%`, width: `${layer.width * 100}%`, transform: "translate(-50%, -50%)" }}
      onPointerDown={onPointerDown}
      role="button"
      tabIndex={0}
      aria-label="Photo in the picture — drag to move"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- private, signed URLs */}
      {url && <img src={url} alt="" draggable={false} className="block w-full drop-shadow-[0_12px_18px_rgba(0,0,0,.35)]" crossOrigin="anonymous" />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Outfits                                                             */
/* ------------------------------------------------------------------ */

function OutfitsTab({ data }: { data: WeddingData }) {
  const [vision, setVision] = usePlanner("vision");
  const [theme] = usePlanner("theme");
  const upload = usePhotoUpload(data.wedding.id);
  const toast = useToast();
  const setOutfit = (id: string, patch: Partial<OutfitPlan>) => setVision((v) => ({ ...v, outfits: v.outfits.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
  const tips = outfitAdvice(vision.outfits, theme.colors);

  const attach = async (o: OutfitPlan, file: File) => {
    try {
      const id = await upload(file, { title: `${o.moment} outfit` });
      setVision((v) => ({ ...v, items: [...v.items, { documentId: id, tag: "outfit", caption: o.moment, likes: [] }], outfits: v.outfits.map((x) => (x.id === o.id ? { ...x, documentId: id } : x)) }));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't upload the photo.", "danger");
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="flex flex-col gap-4">
        {(["bride", "groom"] as const).map((who) => (
          <section key={who} className="wos-card flex flex-col gap-4" aria-labelledby={`h-${who}`}>
            <div className="flex items-center justify-between">
              <h2 id={`h-${who}`} className="wos-h2">{who === "bride" ? data.wedding.brideName : data.wedding.groomName}</h2>
              <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => setVision((v) => ({ ...v, outfits: [...v.outfits, { id: newId(), who, moment: "Another outfit", description: "", color: theme.colors[1] ?? "#c9a24a", documentId: null, done: false }] }))}><Plus className="wos-icon" aria-hidden="true" />Add Outfit</button>
            </div>
            {vision.outfits.filter((o) => o.who === who).map((o) => (
              <div key={o.id} className="grid gap-3 rounded-2xl border border-line p-3 sm:grid-cols-[112px_1fr]">
                <label className="relative block h-36 cursor-pointer overflow-hidden rounded-xl bg-surface-sunken" aria-label="Add an outfit photo">
                  {o.documentId ? <StoredPhoto documentId={o.documentId} className="size-full" /> : <span className="grid size-full place-items-center text-center text-[12px] font-semibold text-ink-muted"><ImagePlus className="wos-icon" aria-hidden="true" />Photo</span>}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void attach(o, f); }} />
                </label>
                <div className="flex flex-col gap-2">
                  <input className="wos-input !h-10 font-semibold" value={o.moment} onChange={(e) => setOutfit(o.id, { moment: e.target.value.slice(0, 60) })} aria-label="When" />
                  <input className="wos-input !h-10" value={o.description} placeholder="Describe it: style, fabric, designer…" onChange={(e) => setOutfit(o.id, { description: e.target.value.slice(0, 200) })} aria-label="Description" />
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-ink-muted">Colour
                      <span className="relative block size-8 rounded-full border border-line" style={{ background: o.color }}>
                        <input type="color" value={o.color} onChange={(e) => setOutfit(o.id, { color: e.target.value })} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label="Outfit colour" />
                      </span>
                    </label>
                    {theme.colors.slice(0, 4).map((c) => <button key={c} type="button" className="size-6 rounded-full border border-line" style={{ background: c }} onClick={() => setOutfit(o.id, { color: c })} aria-label={`Use ${c}`} />)}
                    <span className="flex-1" />
                    <Toggle label="Finalised" checked={o.done} onChange={(v) => setOutfit(o.id, { done: v })} />
                    <button type="button" className="wos-iconbtn !size-9" aria-label="Remove outfit" onClick={() => setVision((v) => ({ ...v, outfits: v.outfits.filter((x) => x.id !== o.id) }))}><Trash2 className="wos-icon" aria-hidden="true" /></button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
      <aside className="wos-card flex flex-col gap-3 lg:sticky lg:top-5" aria-labelledby="h-advice">
        <h2 id="h-advice" className="wos-h2 flex items-center gap-2"><Lightbulb className="wos-icon text-champagne-700" aria-hidden="true" />Style advisor</h2>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {tips.map((t, i) => (
            <li key={i} className="flex gap-3 text-[14px] leading-5">
              <span className="mt-1 flex flex-none gap-1">{t.colors.map((c) => <i key={c} className="block size-3 rounded-full border border-line" style={{ background: c }} />)}</span>
              <span>{t.text}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

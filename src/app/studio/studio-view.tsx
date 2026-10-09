"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { Camera, Download, Play, Share2, Trash2, X } from "lucide-react";
import { usePage } from "@/lib/hooks/use-page";
import { WeddingGate } from "@/components/shell/wedding-gate";
import { useToast } from "@/components/shell/toast";
import { formatLongDate, formatTime } from "@/lib/domain/dates";
import { sortTimeline } from "@/lib/domain/day";
import type { WeddingData } from "@/lib/domain/types";
import { loadStudio, photoToDataUrl, saveStudio, sceneToPng, type StudioSettings } from "@/lib/studio";
import { PoruwaScene, type BrideOutfit, type CoupleLook, type Face, type GroomOutfit, type HallTheme, THEMES } from "@/components/features/poruwa-scene";
import { ChoiceChips, Toggle } from "@/components/ui/fields";
import { Notice, Skeleton, cx } from "@/components/ui/primitives";

const BRIDE_OUTFITS: { value: BrideOutfit; label: string; color: string; accent: string }[] = [
  { value: "kandyan", label: "Kandyan Osariya", color: "#f8f1e2", accent: "#c9a24a" },
  { value: "saree", label: "Saree", color: "#9e1b2a", accent: "#c9a24a" },
  { value: "gown", label: "White gown", color: "#ffffff", accent: "#c9a24a" },
];
const GROOM_OUTFITS: { value: GroomOutfit; label: string; color: string; accent: string }[] = [
  { value: "nilame", label: "Kandyan Nilame", color: "#fbf7ee", accent: "#c9a24a" },
  { value: "national", label: "National dress", color: "#fbf7ee", accent: "#c9a24a" },
  { value: "suit", label: "Suit", color: "#1f2a44", accent: "#9e1b2a" },
];
const BRIDE_COLORS = [
  ["Ivory", "#f8f1e2"], ["White", "#ffffff"], ["Red", "#9e1b2a"], ["Maroon", "#6e1424"], ["Gold", "#d9b25f"],
  ["Blush", "#e9b8bd"], ["Royal blue", "#2c4a8c"], ["Emerald", "#1f6f54"], ["Lilac", "#b9a3d0"],
] as const;
const GROOM_COLORS = [
  ["Ivory", "#fbf7ee"], ["White", "#ffffff"], ["Beige", "#e6d6b8"], ["Navy", "#1f2a44"], ["Black", "#22201f"], ["Charcoal", "#3d3f45"], ["Maroon", "#6e1424"],
] as const;
const ACCENTS = [["Gold", "#c9a24a"], ["Silver", "#b9bec7"], ["Red", "#9e1b2a"], ["Wine", "#6e1424"], ["Emerald", "#1f6f54"], ["Navy", "#1f2a44"]] as const;
const SKINS = [["Fair", "#e8c4a0"], ["Light", "#d4a77c"], ["Medium", "#c99a6e"], ["Tan", "#b98a5e"], ["Brown", "#9a6a44"], ["Deep", "#7a4f32"]] as const;
const HALLS: { value: HallTheme; label: string }[] = [
  { value: "ivory", label: "Ivory & gold" },
  { value: "wine", label: "Royal wine" },
  { value: "garden", label: "Garden" },
  { value: "evening", label: "Evening lights" },
];

type Tab = "photos" | "outfits" | "hall";

export function StudioView() {
  return (
    <WeddingGate>
      <Studio />
    </WeddingGate>
  );
}

function Studio() {
  const page = usePage();
  if (!page) {
    return (
      <div className="mx-auto grid max-w-[1200px] gap-6 p-6 lg:grid-cols-[1fr_380px]">
        <Skeleton style={{ aspectRatio: "4 / 3", borderRadius: 24 }} />
        <Skeleton style={{ height: 480, borderRadius: 24 }} />
      </div>
    );
  }
  return <StudioEditor data={page.data} key={page.data.wedding.id} />;
}

function StudioEditor({ data }: { data: WeddingData }) {
  const { wedding } = data;
  const toast = useToast();
  const [settings, setSettings] = useState<StudioSettings>(() => loadStudio(wedding.id));
  const [tab, setTab] = useState<Tab>("outfits");
  const [play, setPlay] = useState(0);
  const [busy, setBusy] = useState(false);
  const [storageFull, setStorageFull] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [canShare] = useState(canShareFiles);

  const apply = (next: StudioSettings) => {
    setSettings(next);
    setStorageFull(!saveStudio(wedding.id, next));
  };
  const look = settings.look;
  const setLook = (patch: Partial<CoupleLook>) => apply({ ...settings, look: { ...settings.look, ...patch } });

  const poruwa = sortTimeline(data.timeline).find((e) => e.scene === "poruwa");
  const title = `${wedding.brideName} & ${wedding.groomName}`;
  const detail = [formatLongDate(wedding.weddingDate), poruwa ? `Poruwa ${formatTime(poruwa.time)}` : null, wedding.venue || wedding.location].filter(Boolean).join(" · ");
  const fileName = `${wedding.brideName}-${wedding.groomName}-poruwa`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const render = async () => {
    if (!svgRef.current) throw new Error("The picture isn't ready yet.");
    return sceneToPng(svgRef.current, { title, detail });
  };

  const download = async () => {
    setBusy(true);
    try {
      const blob = await render();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't create the picture.", "danger");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      const blob = await render();
      await navigator.share({ files: [new File([blob], `${fileName}.png`, { type: "image/png" })], title });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) toast("Couldn't share the picture. Try Download instead.", "danger");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 pt-5 md:px-6">
        <div className="flex flex-col">
          <span className="wos-overline">Poruwa Studio</span>
          <h1 className="m-0 font-display text-[30px] leading-9 font-medium md:text-[36px] md:leading-[42px]">See yourselves on the Poruwa</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/simulator" className="wos-btn wos-btn--secondary wos-btn--sm max-sm:!hidden">Walk Through the Day</Link>
          <Link href="/dashboard" className="wos-iconbtn" aria-label="Close Poruwa Studio"><X className="wos-icon" aria-hidden="true" /></Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1240px] gap-6 px-4 py-5 md:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <section className="flex flex-col gap-3 lg:sticky lg:top-5" aria-label="Your Poruwa">
          <div className="overflow-hidden rounded-[24px] border border-line shadow-[var(--shadow-md)]">
            <PoruwaScene svgRef={svgRef} look={look} theme={settings.theme} animated={settings.animated} entrance={play > 0} entranceKey={play} className="block h-auto w-full" title={`${title} on the Poruwa`} />
            <div className="flex flex-col items-center gap-1 bg-surface-raised px-4 py-4 text-center">
              <span className="font-display text-[28px] leading-8">{title}</span>
              <span className="wos-overline">{detail}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="wos-btn wos-btn--secondary" onClick={() => setPlay((n) => n + 1)}><Play className="wos-icon" aria-hidden="true" />Play the Entrance</button>
            <button type="button" className="wos-btn wos-btn--primary" onClick={() => void download()} disabled={busy}><Download className="wos-icon" aria-hidden="true" />{busy ? "Preparing…" : "Download Picture"}</button>
            {canShare && <button type="button" className="wos-btn wos-btn--secondary" onClick={() => void share()} disabled={busy}><Share2 className="wos-icon" aria-hidden="true" />Share</button>}
          </div>
        </section>

        <section className="wos-card flex flex-col gap-5" aria-label="Customise">
          <div className="wos-tabs" role="tablist" aria-label="Customise">
            {(["outfits", "photos", "hall"] as const).map((t) => (
              <button key={t} type="button" role="tab" className="wos-tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                {t === "outfits" ? "Outfits" : t === "photos" ? "Photos" : "Hall"}
              </button>
            ))}
          </div>

          {storageFull && (
            <Notice tone="warning" icon={<Camera className="wos-icon" />} title="This browser's storage is full.">
              Your changes show here but won&apos;t be remembered. Try smaller photos.
            </Notice>
          )}

          {tab === "outfits" && (
            <>
              <h2 className="m-0 font-display text-[24px] leading-7 font-medium">{wedding.brideName}</h2>
              <ChoiceChips
                label="Outfit"
                value={look.brideOutfit}
                options={BRIDE_OUTFITS}
                onChange={(v) => {
                  const o = BRIDE_OUTFITS.find((x) => x.value === v)!;
                  setLook({ brideOutfit: v, brideColor: o.color, brideAccent: o.accent });
                }}
              />
              <Swatches label="Colour" value={look.brideColor} options={BRIDE_COLORS} onChange={(c) => setLook({ brideColor: c })} />
              <Swatches label={look.brideOutfit === "gown" ? "Trim" : "Blouse and border"} value={look.brideAccent} options={ACCENTS} onChange={(c) => setLook({ brideAccent: c })} />
              <Swatches label="Skin tone" value={look.brideSkin} options={SKINS} onChange={(c) => setLook({ brideSkin: c })} />

              <h2 className="m-0 border-t border-line pt-5 font-display text-[24px] leading-7 font-medium">{wedding.groomName}</h2>
              <ChoiceChips
                label="Outfit"
                value={look.groomOutfit}
                options={GROOM_OUTFITS}
                onChange={(v) => {
                  const o = GROOM_OUTFITS.find((x) => x.value === v)!;
                  setLook({ groomOutfit: v, groomColor: o.color, groomAccent: o.accent });
                }}
              />
              <Swatches label="Colour" value={look.groomColor} options={GROOM_COLORS} onChange={(c) => setLook({ groomColor: c })} />
              <Swatches label={look.groomOutfit === "suit" ? "Tie" : look.groomOutfit === "national" ? "Shawl" : "Embroidery"} value={look.groomAccent} options={ACCENTS} onChange={(c) => setLook({ groomAccent: c })} />
              <Swatches label="Skin tone" value={look.groomSkin} options={SKINS} onChange={(c) => setLook({ groomSkin: c })} />
            </>
          )}

          {tab === "photos" && (
            <>
              <p className="m-0 text-[14px] leading-5 text-ink-muted">Add a clear, front-facing photo of each of you. Photos stay on this device — they&apos;re never uploaded.</p>
              <PhotoPicker name={wedding.brideName} face={look.brideFace ?? null} onChange={(f) => setLook({ brideFace: f })} />
              <PhotoPicker name={wedding.groomName} face={look.groomFace ?? null} onChange={(f) => setLook({ groomFace: f })} />
            </>
          )}

          {tab === "hall" && (
            <>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Hall">
                {HALLS.map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    role="radio"
                    aria-checked={settings.theme === h.value}
                    onClick={() => apply({ ...settings, theme: h.value })}
                    className={cx("flex flex-col gap-2 rounded-2xl border p-2 text-left text-[14px] font-semibold", settings.theme === h.value ? "border-wine-600 ring-2 ring-wine-600/30" : "border-line")}
                  >
                    <span className="flex h-14 overflow-hidden rounded-xl" aria-hidden="true">
                      {[THEMES[h.value].wall, THEMES[h.value].drape, THEMES[h.value].carpet, THEMES[h.value].trim].map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}
                    </span>
                    {h.label}
                  </button>
                ))}
              </div>
              <Toggle label="Falling petals and flickering lamps" checked={settings.animated} onChange={(v) => apply({ ...settings, animated: v })} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/** Phones that can share files (WhatsApp, Messenger…) get a Share button. */
function canShareFiles(): boolean {
  try {
    const probe = new File([new Uint8Array(1)], "probe.png", { type: "image/png" });
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

function Swatches({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (c: string) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby={id}>
      <span id={id} className="text-[14px] leading-5 font-semibold">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map(([name, c]) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value.toLowerCase() === c}
            aria-label={name}
            title={name}
            onClick={() => onChange(c)}
            className={cx("size-9 rounded-full border border-line", value.toLowerCase() === c && "ring-2 ring-wine-600 ring-offset-2 ring-offset-[var(--surface-raised)]")}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

function PhotoPicker({ name, face, onChange }: { name: string; face: Face | null; onChange: (f: Face | null) => void }) {
  const toast = useToast();
  const inputId = useId();
  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      const src = await photoToDataUrl(file);
      onChange({ src, zoom: 1.3, x: 0, y: 0.1 });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't open that photo.", "danger");
    }
  };
  const set = (patch: Partial<Face>) => face && onChange({ ...face, ...patch });
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-16 flex-none place-items-center overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
          {face ? (
            <svg viewBox="-1 -1 2 2" className="size-16">
              <clipPath id={`${inputId}-clip`}><circle r="1" /></clipPath>
              <image href={face.src} x={-face.zoom + face.x} y={-face.zoom + face.y} width={face.zoom * 2} height={face.zoom * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${inputId}-clip)`} />
            </svg>
          ) : (
            <Camera className="wos-icon text-ink-muted" />
          )}
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <b className="text-[15px] leading-5">{name}</b>
          <div className="flex flex-wrap gap-2">
            <label htmlFor={inputId} className="wos-btn wos-btn--secondary wos-btn--sm cursor-pointer">{face ? "Change Photo" : "Add Photo"}</label>
            <input id={inputId} type="file" accept="image/*" className="sr-only" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
            {face && <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={() => onChange(null)}><Trash2 className="wos-icon" aria-hidden="true" />Remove</button>}
          </div>
        </div>
      </div>
      {face && (
        <div className="grid gap-2">
          <Slider label="Zoom" min={1} max={3} step={0.05} value={face.zoom} onChange={(v) => set({ zoom: v })} />
          <Slider label="Left – right" min={-1} max={1} step={0.02} value={face.x} onChange={(v) => set({ x: v })} />
          <Slider label="Up – down" min={-1} max={1} step={0.02} value={face.y} onChange={(v) => set({ y: v })} />
        </div>
      )}
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className="grid grid-cols-[96px_1fr] items-center gap-3">
      <label htmlFor={id} className="text-[13px] leading-[18px] font-semibold text-ink-muted">{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--wine-600)]" />
    </div>
  );
}

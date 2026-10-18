"use client";

import { useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ImagePlus, Plus, RefreshCw, Trash2, Wand2 } from "lucide-react";
import {
  AMBIENCES, ANIMATION_PRESETS, CARD_LAYOUTS, CARD_SHAPES, ENVELOPE_TEXTURES, FLAP_STYLES, FLORALS, FONTS, FONT_IDS, LINER_STYLES, MUSIC, ORNAMENTS, PHOTO_PLACEMENTS, SEAL_STYLES, TEMPLATES,
  initials, matchColors, type DesignColors, type FontId, type InviteContent, type InviteDesign, type InviteProject,
} from "@/lib/domain/invite-studio";
import { generateWording, type Language, type Length, type Tone, type Tradition } from "@/lib/domain/invite-wording";
import { isMapsUrl } from "@/lib/domain/invite-links";
import { ChoiceChips, NumberField, SelectField, TextArea, TextField, Toggle } from "@/components/ui/fields";
import { cx } from "@/components/ui/primitives";
import { TemplateThumb } from "./template-thumb";

export type Change = (fn: (p: InviteProject) => InviteProject, key?: string) => void;

const LABEL: Record<string, string> = {
  pointed: "Pointed", rounded: "Rounded", straight: "Straight", scalloped: "Scalloped",
  linen: "Linen", smooth: "Smooth paper", velvet: "Velvet", kraft: "Kraft", foil: "Foil shimmer", marble: "Marble",
  florals: "Florals", damask: "Damask", stripes: "Stripes", lotus: "Lotus", deco: "Art deco", leaves: "Leaves", solid: "Plain",
  wax: "Wax seal", ribbon: "Ribbon", none: "None",
  classic: "Classic centred", garden: "Garden wreath", editorial: "Editorial", royal: "Royal crest", arch: "Arch window", kandyan: "Kandyan", blacktie: "Black tie",
  rect: "Rectangle",
  scallop: "Scalloped",
  double: "Double frame", floral: "Floral frame", thin: "Thin line",
  roses: "Roses", wildflowers: "Wildflowers", eucalyptus: "Eucalyptus", orchids: "Orchids",
  gentle: "Gentle", cinematic: "Cinematic", swift: "Swift", petals: "Falling petals", sparkles: "Sparkles", golddust: "Gold dust",
  "music-box": "Music box", piano: "Soft piano",
  card: "On the card", reveal: "After opening", both: "Both",
};
const label = (v: string) => LABEL[v] ?? v.charAt(0).toUpperCase() + v.slice(1);
const opts = <T extends string>(list: readonly T[], names: Partial<Record<T, string>> = {}) => list.map((value) => ({ value, label: names[value] ?? label(value) }));

function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <fieldset className="flex flex-col gap-4 border-0 border-t border-line p-0 pt-4 first:border-t-0 first:pt-0">
      <legend className="float-left mb-1 w-full p-0 font-[family-name:var(--wos-serif)] text-[18px] text-ink">{title}</legend>
      {hint && <p className="m-0 -mt-3 text-[13px] text-ink-muted">{hint}</p>}
      {children}
    </fieldset>
  );
}

export function Range({ label: text, value, min, max, step, onChange, format = (v) => `${Math.round(v * 100)}%` }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  const id = useId();
  return (
    <div className="wos-field">
      <label htmlFor={id} className="flex justify-between">{text}<span className="font-normal text-ink-muted">{format(value)}</span></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="money-slider__range" style={{ "--pct": `${((value - min) / (max - min)) * 100}%` } as CSSProperties} />
    </div>
  );
}

const useSetters = (change: Change) => ({
  content: <K extends keyof InviteContent>(k: K, v: InviteContent[K]) => change((p) => ({ ...p, content: { ...p.content, [k]: v } }), `c.${String(k)}`),
  design: (fn: (d: InviteDesign) => InviteDesign, key: string) => change((p) => ({ ...p, design: fn(p.design) }), `d.${key}`),
});

/* ------------------------------------------------------------------ */

export function TemplatePanel({ p, onPick }: { p: InviteProject; onPick: (id: string) => void }) {
  return (
    <Section title="Template" hint="Switching keeps your wording, details and photo.">
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Template">
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={p.design.templateId === t.id} onClick={() => onPick(t.id)}
            className={cx("flex flex-col overflow-hidden rounded-[var(--radius-md)] border-2 bg-surface-raised p-0 text-left", p.design.templateId === t.id ? "border-wine-600" : "border-transparent")}>
            <TemplateThumb templateId={t.id} content={p.content} className="aspect-[4/5] w-full" />
            <span className="p-2 text-[12px] font-semibold leading-[16px] text-ink">{t.name}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

export function DetailsPanel({ p, change, onRefreshMoments }: { p: InviteProject; change: Change; onRefreshMoments: () => void }) {
  const set = useSetters(change).content;
  const c = p.content;
  const mapsError = c.mapsUrl.trim() && !isMapsUrl(c.mapsUrl) ? "Paste a Google Maps link (https://maps.app.goo.gl/… or https://www.google.com/maps/…)." : undefined;
  return (
    <div className="flex flex-col gap-5">
      <Section title="The couple">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Bride (as on the card)" value={c.brideName} onChange={(v) => set("brideName", v)} />
          <TextField label="Groom (as on the card)" value={c.groomName} onChange={(v) => set("groomName", v)} />
          <TextField label="Bride's full name" help="Used in formal wording." value={c.brideFull} onChange={(v) => set("brideFull", v)} />
          <TextField label="Groom's full name" value={c.groomFull} onChange={(v) => set("groomFull", v)} />
          <TextField label="Bride's parents" placeholder="Mr & Mrs Perera" value={c.brideParents} onChange={(v) => set("brideParents", v)} />
          <TextField label="Groom's parents" placeholder="Mr & Mrs Silva" value={c.groomParents} onChange={(v) => set("groomParents", v)} />
        </div>
        <TextField label="Initials on the seal" help={`Suggested: ${initials(c.brideName, c.groomName)}`} value={p.design.seal.text} onChange={(v) => change((x) => ({ ...x, design: { ...x.design, seal: { ...x.design.seal, text: v.slice(0, 8) } } }), "d.sealText")} />
      </Section>
      <Section title="When">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Date" type="date" value={c.date} onChange={(v) => set("date", v)} />
          <TextField label="Starts at" type="time" value={c.time} onChange={(v) => set("time", v)} />
          <TextField label="Ceremony" value={c.ceremonyTitle} onChange={(v) => set("ceremonyTitle", v)} />
          <TextField label="Ceremony time" type="time" value={c.ceremonyTime} onChange={(v) => set("ceremonyTime", v)} />
          <TextField label="Ceremony place (if different)" className="sm:col-span-2" value={c.ceremonyVenue} onChange={(v) => set("ceremonyVenue", v)} />
          <TextField label="Reception" value={c.receptionTitle} onChange={(v) => set("receptionTitle", v)} />
          <TextField label="Reception time" type="time" value={c.receptionTime} onChange={(v) => set("receptionTime", v)} />
          <TextField label="Reception place (if different)" className="sm:col-span-2" value={c.receptionVenue} onChange={(v) => set("receptionVenue", v)} />
        </div>
      </Section>
      <Section title="Where">
        <TextField label="Venue" value={c.venueName} onChange={(v) => set("venueName", v)} />
        <TextField label="Address" value={c.address} onChange={(v) => set("address", v)} />
        <TextField label="Google Maps link" placeholder="https://maps.app.goo.gl/…" error={mapsError} help="Optional. Without it, guests get a map search for the venue." value={c.mapsUrl} onChange={(v) => set("mapsUrl", v)} />
      </Section>
      <Section title="For guests">
        <TextField label="Dress code" placeholder="Pastel or traditional" value={c.dressCode} onChange={(v) => set("dressCode", v)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Reply by" type="date" value={c.rsvpDeadline} onChange={(v) => set("rsvpDeadline", v)} />
          <NumberField label="Each reply can bring up to" help="People, including the guest." min={1} max={20} value={c.maxParty} onChange={(v) => set("maxParty", Math.max(1, Math.min(20, v ?? 1)))} />
        </div>
        <TextArea label="Contacts" rows={2} placeholder={"Amaya · 077 123 4567\nKavindu · 071 765 4321"} value={c.contacts} onChange={(v) => set("contacts", v)} />
      </Section>
      <Section title="Moments of the day" hint="Shown on the invitation page under “The day”.">
        <Toggle label="Show the moments" checked={p.design.showDayPlan} onChange={(v) => change((x) => ({ ...x, design: { ...x.design, showDayPlan: v } }), "d.showDayPlan")} />
        {p.design.showDayPlan && (
          <div className="flex flex-col gap-2">
            {c.moments.map((m, i) => (
              <div key={i} className="flex items-end gap-2">
                <TextField label={i === 0 ? "Time" : ""} type="time" className="w-[120px]" value={m.time} onChange={(v) => set("moments", c.moments.map((x, j) => (j === i ? { ...x, time: v } : x)))} />
                <TextField label={i === 0 ? "Moment" : ""} className="flex-1" value={m.title} onChange={(v) => set("moments", c.moments.map((x, j) => (j === i ? { ...x, title: v } : x)))} />
                <button type="button" className="wos-iconbtn mb-1" aria-label={`Remove ${m.title || "moment"}`} onClick={() => set("moments", c.moments.filter((_, j) => j !== i))}><Trash2 className="wos-icon" aria-hidden="true" /></button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => set("moments", [...c.moments, { time: "20:00", title: "" }].slice(0, 12))}><Plus className="wos-icon" aria-hidden="true" />Add a moment</button>
              <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm" onClick={onRefreshMoments}><RefreshCw className="wos-icon" aria-hidden="true" />Use my day plan</button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

export function WordingPanel({ p, change }: { p: InviteProject; change: Change }) {
  const set = useSetters(change);
  const [tone, setTone] = useState<Tone>("formal");
  const [tradition, setTradition] = useState<Tradition>("traditional");
  const [language, setLanguage] = useState<Language>("both");
  const [length, setLength] = useState<Length>("short");
  const [variant, setVariant] = useState(0);
  const idea = useMemo(() => generateWording(p.content, { tone, tradition, language, length, variant }), [p.content, tone, tradition, language, length, variant]);
  const c = p.content;
  return (
    <div className="flex flex-col gap-5">
      <Section title="Wording ideas" hint="Written on your device from a library of Sri Lankan wedding phrases — no paid AI. Everything stays editable.">
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceChips label="Tone" value={tone} onChange={setTone} options={[{ value: "formal", label: "Formal" }, { value: "modern", label: "Modern" }]} />
          <ChoiceChips label="Style" value={tradition} onChange={setTradition} options={[{ value: "traditional", label: "Traditional" }, { value: "contemporary", label: "Contemporary" }]} />
          <ChoiceChips label="Language" value={language} onChange={setLanguage} options={[{ value: "en", label: "English" }, { value: "si", label: "සිංහල" }, { value: "both", label: "Both" }]} />
          <ChoiceChips label="Length" value={length} onChange={setLength} options={[{ value: "short", label: "Short" }, { value: "detailed", label: "Detailed" }]} />
        </div>
        <blockquote className="m-0 flex flex-col gap-2 rounded-[var(--radius-md)] border border-line bg-surface-sunken p-4 text-[14px] leading-[21px] text-ink" aria-live="polite">
          {idea.blessing && <span className="text-ink-muted">{idea.blessing}</span>}
          {idea.sinhalaLine && <span>{idea.sinhalaLine}</span>}
          <span>{idea.inviteMessage}</span>
          <span className="italic text-ink-muted">{idea.closingMessage}</span>
        </blockquote>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="wos-btn wos-btn--primary wos-btn--sm" onClick={() => change((x) => ({ ...x, content: { ...x.content, blessing: idea.blessing, sinhalaLine: idea.sinhalaLine, inviteMessage: idea.inviteMessage }, design: { ...x.design, closingMessage: idea.closingMessage } }))}><Wand2 className="wos-icon" aria-hidden="true" />Use this wording</button>
          <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => setVariant((v) => v + 1)}><RefreshCw className="wos-icon" aria-hidden="true" />Try another</button>
        </div>
      </Section>
      <Section title="On the card">
        <TextField label="Blessing (top line)" value={c.blessing} onChange={(v) => set.content("blessing", v)} />
        <TextField label="Sinhala line" value={c.sinhalaLine} onChange={(v) => set.content("sinhalaLine", v)} />
        <TextArea label="Invitation message" rows={4} value={c.inviteMessage} onChange={(v) => set.content("inviteMessage", v)} />
      </Section>
      <Section title="Opening and closing">
        <TextField label="Text on the envelope" value={p.design.openingText} onChange={(v) => set.design((d) => ({ ...d, openingText: v }), "openingText")} />
        <TextArea label="Closing message" rows={2} value={p.design.closingMessage} onChange={(v) => set.design((d) => ({ ...d, closingMessage: v }), "closingMessage")} />
      </Section>
    </div>
  );
}

const COLOR_FIELDS: [keyof DesignColors, string][] = [
  ["background", "Background"], ["envelope", "Envelope"], ["liner", "Envelope liner"], ["card", "Card paper"], ["ink", "Text"],
  ["accent", "Gold / accent"], ["seal", "Seal"], ["floralA", "Flowers"], ["floralB", "Leaves / second flower"],
];
const SWATCHES = ["#D9B3B8", "#E8D4B0", "#722F37", "#C8B8DC", "#A8B5A0", "#C6A15B", "#8FA9C4", "#1C1416"];

function fontOptions(kinds: ("serif" | "script" | "sans")[]) {
  return FONT_IDS.filter((f) => kinds.includes(FONTS[f].kind)).map((f) => ({ value: f, label: FONTS[f].label }));
}

export function DesignPanel({ p, change }: { p: InviteProject; change: Change }) {
  const { design: set } = useSetters(change);
  const d = p.design;
  const [primary, setPrimary] = useState(d.colors.floralA);
  return (
    <div className="flex flex-col gap-5">
      <Section title="Smart colours" hint="Pick your wedding colour — we build a matching, readable palette.">
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Wedding colour">
          {SWATCHES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={primary === c} aria-label={c} onClick={() => setPrimary(c)}
              className={cx("size-8 rounded-full border-2", primary === c ? "border-wine-600 ring-2 ring-wine-600/30" : "border-white shadow-[var(--shadow-sm)]")} style={{ background: c }} />
          ))}
          <input type="color" aria-label="Custom colour" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-line bg-transparent" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => set((x) => ({ ...x, colors: matchColors(primary, "light") }), "colors")}>Light palette</button>
          <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={() => set((x) => ({ ...x, colors: matchColors(primary, "dark") }), "colors")}>Deep palette</button>
        </div>
      </Section>
      <Section title="Colours">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
          {COLOR_FIELDS.map(([k, name]) => (
            <label key={k} className="flex items-center gap-2 text-[13px] text-ink">
              <input type="color" value={d.colors[k]} onChange={(e) => set((x) => ({ ...x, colors: { ...x.colors, [k]: e.target.value } }), `color.${k}`)} className="h-8 w-10 shrink-0 cursor-pointer rounded border border-line bg-transparent" />
              {name}
            </label>
          ))}
        </div>
      </Section>
      <Section title="Envelope">
        <ChoiceChips label="Flap" value={d.envelope.flap} onChange={(v) => set((x) => ({ ...x, envelope: { ...x.envelope, flap: v } }), "flap")} options={opts(FLAP_STYLES)} />
        <ChoiceChips label="Paper" value={d.envelope.texture} onChange={(v) => set((x) => ({ ...x, envelope: { ...x.envelope, texture: v } }), "texture")} options={opts(ENVELOPE_TEXTURES)} />
        <ChoiceChips label="Liner pattern" value={d.envelope.liner} onChange={(v) => set((x) => ({ ...x, envelope: { ...x.envelope, liner: v } }), "liner")} options={opts(LINER_STYLES)} />
        <ChoiceChips label="Seal" value={d.seal.style} onChange={(v) => set((x) => ({ ...x, seal: { ...x.seal, style: v } }), "seal")} options={opts(SEAL_STYLES, { foil: "Gold foil" })} />
      </Section>
      <Section title="Card">
        <SelectField label="Layout" value={d.card.layout} onChange={(v) => set((x) => ({ ...x, card: { ...x.card, layout: v } }), "layout")} options={opts(CARD_LAYOUTS, { deco: "Art deco" })} />
        <ChoiceChips label="Shape" value={d.card.shape} onChange={(v) => set((x) => ({ ...x, card: { ...x.card, shape: v } }), "shape")} options={opts(CARD_SHAPES, { arch: "Arch", rounded: "Rounded corners" })} />
        <SelectField label="Border" value={d.card.ornament} onChange={(v) => set((x) => ({ ...x, card: { ...x.card, ornament: v } }), "ornament")} options={opts(ORNAMENTS, { kandyan: "Kandyan", royal: "Royal", deco: "Art deco" })} />
        <SelectField label="Flowers" value={d.florals} onChange={(v) => set((x) => ({ ...x, florals: v }), "florals")} options={opts(FLORALS, { lotus: "Lotus & oil lamp" })} />
      </Section>
      <Section title="Fonts">
        <SelectField label="Names" value={d.fonts.names} onChange={(v: FontId) => set((x) => ({ ...x, fonts: { ...x.fonts, names: v } }), "fNames")} options={fontOptions(["script", "serif"])} />
        <SelectField label="Headings" value={d.fonts.headings} onChange={(v: FontId) => set((x) => ({ ...x, fonts: { ...x.fonts, headings: v } }), "fHead")} options={fontOptions(["serif", "sans"])} />
        <SelectField label="Body text" value={d.fonts.body} onChange={(v: FontId) => set((x) => ({ ...x, fonts: { ...x.fonts, body: v } }), "fBody")} options={fontOptions(["serif", "sans"])} />
        <Range label="Names size" value={d.scale.names} min={0.7} max={1.4} step={0.05} onChange={(v) => set((x) => ({ ...x, scale: { ...x.scale, names: v } }), "sNames")} />
        <Range label="Text size" value={d.scale.body} min={0.7} max={1.4} step={0.05} onChange={(v) => set((x) => ({ ...x, scale: { ...x.scale, body: v } }), "sBody")} />
      </Section>
    </div>
  );
}

/** Shrink a photo to a light JPEG data URL so the published invitation stays fast. */
async function photoToDataUrl(file: File, max = 1400): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo (JPG or PNG).");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That file isn't a photo we can open."));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't resize photos.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.84);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoPanel({ p, change, onError }: { p: InviteProject; change: Change; onError: (m: string) => void }) {
  const { design: set } = useSetters(change);
  const photo = p.design.photo;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const setPhoto = (patch: Partial<InviteDesign["photo"]>, key: string) => set((x) => ({ ...x, photo: { ...x.photo, ...patch } }), key);
  return (
    <div className="flex flex-col gap-5">
      <Section title="Your photo" hint="A pre-shoot photo looks lovely. It's resized on your device before saving.">
        <input ref={input} type="file" accept="image/*" className="sr-only" aria-label="Choose a photo" onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            const src = await photoToDataUrl(file);
            set((x) => ({ ...x, photo: { ...x.photo, src, x: 50, y: 50, zoom: 1, placement: x.photo.placement === "none" ? "both" : x.photo.placement } }), "photo");
          } catch (err) {
            onError(err instanceof Error ? err.message : "Couldn't add the photo.");
          } finally {
            setBusy(false);
          }
        }} />
        {photo.src ? (
          <div className="flex flex-col gap-3">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[260px] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface-sunken">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
              <img src={photo.src} alt="Your photo, as it will be cropped" className="size-full object-cover" style={{ objectPosition: `${photo.x}% ${photo.y}%`, transform: `scale(${photo.zoom})`, transformOrigin: `${photo.x}% ${photo.y}%` }} />
            </div>
            <Range label="Move left / right" value={photo.x} min={0} max={100} step={1} format={(v) => `${v}%`} onChange={(v) => setPhoto({ x: v }, "px")} />
            <Range label="Move up / down" value={photo.y} min={0} max={100} step={1} format={(v) => `${v}%`} onChange={(v) => setPhoto({ y: v }, "py")} />
            <Range label="Zoom" value={photo.zoom} min={1} max={2.5} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => setPhoto({ zoom: v }, "pz")} />
            <ChoiceChips label="Show the photo" value={photo.placement} onChange={(v) => setPhoto({ placement: v }, "pp")} options={opts(PHOTO_PLACEMENTS, { none: "Hidden" })} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" disabled={busy} onClick={() => input.current?.click()}><ImagePlus className="wos-icon" aria-hidden="true" />Change photo</button>
              <button type="button" className="wos-btn wos-btn--ghost wos-btn--sm !text-[var(--danger)]" onClick={() => setPhoto({ src: null, placement: "none" }, "photo")}><Trash2 className="wos-icon" aria-hidden="true" />Remove</button>
            </div>
          </div>
        ) : (
          <button type="button" className="wos-btn wos-btn--primary self-start" disabled={busy} onClick={() => input.current?.click()}><ImagePlus className="wos-icon" aria-hidden="true" />{busy ? "Adding…" : "Add a photo"}</button>
        )}
      </Section>
    </div>
  );
}

export function MotionPanel({ p, change, onReplay }: { p: InviteProject; change: Change; onReplay: () => void }) {
  const { design: set } = useSetters(change);
  const d = p.design;
  return (
    <div className="flex flex-col gap-5">
      <Section title="Opening animation">
        <ChoiceChips label="Style" value={d.animation.preset} onChange={(v) => set((x) => ({ ...x, animation: { ...x.animation, preset: v } }), "preset")} options={opts(ANIMATION_PRESETS)} />
        <Range label="Speed" value={d.animation.speed} min={0.6} max={1.6} step={0.05} format={(v) => (v < 0.95 ? "Slower" : v > 1.05 ? "Faster" : "Normal")} onChange={(v) => set((x) => ({ ...x, animation: { ...x.animation, speed: v } }), "speed")} />
        <ChoiceChips label="Floating in the air" value={d.ambience} onChange={(v) => set((x) => ({ ...x, ambience: v }), "ambience")} options={opts(AMBIENCES)} />
        <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm self-start" onClick={onReplay}><RefreshCw className="wos-icon" aria-hidden="true" />Replay the opening</button>
        <p className="m-0 text-[13px] text-ink-muted">Guests who prefer less motion (a phone setting) go straight to the invitation.</p>
      </Section>
      <Section title="Sound">
        <ChoiceChips label="Music" value={d.music} onChange={(v) => set((x) => ({ ...x, music: v }), "music")} options={opts(MUSIC, { none: "No music" })} />
        <p className="m-0 text-[13px] text-ink-muted">Music starts only after the guest taps to open, and they can mute it any time.</p>
      </Section>
      <Section title="Extras">
        <Toggle label="Show a countdown" checked={d.showCountdown} onChange={(v) => set((x) => ({ ...x, showCountdown: v }), "countdown")} />
      </Section>
    </div>
  );
}

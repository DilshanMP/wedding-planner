import { contrast, darkenFor, luminance, mix, parseHex } from "../theme-colors";
import type { ID, ISODate, ISODateTime, Wedding } from "./types";

/**
 * EverAfter Studio — the couple's animated invitations.
 *
 * A project keeps its own content (names, date, venue…) and design (colours,
 * envelope, card, fonts, animation) separately from the template it started
 * from, so every invitation can be rebuilt exactly from its saved data and new
 * templates can be added without touching the editor.
 */

/* ------------------------------------------------------------------ */
/* Design vocabulary                                                   */
/* ------------------------------------------------------------------ */

export const FLAP_STYLES = ["pointed", "rounded", "straight", "scalloped"] as const;
export type FlapStyle = (typeof FLAP_STYLES)[number];
export const ENVELOPE_TEXTURES = ["linen", "smooth", "velvet", "kraft", "foil", "marble"] as const;
export type EnvelopeTexture = (typeof ENVELOPE_TEXTURES)[number];
export const LINER_STYLES = ["florals", "damask", "stripes", "lotus", "deco", "leaves", "solid"] as const;
export type LinerStyle = (typeof LINER_STYLES)[number];
export const SEAL_STYLES = ["wax", "foil", "ribbon", "none"] as const;
export type SealStyle = (typeof SEAL_STYLES)[number];
export const CARD_LAYOUTS = ["classic", "garden", "editorial", "royal", "arch", "kandyan", "deco", "blacktie"] as const;
export type CardLayout = (typeof CARD_LAYOUTS)[number];
export const CARD_SHAPES = ["rect", "rounded", "arch", "scallop"] as const;
export type CardShape = (typeof CARD_SHAPES)[number];
export const ORNAMENTS = ["double", "floral", "thin", "royal", "kandyan", "deco", "none"] as const;
export type Ornament = (typeof ORNAMENTS)[number];
export const FLORALS = ["roses", "wildflowers", "eucalyptus", "lotus", "orchids", "none"] as const;
export type Florals = (typeof FLORALS)[number];
export const ANIMATION_PRESETS = ["gentle", "cinematic", "swift", "royal"] as const;
export type AnimationPreset = (typeof ANIMATION_PRESETS)[number];
export const AMBIENCES = ["petals", "sparkles", "golddust", "leaves", "none"] as const;
export type Ambience = (typeof AMBIENCES)[number];
export const MUSIC = ["music-box", "piano", "none"] as const;
export type Music = (typeof MUSIC)[number];
export const PHOTO_PLACEMENTS = ["card", "reveal", "both", "none"] as const;
export type PhotoPlacement = (typeof PHOTO_PLACEMENTS)[number];

export const FONT_IDS = ["cormorant", "playfair", "cinzel", "bodoni", "greatvibes", "pinyon", "parisienne", "manrope", "jost"] as const;
export type FontId = (typeof FONT_IDS)[number];

/** CSS / SVG font stacks. Sinhala text falls through to Noto Serif Sinhala. */
export const FONTS: Record<FontId, { label: string; family: string; kind: "serif" | "script" | "sans" }> = {
  cormorant: { label: "Cormorant (classic serif)", family: "'Cormorant Garamond', 'Noto Serif Sinhala', Georgia, serif", kind: "serif" },
  playfair: { label: "Playfair Display", family: "'Playfair Display', 'Noto Serif Sinhala', Georgia, serif", kind: "serif" },
  cinzel: { label: "Cinzel (royal capitals)", family: "'Cinzel', 'Noto Serif Sinhala', Georgia, serif", kind: "serif" },
  bodoni: { label: "Bodoni (editorial)", family: "'Bodoni Moda', 'Noto Serif Sinhala', Georgia, serif", kind: "serif" },
  greatvibes: { label: "Great Vibes (calligraphy)", family: "'Great Vibes', 'Noto Serif Sinhala', cursive", kind: "script" },
  pinyon: { label: "Pinyon Script", family: "'Pinyon Script', 'Noto Serif Sinhala', cursive", kind: "script" },
  parisienne: { label: "Parisienne", family: "'Parisienne', 'Noto Serif Sinhala', cursive", kind: "script" },
  manrope: { label: "Manrope (modern sans)", family: "'Manrope', 'Noto Sans Sinhala', system-ui, sans-serif", kind: "sans" },
  jost: { label: "Jost (geometric sans)", family: "'Jost', 'Noto Sans Sinhala', system-ui, sans-serif", kind: "sans" },
};

export interface DesignColors {
  /** Page behind the envelope. */
  background: string;
  envelope: string;
  /** Inside of the envelope and flap. */
  liner: string;
  card: string;
  ink: string;
  accent: string;
  seal: string;
  floralA: string;
  floralB: string;
}

export type Addressing = "you" | "name";
/** How the invitation opens: a sealed envelope, or ribbon-tied garden doors. */
export const OPENINGS = ["envelope", "gate"] as const;
export type Opening = (typeof OPENINGS)[number];
export const STORY_ICONS = ["meet", "adventure", "question", "wedding", "heart", "home"] as const;
export type StoryIcon = (typeof STORY_ICONS)[number];
export interface StoryChapter { title: string; text: string; icon: StoryIcon }

export interface InviteDesign {
  templateId: string;
  colors: DesignColors;
  envelope: { flap: FlapStyle; texture: EnvelopeTexture; liner: LinerStyle };
  seal: { style: SealStyle; text: string };
  card: { layout: CardLayout; shape: CardShape; ornament: Ornament };
  florals: Florals;
  fonts: { names: FontId; headings: FontId; body: FontId };
  /** 0.7–1.4 multipliers. */
  scale: { names: number; body: number };
  animation: { preset: AnimationPreset; speed: number };
  ambience: Ambience;
  music: Music;
  openingText: string;
  closingMessage: string;
  showCountdown: boolean;
  showDayPlan: boolean;
  /** Personal links: "You / You Both / You & Your Family", or the guest's name. */
  addressing: Addressing;
  opening: Opening;
  photo: { src: string | null; x: number; y: number; zoom: number; placement: PhotoPlacement };
}

export interface InviteContent {
  brideName: string;
  groomName: string;
  brideFull: string;
  groomFull: string;
  brideParents: string;
  groomParents: string;
  blessing: string;
  sinhalaLine: string;
  inviteMessage: string;
  date: ISODate;
  /** HH:mm, the start of the celebration. */
  time: string;
  ceremonyTitle: string;
  ceremonyTime: string;
  ceremonyVenue: string;
  receptionTitle: string;
  receptionTime: string;
  receptionVenue: string;
  venueName: string;
  address: string;
  mapsUrl: string;
  dressCode: string;
  rsvpDeadline: ISODate | "";
  contacts: string;
  /** Up to how many people one RSVP may bring (1 = just themselves). */
  maxParty: number;
  /** Optional moments shown on the invitation (from the day plan). */
  moments: { time: string; title: string }[];
  /** "Our story" chapters (garden-gate invitations). */
  story: StoryChapter[];
}

export type ExportKind = "png" | "svg" | "pdf" | "video" | "canva";

export interface ExportRecord {
  id: ID;
  kind: ExportKind;
  status: "done" | "failed";
  at: ISODateTime;
  /** Canva edit link, or a file name. */
  detail: string;
}

export interface InviteProject {
  id: ID;
  name: string;
  content: InviteContent;
  design: InviteDesign;
  slug: string | null;
  publishedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  exports: ExportRecord[];
}

export interface InvitesPlan {
  projects: InviteProject[];
  /** The design used for each guest's personal invitation link. */
  mainId: ID | null;
}

export function emptyInvites(): InvitesPlan {
  return { projects: [], mainId: null };
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

export const BRAND = {
  ivory: "#FFF9F0",
  champagne: "#E8D4B0",
  dustyPink: "#D9B3B8",
  wine: "#722F37",
  lavender: "#C8B8DC",
  sage: "#A8B5A0",
  gold: "#C6A15B",
} as const;

export interface InviteTemplate {
  id: string;
  name: string;
  tagline: string;
  mood: string[];
  design: Omit<InviteDesign, "templateId" | "photo" | "openingText" | "closingMessage" | "showCountdown" | "showDayPlan" | "addressing" | "opening" | "music"> & { music: Music; opening?: Opening };
  /** Static (no ambience, quick reveal) or animated by default. */
  animated: boolean;
}

const t = (x: InviteTemplate) => x;

export const TEMPLATES: InviteTemplate[] = [
  t({
    id: "crystal-gate",
    name: "Crystal Garden Gate",
    tagline: "Ribbon-tied garden doors open on a floral arch, then the rings rise in golden light.",
    mood: ["Cinematic", "Romantic", "New"],
    animated: true,
    design: {
      colors: { background: "#F6F1EC", envelope: "#EEE5DB", liner: "#E9DCD6", card: "#FFFDFA", ink: "#3E3438", accent: "#B48C46", seal: "#B9787F", floralA: "#EBD9D7", floralB: "#E3D7C3" },
      envelope: { flap: "pointed", texture: "smooth", liner: "florals" },
      seal: { style: "none", text: "" },
      card: { layout: "arch", shape: "arch", ornament: "thin" },
      florals: "roses",
      fonts: { names: "pinyon", headings: "cormorant", body: "cormorant" },
      scale: { names: 1, body: 1 },
      animation: { preset: "cinematic", speed: 1 },
      ambience: "sparkles",
      music: "piano",
      opening: "gate",
    },
  }),
  t({
    id: "ivory-champagne",
    name: "Ivory & Champagne Luxury",
    tagline: "Champagne linen, a wine wax seal and gold leaf.",
    mood: ["Luxury", "Classic"],
    animated: true,
    design: {
      colors: { background: "#F7EFE3", envelope: "#EBDCC2", liner: "#C6A15B", card: "#FFFCF6", ink: "#4A3730", accent: "#B48C46", seal: BRAND.wine, floralA: BRAND.dustyPink, floralB: BRAND.sage },
      envelope: { flap: "pointed", texture: "linen", liner: "damask" },
      seal: { style: "wax", text: "" },
      card: { layout: "classic", shape: "rect", ornament: "double" },
      florals: "roses",
      fonts: { names: "greatvibes", headings: "cormorant", body: "cormorant" },
      scale: { names: 1, body: 1 },
      animation: { preset: "cinematic", speed: 1 },
      ambience: "golddust",
      music: "music-box",
    },
  }),
  t({
    id: "dusty-pink-floral",
    name: "Dusty Pink Romantic Floral",
    tagline: "Blush envelope, a garden of roses, soft falling petals.",
    mood: ["Romantic", "Floral"],
    animated: true,
    design: {
      colors: { background: "#F8ECEB", envelope: "#E4BFC3", liner: "#F6E3E1", card: "#FFFAF7", ink: "#6A3A44", accent: "#B98A5E", seal: "#A9606B", floralA: "#D9A2AA", floralB: BRAND.sage },
      envelope: { flap: "rounded", texture: "smooth", liner: "florals" },
      seal: { style: "wax", text: "" },
      card: { layout: "garden", shape: "rounded", ornament: "floral" },
      florals: "roses",
      fonts: { names: "parisienne", headings: "cormorant", body: "cormorant" },
      scale: { names: 1, body: 1 },
      animation: { preset: "gentle", speed: 1 },
      ambience: "petals",
      music: "music-box",
    },
  }),
  t({
    id: "modern-minimal",
    name: "Modern Minimalist Editorial",
    tagline: "Gallery-white paper, big type, nothing extra.",
    mood: ["Modern", "Minimal"],
    animated: false,
    design: {
      colors: { background: "#EFECE6", envelope: "#FBFAF7", liner: "#1E1E1E", card: "#FFFFFF", ink: "#1C1C1C", accent: "#A88A55", seal: "#1C1C1C", floralA: "#D8D2C8", floralB: "#BFC5B8" },
      envelope: { flap: "straight", texture: "smooth", liner: "stripes" },
      seal: { style: "foil", text: "" },
      card: { layout: "editorial", shape: "rect", ornament: "thin" },
      florals: "none",
      fonts: { names: "bodoni", headings: "jost", body: "jost" },
      scale: { names: 1, body: 1 },
      animation: { preset: "swift", speed: 1 },
      ambience: "none",
      music: "piano",
    },
  }),
  t({
    id: "wine-royal",
    name: "Wine Red Royal Elegance",
    tagline: "Velvet wine envelope, gold crest, a regal reveal.",
    mood: ["Royal", "Bold"],
    animated: true,
    design: {
      colors: { background: "#2B1116", envelope: BRAND.wine, liner: "#D9BE85", card: "#FFF8EE", ink: "#4B1A22", accent: "#B88B3E", seal: "#C9A456", floralA: "#9E4A55", floralB: "#C6A15B" },
      envelope: { flap: "pointed", texture: "velvet", liner: "damask" },
      seal: { style: "foil", text: "" },
      card: { layout: "royal", shape: "rect", ornament: "royal" },
      florals: "roses",
      fonts: { names: "pinyon", headings: "cinzel", body: "cormorant" },
      scale: { names: 1, body: 1 },
      animation: { preset: "royal", speed: 1 },
      ambience: "golddust",
      music: "piano",
    },
  }),
  t({
    id: "lavender-sage",
    name: "Lavender & Sage Garden",
    tagline: "Lavender paper, a scalloped flap and wild garden sprigs.",
    mood: ["Garden", "Soft"],
    animated: true,
    design: {
      colors: { background: "#F1EEF4", envelope: "#D8CDE6", liner: "#A8B5A0", card: "#FCFBF7", ink: "#46405A", accent: "#8E9C85", seal: "#8B78AE", floralA: BRAND.lavender, floralB: BRAND.sage },
      envelope: { flap: "scalloped", texture: "smooth", liner: "leaves" },
      seal: { style: "wax", text: "" },
      card: { layout: "arch", shape: "arch", ornament: "floral" },
      florals: "wildflowers",
      fonts: { names: "pinyon", headings: "cormorant", body: "cormorant" },
      scale: { names: 1, body: 1 },
      animation: { preset: "gentle", speed: 1 },
      ambience: "leaves",
      music: "music-box",
    },
  }),
  t({
    id: "sri-lankan",
    name: "Traditional Sri Lankan",
    tagline: "Lotus liner, Kandyan border, a gold seal and Sinhala blessing.",
    mood: ["Traditional", "Sri Lankan"],
    animated: true,
    design: {
      colors: { background: "#F6EEDD", envelope: "#F1E1C0", liner: "#7A1F2A", card: "#FFF8EA", ink: "#6B1E26", accent: "#B88A35", seal: "#B88A35", floralA: "#F4F1E6", floralB: "#C6A15B" },
      envelope: { flap: "pointed", texture: "linen", liner: "lotus" },
      seal: { style: "foil", text: "" },
      card: { layout: "kandyan", shape: "rect", ornament: "kandyan" },
      florals: "lotus",
      fonts: { names: "greatvibes", headings: "cinzel", body: "cormorant" },
      scale: { names: 1, body: 1 },
      animation: { preset: "royal", speed: 1 },
      ambience: "petals",
      music: "music-box",
    },
  }),
  t({
    id: "gold-foil",
    name: "Cinematic Gold Foil",
    tagline: "Midnight envelope, gold foil art deco, a spotlight reveal.",
    mood: ["Cinematic", "Glamour"],
    animated: true,
    design: {
      colors: { background: "#121016", envelope: "#24202B", liner: "#C6A15B", card: "#FFF9F0", ink: "#2A241E", accent: "#B68E44", seal: "#C6A15B", floralA: "#E8D4B0", floralB: "#C6A15B" },
      envelope: { flap: "pointed", texture: "foil", liner: "deco" },
      seal: { style: "foil", text: "" },
      card: { layout: "deco", shape: "rect", ornament: "deco" },
      florals: "none",
      fonts: { names: "greatvibes", headings: "cinzel", body: "playfair" },
      scale: { names: 1, body: 1 },
      animation: { preset: "cinematic", speed: 1 },
      ambience: "sparkles",
      music: "piano",
    },
  }),
  t({
    id: "black-tie",
    name: "Modern Black-Tie Luxury",
    tagline: "Matte black, an ivory-on-black card and a ribbon seal.",
    mood: ["Black tie", "Modern"],
    animated: true,
    design: {
      colors: { background: "#0E0E10", envelope: "#18181B", liner: "#E8D4B0", card: "#141416", ink: "#F3ECE0", accent: "#C6A15B", seal: "#C6A15B", floralA: "#3A3A3F", floralB: "#C6A15B" },
      envelope: { flap: "straight", texture: "smooth", liner: "stripes" },
      seal: { style: "ribbon", text: "" },
      card: { layout: "blacktie", shape: "rect", ornament: "thin" },
      florals: "none",
      fonts: { names: "bodoni", headings: "cinzel", body: "jost" },
      scale: { names: 1, body: 1 },
      animation: { preset: "swift", speed: 1 },
      ambience: "sparkles",
      music: "piano",
    },
  }),
];

export function templateById(id: string): InviteTemplate {
  return TEMPLATES.find((x) => x.id === id) ?? TEMPLATES.find((x) => x.id === "ivory-champagne")!;
}

/* ------------------------------------------------------------------ */
/* Creating projects                                                   */
/* ------------------------------------------------------------------ */

/** How a personal invitation addresses its guest, in plain English. */
export function addressFor(party: { adults: number; children: number }): string {
  const n = Math.max(1, party.adults + party.children);
  if (n === 1) return "You";
  if (n === 2 && party.children === 0) return "You Both";
  return "You & Your Family";
}

export function initials(bride: string, groom: string): string {
  const first = (s: string) => (s.trim()[0] ?? "").toUpperCase();
  const b = first(bride);
  const g = first(groom);
  return b && g ? `${b} & ${g}` : b || g || "♥";
}

export function designFromTemplate(templateId: string, keep?: Partial<InviteDesign>): InviteDesign {
  const tpl = templateById(templateId);
  return {
    templateId: tpl.id,
    ...structuredClone(tpl.design),
    seal: { ...tpl.design.seal, text: keep?.seal?.text ?? "" },
    openingText: keep?.openingText ?? "Tap to Open Our Invitation",
    closingMessage: keep?.closingMessage ?? "With love and gratitude, we can't wait to celebrate with you.",
    showCountdown: keep?.showCountdown ?? true,
    showDayPlan: keep?.showDayPlan ?? true,
    addressing: keep?.addressing ?? "you",
    opening: tpl.design.opening ?? "envelope",
    photo: keep?.photo ?? { src: null, x: 50, y: 50, zoom: 1, placement: "none" },
  };
}

export function contentFromWedding(w: Pick<Wedding, "brideName" | "groomName" | "weddingDate" | "venue" | "location">, moments: { time: string; title: string }[] = []): InviteContent {
  return {
    brideName: w.brideName,
    groomName: w.groomName,
    brideFull: "",
    groomFull: "",
    brideParents: "",
    groomParents: "",
    blessing: "With the blessings of the Noble Triple Gem",
    sinhalaLine: "ශුභ විවාහ මංගල්‍යය",
    inviteMessage: "Together with our families, we joyfully invite you to celebrate our wedding.",
    date: w.weddingDate,
    time: moments.map((m) => m.time).sort()[0] ?? "17:00",
    ceremonyTitle: "Poruwa ceremony",
    ceremonyTime: moments.find((m) => /poruwa/i.test(m.title))?.time ?? "17:30",
    ceremonyVenue: "",
    receptionTitle: "Reception & dinner",
    receptionTime: "19:00",
    receptionVenue: "",
    venueName: w.venue,
    address: w.location,
    mapsUrl: "",
    dressCode: "",
    rsvpDeadline: "",
    contacts: "",
    maxParty: 2,
    moments,
    story: [],
  };
}

export function newProject(templateId: string, content: InviteContent, now: string, newId: () => string, name?: string): InviteProject {
  const design = designFromTemplate(templateId);
  design.seal.text = initials(content.brideName, content.groomName);
  return {
    id: newId(),
    name: name ?? `${templateById(templateId).name}`,
    content,
    design,
    slug: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    exports: [],
  };
}

/** Switch template but keep everything the couple wrote and their photo. */
export function applyTemplate(project: InviteProject, templateId: string): InviteProject {
  const design = designFromTemplate(templateId, project.design);
  design.seal.text = project.design.seal.text;
  return { ...project, design };
}

/** Old saves may miss newer fields; fill them so rendering never breaks. */
export function normalizeProject(p: Partial<InviteProject> & { id: ID }, now: string): InviteProject {
  const base = designFromTemplate(p.design?.templateId ?? "ivory-champagne");
  const d = (p.design ?? {}) as Partial<InviteDesign>;
  const c = contentFromWedding({ brideName: "", groomName: "", weddingDate: now.slice(0, 10), venue: "", location: "" });
  return {
    id: p.id,
    name: p.name ?? "Our invitation",
    content: { ...c, ...(p.content ?? {}) },
    design: {
      ...base,
      ...d,
      colors: { ...base.colors, ...(d.colors ?? {}) },
      envelope: { ...base.envelope, ...(d.envelope ?? {}) },
      seal: { ...base.seal, ...(d.seal ?? {}) },
      card: { ...base.card, ...(d.card ?? {}) },
      fonts: { ...base.fonts, ...(d.fonts ?? {}) },
      scale: { ...base.scale, ...(d.scale ?? {}) },
      animation: { ...base.animation, ...(d.animation ?? {}) },
      photo: { ...base.photo, ...(d.photo ?? {}) },
    },
    slug: p.slug ?? null,
    publishedAt: p.publishedAt ?? null,
    createdAt: p.createdAt ?? now,
    updatedAt: p.updatedAt ?? now,
    exports: p.exports ?? [],
  };
}

export function normalizeInvites(raw: Partial<InvitesPlan> | null | undefined, now: string): InvitesPlan {
  const projects = (raw?.projects ?? []).filter((p) => p && p.id).map((p) => normalizeProject(p, now));
  const mainId = raw?.mainId && projects.some((p) => p.id === raw.mainId) ? raw.mainId : projects.find((p) => p.slug)?.id ?? null;
  return { projects, mainId };
}

/* ------------------------------------------------------------------ */
/* Smart colour matching                                               */
/* ------------------------------------------------------------------ */

/** A full, readable palette from one wedding colour. */
export function matchColors(primary: string, mood: "light" | "dark" = "light"): DesignColors {
  const p = parseHex(primary) ? primary : BRAND.dustyPink;
  if (mood === "dark") {
    const envelope = luminance(p) > 0.2 ? mix(p, "#140f12", 0.55) : p;
    const card = "#FFF9F0";
    return {
      background: mix(envelope, "#000000", 0.45),
      envelope,
      liner: BRAND.gold,
      card,
      ink: darkenFor(mix(p, "#2a1d1f", 0.6), card, 8),
      accent: darkenFor(BRAND.gold, card, 2.6),
      seal: BRAND.gold,
      floralA: mix(p, "#ffffff", 0.35),
      floralB: BRAND.gold,
    };
  }
  const card = mix(BRAND.ivory, "#ffffff", 0.4);
  const accent = darkenFor(mix(BRAND.gold, p, 0.2), card, 2.6);
  // Pick the complementary floral: cool colours get sage, warm get lavender.
  const [r, , b] = parseHex(p)!;
  return {
    background: mix(p, BRAND.ivory, 0.86),
    envelope: mix(p, BRAND.ivory, 0.5),
    liner: darkenFor(p, mix(p, BRAND.ivory, 0.5), 1.6),
    card,
    ink: darkenFor(mix(p, "#2a1d1f", 0.6), card, 8),
    accent,
    seal: darkenFor(p, BRAND.ivory, 4.5),
    floralA: mix(p, "#ffffff", 0.25),
    floralB: b > r ? BRAND.sage : BRAND.lavender,
  };
}

/**
 * A soft "crystal" palette from the wedding colours chosen in Our look
 * ([0] main, [1] second, [2] light, [3] accent/gold).
 */
export function paletteFromTheme(theme: string[]): DesignColors {
  const pick = (i: number, fallback: string) => (theme[i] && parseHex(theme[i]) ? theme[i] : fallback);
  const main = pick(0, BRAND.dustyPink);
  const second = pick(1, BRAND.champagne);
  const light = pick(2, BRAND.ivory);
  const gold = pick(3, BRAND.gold);
  const background = luminance(light) > 0.6 ? mix(light, "#ffffff", 0.2) : mix(main, "#ffffff", 0.88);
  const card = mix(background, "#ffffff", 0.6);
  return {
    background,
    envelope: mix(second, background, 0.62),
    liner: mix(main, background, 0.72),
    card,
    ink: darkenFor(mix(main, "#2a1d1f", 0.62), card, 8),
    accent: darkenFor(gold, card, 2.6),
    seal: darkenFor(main, card, 3),
    floralA: mix(main, "#ffffff", 0.62),
    floralB: mix(second, "#ffffff", 0.35),
  };
}

/** Text colour that stays readable on a colour (for seals, black-tie cards…). */
export function readableOn(bg: string): string {
  return contrast("#FFF9F0", bg) >= contrast("#1C1416", bg) ? "#FFF9F0" : "#1C1416";
}

/* ------------------------------------------------------------------ */
/* Publishing                                                          */
/* ------------------------------------------------------------------ */

/** What a guest's link shows: a frozen copy of the project. */
export interface PublishedSnapshot {
  version: 1;
  projectId: ID;
  content: InviteContent;
  design: InviteDesign;
  publishedAt: ISODateTime;
}

export interface PublishedInvitation {
  slug: string;
  weddingId: ID;
  projectId: ID;
  isMain: boolean;
  data: PublishedSnapshot;
  publishedAt: ISODateTime;
  views: number;
  active: boolean;
}

export interface InvitationRsvp {
  id: ID;
  slug: string;
  weddingId: ID;
  name: string;
  attending: "yes" | "no" | "maybe";
  party: number;
  message: string;
  contact: string;
  createdAt: ISODateTime;
}

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/;

export function makeSlug(bride: string, groom: string, random: () => number = Math.random): string {
  const part = (s: string) => s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 18);
  const base = [part(bride), part(groom)].filter(Boolean).join("-and-") || "our-wedding";
  const tail = Math.floor(random() * 36 ** 4).toString(36).padStart(4, "0");
  return `${base}-${tail}`;
}

export function snapshot(project: InviteProject, now: string): PublishedSnapshot {
  return { version: 1, projectId: project.id, content: structuredClone(project.content), design: structuredClone(project.design), publishedAt: now };
}

/** Changes made since the last publish. */
export function hasUnpublishedChanges(project: InviteProject): boolean {
  return Boolean(project.publishedAt && project.updatedAt > project.publishedAt);
}

export function inviteLink(origin: string, slug: string): string {
  return `${origin}/i/${slug}`;
}

export function shareMessage(content: InviteContent, link: string): string {
  return `💌 ${content.brideName} & ${content.groomName} are getting married!\n\nTap to open our invitation (sound on 🎶):\n${link}`;
}

/** Validate a guest's reply before it's sent (the server checks again). */
export function checkRsvp(input: { name: string; attending: string; party: number; message: string }, maxParty: number): string | null {
  if (!input.name.trim()) return "Please write your name.";
  if (input.name.trim().length > 80) return "That name is a little long.";
  if (!["yes", "no", "maybe"].includes(input.attending)) return "Choose whether you can come.";
  if (input.attending === "yes" && (input.party < 1 || input.party > Math.max(1, maxParty))) return `This invitation is for up to ${Math.max(1, maxParty)} ${maxParty === 1 ? "person" : "people"}.`;
  if (input.message.length > 500) return "Please keep the message under 500 characters.";
  return null;
}

/** Rough size check so a published invitation stays light on mobile data. */
export function snapshotBytes(s: PublishedSnapshot): number {
  return new TextEncoder().encode(JSON.stringify(s)).length;
}

export const MAX_SNAPSHOT_BYTES = 1_500_000;

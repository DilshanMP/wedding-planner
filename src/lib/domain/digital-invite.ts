import { contrast, darkenFor, luminance, mix, parseHex } from "../theme-colors";
import { formatLongDate, formatTime } from "./dates";
import { PALETTES, defaultInvite, defaultStationery, normalizePlanner, type InvitationText, type InviteSettings, type PlannerData } from "./planner";
import type { Guest, SimulatorScene, WeddingData } from "./types";

/**
 * The animated online invitation: everything it shows, worked out from the
 * wedding so the same component renders the couple's preview and the guest's
 * personal link.
 */

export interface InviteMoment {
  time: string;
  title: string;
  scene: SimulatorScene;
  location: string;
}

export interface InviteContent {
  /** Empty in the couple's own preview. */
  guestName: string;
  partySize: number;
  brideName: string;
  groomName: string;
  weddingDate: string;
  venue: string;
  location: string;
  text: InvitationText;
  settings: InviteSettings;
  /** Wedding colours, used when settings.palette is "theme". */
  themeColors: string[];
  moments: InviteMoment[];
}

export interface InvitePalette {
  paper: string;
  /** Main colour: names, buttons. */
  primary: string;
  /** Champagne / metallic accent. */
  gold: string;
  /** Soft tint for washes and petals. */
  blush: string;
  /** Body text that passes contrast on the paper. */
  ink: string;
  /** Text on the primary colour. */
  onPrimary: string;
}

/** Sri Lanka has no daylight saving: always UTC+05:30. */
const SL_OFFSET_MIN = 330;

export function invitePalette(settings: Pick<InviteSettings, "palette">, themeColors: string[]): InvitePalette {
  const chosen = settings.palette === "theme" ? themeColors : PALETTES.find((p) => p.name === settings.palette)?.colors ?? PALETTES[0].colors;
  const colors = chosen.filter((c) => parseHex(c));
  const list = colors.length >= 2 ? colors : PALETTES[0].colors;
  const paper = mix([...list].sort((a, b) => luminance(b) - luminance(a))[0], "#ffffff", 0.35);
  const primarySource = list.find((c) => luminance(c) < 0.5) ?? list[0];
  const primary = darkenFor(primarySource, paper, 3.2);
  const goldSource = list[3] ?? list[1];
  const gold = darkenFor(goldSource, paper, 2.2);
  const blush = mix(list[1] ?? primary, paper, 0.35);
  const ink = darkenFor(mix(primary, "#2a1d1f", 0.55), paper, 8);
  const onPrimary = contrast("#fffdf9", primary) >= 4.5 ? "#fffdf9" : "#1a1214";
  return { paper, primary, gold, blush, ink, onPrimary };
}

/** Initials for the wax seal, e.g. "S & D". */
export function monogram(bride: string, groom: string): [string, string] {
  const first = (s: string) => (s.trim()[0] ?? "").toUpperCase();
  return [first(bride) || "♥", first(groom) || "♥"];
}

/** Start of the celebration: the first moment of the day, else the Poruwa time on the card, else 5 p.m. */
export function startTime(content: Pick<InviteContent, "moments" | "text">): string {
  const times = content.moments.map((m) => m.time).filter((t) => /^\d{2}:\d{2}$/.test(t)).sort();
  if (times.length) return times[0];
  const m = /(\d{1,2})[.:](\d{2})\s*(a\.?m|p\.?m)?/i.exec(content.text.timeLine);
  if (m) {
    let h = Number(m[1]) % 12;
    if (/p/i.test(m[3] ?? "") || (!m[3] && h < 9)) h += 12;
    return `${String(h).padStart(2, "0")}:${m[2]}`;
  }
  return "17:00";
}

/** The wedding start as a real instant (Sri Lanka time). */
export function weddingInstant(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - SL_OFFSET_MIN * 60_000);
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** The day has started (or passed). */
  done: boolean;
}

export function countdown(target: Date, now: Date): Countdown {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, done: false };
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function endInstant(content: InviteContent, start: Date): Date {
  const last = content.moments.map((m) => m.time).sort().at(-1);
  const startMin = Number(startTime(content).slice(0, 2)) * 60 + Number(startTime(content).slice(3));
  if (last) {
    const lastMin = Number(last.slice(0, 2)) * 60 + Number(last.slice(3));
    if (lastMin > startMin) return new Date(start.getTime() + (lastMin - startMin + 60) * 60_000);
  }
  return new Date(start.getTime() + 6 * 3600_000);
}

export function inviteTitle(content: Pick<InviteContent, "brideName" | "groomName">): string {
  return `${content.brideName} & ${content.groomName}'s wedding`;
}

export function placeLine(content: Pick<InviteContent, "venue" | "location">): string {
  return [content.venue, content.location].filter(Boolean).join(", ");
}

/** An .ics file guests can add to any calendar. */
export function calendarFile(content: InviteContent, uid: string): string {
  const start = weddingInstant(content.weddingDate, startTime(content));
  const end = endInstant(content, start);
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Poruwa Planner//Invitation//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}@poruwa-planner`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(inviteTitle(content))}`,
    `LOCATION:${esc(placeLine(content))}`,
    `DESCRIPTION:${esc(content.text.timeLine || "We can't wait to celebrate with you.")}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(inviteTitle(content))} is tomorrow`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function googleCalendarUrl(content: InviteContent): string {
  const start = weddingInstant(content.weddingDate, startTime(content));
  const end = endInstant(content, start);
  const q = new URLSearchParams({ action: "TEMPLATE", text: inviteTitle(content), dates: `${stamp(start)}/${stamp(end)}`, details: content.text.timeLine, location: placeLine(content) });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export function mapUrl(content: Pick<InviteContent, "venue" | "location">): string | null {
  const place = placeLine(content);
  return place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}` : null;
}

/** "Thursday, 27 May 2027 · 5:30 PM" */
export function whenLine(content: InviteContent): string {
  return `${formatLongDate(content.weddingDate)} · ${formatTime(startTime(content))}`;
}

/** Fill the card text from the wedding when the couple hasn't written it. */
export function contentDefaults(partial: Partial<InviteContent> & Pick<InviteContent, "brideName" | "groomName" | "weddingDate">): InviteContent {
  const d = defaultStationery();
  return {
    guestName: "",
    partySize: 1,
    venue: "",
    location: "",
    moments: [],
    themeColors: PALETTES[0].colors,
    ...partial,
    text: { ...d.text, ...(partial.text ?? {}) },
    settings: { ...defaultInvite(), ...(partial.settings ?? {}) },
  };
}

const INVITE_SCENES: SimulatorScene[] = ["arrival", "poruwa", "reception", "dinner", "cake", "entertainment", "going_away"];

/** The couple's own data (in the app), optionally personalised for one guest. */
export function contentFromWedding(data: WeddingData, guest?: Guest | null): InviteContent {
  const { wedding, planner } = data;
  return contentDefaults({
    guestName: guest?.name ?? "",
    partySize: guest ? Math.max(1, guest.adults + guest.children) : 2,
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    weddingDate: wedding.weddingDate,
    venue: wedding.venue,
    location: wedding.location,
    text: planner.stationery.text,
    settings: planner.stationery.invite,
    themeColors: planner.theme.colors,
    moments: data.timeline
      .filter((e) => INVITE_SCENES.includes(e.scene))
      .sort((a, b) => a.time.localeCompare(b.time))
      .map(({ time, title, scene, location }) => ({ time, title, scene, location })),
  });
}

/** What a guest's link returns (raw planner JSON from the database). */
export function contentFromLookup(inv: {
  guestName: string; adults: number; children: number; brideName: string; groomName: string; weddingDate: string; venue: string; location: string;
  theme: unknown; stationery: unknown; moments: { time: string; title: string; scene: string; location: string }[];
}): InviteContent {
  const planner = normalizePlanner({ theme: (inv.theme ?? undefined) as PlannerData["theme"] | undefined, stationery: (inv.stationery ?? undefined) as PlannerData["stationery"] | undefined }, () => "x");
  return contentDefaults({
    guestName: inv.guestName,
    partySize: Math.max(1, inv.adults + inv.children),
    brideName: inv.brideName,
    groomName: inv.groomName,
    weddingDate: inv.weddingDate,
    venue: inv.venue ?? "",
    location: inv.location ?? "",
    text: planner.stationery.text,
    settings: planner.stationery.invite,
    themeColors: planner.theme.colors,
    moments: (inv.moments ?? [])
      .filter((m) => INVITE_SCENES.includes(m.scene as SimulatorScene))
      .map((m) => ({ time: String(m.time).slice(0, 5), title: m.title, scene: m.scene as SimulatorScene, location: m.location ?? "" })),
  });
}

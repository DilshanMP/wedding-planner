import { weddingInstant } from "./digital-invite";
import type { InviteContent } from "./invite-studio";

/** Calendar, map and timing helpers for a studio invitation (Sri Lanka time). */

const valid = (t: string) => /^\d{2}:\d{2}$/.test(t);

export function startInstant(c: Pick<InviteContent, "date" | "time" | "ceremonyTime">): Date {
  const t = [c.time, c.ceremonyTime].filter(valid).sort()[0] ?? "17:00";
  return weddingInstant(c.date, t);
}

function endInstant(c: InviteContent): Date {
  const start = startInstant(c);
  return new Date(start.getTime() + 6 * 3600_000);
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const title = (c: Pick<InviteContent, "brideName" | "groomName">) => `${c.brideName} & ${c.groomName}'s wedding`;
export const placeOf = (c: Pick<InviteContent, "venueName" | "address">) => [c.venueName, c.address].filter(Boolean).join(", ");

export function calendarFile(c: InviteContent, uid: string): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
  const details = [c.ceremonyTitle && `${c.ceremonyTitle}${c.ceremonyTime ? ` · ${c.ceremonyTime}` : ""}`, c.receptionTitle && `${c.receptionTitle}${c.receptionTime ? ` · ${c.receptionTime}` : ""}`, c.dressCode && `Dress code: ${c.dressCode}`]
    .filter(Boolean).join("\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EverAfter Studio//Invitation//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${uid}@everafter-studio`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(startInstant(c))}`, `DTEND:${stamp(endInstant(c))}`,
    `SUMMARY:${esc(title(c))}`, `LOCATION:${esc(placeOf(c))}`, `DESCRIPTION:${esc(details)}`,
    "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${esc(title(c))} is tomorrow`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

export function googleCalendarUrl(c: InviteContent): string {
  const q = new URLSearchParams({ action: "TEMPLATE", text: title(c), dates: `${stamp(startInstant(c))}/${stamp(endInstant(c))}`, details: c.inviteMessage, location: placeOf(c) });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

const MAPS_URL = /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.[a-z.]+)/i;

/** Only Google Maps links are shown to guests. */
export const isMapsUrl = (url: string) => MAPS_URL.test(url.trim());

/** The couple's own Google Maps link when given (only http(s)), else a search. */
export function mapLink(c: Pick<InviteContent, "mapsUrl" | "venueName" | "address">): string | null {
  if (isMapsUrl(c.mapsUrl)) return c.mapsUrl.trim();
  const place = placeOf(c);
  return place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}` : null;
}

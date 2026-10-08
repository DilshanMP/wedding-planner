import type { ISODate } from "./types";

/**
 * Calendar-date helpers. Wedding dates are local calendar days, so all maths is
 * done on UTC midnights to avoid daylight-saving and time-zone drift.
 */

const DAY_MS = 86_400_000;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parts(date: ISODate): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = parts(value);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function toUTC(date: ISODate): number {
  const [y, m, d] = parts(date);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms: number): ISODate {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today's local calendar date. */
export function todayISO(now: Date = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(toUTC(date) + days * DAY_MS);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY_MS);
}

export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** `12 June 2027` */
export function formatDate(date: ISODate): string {
  const [y, m, d] = parts(date);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** `12 Jun` — compact, for lists. */
export function formatShortDate(date: ISODate): string {
  const [, m, d] = parts(date);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`;
}

/** `Saturday, 12 June 2027` */
export function formatLongDate(date: ISODate): string {
  const dt = new Date(toUTC(date));
  return `${WEEKDAYS[dt.getUTCDay()]}, ${formatDate(date)}`;
}

export function monthLabel(date: ISODate): string {
  const [y, m] = parts(date);
  return `${MONTHS[m - 1]} ${y}`;
}

export function monthName(date: ISODate): string {
  return MONTHS[parts(date)[1] - 1];
}

export function monthShort(date: ISODate): string {
  return MONTHS[parts(date)[1] - 1].slice(0, 3);
}

export function dayOfMonth(date: ISODate): number {
  return parts(date)[2];
}

/** Relative phrase for a due date: `Today`, `Tomorrow`, `In 5 days`, `3 days overdue`. */
export function relativeDue(date: ISODate, today: ISODate): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${-diff} days overdue`;
  if (diff < 14) return `In ${diff} days`;
  if (diff < 60) return `In ${Math.round(diff / 7)} weeks`;
  return `In ${Math.round(diff / 30)} months`;
}

/* ------------------------------------------------------------------ */
/* Times of day                                                        */
/* ------------------------------------------------------------------ */

export function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** `10:30 AM` */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function nowTime(now: Date = new Date()): string {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

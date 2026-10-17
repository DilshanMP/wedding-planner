import { formatLongDate } from "./dates";
import { SIDE_LABEL, partySize } from "./guests";
import type { Guest, ID, WeddingData } from "./types";

/**
 * A shareable guest list: who sits at which table, plus an A–Z list guests
 * can scan at the entrance to find their table.
 */

/** Table label for each guest: the table plan first, else the "Table" typed on the guest. */
export function tableOf(data: Pick<WeddingData, "guests" | "planner">): Map<ID, string> {
  const map = new Map<ID, string>();
  for (const g of data.guests) if (g.table.trim()) map.set(g.id, g.table.trim());
  for (const t of data.planner.seating.tables) for (const id of t.guestIds) map.set(id, t.label);
  return map;
}

export interface ReportTable {
  label: string;
  guests: Guest[];
  people: number;
  seats: number | null;
}

export interface GuestReport {
  tables: ReportTable[];
  unseated: Guest[];
  alpha: { guest: Guest; table: string }[];
  invitations: number;
  people: number;
  attending: number;
  pending: number;
  declined: number;
}

/** Natural order: "Table 2" before "Table 10", head table first. */
const tableOrder = (a: string, b: string) => {
  const head = (s: string) => /head|couple|bride|groom|vip/i.test(s);
  if (head(a) !== head(b)) return head(a) ? -1 : 1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
};

export function guestReport(data: Pick<WeddingData, "guests" | "planner">, opts: { attendingOnly?: boolean } = {}): GuestReport {
  const guests = data.guests.filter((g) => (opts.attendingOnly ? g.rsvp === "yes" : g.rsvp !== "no")).sort((a, b) => a.name.localeCompare(b.name));
  const tables = tableOf(data);
  const byTable = new Map<string, Guest[]>();
  const unseated: Guest[] = [];
  for (const g of guests) {
    const t = tables.get(g.id);
    if (t) byTable.set(t, [...(byTable.get(t) ?? []), g]);
    else unseated.push(g);
  }
  const seatsFor = (label: string) => data.planner.seating.tables.find((t) => t.label === label)?.seats ?? null;
  return {
    tables: [...byTable.entries()].sort((a, b) => tableOrder(a[0], b[0])).map(([label, gs]) => ({ label, guests: gs, people: gs.reduce((n, g) => n + partySize(g), 0), seats: seatsFor(label) })),
    unseated,
    alpha: guests.map((g) => ({ guest: g, table: tables.get(g.id) ?? "" })),
    invitations: guests.length,
    people: guests.reduce((n, g) => n + partySize(g), 0),
    attending: data.guests.filter((g) => g.rsvp === "yes").reduce((n, g) => n + partySize(g), 0),
    pending: data.guests.filter((g) => g.rsvp === "pending" || g.rsvp === "maybe").reduce((n, g) => n + partySize(g), 0),
    declined: data.guests.filter((g) => g.rsvp === "no").reduce((n, g) => n + partySize(g), 0),
  };
}

/** Plain text for WhatsApp: table by table. */
export function guestReportText(report: GuestReport, wedding: { brideName: string; groomName: string; weddingDate: string; venue: string }): string {
  const lines = [`💍 ${wedding.brideName} & ${wedding.groomName} — guest list`, `${formatLongDate(wedding.weddingDate)}${wedding.venue ? ` · ${wedding.venue}` : ""}`, `${report.invitations} invitations · ${report.people} people`, ""];
  for (const t of report.tables) {
    lines.push(`🪑 ${t.label.toUpperCase()} (${t.people}${t.seats ? `/${t.seats}` : ""})`);
    for (const g of t.guests) lines.push(`• ${g.name}${partySize(g) > 1 ? ` (${partySize(g)})` : ""}`);
    lines.push("");
  }
  if (report.unseated.length) {
    lines.push("NOT SEATED YET");
    for (const g of report.unseated) lines.push(`• ${g.name}${partySize(g) > 1 ? ` (${partySize(g)})` : ""} — ${SIDE_LABEL[g.side]}`);
  }
  return lines.join("\n").trim();
}

import { RSVP_LABEL, TASK_STATUS_LABEL, VENDOR_STATUS_LABEL } from "./catalog";
import { formatLongDate } from "./dates";
import { formatLKR } from "./money";
import type { CollectionItem, CollectionKey, ID, ISODateTime, Wedding, WeddingData } from "./types";

/** One line in the "who did what" feed. */
export interface ActivityEntry {
  id: ID;
  weddingId: ID;
  at: ISODateTime;
  /** Account that made the change (cloud mode); null on a device without accounts. */
  actorId: string | null;
  actorName: string;
  kind: CollectionKey | "wedding";
  /** Short sentence without the actor, e.g. `completed “Book the photographer”`. */
  summary: string;
}

export type ActivityDraft = Pick<ActivityEntry, "kind" | "summary">;

const NOUN: Record<CollectionKey, [string, string]> = {
  people: ["person", "people"],
  tasks: ["task", "tasks"],
  guests: ["guest", "guests"],
  budgetItems: ["budget line", "budget lines"],
  vendors: ["vendor", "vendors"],
  quotes: ["quote", "quotes"],
  payments: ["payment", "payments"],
  timeline: ["moment", "wedding-day moments"],
  documents: ["document", "documents"],
};

const q = (s: string) => `“${s.trim() || "Untitled"}”`;

function label<K extends CollectionKey>(key: K, item: CollectionItem<K>, data: WeddingData): string {
  const any = item as unknown as Record<string, unknown>;
  if (key === "quotes") {
    const vendor = data.vendors.find((v) => v.id === any.vendorId);
    return vendor ? vendor.name : String(any.packageName ?? "");
  }
  if (key === "payments") return String(any.label ?? "");
  return String(any.title ?? any.name ?? "");
}

function describeOne<K extends CollectionKey>(key: K, before: CollectionItem<K> | undefined, after: CollectionItem<K>, data: WeddingData): string | null {
  const name = label(key, after, data);
  if (!before) {
    switch (key) {
      case "quotes":
        return `added a quote from ${name}`;
      case "payments": {
        const p = after as CollectionItem<"payments">;
        return p.status === "paid" ? `recorded a payment of ${formatLKR(p.amount)} for ${q(name)}` : `scheduled a payment of ${formatLKR(p.amount)} for ${q(name)}`;
      }
      case "timeline":
        return `added ${q(name)} to the wedding day`;
      case "documents":
        return `uploaded ${q(name)}`;
      default:
        return `added ${NOUN[key][0]} ${q(name)}`;
    }
  }
  if (key === "tasks") {
    const [b, a] = [before as CollectionItem<"tasks">, after as CollectionItem<"tasks">];
    if (a.status !== b.status) return a.status === "completed" ? `completed ${q(name)}` : `moved ${q(name)} to ${TASK_STATUS_LABEL[a.status]}`;
  }
  if (key === "guests") {
    const [b, a] = [before as CollectionItem<"guests">, after as CollectionItem<"guests">];
    if (a.rsvp !== b.rsvp) return `marked ${q(name)} as ${RSVP_LABEL[a.rsvp]}`;
    if (a.invitation !== b.invitation && b.invitation === "not_sent") return `sent an invitation to ${q(name)}`;
  }
  if (key === "vendors") {
    const [b, a] = [before as CollectionItem<"vendors">, after as CollectionItem<"vendors">];
    if (a.status !== b.status) return a.status === "booked" ? `booked ${q(name)}` : `moved ${q(name)} to ${VENDOR_STATUS_LABEL[a.status]}`;
    // Wedding Day Mode check-ins are too frequent to be news.
    if (a.dayStatus !== b.dayStatus) return null;
  }
  if (key === "payments") {
    const [b, a] = [before as CollectionItem<"payments">, after as CollectionItem<"payments">];
    if (a.status === "paid" && b.status !== "paid") return `paid ${formatLKR(a.amount)} for ${q(name)}`;
  }
  if (key === "quotes") return `updated the quote from ${name}`;
  return `updated ${NOUN[key][0]} ${q(name)}`;
}

/** What an upsert means to a person reading the feed. Batches become one line. */
export function describeUpsert<K extends CollectionKey>(key: K, items: CollectionItem<K>[], before: WeddingData): ActivityDraft[] {
  const old = new Map((before[key] as CollectionItem<K>[]).map((i) => [i.id, i]));
  const lines = items.map((i) => describeOne(key, old.get(i.id), i, before)).filter((s): s is string => s !== null);
  if (lines.length <= 3) return lines.map((summary) => ({ kind: key, summary }));
  const added = items.filter((i) => !old.has(i.id)).length;
  return [{ kind: key, summary: added === items.length ? `added ${items.length} ${NOUN[key][1]}` : `updated ${items.length} ${NOUN[key][1]}` }];
}

export function describeRemove(key: CollectionKey, ids: string[], before: WeddingData): ActivityDraft[] {
  const list = before[key] as { id: string }[];
  const gone = list.filter((i) => ids.includes(i.id)) as CollectionItem<typeof key>[];
  if (gone.length === 0) return [];
  if (gone.length > 1) return [{ kind: key, summary: `removed ${gone.length} ${NOUN[key][1]}` }];
  return [{ kind: key, summary: `removed ${NOUN[key][0]} ${q(label(key, gone[0], before))}` }];
}

export function describeWedding(before: Wedding, after: Wedding): ActivityDraft[] {
  if (after.weddingDate !== before.weddingDate) return [{ kind: "wedding", summary: `moved the wedding date to ${formatLongDate(after.weddingDate)}` }];
  if (after.rsvpEnabled !== before.rsvpEnabled) return [{ kind: "wedding", summary: after.rsvpEnabled ? "turned on online RSVP" : "turned off online RSVP" }];
  if (after.budget !== before.budget) return [{ kind: "wedding", summary: `set the total budget to ${formatLKR(after.budget)}` }];
  return [{ kind: "wedding", summary: "updated the wedding details" }];
}

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", then a date. */
export function timeAgo(at: ISODateTime, now: Date): string {
  const s = Math.max(0, Math.round((now.getTime() - new Date(at).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** A believable history for the sample wedding, so the feed isn't empty on first look. */
export function sampleActivity(data: WeddingData, now: Date): ActivityEntry[] {
  const { brideName: bride, groomName: groom, id: weddingId } = data.wedding;
  const done = data.tasks.filter((t) => t.status === "completed");
  const booked = data.vendors.filter((v) => v.status === "booked");
  const yes = data.guests.filter((g) => g.rsvp === "yes");
  const paid = data.payments.filter((p) => p.status === "paid");
  const quote = data.quotes[0];
  const quoteVendor = quote ? data.vendors.find((v) => v.id === quote.vendorId) : undefined;
  const lines: [string, ActivityEntry["kind"], string | undefined, number][] = [
    [bride, "tasks", done[0] && `completed ${q(done[0].title)}`, 25],
    [groom, "payments", paid[0] && `paid ${formatLKR(paid[0].amount)} for ${q(paid[0].label)}`, 140],
    [bride, "guests", yes[0] && `marked ${q(yes[0].name)} as Attending`, 60 * 5],
    [groom, "quotes", quoteVendor && `added a quote from ${quoteVendor.name}`, 60 * 26],
    [bride, "vendors", booked[1] && `booked ${q(booked[1].name)}`, 60 * 30],
    [groom, "tasks", done[1] && `completed ${q(done[1].title)}`, 60 * 52],
    [bride, "guests", "added 24 guests", 60 * 75],
    [groom, "vendors", booked[0] && `booked ${q(booked[0].name)}`, 60 * 24 * 6],
  ];
  return lines
    .filter((l): l is [string, ActivityEntry["kind"], string, number] => Boolean(l[2]))
    .map(([actorName, kind, summary, minutesAgo], i) => ({
      id: `sample-activity-${i}`,
      weddingId,
      at: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
      actorId: null,
      actorName,
      kind,
      summary,
    }))
    .reverse();
}

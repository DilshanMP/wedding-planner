import {
  BUDGET_CATEGORIES, BUDGET_STATUS_LABEL, INVITATION_LABEL, MEAL_LABEL, PARTY_LABEL, PRIORITY_LABEL, RELATION_LABEL, ROLE_LABEL,
  RSVP_LABEL, TASK_CATEGORIES, TASK_STATUS_LABEL, VENDOR_STATUS_LABEL, budgetCategoryLabel,
} from "./catalog";
import { expectedCost, paidForItem } from "./budget";
import { SIDE_LABEL } from "./guests";
import { SCENE_LABEL } from "./scenes";
import { budgetItemSchema, guestSchema, paymentSchema, taskSchema, timelineEventSchema, vendorSchema } from "./schemas";
import type { MenuPlan, SeatingPlan } from "./planner";
import type { CollectionItem, CollectionKey, ID, Person, Wedding, WeddingData } from "./types";

/**
 * The whole plan as one Excel workbook, and back again.
 *
 * Every list has an ID column (leave it alone) and a "Delete?" column.
 * Importing updates rows whose ID matches, adds rows without an ID, and
 * removes only rows marked "Delete? = Yes" — a row missing from the sheet is
 * never deleted.
 */

export type Cell = string | number | null | undefined;
export interface SheetData {
  name: string;
  rows: Cell[][];
  moneyColumns?: number[];
  widths?: number[];
}

/* ------------------------------------------------------------------ */
/* Cell parsing                                                        */
/* ------------------------------------------------------------------ */

const str = (v: Cell) => (v === null || v === undefined ? "" : String(v).trim());

function num(v: Cell, label: string): number {
  if (typeof v === "number") return v;
  const s = str(v).replace(/[,\s]|LKR|Rs\.?/gi, "");
  if (s === "") return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`${label} should be a number, not "${str(v)}".`);
  return n;
}

function optNum(v: Cell, label: string): number | null {
  return str(v) === "" || str(v) === "—" ? null : num(v, label);
}

/** Excel stores typed dates as day numbers since 1899-12-30. */
function date(v: Cell, label: string): string {
  if (typeof v === "number" && v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000).toISOString().slice(0, 10);
  const s = str(v);
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const dmy = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(s);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  throw new Error(`${label} should be a date like 2027-05-27, not "${s}".`);
}

const optDate = (v: Cell, label: string) => (str(v) === "" || str(v) === "—" ? null : date(v, label));

/** Excel stores typed times as a fraction of a day. */
function time(v: Cell, label: string): string {
  if (typeof v === "number" && v >= 0 && v < 1) {
    const m = Math.round(v * 1440);
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }
  const m = /^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/i.exec(str(v));
  if (!m) throw new Error(`${label} should be a time like 17:30, not "${str(v)}".`);
  let h = Number(m[1]);
  if (m[3]?.toLowerCase() === "pm" && h < 12) h += 12;
  if (m[3]?.toLowerCase() === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** Text cells: keep the saved value when only spacing differs (no false "updated"). */
function setText(draft: object, key: string, v: Cell) {
  const rec = draft as Record<string, unknown>;
  if (str(v) !== String(rec[key] ?? "").trim()) rec[key] = str(v);
}

const YES = /^(y|yes|x|✓|true|1|ow|ඔව්)$/i;
const bool = (v: Cell) => YES.test(str(v));
const yn = (b: boolean) => (b ? "Yes" : "No");

function pick<T extends string>(v: Cell, labels: Record<T, string>, label: string, fallback?: T): T {
  const s = str(v).toLowerCase();
  if (!s && fallback !== undefined) return fallback;
  for (const [k, l] of Object.entries(labels) as [T, string][]) if (l.toLowerCase() === s || k.toLowerCase() === s) return k;
  throw new Error(`${label} "${str(v)}" isn't one of: ${Object.values(labels).join(", ")}.`);
}

/* ------------------------------------------------------------------ */
/* Columns                                                             */
/* ------------------------------------------------------------------ */

interface Ctx {
  data: WeddingData;
  vendorName: (id: ID | null) => string;
  vendorId: (name: string) => ID | null;
  itemName: (id: ID | null) => string;
  itemId: (name: string) => ID | null;
  personName: (id: ID | null) => string;
  personId: (name: string) => ID | null;
}

interface Col<T> {
  header: string;
  get: (item: T, ctx: Ctx) => Cell;
  /** Missing = shown for information only (e.g. Paid, Balance). */
  set?: (draft: T, v: Cell, ctx: Ctx) => void;
  money?: boolean;
  width?: number;
}

type Rec = Record<string, unknown>;

const shownTable = (g: { id: ID; table: string }, c: Ctx) => c.data.planner.seating.tables.find((t) => t.guestIds.includes(g.id))?.label ?? g.table;

const budgetLabels = Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c.id, c.label])) as Record<string, string>;
const taskLabels = Object.fromEntries(TASK_CATEGORIES.map((c) => [c.id, c.label])) as Record<string, string>;

const COLS: { [K in CollectionKey]?: Col<CollectionItem<K>>[] } = {
  guests: [
    { header: "Name", get: (g) => g.name, set: (g, v) => setText(g, "name", v), width: 28 },
    { header: "Side", get: (g) => SIDE_LABEL[g.side], set: (g, v) => (g.side = pick(v, SIDE_LABEL, "Side", "bride")), width: 9 },
    { header: "Category", get: (g) => g.category, set: (g, v) => setText(g, "category", v), width: 18 },
    { header: "Relation", get: (g) => RELATION_LABEL[g.relation], set: (g, v) => (g.relation = pick(v, RELATION_LABEL, "Relation", "family")), width: 11 },
    { header: "Party", get: (g) => PARTY_LABEL[g.partyType], set: (g, v) => (g.partyType = pick(v, PARTY_LABEL, "Party", "single")), width: 10 },
    { header: "Adults", get: (g) => g.adults, set: (g, v) => (g.adults = Math.round(num(v, "Adults"))), width: 8 },
    { header: "Children", get: (g) => g.children, set: (g, v) => (g.children = Math.round(num(v, "Children"))), width: 9 },
    { header: "Phone", get: (g) => g.phone, set: (g, v) => setText(g, "phone", v), width: 15 },
    { header: "Email", get: (g) => g.email, set: (g, v) => setText(g, "email", v), width: 22 },
    { header: "Invitation", get: (g) => INVITATION_LABEL[g.invitation], set: (g, v) => (g.invitation = pick(v, INVITATION_LABEL, "Invitation", "not_sent")), width: 12 },
    { header: "RSVP", get: (g) => RSVP_LABEL[g.rsvp], set: (g, v) => (g.rsvp = pick(v, RSVP_LABEL, "RSVP", "pending")), width: 13 },
    { header: "Meal", get: (g) => MEAL_LABEL[g.meal], set: (g, v) => (g.meal = pick(v, MEAL_LABEL, "Meal", "unknown")), width: 14 },
    { header: "Table", get: (g, c) => shownTable(g, c), set: (g, v, c) => { if (str(v) !== shownTable(g, c)) g.table = str(v); }, width: 10 },
    { header: "VIP", get: (g) => yn(g.vip), set: (g, v) => (g.vip = bool(v)), width: 6 },
    { header: "Transport", get: (g) => yn(g.needsTransport), set: (g, v) => (g.needsTransport = bool(v)), width: 10 },
    { header: "Accommodation", get: (g) => yn(g.needsAccommodation), set: (g, v) => (g.needsAccommodation = bool(v)), width: 14 },
    { header: "Notes", get: (g) => g.notes, set: (g, v) => setText(g, "notes", v), width: 30 },
  ],
  budgetItems: [
    { header: "Category", get: (i) => budgetCategoryLabel(i.categoryId), set: (i, v) => (i.categoryId = pick(v, budgetLabels, "Category", "miscellaneous") as typeof i.categoryId), width: 18 },
    { header: "Item", get: (i) => i.name, set: (i, v) => setText(i, "name", v), width: 32 },
    { header: "Planned (LKR)", get: (i) => i.planned, set: (i, v) => (i.planned = Math.round(num(v, "Planned"))), money: true, width: 14 },
    { header: "Quoted (LKR)", get: (i) => i.quoted, set: (i, v) => (i.quoted = optNum(v, "Quoted")), money: true, width: 14 },
    { header: "Final (LKR)", get: (i) => i.final, set: (i, v) => (i.final = optNum(v, "Final")), money: true, width: 14 },
    { header: "Paid (LKR)", get: (i, c) => paidForItem(i, c.data.payments), money: true, width: 13 },
    { header: "Balance (LKR)", get: (i, c) => Math.max(0, expectedCost(i) - paidForItem(i, c.data.payments)), money: true, width: 14 },
    { header: "Vendor", get: (i, c) => c.vendorName(i.vendorId), set: (i, v, c) => (i.vendorId = c.vendorId(str(v))), width: 22 },
    { header: "Status", get: (i) => BUDGET_STATUS_LABEL[i.status], set: (i, v) => (i.status = pick(v, BUDGET_STATUS_LABEL, "Status", "planned")), width: 14 },
    { header: "Notes", get: (i) => i.notes, set: (i, v) => setText(i, "notes", v), width: 30 },
  ],
  payments: [
    { header: "Description", get: (p) => p.label, set: (p, v) => setText(p, "label", v), width: 24 },
    { header: "Amount (LKR)", get: (p) => p.amount, set: (p, v) => (p.amount = Math.round(num(v, "Amount"))), money: true, width: 14 },
    { header: "Status", get: (p) => (p.status === "paid" ? "Paid" : "Scheduled"), set: (p, v) => (p.status = pick<"paid" | "scheduled">(v, { paid: "Paid", scheduled: "Scheduled" }, "Status", "scheduled")), width: 11 },
    { header: "Due date", get: (p) => p.dueDate, set: (p, v) => (p.dueDate = date(v, "Due date")), width: 12 },
    { header: "Paid on", get: (p) => p.paidDate ?? "", set: (p, v) => (p.paidDate = optDate(v, "Paid on")), width: 12 },
    { header: "Paid by", get: (p) => p.paidBy, set: (p, v) => setText(p, "paidBy", v), width: 16 },
    { header: "Method", get: (p) => p.method, set: (p, v) => setText(p, "method", v), width: 14 },
    { header: "Reference", get: (p) => p.reference, set: (p, v) => setText(p, "reference", v), width: 16 },
    { header: "Vendor", get: (p, c) => c.vendorName(p.vendorId), set: (p, v, c) => (p.vendorId = c.vendorId(str(v))), width: 22 },
    { header: "Budget line", get: (p, c) => c.itemName(p.budgetItemId), set: (p, v, c) => (p.budgetItemId = c.itemId(str(v))), width: 28 },
  ],
  vendors: [
    { header: "Name", get: (v) => v.name, set: (v, x) => setText(v, "name", x), width: 24 },
    { header: "Category", get: (v) => budgetCategoryLabel(v.categoryId), set: (v, x) => (v.categoryId = pick(x, budgetLabels, "Category", "miscellaneous") as typeof v.categoryId), width: 18 },
    { header: "Status", get: (v) => VENDOR_STATUS_LABEL[v.status], set: (v, x) => (v.status = pick(x, VENDOR_STATUS_LABEL, "Status", "researching")), width: 13 },
    { header: "Contact", get: (v) => v.contactName, set: (v, x) => setText(v, "contactName", x), width: 18 },
    { header: "Phone", get: (v) => v.phone, set: (v, x) => setText(v, "phone", x), width: 15 },
    { header: "Email", get: (v) => v.email, set: (v, x) => setText(v, "email", x), width: 22 },
    { header: "Location", get: (v) => v.location, set: (v, x) => setText(v, "location", x), width: 16 },
    { header: "Rating", get: (v) => v.rating, set: (v, x) => (v.rating = optNum(x, "Rating")), width: 8 },
    { header: "Arrival time", get: (v) => v.arrivalTime, set: (v, x) => (v.arrivalTime = str(x) ? time(x, "Arrival time") : ""), width: 12 },
    { header: "Notes", get: (v) => v.notes, set: (v, x) => setText(v, "notes", x), width: 30 },
  ],
  tasks: [
    { header: "Task", get: (t) => t.title, set: (t, v) => setText(t, "title", v), width: 36 },
    { header: "Status", get: (t) => TASK_STATUS_LABEL[t.status], set: (t, v) => (t.status = pick(v, TASK_STATUS_LABEL, "Status", "not_started")), width: 13 },
    { header: "Due", get: (t) => t.dueDate ?? "", set: (t, v) => (t.dueDate = optDate(v, "Due")), width: 12 },
    { header: "Priority", get: (t) => PRIORITY_LABEL[t.priority], set: (t, v) => (t.priority = pick(v, PRIORITY_LABEL, "Priority", "medium")), width: 9 },
    { header: "Area", get: (t) => taskLabels[t.categoryId] ?? t.categoryId, set: (t, v) => (t.categoryId = str(v) ? pick(v, taskLabels, "Area") : t.categoryId || "vision"), width: 20 },
    { header: "Owner", get: (t, c) => c.personName(t.ownerId), set: (t, v, c) => (t.ownerId = c.personId(str(v))), width: 16 },
    { header: "Vendor", get: (t, c) => c.vendorName(t.vendorId), set: (t, v, c) => (t.vendorId = c.vendorId(str(v))), width: 20 },
    { header: "Estimated cost (LKR)", get: (t) => t.estimatedCost, set: (t, v) => (t.estimatedCost = optNum(v, "Estimated cost")), money: true, width: 16 },
    { header: "Notes", get: (t) => t.notes, set: (t, v) => setText(t, "notes", v), width: 30 },
  ],
  timeline: [
    { header: "Time", get: (e) => e.time, set: (e, v) => (e.time = time(v, "Time")), width: 8 },
    { header: "Minutes", get: (e) => e.durationMinutes, set: (e, v) => (e.durationMinutes = Math.round(num(v, "Minutes"))), width: 9 },
    { header: "Moment", get: (e) => e.title, set: (e, v) => setText(e, "title", v), width: 30 },
    { header: "Where", get: (e) => e.location, set: (e, v) => setText(e, "location", v), width: 18 },
    { header: "Type", get: (e) => SCENE_LABEL[e.scene], set: (e, v) => (e.scene = pick(v, SCENE_LABEL, "Type", "other")), width: 16 },
    { header: "Details", get: (e) => e.description, set: (e, v) => setText(e, "description", v), width: 34 },
  ],
  people: [
    { header: "Name", get: (p) => p.name, set: (p, v) => setText(p, "name", v), width: 22 },
    { header: "Role", get: (p) => ROLE_LABEL[p.role], set: (p, v) => (p.role = pick(v, ROLE_LABEL, "Role", "bride_family")), width: 16 },
    { header: "Phone", get: (p) => p.phone, set: (p, v) => setText(p, "phone", v), width: 15 },
  ],
};

const SHEET: { key: CollectionKey; name: string }[] = [
  { key: "guests", name: "Guests" },
  { key: "budgetItems", name: "Budget" },
  { key: "payments", name: "Payments" },
  { key: "vendors", name: "Vendors" },
  { key: "tasks", name: "Checklist" },
  { key: "timeline", name: "Day plan" },
  { key: "people", name: "People" },
];

const SCHEMA: { [K in CollectionKey]?: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } } } = {
  guests: guestSchema, budgetItems: budgetItemSchema, payments: paymentSchema, vendors: vendorSchema, tasks: taskSchema, timeline: timelineEventSchema,
};

function context(data: WeddingData, extra: { vendors?: CollectionItem<"vendors">[]; items?: CollectionItem<"budgetItems">[]; people?: Person[] } = {}): Ctx {
  const vendors = [...data.vendors, ...(extra.vendors ?? [])];
  const items = [...data.budgetItems, ...(extra.items ?? [])];
  const people = [...data.people, ...(extra.people ?? [])];
  const byName = <T extends { id: ID }>(list: T[], name: (t: T) => string) => (s: string) => {
    if (!s) return null;
    const hit = list.find((x) => name(x).toLowerCase() === s.toLowerCase());
    if (!hit) throw new Error(`No match for "${s}". Check the spelling, or add it first.`);
    return hit.id;
  };
  return {
    data,
    vendorName: (id) => vendors.find((v) => v.id === id)?.name ?? "",
    vendorId: byName(vendors, (v) => v.name),
    itemName: (id) => items.find((i) => i.id === id)?.name ?? "",
    itemId: byName(items, (i) => i.name),
    personName: (id) => people.find((p) => p.id === id)?.name ?? "",
    personId: byName(people, (p) => p.name),
  };
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export function exportWorkbook(data: WeddingData, today: string): SheetData[] {
  const ctx = context(data);
  const w = data.wedding;
  const sheets: SheetData[] = [
    {
      name: "Read me",
      widths: [100],
      rows: [
        [`${w.brideName} & ${w.groomName} — wedding plan (exported ${today})`],
        [""],
        ["How to edit and bring it back:"],
        ["1. Change any cell. Keep the ID column as it is — it's how the app knows which row is which."],
        ["2. To add something, add a row and leave its ID empty."],
        ["3. To delete something, type Yes in its 'Delete?' column. Rows you just remove from the sheet are NOT deleted."],
        ["4. Grey-headed columns like Paid and Balance are worked out by the app and ignored on import."],
        ["5. In the app: Reports → Excel workbook → Import. You'll see every change before anything is saved."],
        [""],
        ["Tip: for Side, Status, RSVP and similar columns, use the same words you see in the app (e.g. Bride, Groom, Both · Attending, Pending)."],
      ],
    },
    {
      name: "Wedding",
      widths: [22, 40],
      rows: [
        ["Field", "Value"],
        ["Bride", w.brideName], ["Groom", w.groomName], ["Wedding date", w.weddingDate], ["Venue", w.venue], ["Location", w.location],
        ["Total budget (LKR)", w.budget], ["Expected guests", w.estimatedGuests],
      ],
      moneyColumns: [],
    },
  ];
  for (const { key, name } of SHEET) {
    const cols = COLS[key] as unknown as Col<Rec>[];
    const list = data[key] as unknown as Rec[];
    sheets.push({
      name,
      rows: [["ID", ...cols.map((c) => c.header), "Delete?"], ...list.map((item) => [String(item.id), ...cols.map((c) => c.get(item, ctx)), ""])],
      moneyColumns: cols.map((c, i) => (c.money ? i + 1 : -1)).filter((i) => i > 0),
      widths: [10, ...cols.map((c) => c.width ?? 14), 9],
    });
  }
  const byId = new Map(data.guests.map((g) => [g.id, g]));
  sheets.push({
    name: "Seating",
    widths: [14, 30, 8, 10],
    rows: [["Table", "Guest", "People", "Guest ID"], ...data.planner.seating.tables.flatMap((t) => t.guestIds.map((id) => [t.label, byId.get(id)?.name ?? "", (byId.get(id)?.adults ?? 0) + (byId.get(id)?.children ?? 0), id]))],
  });
  const menu = data.planner.menu;
  sheets.push({
    name: "Menu",
    widths: [24, 50, 10],
    rows: [["Course", "Dish", "Chosen"], ...menu.sections.flatMap((s) => s.items.map((d) => [s.title, d, s.pick === 0 ? "Included" : yn((menu.chosen[s.id] ?? []).includes(d))]))],
  });
  sheets.push({
    name: "Quotes",
    widths: [22, 22, 14, 14, 30],
    moneyColumns: [2, 3],
    rows: [["Vendor", "Package", "Price (LKR)", "Extras (LKR)", "Payment terms"], ...data.quotes.map((q) => [ctx.vendorName(q.vendorId), q.packageName, q.price, q.additionalCharges + q.overtime + q.transport + q.taxes, q.paymentTerms])],
  });
  return sheets;
}

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

export interface CollectionChange {
  key: CollectionKey;
  sheet: string;
  upserts: Rec[];
  removes: ID[];
  added: number;
  updated: number;
}

export interface ImportIssue {
  sheet: string;
  row: number;
  message: string;
}

export interface ImportPlan {
  changes: CollectionChange[];
  wedding: Partial<Wedding> | null;
  seating: SeatingPlan | null;
  menu: MenuPlan | null;
  issues: ImportIssue[];
  /** Sheets we didn't recognise (left alone). */
  ignored: string[];
  /** Nothing to do. */
  empty: boolean;
}

function blank(key: CollectionKey, now: string, newId: () => string): Rec {
  const base = { id: newId(), createdAt: now, updatedAt: now };
  switch (key) {
    case "guests": return { ...base, name: "", phone: "", email: "", side: "bride", category: "", relation: "family", vip: false, partyType: "single", adults: 1, children: 0, invitation: "not_sent", rsvp: "pending", meal: "unknown", vegCount: 0, table: "", needsTransport: false, needsAccommodation: false, notes: "", rsvpToken: newId() };
    case "budgetItems": return { ...base, categoryId: "miscellaneous", name: "", planned: 0, quoted: null, final: null, vendorId: null, status: "planned", notes: "" };
    case "payments": return { ...base, vendorId: null, budgetItemId: null, label: "", amount: 0, dueDate: now.slice(0, 10), paidDate: null, status: "scheduled", method: "", reference: "", paidBy: "" };
    case "vendors": return { ...base, name: "", categoryId: "miscellaneous", contactName: "", phone: "", email: "", location: "", status: "researching", rating: null, notes: "", dayStatus: "not_arrived", arrivalTime: "" };
    case "tasks": return { ...base, title: "", categoryId: "vision", description: "", priority: "medium", dueDate: null, ownerId: null, estimatedCost: null, actualCost: null, vendorId: null, notes: "", dependsOn: [], status: "not_started", completedAt: null, templateKey: null };
    case "timeline": return { ...base, time: "17:00", durationMinutes: 30, title: "", location: "", description: "", vendorIds: [], ownerId: null, scene: "other" };
    case "people": return { id: newId(), name: "", role: "bride_family", phone: "" };
    default: return base;
  }
}

function same(a: Rec, b: Rec): boolean {
  const strip = (o: Rec) => JSON.stringify({ ...o, updatedAt: null });
  return strip(a) === strip(b);
}

const norm = (s: Cell) => str(s).toLowerCase().replace(/[^a-z0-9?]/g, "");

/** Work out what an edited workbook would change. Nothing is saved here. */
export function planImport(data: WeddingData, sheets: { name: string; rows: Cell[][] }[], now: string, newId: () => string): ImportPlan {
  const issues: ImportIssue[] = [];
  const changes: CollectionChange[] = [];
  const known = new Set(["read me", "wedding", "seating", "menu", "quotes", ...SHEET.map((s) => s.name.toLowerCase())]);
  const ignored = sheets.filter((s) => !known.has(s.name.trim().toLowerCase())).map((s) => s.name);
  const find = (name: string) => sheets.find((s) => s.name.trim().toLowerCase() === name.toLowerCase());
  const created: { vendors: CollectionItem<"vendors">[]; items: CollectionItem<"budgetItems">[]; people: Person[] } = { vendors: [], items: [], people: [] };
  const completedAt = (t: Rec) => (t.status === "completed" ? (t.completedAt as string | null) ?? now : null);

  // Vendors and people first so other sheets can name them.
  const order: CollectionKey[] = ["vendors", "people", "budgetItems", "payments", "guests", "tasks", "timeline"];
  for (const key of order) {
    const sheetName = SHEET.find((s) => s.key === key)!.name;
    const sheet = find(sheetName);
    if (!sheet || sheet.rows.length < 1) continue;
    const cols = COLS[key] as unknown as Col<Rec>[];
    const header = sheet.rows[0].map(norm);
    const idCol = header.indexOf("id");
    const delCol = header.findIndex((h) => h === "delete?" || h === "delete");
    const colAt = cols.map((c) => header.indexOf(norm(c.header)));
    const existing = new Map((data[key] as unknown as Rec[]).map((i) => [String(i.id), i]));
    const change: CollectionChange = { key, sheet: sheetName, upserts: [], removes: [], added: 0, updated: 0 };
    const ctx = context(data, created);

    sheet.rows.slice(1).forEach((row, i) => {
      const rowNo = i + 2;
      if (row.every((c) => str(c) === "")) return;
      const id = idCol >= 0 ? str(row[idCol]) : "";
      const before = id ? existing.get(id) : undefined;
      if (id && !before) {
        issues.push({ sheet: sheetName, row: rowNo, message: `ID ${id} isn't in your plan (maybe deleted already). Clear the ID to add it as new.` });
        return;
      }
      if (delCol >= 0 && bool(row[delCol])) {
        if (before) change.removes.push(id);
        return;
      }
      const draft: Rec = before ? structuredClone(before) : blank(key, now, newId);
      try {
        cols.forEach((c, ci) => {
          if (c.set && colAt[ci] >= 0) c.set(draft, row[colAt[ci]], ctx);
        });
      } catch (e) {
        issues.push({ sheet: sheetName, row: rowNo, message: e instanceof Error ? e.message : String(e) });
        return;
      }
      if (key === "tasks") draft.completedAt = completedAt(draft);
      if (key === "payments" && draft.status === "paid" && !draft.paidDate) draft.paidDate = draft.dueDate;
      if (key === "payments" && draft.status !== "paid") draft.paidDate = null;
      const schema = SCHEMA[key];
      // Forms use "" for an empty date; the saved record uses null.
      const check = schema?.safeParse({ ...draft, dueDate: draft.dueDate ?? "", paidDate: draft.paidDate ?? "" });
      if (check && !check.success) {
        issues.push({ sheet: sheetName, row: rowNo, message: check.error?.issues[0]?.message ?? "This row has a problem." });
        return;
      }
      if (key === "people" && !str(draft.name as string)) {
        issues.push({ sheet: sheetName, row: rowNo, message: "Name is missing." });
        return;
      }
      if (before) {
        if (same(before, draft)) return;
        if ("updatedAt" in before) draft.updatedAt = now;
        change.updated += 1;
      } else change.added += 1;
      change.upserts.push(draft);
      if (key === "vendors" && !before) created.vendors.push(draft as unknown as CollectionItem<"vendors">);
      if (key === "budgetItems" && !before) created.items.push(draft as unknown as CollectionItem<"budgetItems">);
      if (key === "people" && !before) created.people.push(draft as unknown as Person);
    });
    if (change.upserts.length || change.removes.length) changes.push(change);
  }

  // Wedding details
  let wedding: Partial<Wedding> | null = null;
  const ws = find("Wedding");
  if (ws) {
    const patch: Partial<Wedding> = {};
    const w = data.wedding;
    for (const [i, row] of ws.rows.entries()) {
      const field = norm(row[0]);
      const v = row[1];
      try {
        if (field === "bride" && str(v) && str(v) !== w.brideName) patch.brideName = str(v);
        if (field === "groom" && str(v) && str(v) !== w.groomName) patch.groomName = str(v);
        if (field === "weddingdate" && str(v) && date(v, "Wedding date") !== w.weddingDate) patch.weddingDate = date(v, "Wedding date");
        if (field === "venue" && str(v) !== w.venue) patch.venue = str(v);
        if (field === "location" && str(v) !== w.location) patch.location = str(v);
        if (field === "totalbudgetlkr" && str(v) && Math.round(num(v, "Total budget")) !== w.budget) patch.budget = Math.round(num(v, "Total budget"));
        if (field === "expectedguests" && str(v) && Math.round(num(v, "Expected guests")) !== w.estimatedGuests) patch.estimatedGuests = Math.round(num(v, "Expected guests"));
      } catch (e) {
        issues.push({ sheet: "Wedding", row: i + 1, message: e instanceof Error ? e.message : String(e) });
      }
    }
    if (Object.keys(patch).length) wedding = patch;
  }

  // Seating: tables named in the sheet get exactly the guests listed for them.
  let seating: SeatingPlan | null = null;
  const ss = find("Seating");
  if (ss && ss.rows.length > 1) {
    const h = ss.rows[0].map(norm);
    const tCol = h.indexOf("table");
    const idCol = h.indexOf("guestid");
    const nameCol = h.indexOf("guest");
    const plan = structuredClone(data.planner.seating);
    const wanted = new Map<string, ID[]>();
    const guestIds = new Set([...data.guests.map((g) => g.id), ...(changes.find((c) => c.key === "guests")?.upserts.map((g) => String(g.id)) ?? [])]);
    const guestByName = (n: string) => data.guests.find((g) => g.name.toLowerCase() === n.toLowerCase())?.id;
    ss.rows.slice(1).forEach((row, i) => {
      const label = str(row[tCol]);
      if (!label) return;
      const gid = str(row[idCol]) || guestByName(str(row[nameCol])) || "";
      if (!gid || !guestIds.has(gid)) {
        issues.push({ sheet: "Seating", row: i + 2, message: `Guest "${str(row[nameCol]) || gid}" isn't on your guest list.` });
        return;
      }
      if (!plan.tables.some((t) => t.label.toLowerCase() === label.toLowerCase())) {
        issues.push({ sheet: "Seating", row: i + 2, message: `There's no table called "${label}" in your table plan.` });
        return;
      }
      wanted.set(label.toLowerCase(), [...(wanted.get(label.toLowerCase()) ?? []), gid]);
    });
    const moved = new Set([...wanted.values()].flat());
    let changed = false;
    plan.tables = plan.tables.map((t) => {
      const want = wanted.get(t.label.toLowerCase());
      const next = want ? [...new Set(want)] : t.guestIds.filter((id) => !moved.has(id));
      if (next.join() !== t.guestIds.join()) changed = true;
      return { ...t, guestIds: next };
    });
    if (changed) seating = plan;
  }

  // Menu: which dishes are chosen.
  let menu: MenuPlan | null = null;
  const ms = find("Menu");
  if (ms && ms.rows.length > 1 && data.planner.menu.sections.length) {
    const next = structuredClone(data.planner.menu);
    const chosen: Record<string, string[]> = {};
    for (const row of ms.rows.slice(1)) {
      const sec = next.sections.find((s) => s.title.toLowerCase() === str(row[0]).toLowerCase());
      if (!sec || sec.pick === 0) continue;
      if (bool(row[2]) && sec.items.includes(str(row[1]))) chosen[sec.id] = [...(chosen[sec.id] ?? []), str(row[1])];
    }
    for (const sec of next.sections) if (sec.pick > 0) next.chosen[sec.id] = (chosen[sec.id] ?? []).slice(0, sec.pick);
    const key = (c: Record<string, string[]>) => JSON.stringify(Object.entries(c).filter(([, v]) => v.length).sort(([a], [b]) => a.localeCompare(b)));
    if (key(next.chosen) !== key(data.planner.menu.chosen)) menu = { ...next, finalizedAt: null };
  }

  return { changes, wedding, seating, menu, issues, ignored, empty: !changes.length && !wedding && !seating && !menu };
}

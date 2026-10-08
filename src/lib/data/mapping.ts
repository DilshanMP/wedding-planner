import type { CollectionKey } from "@/lib/domain/types";

/** Database table for each collection in the wedding aggregate. */
export const TABLES: Record<CollectionKey, string> = {
  people: "participants",
  tasks: "tasks",
  guests: "guests",
  budgetItems: "budget_items",
  vendors: "vendors",
  quotes: "vendor_quotes",
  payments: "payments",
  timeline: "timeline_events",
};

/** JSON / array columns whose inner keys must not be case-converted. */
const OPAQUE = new Set(["features", "blueprint", "plannerQuotes", "dayNotes", "priorities", "mustHave", "niceToHave", "avoidOverspending", "dependsOn", "vendorIds"]);

/** Database-only columns that the domain model doesn't carry. */
const DB_ONLY = new Set(["wedding_id", "owner_id", "deleted_at", "public_slug", "rsvp_token", "user_id", "invited_by"]);

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Numeric columns returned by PostgREST as strings (numeric type). */
const NUMERIC = new Set(["rating", "reviewScore", "hours", "pendingAttendanceRate"]);

export function toRow(item: object, weddingId?: string): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(item)) {
    row[toSnake(k)] = OPAQUE.has(k) ? v : v === undefined ? null : v;
  }
  if (weddingId) row.wedding_id = weddingId;
  return row;
}

export function fromRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (DB_ONLY.has(k)) continue;
    const key = toCamel(k);
    out[key] = NUMERIC.has(key) && typeof v === "string" ? Number(v) : v;
  }
  return out as T;
}
